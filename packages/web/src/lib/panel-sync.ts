import { db } from '@/lib/db';
import { guildConfig, ticketCategories } from '@gtps/shared';
import { eq } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';
const BOT_TOKEN = process.env.DISCORD_TOKEN;
const BRAND_COLOR = 0x22c55e;

type PanelCategory = {
  id: number;
  name: string;
  emoji: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export function buildPanelPayload(categories: PanelCategory[], panelMessage?: string | null, panelTitle?: string | null) {
  const active = categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const title = panelTitle ?? 'GTPS Cloud Support';
  const baseDescription = panelMessage ?? 'Select a category below and click the button to open a ticket.';
  const description = active.length > 0
    ? baseDescription
    : `${baseDescription}\n\nNo ticket categories are enabled right now. Please check back later.`;

  const embeds = [
    {
      title,
      description,
      color: BRAND_COLOR,
      footer: { text: `${title} • Support System` },
      timestamp: new Date().toISOString(),
    },
  ];

  const components = active.length > 0
    ? [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'panel_select',
              placeholder: 'Select a category to open a ticket\u2026',
              min_values: 1,
              max_values: 1,
              options: active.map((cat) => ({
                label: cat.name,
                value: String(cat.id),
                description: cat.description?.slice(0, 100) || undefined,
                emoji: { name: cat.emoji },
              })),
            },
          ],
        },
      ]
    : [];

  return { embeds, components };
}

export async function syncTrackedPanel() {
  if (!BOT_TOKEN) return;

  const cfg = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, GUILD_ID) });
  if (!cfg?.panelChannelId || !cfg.panelMessageId) return;

  const categories = await db.query.ticketCategories.findMany({
    where: eq(ticketCategories.guildId, GUILD_ID),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.id)],
  });

  const payload = buildPanelPayload(categories, cfg.panelMessage, cfg.panelTitle);

  await fetch(`https://discord.com/api/v10/channels/${cfg.panelChannelId}/messages/${cfg.panelMessageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

let syncQueue: Promise<void> = Promise.resolve();

export function queueTrackedPanelSync() {
  syncQueue = syncQueue
    .catch(() => {})
    .then(async () => {
      await syncTrackedPanel();
    });

  return syncQueue;
}

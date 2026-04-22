import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketCategories, guildConfig } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';
const BOT_TOKEN = process.env.DISCORD_TOKEN;

async function refreshPanel() {
  const cfg = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, GUILD_ID) });
  if (!cfg?.panelChannelId || !cfg.panelMessageId) return;

  const allCategories = await db.query.ticketCategories.findMany({ where: eq(ticketCategories.guildId, GUILD_ID) });
  const active = allCategories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const components = active.length > 0
    ? [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'panel_select',
              placeholder: 'Select a category to open a ticket…',
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

  await fetch(`https://discord.com/api/v10/channels/${cfg.panelChannelId}/messages/${cfg.panelMessageId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ components }),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);
  const body = await request.json();

  const allowed = ['name', 'description', 'emoji', 'categoryChannelId', 'staffRoleIds', 'welcomeMessage', 'color', 'questions', 'sortOrder', 'isActive'];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const [category] = await db
    .update(ticketCategories)
    .set(update)
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)))
    .returning();

  // Auto-refresh the panel whenever isActive changes
  if ('isActive' in body) {
    refreshPanel().catch(() => {});
  }

  return NextResponse.json({ category });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);
  await db.delete(ticketCategories).where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)));
  refreshPanel().catch(() => {});
  return NextResponse.json({ success: true });
}

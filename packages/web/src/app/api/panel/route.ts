import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guildConfig, ticketCategories } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { buildPanelPayload } from '@/lib/panel-sync';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';
const BOT_TOKEN = process.env.DISCORD_TOKEN;

async function discordRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function GET() {
  const cfg = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, GUILD_ID) });
  return NextResponse.json({
    panelChannelId: cfg?.panelChannelId ?? null,
    panelMessageId: cfg?.panelMessageId ?? null,
    panelMessage: cfg?.panelMessage ?? 'Select a category below and click the button to open a ticket.',
    panelTitle: cfg?.panelTitle ?? 'GTPS Cloud Support',
  });
}

export async function POST(request: Request) {
  const body = await request.json() as { channelId?: string; action?: 'create' | 'refresh'; panelMessage?: string; panelTitle?: string };
  const action = body.action ?? 'refresh';

  const cfg = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, GUILD_ID) });

  const categories = await db.query.ticketCategories.findMany({
    where: eq(ticketCategories.guildId, GUILD_ID),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.id)],
  });

  const payload = buildPanelPayload(categories, body.panelMessage ?? cfg?.panelMessage, body.panelTitle ?? cfg?.panelTitle);

  if (action === 'refresh' && cfg?.panelChannelId && cfg.panelMessageId) {
    try {
      await discordRequest('PATCH', `/channels/${cfg.panelChannelId}/messages/${cfg.panelMessageId}`, payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('10008') || msg.includes('404')) {
        // Stale panel message — clear it so the UI can recreate
        await db.insert(guildConfig)
          .values({ guildId: GUILD_ID, panelMessageId: null, updatedAt: new Date() })
          .onConflictDoUpdate({ target: guildConfig.guildId, set: { panelMessageId: null, updatedAt: new Date() } });
        return NextResponse.json(
          { error: 'Panel message no longer exists. Please recreate the panel.', code: 'MESSAGE_NOT_FOUND' },
          { status: 404 },
        );
      }
      throw err;
    }
    const saveSet: Record<string, unknown> = { updatedAt: new Date() };
    if (body.panelMessage !== undefined) saveSet.panelMessage = body.panelMessage;
    if (body.panelTitle !== undefined) saveSet.panelTitle = body.panelTitle;
    if (Object.keys(saveSet).length > 1) {
      await db.insert(guildConfig).values({ guildId: GUILD_ID, ...saveSet })
        .onConflictDoUpdate({ target: guildConfig.guildId, set: saveSet });
    }
    return NextResponse.json({ success: true, action: 'refreshed' });
  }

  const channelId = body.channelId ?? cfg?.panelChannelId;
  if (!channelId) {
    return NextResponse.json({ error: 'No channel specified and no existing panel channel set.' }, { status: 400 });
  }

  const message = await discordRequest('POST', `/channels/${channelId}/messages`, payload) as { id: string };

  await db
    .insert(guildConfig)
    .values({ guildId: GUILD_ID, panelChannelId: channelId, panelMessageId: message.id, panelMessage: body.panelMessage, panelTitle: body.panelTitle })
    .onConflictDoUpdate({
      target: guildConfig.guildId,
      set: {
        panelChannelId: channelId,
        panelMessageId: message.id,
        ...(body.panelMessage !== undefined ? { panelMessage: body.panelMessage } : {}),
        ...(body.panelTitle !== undefined ? { panelTitle: body.panelTitle } : {}),
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true, action: 'created', panelChannelId: channelId, panelMessageId: message.id });
}

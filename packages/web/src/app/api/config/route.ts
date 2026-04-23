import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guildConfig } from '@gtps/shared';
import { eq } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export async function GET() {
  const cfg = await db.query.guildConfig.findFirst({
    where: eq(guildConfig.guildId, GUILD_ID),
  });

  return NextResponse.json({ config: cfg ?? null });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const allowed = [
    'ticketingEnabled',
    'ticketingDisabledReason',
    'staffRoleIds',
    'dashboardRoleIds',
    'logChannelId',
    'transcriptChannelId',
    'autoCloseHours',
    'maxOpenTickets',
  ];
  const update: Record<string, unknown> = { updatedAt: new Date() };

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  await db
    .insert(guildConfig)
    .values({ guildId: GUILD_ID, ...update })
    .onConflictDoUpdate({
      target: guildConfig.guildId,
      set: update,
    });

  return NextResponse.json({ success: true });
}

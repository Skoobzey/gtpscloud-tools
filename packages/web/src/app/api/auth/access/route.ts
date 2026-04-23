import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guildConfig, accounts, users } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

type SessionShape = {
  user?: {
    id?: string;
    discordId?: string;
  };
};

export async function GET(request: Request) {
  const cfg = await db.query.guildConfig.findFirst({
    where: eq(guildConfig.guildId, GUILD_ID),
  });

  const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  }).catch(() => null);

  let discordId: string | null = null;

  if (sessionRes?.ok) {
    const session = (await sessionRes.json().catch(() => null)) as SessionShape | null;
    discordId = session?.user?.discordId ?? null;

    if (!discordId && session?.user?.id) {
      const discordAccount = await db.query.accounts.findFirst({
        where: and(eq(accounts.userId, session.user.id), eq(accounts.providerId, 'discord')),
      });

      discordId = discordAccount?.accountId ?? null;

      if (discordId) {
        await db
          .update(users)
          .set({ discordId, updatedAt: new Date() })
          .where(eq(users.id, session.user.id));
      }
    }
  }

  return NextResponse.json({
    staffRoleIds: cfg?.staffRoleIds ?? [],
    dashboardRoleIds: cfg?.dashboardRoleIds ?? [],
    discordId,
  });
}

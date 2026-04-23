import { NextRequest, NextResponse } from 'next/server';

type SessionResponse = {
  user?: {
    id?: string;
  };
};

type AccessConfigResponse = {
  dashboardRoleIds?: string[];
  discordId?: string | null;
};

type DiscordMember = {
  roles: string[];
};

type DiscordRole = {
  id: string;
  permissions: string;
};

type DiscordGuild = {
  owner_id?: string;
};

const ADMINISTRATOR = 1n << 3n;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/dashboard', '/api/tickets', '/api/config', '/api/analytics', '/api/discord', '/api/panel'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  }).catch(() => null);

  if (!sessionRes?.ok) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const session = await sessionRes.json().catch(() => null) as SessionResponse | null;

  if (!session?.user?.id) {
    return deny(request);
  }

  const accessRes = await fetch(new URL('/api/auth/access', request.url), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  }).catch(() => null);
  const accessConfig = (await accessRes?.json().catch(() => null)) as AccessConfigResponse | null;
  const allowedRoleIds = accessConfig?.dashboardRoleIds ?? [];
  const discordId = accessConfig?.discordId ?? null;

  if (!discordId) {
    return deny(request);
  }

  const guildId = process.env.GUILD_ID;
  const botToken = process.env.DISCORD_TOKEN;
  if (!guildId || !botToken) {
    return deny(request);
  }

  const headers = { Authorization: `Bot ${botToken}` };
  const [memberRes, rolesRes, guildRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, { headers }).catch(() => null),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers }).catch(() => null),
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers }).catch(() => null),
  ]);

  if (!memberRes?.ok || !rolesRes?.ok) {
    return deny(request);
  }

  const member = (await memberRes.json()) as DiscordMember;
  const roles = (await rolesRes.json()) as DiscordRole[];
  const guild = (await guildRes?.json().catch(() => null)) as DiscordGuild | null;
  const memberRoleSet = new Set(member.roles ?? []);

  const hasAllowedRole = allowedRoleIds.some((id) => memberRoleSet.has(id));

  const hasAdministratorPermission = roles
    .filter((role) => memberRoleSet.has(role.id))
    .some((role) => {
      try {
        return (BigInt(role.permissions) & ADMINISTRATOR) === ADMINISTRATOR;
      } catch {
        return false;
      }
    });

  const isGuildOwner = guild?.owner_id === discordId;

  if (!hasAllowedRole && !hasAdministratorPermission && !isGuildOwner) {
    return deny(request);
  }

  return NextResponse.next();
}

function deny(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/tickets/:path*', '/api/config/:path*', '/api/analytics/:path*', '/api/discord/:path*', '/api/panel/:path*'],
};

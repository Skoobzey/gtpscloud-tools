import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { tickets, ticketMessages, ticketParticipants, guildConfig, ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';

type SessionShape = {
  user?: {
    isStaff?: boolean;
    discordId?: string;
  };
};

const BOT_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

type DiscordRole = { id: string; name: string; position: number };
type DiscordMember = { roles?: string[] };

async function resolveStaffRoleLabels(authorIds: string[], allowedRoleIds: string[]) {
  const labels = new Map<string, string>();
  if (!BOT_TOKEN || !authorIds.length || !allowedRoleIds.length) return labels;

  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  }).catch(() => null);
  if (!rolesRes?.ok) return labels;

  const roles = (await rolesRes.json().catch(() => [])) as DiscordRole[];
  const allowedRoleSet = new Set(allowedRoleIds);
  const allowedRoles = roles
    .filter((r) => allowedRoleSet.has(r.id))
    .sort((a, b) => b.position - a.position);

  if (!allowedRoles.length) return labels;

  for (const authorId of authorIds) {
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${authorId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    }).catch(() => null);
    if (!memberRes?.ok) continue;

    const member = (await memberRes.json().catch(() => null)) as DiscordMember | null;
    if (!member?.roles?.length) continue;

    const roleIdSet = new Set(member.roles);
    const matched = allowedRoles.find((role) => roleIdSet.has(role.id));
    if (matched) labels.set(authorId, matched.name);
  }

  return labels;
}

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const id = parseInt(ticketId, 10);
  if (Number.isNaN(id)) {
    return new NextResponse('Invalid ticket id', { status: 400 });
  }

  const url = new URL(request.url);
  const exp = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');
  const hasSignedLink = Boolean(exp && sig);

  let signedLinkAllowed = false;
  if (hasSignedLink && process.env.TRANSCRIPT_LINK_SECRET) {
    const expInt = parseInt(exp ?? '0', 10);
    if (!Number.isNaN(expInt) && expInt >= Math.floor(Date.now() / 1000)) {
      const payload = `${id}.${expInt}`;
      const expected = createHmac('sha256', process.env.TRANSCRIPT_LINK_SECRET)
        .update(payload)
        .digest('base64url');

      const sigBuf = Buffer.from(sig ?? '');
      const expectedBuf = Buffer.from(expected);
      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
        signedLinkAllowed = true;
      }
    }
  }

  let requesterDiscordId: string | undefined;
  let requesterIsStaff = false;

  if (!signedLinkAllowed) {
    const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
      headers: { cookie: request.headers.get('cookie') ?? '' },
    }).catch(() => null);

    if (!sessionRes?.ok) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const session = (await sessionRes.json().catch(() => null)) as SessionShape | null;
    requesterDiscordId = session?.user?.discordId;
    requesterIsStaff = session?.user?.isStaff === true;

    if (!requesterDiscordId && !requesterIsStaff) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, id),
  });

  if (!ticket) {
    return new NextResponse('Transcript not found', { status: 404 });
  }

  if (!signedLinkAllowed && !requesterIsStaff) {
    const isOpener = requesterDiscordId === ticket.userId;
    let isParticipant = false;

    if (!isOpener && requesterDiscordId) {
      const participant = await db.query.ticketParticipants.findFirst({
        where: and(eq(ticketParticipants.ticketId, id), eq(ticketParticipants.userId, requesterDiscordId)),
      });
      isParticipant = Boolean(participant);
    }

    if (!isOpener && !isParticipant) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const messages = await db.query.ticketMessages.findMany({
    where: eq(ticketMessages.ticketId, id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  const cfg = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, GUILD_ID) });
  const category = ticket.categoryId
    ? await db.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, ticket.categoryId) })
    : null;

  const allowedStaffRoleIds = Array.from(new Set([...(cfg?.staffRoleIds ?? []), ...(category?.staffRoleIds ?? [])]));
  const staffAuthorIds = Array.from(new Set(messages.filter((m) => m.isStaff).map((m) => m.authorId)));
  const staffRoleLabels = await resolveStaffRoleLabels(staffAuthorIds, allowedStaffRoleIds);

  const rows = messages
    .map((msg) => {
      const time = new Date(msg.createdAt).toLocaleString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const avatar = msg.authorAvatar
        ? `<img src="${escapeHtml(msg.authorAvatar)}" class="avatar" />`
        : `<div class="avatar-placeholder">${escapeHtml(msg.authorUsername[0]?.toUpperCase() ?? '?')}</div>`;

      const attachmentHtml = (msg.attachments as Array<{ url: string; name: string }>)
        .map((a) => {
          const url = escapeHtml(a.url);
          const name = escapeHtml(a.name);
          const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(a.name);
          return `
<a href="${url}" class="attachment" target="_blank" rel="noopener noreferrer">${name}</a>
${isImage ? `<img src="${url}" class="attachment-image" alt="${name}" loading="lazy" />` : ''}`;
        })
        .join('');

      const staffRole = msg.isStaff ? staffRoleLabels.get(msg.authorId) ?? 'Staff' : null;

      return `<div class="message ${msg.isStaff ? 'staff' : ''}">
  <div class="message-left">${avatar}</div>
  <div class="message-body">
    <div class="message-header">
      <span class="username ${msg.isStaff ? 'staff-name' : ''}">${escapeHtml(msg.authorUsername)}</span>
      ${staffRole ? `<span class="staff-role">${escapeHtml(staffRole)}</span>` : ''}
      <span class="timestamp">${time} UTC</span>
    </div>
    <div class="message-content">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
    ${attachmentHtml ? `<div class="attachments">${attachmentHtml}</div>` : ''}
  </div>
</div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Ticket Transcript #${String(ticket.ticketNumber).padStart(4, '0')}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; }
.header { background: #111827; border-bottom: 1px solid #1f2937; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
.header-logo { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; border: 1px solid #1f2937; box-shadow: 0 0 18px rgba(34, 197, 94, 0.2); }
.header-title { font-size: 20px; font-weight: 700; color: #f9fafb; }
.header-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
.messages { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.message { display: flex; gap: 12px; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; }
.message:hover { background: #111827; }
.message.staff { border-left: 2px solid #22c55e; }
.avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: #374151; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.message-body { flex: 1; min-width: 0; }
.message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
.username { font-weight: 600; color: #f9fafb; }
.staff-name { color: #22c55e; }
.staff-role { font-size: 10px; font-weight: 600; color: #86efac; background: rgba(34, 197, 94, 0.14); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 999px; padding: 1px 7px; line-height: 1.5; }
.timestamp { font-size: 11px; color: #6b7280; }
.message-content { color: #d1d5db; word-break: break-word; white-space: pre-wrap; }
.attachments { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; }
.attachment { background: #1f2937; color: #60a5fa; padding: 4px 10px; border-radius: 4px; font-size: 12px; text-decoration: none; display: inline-block; }
.attachment:hover { background: #374151; }
.attachment-image { display: block; width: 100%; max-width: 560px; border-radius: 8px; border: 1px solid #1f2937; margin-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <img class="header-logo" src="/logos/logo.png" alt="GTPS Cloud" />
  <div>
    <div class="header-title">Ticket Transcript #${String(ticket.ticketNumber).padStart(4, '0')}</div>
    <div class="header-sub">Generated on ${new Date().toUTCString()}</div>
  </div>
</div>
<div class="messages">
${rows || '<p style="color:#9ca3af;padding:24px 0;">No messages recorded.</p>'}
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

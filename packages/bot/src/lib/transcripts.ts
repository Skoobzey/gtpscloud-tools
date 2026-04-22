import { db, ticketMessages } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import type { Guild } from 'discord.js';
import { config } from '../config.js';

export async function generateTranscript(ticketId: number, guild: Guild): Promise<Buffer | null> {
  const messages = await db.query.ticketMessages.findMany({
    where: eq(ticketMessages.ticketId, ticketId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  if (!messages.length) return null;

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
        ? `<img src="${msg.authorAvatar}" class="avatar" />`
        : `<div class="avatar-placeholder">${msg.authorUsername[0]?.toUpperCase()}</div>`;

      const attachmentHtml = (msg.attachments as Array<{ url: string; name: string }>)
        .map(
          (a) =>
            `<a href="${escapeHtml(a.url)}" class="attachment" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name)}</a>`,
        )
        .join('');

      return `<div class="message ${msg.isStaff ? 'staff' : ''}">
  <div class="message-left">${avatar}</div>
  <div class="message-body">
    <div class="message-header">
      <span class="username ${msg.isStaff ? 'staff-name' : ''}">${escapeHtml(msg.authorUsername)}</span>
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
<title>Ticket Transcript — ${config.brand.name}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; }
.header { background: #111827; border-bottom: 1px solid #1f2937; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
.header-logo { width: 40px; height: 40px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #000; }
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
.timestamp { font-size: 11px; color: #6b7280; }
.message-content { color: #d1d5db; word-break: break-word; white-space: pre-wrap; }
.attachments { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; }
.attachment { background: #1f2937; color: #60a5fa; padding: 4px 10px; border-radius: 4px; font-size: 12px; text-decoration: none; }
.attachment:hover { background: #374151; }
</style>
</head>
<body>
<div class="header">
  <div class="header-logo">G</div>
  <div>
    <div class="header-title">${config.brand.name} — Ticket Transcript</div>
    <div class="header-sub">Generated on ${new Date().toUTCString()}</div>
  </div>
</div>
<div class="messages">
${rows}
</div>
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

import { db } from '@/lib/db';
import { tickets, ticketMessages, guildConfig } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { formatDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const BOT_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

type DiscordRole = { id: string; name: string; position: number };
type DiscordMember = { roles?: string[] };

async function resolveStaffRoleLabels(authorIds: string[], allowedRoleIds: string[]) {
  const labels = new Map<string, string>();
  if (!BOT_TOKEN || !authorIds.length || !allowedRoleIds.length) return labels;

  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    cache: 'no-store',
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
      cache: 'no-store',
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

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) notFound();

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: { category: true },
  });

  if (!ticket) notFound();

  const messages = await db.query.ticketMessages.findMany({
    where: eq(ticketMessages.ticketId, ticketId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  const cfg = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, GUILD_ID) });
  const allowedStaffRoleIds = Array.from(
    new Set([...(cfg?.staffRoleIds ?? []), ...(ticket.category?.staffRoleIds ?? [])]),
  );
  const staffAuthorIds = Array.from(new Set(messages.filter((m) => m.isStaff).map((m) => m.authorId)));
  const staffRoleLabels = await resolveStaffRoleLabels(staffAuthorIds, allowedStaffRoleIds);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tickets" className="p-2 rounded-lg bg-[#111111] border border-[#27272a] text-[#71717a] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Ticket #{String(ticket.ticketNumber).padStart(4, '0')}
          </h1>
          <p className="text-[#71717a] text-sm">{ticket.category ? `${ticket.category.emoji} ${ticket.category.name}` : 'Uncategorised'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Status</p>
          <Badge variant="status" value={ticket.status} />
        </div>
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Priority</p>
          <Badge variant="priority" value={ticket.priority} />
        </div>
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Opened by</p>
          <p className="text-sm font-mono text-[#d4d4d8]">{ticket.userId}</p>
        </div>
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Created</p>
          <p className="text-sm text-[#d4d4d8]">{formatDate(ticket.createdAt)}</p>
        </div>
      </div>

      {ticket.subject && (
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Subject</p>
          <p className="text-sm text-[#d4d4d8]">{ticket.subject}</p>
        </div>
      )}

      {ticket.claimedBy && (
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Claimed by</p>
          <p className="text-sm font-mono text-[#22c55e]">{ticket.claimedBy}</p>
        </div>
      )}

      {ticket.closeReason && (
        <div className="bg-[#111111] border border-red-400/20 rounded-xl p-4">
          <p className="text-xs text-[#71717a] mb-1">Close reason</p>
          <p className="text-sm text-[#d4d4d8]">{ticket.closeReason}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Transcript
          <span className="text-sm font-normal text-[#71717a] ml-2">({messages.length} messages)</span>
        </h2>
        <div className="space-y-1">
          {messages.length === 0 ? (
            <p className="text-[#52525b] text-sm text-center py-10">No messages recorded.</p>
          ) : (
            messages.map((msg) => (
              (() => {
                const staffRole = msg.isStaff ? staffRoleLabels.get(msg.authorId) ?? 'Staff' : null;
                return (
              <div
                key={msg.id}
                className={`flex gap-3 px-4 py-3 rounded-lg hover:bg-[#111111] transition-colors ${msg.isStaff ? 'border-l-2 border-[#22c55e]' : ''}`}
              >
                {msg.authorAvatar ? (
                  <img src={msg.authorAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    {msg.authorUsername[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${msg.isStaff ? 'text-[#22c55e]' : 'text-white'}`}>
                      {msg.authorUsername}
                    </span>
                    {staffRole && (
                      <span className="text-xs bg-[#22c55e]/10 text-[#22c55e] px-1.5 py-0.5 rounded font-medium">{staffRole}</span>
                    )}
                    <span className="text-xs text-[#52525b]">{formatDate(msg.createdAt)}</span>
                  </div>
                  {msg.content && (
                    <p className="text-sm text-[#d4d4d8] whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  {(msg.attachments as Array<{ url: string; name: string }>).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(msg.attachments as Array<{ url: string; name: string }>).map((a, i) => (
                        <a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-[#18181b] text-[#60a5fa] hover:bg-[#27272a] px-2.5 py-1 rounded-md transition-colors"
                        >
                          📎 {a.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                );
              })()
            ))
          )}
        </div>
      </div>
    </div>
  );
}

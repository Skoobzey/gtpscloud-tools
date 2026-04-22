import { db } from '@/lib/db';
import { tickets, ticketCategories } from '@gtps/shared';
import { eq, count, and, sql, desc } from 'drizzle-orm';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Ticket, BarChart2, Clock, CheckCircle } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import Link from 'next/link';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export default async function DashboardPage() {
  const [total] = await db.select({ count: count() }).from(tickets).where(eq(tickets.guildId, GUILD_ID));
  const [open] = await db.select({ count: count() }).from(tickets).where(and(eq(tickets.guildId, GUILD_ID), sql`${tickets.status} IN ('open', 'pending')`));
  const [closed] = await db.select({ count: count() }).from(tickets).where(and(eq(tickets.guildId, GUILD_ID), eq(tickets.status, 'closed')));
  const [urgent] = await db.select({ count: count() }).from(tickets).where(and(eq(tickets.guildId, GUILD_ID), eq(tickets.priority, 'urgent'), sql`${tickets.status} IN ('open', 'pending')`));

  const recent = await db.query.tickets.findMany({
    where: eq(tickets.guildId, GUILD_ID),
    orderBy: [desc(tickets.createdAt)],
    limit: 8,
    with: { category: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-[#71717a] text-sm mt-1">GTPS Cloud tools dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={total.count} icon={<Ticket size={18} />} />
        <StatCard title="Open Tickets" value={open.count} icon={<Clock size={18} />} />
        <StatCard title="Closed Tickets" value={closed.count} icon={<CheckCircle size={18} />} />
        <StatCard title="Urgent Open" value={urgent.count} description="Requires immediate attention" icon={<BarChart2 size={18} />} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
          <Link href="/dashboard/tickets" className="text-sm text-[#22c55e] hover:text-[#16a34a] font-medium transition-colors">
            View all →
          </Link>
        </div>
        <div className="border border-[#27272a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#111111]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Opened</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((ticket) => (
                <tr key={ticket.id} className="border-b border-[#27272a] last:border-0 bg-[#0a0a0a] hover:bg-[#111111] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tickets/${ticket.id}`} className="text-[#22c55e] font-mono font-medium hover:underline">
                      #{String(ticket.ticketNumber).padStart(4, '0')}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#d4d4d8]">
                    {ticket.category ? `${ticket.category.emoji} ${ticket.category.name}` : '—'}
                  </td>
                  <td className="px-4 py-3"><Badge variant="status" value={ticket.status} /></td>
                  <td className="px-4 py-3"><Badge variant="priority" value={ticket.priority} /></td>
                  <td className="px-4 py-3 text-[#71717a]">{formatRelative(ticket.createdAt)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#52525b]">No tickets yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

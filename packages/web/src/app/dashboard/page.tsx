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
    <div className="space-y-6">
      <div className="dash-surface rounded-2xl p-5 lg:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[#6d8d7f] mb-2">Control Room</p>
        <h1 className="text-[30px] dash-title dash-glow text-[#e9fff5] leading-tight">Support Operations</h1>
        <p className="text-[#90ab9f] text-sm mt-1.5">Real-time visibility across tickets, response workload, and urgent queue health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={total.count} icon={<Ticket size={18} />} />
        <StatCard title="Open Tickets" value={open.count} icon={<Clock size={18} />} />
        <StatCard title="Closed Tickets" value={closed.count} icon={<CheckCircle size={18} />} />
        <StatCard title="Urgent Open" value={urgent.count} description="Requires immediate attention" icon={<BarChart2 size={18} />} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg dash-title text-[#dcfff1]">Recent Tickets</h2>
          <Link href="/dashboard/tickets" className="text-sm text-[#72f0c1] hover:text-[#43d79d] font-medium transition-colors">
            View all →
          </Link>
        </div>
        <div className="dash-surface rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f312b] bg-[#0f1815]">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7f9f92] uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7f9f92] uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7f9f92] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7f9f92] uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7f9f92] uppercase tracking-wide">Opened</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((ticket) => (
                <tr key={ticket.id} className="border-b border-[#1f312b] last:border-0 bg-[#0a120f] hover:bg-[#0f1a15] transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/tickets/${ticket.id}`} className="text-[#67e8b1] font-mono font-medium hover:underline">
                      #{String(ticket.ticketNumber).padStart(4, '0')}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[#d5eee3]">
                    {ticket.category ? `${ticket.category.emoji} ${ticket.category.name}` : '—'}
                  </td>
                  <td className="px-4 py-2.5"><Badge variant="status" value={ticket.status} /></td>
                  <td className="px-4 py-2.5"><Badge variant="priority" value={ticket.priority} /></td>
                  <td className="px-4 py-2.5 text-[#88a79a]">{formatRelative(ticket.createdAt)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#6f8b7f]">No tickets yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

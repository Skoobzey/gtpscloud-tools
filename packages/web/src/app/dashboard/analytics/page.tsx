import { db } from '@/lib/db';
import { tickets, ticketCategories } from '@gtps/shared';
import { eq, and, sql, count } from 'drizzle-orm';
import { StatCard } from '@/components/StatCard';
import { Ticket, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { AnalyticsCharts } from './AnalyticsCharts';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export default async function AnalyticsPage() {
  const [total] = await db.select({ count: count() }).from(tickets).where(eq(tickets.guildId, GUILD_ID));
  const [open] = await db.select({ count: count() }).from(tickets).where(and(eq(tickets.guildId, GUILD_ID), sql`${tickets.status} IN ('open', 'pending')`));
  const [closed] = await db.select({ count: count() }).from(tickets).where(and(eq(tickets.guildId, GUILD_ID), eq(tickets.status, 'closed')));
  const [urgent] = await db.select({ count: count() }).from(tickets).where(and(eq(tickets.guildId, GUILD_ID), eq(tickets.priority, 'urgent'), sql`${tickets.status} IN ('open', 'pending')`));

  const categoryCounts = await db
    .select({
      name: ticketCategories.name,
      emoji: ticketCategories.emoji,
      count: count(tickets.id),
    })
    .from(ticketCategories)
    .leftJoin(tickets, eq(tickets.categoryId, ticketCategories.id))
    .where(eq(ticketCategories.guildId, GUILD_ID))
    .groupBy(ticketCategories.id, ticketCategories.name, ticketCategories.emoji);

  const categoryData = categoryCounts.map((c) => ({
    name: `${c.emoji} ${c.name}`,
    tickets: c.count,
  }));

  const statusData = [
    { name: 'Open', value: open.count },
    { name: 'Closed', value: closed.count },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-[#71717a] text-sm mt-1">Ticket statistics and trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={total.count} icon={<Ticket size={18} />} />
        <StatCard title="Open" value={open.count} icon={<Clock size={18} />} />
        <StatCard title="Closed" value={closed.count} icon={<CheckCircle size={18} />} />
        <StatCard title="Urgent Open" value={urgent.count} icon={<AlertTriangle size={18} />} />
      </div>

      <AnalyticsCharts categoryData={categoryData} statusData={statusData} />
    </div>
  );
}

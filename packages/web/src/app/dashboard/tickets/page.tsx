'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/Badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';

type TicketRow = {
  id: number;
  ticketNumber: number;
  status: string;
  priority: string;
  userId: string;
  createdAt: string;
  category: { name: string; emoji: string } | null;
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
      ...(priority && { priority }),
    });
    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, status, priority]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tickets</h1>
        <p className="text-[#71717a] text-sm mt-1">{total} total tickets</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
          <input
            type="text"
            placeholder="Search by ticket # or user ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#111111] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-[#111111] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1); }}
          className="bg-[#111111] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="border border-[#27272a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#111111]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Opened</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#52525b]">Loading…</td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#52525b]">No tickets found.</td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-[#27272a] last:border-0 bg-[#0a0a0a] hover:bg-[#111111] transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[#22c55e]">
                      #{String(ticket.ticketNumber).padStart(4, '0')}
                    </td>
                    <td className="px-4 py-3 text-[#d4d4d8]">
                      {ticket.category ? `${ticket.category.emoji} ${ticket.category.name}` : '—'}
                    </td>
                    <td className="px-4 py-3"><Badge variant="status" value={ticket.status} /></td>
                    <td className="px-4 py-3"><Badge variant="priority" value={ticket.priority} /></td>
                    <td className="px-4 py-3 text-[#71717a] font-mono text-xs">{ticket.userId}</td>
                    <td className="px-4 py-3 text-[#71717a]">{formatDate(ticket.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/tickets/${ticket.id}`} className="text-xs text-[#22c55e] hover:underline font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#71717a]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-[#111111] border border-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-[#111111] border border-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

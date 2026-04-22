import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@gtps/shared';
import { eq, and, sql, like, ilike, count, desc } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';

  const conditions = [eq(tickets.guildId, GUILD_ID)];

  if (status) conditions.push(eq(tickets.status, status as 'open' | 'pending' | 'closed' | 'deleted'));
  if (priority) conditions.push(eq(tickets.priority, priority as 'low' | 'normal' | 'high' | 'urgent'));

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(tickets).where(where);

  const rows = await db.query.tickets.findMany({
    where,
    orderBy: [desc(tickets.createdAt)],
    limit,
    offset,
    with: { category: true },
  });

  return NextResponse.json({ tickets: rows, total, page, limit });
}

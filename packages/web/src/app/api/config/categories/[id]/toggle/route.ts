import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);

  const category = await db.query.ticketCategories.findFirst({
    where: and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)),
  });

  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [updated] = await db
    .update(ticketCategories)
    .set({ isActive: !category.isActive, updatedAt: new Date() })
    .where(eq(ticketCategories.id, categoryId))
    .returning();

  return NextResponse.json({ category: updated });
}

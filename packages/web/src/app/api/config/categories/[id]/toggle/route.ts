import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';
import { queueTrackedPanelSync } from '@/lib/panel-sync';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);
  const body = await request.json().catch(() => ({} as { isActive?: boolean }));

  const category = await db.query.ticketCategories.findFirst({
    where: and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)),
  });

  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const nextIsActive = typeof body.isActive === 'boolean' ? body.isActive : !category.isActive;

  const [updated] = await db
    .update(ticketCategories)
    .set({ isActive: nextIsActive, updatedAt: new Date() })
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)))
    .returning();

  queueTrackedPanelSync().catch(() => {});

  return NextResponse.json({ category: updated });
}

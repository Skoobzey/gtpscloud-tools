import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';
import { queueTrackedPanelSync } from '@/lib/panel-sync';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);
  const body = await request.json();

  const allowed = ['name', 'description', 'emoji', 'categoryChannelId', 'staffRoleIds', 'welcomeMessage', 'color', 'questions', 'sortOrder', 'isActive'];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const [category] = await db
    .update(ticketCategories)
    .set(update)
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)))
    .returning();

  queueTrackedPanelSync().catch(() => {});

  return NextResponse.json({ category });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);
  await db.delete(ticketCategories).where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.guildId, GUILD_ID)));
  queueTrackedPanelSync().catch(() => {});
  return NextResponse.json({ success: true });
}

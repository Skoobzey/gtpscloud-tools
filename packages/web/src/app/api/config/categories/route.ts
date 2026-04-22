import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

export async function GET() {
  const categories = await db.query.ticketCategories.findMany({
    where: eq(ticketCategories.guildId, GUILD_ID),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.id)],
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const body = await request.json();
  const [category] = await db
    .insert(ticketCategories)
    .values({
      guildId: GUILD_ID,
      name: body.name,
      description: body.description ?? '',
      emoji: body.emoji ?? '🎫',
      welcomeMessage: body.welcomeMessage ?? undefined,
      categoryChannelId: body.categoryChannelId ?? null,
      staffRoleIds: body.staffRoleIds ?? [],
      color: body.color ?? 0x22c55e,
      questions: body.questions ?? [],
    })
    .returning();
  return NextResponse.json({ category }, { status: 201 });
}

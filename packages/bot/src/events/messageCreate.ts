import type { Message } from 'discord.js';
import { db, tickets, ticketMessages } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { isStaffMember } from '../lib/permissions.js';

export async function messageCreate(message: Message) {
  if (!message.guildId || message.guildId !== config.guildId) return;
  if (message.author.bot) return;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.channelId, message.channelId),
  });

  if (!ticket || ticket.status === 'deleted') return;

  const isStaff = await isStaffMember(message.member ?? null);

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    messageId: message.id,
    authorId: message.author.id,
    authorUsername: message.author.username,
    authorAvatar: message.author.displayAvatarURL(),
    content: message.content,
    attachments: message.attachments.map((a) => ({
      url: a.url,
      name: a.name,
      size: a.size,
    })),
    embeds: message.embeds.map((e) => e.toJSON() as Record<string, unknown>),
    isStaff,
  });
}

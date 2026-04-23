import cron from 'node-cron';
import type { Client } from 'discord.js';
import { db, tickets, ticketMessages } from '@gtps/shared';
import { eq, and, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { getOrCreateConfig, closeTicket } from './tickets.js';

export function startAutoCloseScheduler(client: Client) {
  cron.schedule('*/30 * * * *', async () => {
    const cfg = await getOrCreateConfig(config.guildId);
    if (!cfg.autoCloseHours || cfg.autoCloseHours <= 0) return;

    const cutoff = new Date(Date.now() - cfg.autoCloseHours * 60 * 60 * 1000);

    const openTickets = await db.query.tickets.findMany({
      where: and(
        eq(tickets.guildId, config.guildId),
        eq(tickets.status, 'open'),
      ),
    });

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    for (const ticket of openTickets) {
      const lastMessage = await db.query.ticketMessages.findFirst({
        where: eq(ticketMessages.ticketId, ticket.id),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });

      if (!lastMessage?.isStaff) continue;
      if (lastMessage.createdAt > cutoff) continue;

      await closeTicket(
        ticket.id,
        client.user!.id,
        guild,
        `Auto-closed after ${cfg.autoCloseHours} hours without a user reply`,
      ).catch(console.error);
    }
  });
}

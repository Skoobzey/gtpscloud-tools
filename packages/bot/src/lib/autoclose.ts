import cron from 'node-cron';
import type { Client } from 'discord.js';
import { db, tickets } from '@gtps/shared';
import { eq, and, lt, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { getOrCreateConfig, closeTicket } from './tickets.js';

export function startAutoCloseScheduler(client: Client) {
  cron.schedule('*/30 * * * *', async () => {
    const cfg = await getOrCreateConfig(config.guildId);
    if (!cfg.autoCloseHours || cfg.autoCloseHours <= 0) return;

    const cutoff = new Date(Date.now() - cfg.autoCloseHours * 60 * 60 * 1000);

    const stale = await db.query.tickets.findMany({
      where: and(
        eq(tickets.guildId, config.guildId),
        sql`${tickets.status} IN ('open', 'pending')`,
        lt(tickets.updatedAt, cutoff),
      ),
    });

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    for (const ticket of stale) {
      await closeTicket(ticket.id, client.user!.id, guild, `Auto-closed after ${cfg.autoCloseHours} hours of inactivity`).catch(console.error);
    }
  });
}

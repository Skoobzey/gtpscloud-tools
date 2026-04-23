import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../client.js';
import { db, tickets } from '@gtps/shared';
import { eq, and, count, sql } from 'drizzle-orm';
import { config } from '../config.js';

export const adminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Bot administration commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName('stats').setDescription('View ticket statistics')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const [total] = await db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.guildId, config.guildId));

    const [open] = await db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.guildId, config.guildId), sql`${tickets.status} IN ('open', 'pending')`));

    const [closed] = await db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.guildId, config.guildId), eq(tickets.status, 'closed')));

    const [deleted] = await db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.guildId, config.guildId), eq(tickets.status, 'deleted')));

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${config.brand.name} — Ticket Statistics`)
      .addFields(
        { name: 'Total Tickets', value: String(total.count), inline: true },
        { name: 'Open', value: String(open.count), inline: true },
        { name: 'Closed', value: String(closed.count), inline: true },
        { name: 'Deleted', value: String(deleted.count), inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
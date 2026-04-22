import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../client.js';
import { db, ticketCategories, guildConfig } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { panelEmbed, panelSelectMenu } from '../lib/embeds.js';

export const panelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Manage the support ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create or refresh the ticket panel in a channel')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel to send the panel to (defaults to current)').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('refresh').setDescription('Refresh the existing panel with updated categories'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();

    const categories = await db.query.ticketCategories.findMany({
      where: eq(ticketCategories.guildId, config.guildId),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.id)],
    });

    const activeCategories = categories.filter((c) => c.isActive);

    if (!activeCategories.length) {
      await interaction.reply({
        content: 'No active ticket categories found. Use `/admin category` to create categories first.',
        ephemeral: true,
      });
      return;
    }

    if (sub === 'create') {
      const targetChannel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

      await interaction.deferReply({ ephemeral: true });

      const cfg2 = await db.query.guildConfig.findFirst({ where: eq(guildConfig.guildId, config.guildId) });
      const embed = panelEmbed(activeCategories, cfg2?.panelMessage, cfg2?.panelTitle);
      const rows = panelSelectMenu(activeCategories);

      const message = await targetChannel.send({ embeds: [embed], components: rows });

      await db
        .insert(guildConfig)
        .values({
          guildId: config.guildId,
          panelChannelId: targetChannel.id,
          panelMessageId: message.id,
        })
        .onConflictDoUpdate({
          target: guildConfig.guildId,
          set: { panelChannelId: targetChannel.id, panelMessageId: message.id, updatedAt: new Date() },
        });

      await interaction.editReply({ content: `Panel created in <#${targetChannel.id}>.` });
      return;
    }

    if (sub === 'refresh') {
      await interaction.deferReply({ ephemeral: true });

      const cfg = await db.query.guildConfig.findFirst({
        where: eq(guildConfig.guildId, config.guildId),
      });

      if (!cfg?.panelChannelId || !cfg.panelMessageId) {
        await interaction.editReply({ content: 'No panel found. Use `/panel create` first.' });
        return;
      }

      const panelChannel = interaction.guild.channels.cache.get(cfg.panelChannelId) as TextChannel | undefined;
      if (!panelChannel) {
        await interaction.editReply({ content: 'Panel channel not found.' });
        return;
      }

      const message = await panelChannel.messages.fetch(cfg.panelMessageId).catch(() => null);
      if (!message) {
        await interaction.editReply({ content: 'Panel message not found. Use `/panel create` to recreate it.' });
        return;
      }

      const embed = panelEmbed(activeCategories, cfg?.panelMessage, cfg?.panelTitle);
      const rows = panelSelectMenu(activeCategories);

      await message.edit({ embeds: [embed], components: rows });
      await interaction.editReply({ content: 'Panel refreshed.' });
    }
  },
};

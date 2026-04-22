import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type { TicketCategory, Ticket, GuildConfig } from '@gtps/shared';
import { config } from '../config.js';

export function ticketOpenEmbed(
  ticket: Ticket,
  category: TicketCategory,
  username: string,
  opts?: { claimedByUsername?: string; participantIds?: string[] },
) {
  const priorityEmoji: Record<string, string> = { low: '🟢', normal: '🔵', high: '🟡', urgent: '🔴' };
  const claimedValue = opts?.claimedByUsername
    ? opts.claimedByUsername
    : ticket.claimedBy
    ? `<@${ticket.claimedBy}>`
    : 'Unclaimed';

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: 'Category', value: category.name, inline: true },
    { name: 'Priority', value: `${priorityEmoji[ticket.priority] ?? ''} ${capitalise(ticket.priority)}`, inline: true },
    { name: 'Status', value: capitalise(ticket.status), inline: true },
    { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
    { name: 'Claimed by', value: claimedValue, inline: true },
  ];

  if (ticket.subject) fields.push({ name: 'Subject', value: ticket.subject, inline: false });
  if (opts?.participantIds?.length) {
    fields.push({ name: 'Added Users', value: opts.participantIds.map((id) => `<@${id}>`).join(', '), inline: false });
  }

  return new EmbedBuilder()
    .setColor(category.color)
    .setTitle(`${category.emoji} Ticket #${String(ticket.ticketNumber).padStart(4, '0')}`)
    .setDescription(category.welcomeMessage)
    .addFields(fields)
    .setFooter({ text: config.brand.name })
    .setTimestamp();
}

export function ticketControlRow(ticketId: number, claimedBy?: string | null) {
  const claimBtn = new ButtonBuilder()
    .setCustomId(`ticket_claim:${ticketId}`);

  if (claimedBy) {
    claimBtn.setLabel('Unclaim').setStyle(ButtonStyle.Primary).setEmoji('🔓');
  } else {
    claimBtn.setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋');
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close:${ticketId}`)
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    claimBtn,
    new ButtonBuilder()
      .setCustomId(`ticket_transcript:${ticketId}`)
      .setLabel('Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📄'),
  );
}

export function ticketClosedEmbed(ticket: Ticket, closerId: string) {
  return new EmbedBuilder()
    .setColor(config.brand.colorDanger)
    .setTitle('🔒 Ticket Closed')
    .addFields(
      { name: 'Closed by', value: `<@${closerId}>`, inline: true },
      ...(ticket.closeReason ? [{ name: 'Reason', value: ticket.closeReason, inline: false }] : []),
    )
    .setFooter({ text: config.brand.name })
    .setTimestamp();
}

export function ticketReopenedEmbed(reopenerUsername: string) {
  return new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle('🔓 Ticket Reopened')
    .setDescription(`This ticket has been reopened by **${reopenerUsername}**.`)
    .setFooter({ text: config.brand.name })
    .setTimestamp();
}

export function ticketClaimedEmbed(staffUsername: string) {
  return new EmbedBuilder()
    .setColor(config.brand.colorInfo)
    .setTitle('🙋 Ticket Claimed')
    .setDescription(`This ticket has been claimed by **${staffUsername}**.`)
    .setFooter({ text: config.brand.name })
    .setTimestamp();
}

export function ticketUnclaimedEmbed() {
  return new EmbedBuilder()
    .setColor(config.brand.colorMuted)
    .setTitle('🙋 Ticket Unclaimed')
    .setDescription('This ticket is no longer claimed.')
    .setFooter({ text: config.brand.name })
    .setTimestamp();
}

export function logEmbed(
  title: string,
  description: string,
  color: number,
  fields?: Array<{ name: string; value: string; inline?: boolean }>,
) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: config.brand.name })
    .setTimestamp();

  if (fields?.length) embed.addFields(fields);

  return embed;
}

export function panelEmbed(categories: TicketCategory[], message?: string | null, title?: string | null) {
  const t = title ?? `${config.brand.name} Support`;
  return new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(t)
    .setDescription(message ?? 'Select a category below and click the button to open a ticket.')
    .setFooter({ text: `${t} • Support System` })
    .setTimestamp();
}

export function panelSelectMenu(categories: TicketCategory[]) {
  const active = categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  if (active.length === 0) return [];
  const menu = new StringSelectMenuBuilder()
    .setCustomId('panel_select')
    .setPlaceholder('Select a category to open a ticket…')
    .addOptions(
      active.map((cat) => ({
        label: cat.name,
        description: cat.description?.slice(0, 100) || undefined,
        value: String(cat.id),
        emoji: cat.emoji,
      })),
    );
  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];
}

export function reopenDeleteRow(ticketId: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_reopen:${ticketId}`)
      .setLabel('Reopen')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔓'),
    new ButtonBuilder()
      .setCustomId(`ticket_delete:${ticketId}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️'),
  );
}

export function prioritySelectRow(ticketId: number) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket_priority:${ticketId}`)
      .setPlaceholder('Set Priority')
      .addOptions([
        { label: 'Low', value: 'low', emoji: '🟢' },
        { label: 'Normal', value: 'normal', emoji: '🔵' },
        { label: 'High', value: 'high', emoji: '🟡' },
        { label: 'Urgent', value: 'urgent', emoji: '🔴' },
      ]),
  );
}

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

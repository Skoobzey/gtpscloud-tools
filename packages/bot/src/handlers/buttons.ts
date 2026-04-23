import type { ButtonInteraction, InteractionReplyOptions } from 'discord.js';
import {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { db, tickets, ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';
import { isStaffMember } from '../lib/permissions.js';
import {
  closeTicket,
  reopenTicket,
  deleteTicket,
  claimTicket,
  unclaimTicket,
  holdTicket,
  resumeTicket,
  getOrCreateConfig,
} from '../lib/tickets.js';
import { createTicket } from '../lib/tickets.js';
import { config } from '../config.js';
import { buildTranscriptUrl } from '../lib/transcript-link.js';

export async function handleButton(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  const [action, rawId] = interaction.customId.split(':');
  const id = parseInt(rawId ?? '0', 10);
  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const isStaff = await isStaffMember(member);

  try {
    if (action === 'ticket_create') {
      const cfg = await getOrCreateConfig(config.guildId);
      if (!cfg.ticketingEnabled) {
        await interaction.reply({ content: cfg.ticketingDisabledReason, flags: MessageFlags.Ephemeral });
        return;
      }

      const category = await db.query.ticketCategories.findFirst({
        where: and(eq(ticketCategories.id, id), eq(ticketCategories.isActive, true)),
      });
      if (!category) {
        await interaction.reply({ content: 'Category not found or is inactive.', flags: MessageFlags.Ephemeral });
        return;
      }

      type Question = { id: string; label: string; placeholder?: string; style: 'short' | 'paragraph'; required: boolean };
      const questions = (category.questions ?? []) as Question[];

      if (questions.length > 0) {
        const modal = new ModalBuilder()
          .setCustomId(`modal_questions:${id}`)
          .setTitle(`Open Ticket — ${category.name}`.slice(0, 45))
          .addComponents(
            ...questions.slice(0, 5).map((q) =>
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId(q.id)
                  .setLabel(q.label.slice(0, 45))
                  .setStyle(q.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                  .setRequired(q.required)
                  .setPlaceholder((q.placeholder ?? '').slice(0, 100)),
              ),
            ),
          );
        await interaction.showModal(modal);
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const { channel } = await createTicket(guild, member, id);
        await interaction.editReply({ content: `Your ticket has been created: <#${channel.id}>` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not create ticket.';
        await interaction.editReply({ content: msg });
      }
      return;
    }

    if (action === 'ticket_close') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_close:${id}`)
        .setTitle('Close Ticket')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('reason')
              .setLabel('Reason (optional)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'ticket_reopen') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can reopen tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferUpdate();
      await reopenTicket(id, interaction.user.username, guild);
      return;
    }

    if (action === 'ticket_delete') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can delete tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ content: 'Deleting ticket…', flags: MessageFlags.Ephemeral });
      await deleteTicket(id, interaction.user.id, guild);
      return;
    }

    if (action === 'ticket_claim') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can claim tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
      if (ticket?.claimedBy === interaction.user.id) {
        await interaction.deferUpdate();
        await unclaimTicket(id, guild);
        return;
      }
      await interaction.deferUpdate();
      await claimTicket(id, interaction.user.id, interaction.user.username, guild);
      return;
    }

    if (action === 'ticket_hold') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can hold or resume tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferUpdate();
      if (ticket.status === 'pending') {
        await resumeTicket(id, interaction.user.id, interaction.user.username, guild);
      } else {
        await holdTicket(id, interaction.user.id, interaction.user.username, guild);
      }
      return;
    }

    if (action === 'ticket_transcript') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can generate transcripts.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
      if (!ticket) {
        await interaction.editReply({ content: 'Ticket not found.' });
        return;
      }
      const transcriptUrl = buildTranscriptUrl(id);
      await interaction.editReply({ content: `Transcript link: ${transcriptUrl}` });
      return;
    }
  } catch (err) {
    console.error('[Button Error]', err);
    const payload: InteractionReplyOptions = { content: 'An error occurred.', flags: ['Ephemeral'] };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}

import type { ButtonInteraction } from 'discord.js';
import {
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
} from '../lib/tickets.js';
import { createTicket } from '../lib/tickets.js';
import { generateTranscript } from '../lib/transcripts.js';
import { config } from '../config.js';

export async function handleButton(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  const [action, rawId] = interaction.customId.split(':');
  const id = parseInt(rawId ?? '0', 10);
  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const isStaff = await isStaffMember(member);

  try {
    if (action === 'ticket_create') {
      // Fetch category to check for questions
      const category = await db.query.ticketCategories.findFirst({
        where: and(eq(ticketCategories.id, id), eq(ticketCategories.isActive, true)),
      });
      if (!category) {
        await interaction.reply({ content: 'Category not found or is inactive.', ephemeral: true });
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

      await interaction.deferReply({ ephemeral: true });
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
        await interaction.reply({ content: 'Only staff can reopen tickets.', ephemeral: true });
        return;
      }
      await interaction.deferUpdate();
      await reopenTicket(id, interaction.user.username, guild);
      return;
    }

    if (action === 'ticket_delete') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can delete tickets.', ephemeral: true });
        return;
      }
      await interaction.reply({ content: 'Deleting ticket…', ephemeral: true });
      await deleteTicket(id, interaction.user.id, guild);
      return;
    }

    if (action === 'ticket_claim') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
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

    if (action === 'ticket_transcript') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can generate transcripts.', ephemeral: true });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
      if (!ticket) {
        await interaction.editReply({ content: 'Ticket not found.' });
        return;
      }
      const buffer = await generateTranscript(id, guild);
      if (!buffer) {
        await interaction.editReply({ content: 'No messages to generate a transcript from.' });
        return;
      }
      await interaction.editReply({
        content: 'Here is the transcript:',
        files: [{ attachment: buffer, name: `transcript-${ticket.ticketNumber}.html` }],
      });
      return;
    }
  } catch (err) {
    console.error('[Button Error]', err);
    const payload = { content: 'An error occurred.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}

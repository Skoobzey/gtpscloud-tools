import { MessageFlags } from 'discord.js';
import type { ModalSubmitInteraction } from 'discord.js';
import { isStaffMember } from '../lib/permissions.js';
import { closeTicket, createTicket, getOrCreateConfig } from '../lib/tickets.js';
import { db, tickets, ticketCategories } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';

export async function handleModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guild) return;

  const [action, rawId] = interaction.customId.split(':');
  const id = parseInt(rawId ?? '0', 10);
  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const isStaff = await isStaffMember(member);

  try {
    if (action === 'modal_close') {
      const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (!isStaff && ticket.userId !== interaction.user.id) {
        await interaction.reply({ content: 'You do not have permission to close this ticket.', flags: MessageFlags.Ephemeral });
        return;
      }

      const reason = interaction.fields.getTextInputValue('reason') || undefined;
      await interaction.deferUpdate();
      await closeTicket(id, interaction.user.id, guild, reason);
    }

    if (action === 'modal_questions') {
      const cfg = await getOrCreateConfig(config.guildId);
      if (!cfg.ticketingEnabled) {
        await interaction.reply({ content: cfg.ticketingDisabledReason, flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const category = await db.query.ticketCategories.findFirst({
        where: eq(ticketCategories.id, id),
      });
      if (!category) {
        await interaction.editReply({ content: 'Category not found.' });
        return;
      }

      type Question = { id: string; label: string; placeholder?: string; style: 'short' | 'paragraph'; required: boolean };
      const questions = (category.questions ?? []) as Question[];

      const modalAnswers: Record<string, string> = {};
      for (const q of questions) {
        try { modalAnswers[q.id] = interaction.fields.getTextInputValue(q.id); } catch { /* optional */ }
      }

      const firstShort = questions.find((q) => q.style === 'short');
      const subject = firstShort ? modalAnswers[firstShort.id] : undefined;

      const guild = interaction.guild!;
      const member = await guild.members.fetch(interaction.user.id);

      try {
        const { channel } = await createTicket(guild, member, id, subject, modalAnswers);
        await interaction.editReply({ content: `Your ticket has been created: <#${channel.id}>` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not create ticket.';
        await interaction.editReply({ content: msg });
      }
    }
  } catch (err) {
    console.error('[Modal Error]', err);
    const payload = { content: 'An error occurred.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}

import type { StringSelectMenuInteraction } from 'discord.js';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { db, tickets, ticketCategories } from '@gtps/shared';
import { eq, and } from 'drizzle-orm';
import { isStaffMember } from '../lib/permissions.js';
import { createTicket } from '../lib/tickets.js';
import { config } from '../config.js';

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  if (!interaction.guild) return;

  const [action, rawId] = interaction.customId.split(':');
  const id = parseInt(rawId ?? '0', 10);
  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const isStaff = await isStaffMember(member);

  try {
    if (action === 'panel_select') {
      const categoryId = parseInt(interaction.values[0] ?? '0', 10);

      const category = await db.query.ticketCategories.findFirst({
        where: and(eq(ticketCategories.id, categoryId), eq(ticketCategories.isActive, true)),
      });
      if (!category) {
        await interaction.reply({ content: 'Category not found or is inactive.', ephemeral: true });
        return;
      }

      type Question = { id: string; label: string; placeholder?: string; style: 'short' | 'paragraph'; required: boolean };
      const questions = (category.questions ?? []) as Question[];

      if (questions.length > 0) {
        const modal = new ModalBuilder()
          .setCustomId(`modal_questions:${categoryId}`)
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
        const { channel } = await createTicket(guild, member, categoryId);
        await interaction.editReply({ content: `Your ticket has been created: <#${channel.id}>` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not create ticket.';
        await interaction.editReply({ content: msg });
      }
      return;
    }

    if (action === 'ticket_priority') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can change ticket priority.', ephemeral: true });
        return;
      }

      const level = interaction.values[0] as 'low' | 'normal' | 'high' | 'urgent';

      await db
        .update(tickets)
        .set({ priority: level, updatedAt: new Date() })
        .where(eq(tickets.id, id));

      await interaction.reply({ content: `Priority updated to **${level}**.`, ephemeral: true });
    }
  } catch (err) {
    console.error('[SelectMenu Error]', err);
    const payload = { content: 'An error occurred.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}

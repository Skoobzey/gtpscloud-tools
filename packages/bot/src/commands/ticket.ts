import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  MessageFlags,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../client.js';
import { isStaffMember } from '../lib/permissions.js';
import {
  closeTicket,
  reopenTicket,
  deleteTicket,
  claimTicket,
  unclaimTicket,
  holdTicket,
  resumeTicket,
  addParticipant,
  removeParticipant,
  updateOpenEmbed,
} from '../lib/tickets.js';
import { db, tickets, ticketCategories } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';

export const ticketCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close this ticket')
        .addStringOption((o) => o.setName('reason').setDescription('Reason for closing').setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName('reopen').setDescription('Reopen a closed ticket'))
    .addSubcommand((sub) => sub.setName('delete').setDescription('Permanently delete this ticket'))
    .addSubcommand((sub) => sub.setName('claim').setDescription('Claim this ticket as your own'))
    .addSubcommand((sub) => sub.setName('unclaim').setDescription('Release your claim on this ticket'))
    .addSubcommand((sub) => sub.setName('hold').setDescription('Put this ticket on hold'))
    .addSubcommand((sub) => sub.setName('unhold').setDescription('Resume a held ticket'))
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a user to this ticket')
        .addUserOption((o) => o.setName('user').setDescription('User to add').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from this ticket')
        .addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('transfer')
        .setDescription('Transfer the ticket claim to another staff member')
        .addUserOption((o) => o.setName('staff').setDescription('Staff member to transfer to').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('priority')
        .setDescription('Set the priority of this ticket')
        .addStringOption((o) =>
          o
            .setName('level')
            .setDescription('Priority level')
            .setRequired(true)
            .addChoices(
              { name: '🟢 Low', value: 'low' },
              { name: '🔵 Normal', value: 'normal' },
              { name: '🟡 High', value: 'high' },
              { name: '🔴 Urgent', value: 'urgent' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Rename this ticket channel')
        .addStringOption((o) => o.setName('name').setDescription('New channel name').setRequired(true).setMaxLength(50)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const isStaff = await isStaffMember(member);

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.channelId, interaction.channelId),
    });

    const requireTicketChannel = () => {
      if (!ticket) {
        return interaction.reply({ content: 'This command must be used inside a ticket channel.', flags: MessageFlags.Ephemeral });
      }
      return null;
    };

    if (sub === 'close') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff && ticket!.userId !== interaction.user.id) {
        await interaction.reply({ content: 'You do not have permission to close this ticket.', flags: MessageFlags.Ephemeral });
        return;
      }
      const reason = interaction.options.getString('reason') ?? undefined;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await closeTicket(ticket!.id, interaction.user.id, guild, reason);
      await interaction.editReply({ content: 'Ticket closed.' });
      return;
    }

    if (sub === 'reopen') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can reopen tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await reopenTicket(ticket!.id, interaction.user.username, guild);
      await interaction.editReply({ content: 'Ticket reopened.' });
      return;
    }

    if (sub === 'delete') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can delete tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ content: 'Deleting ticket...', flags: MessageFlags.Ephemeral });
      await deleteTicket(ticket!.id, interaction.user.id, guild);
      return;
    }

    if (sub === 'claim') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can claim tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (ticket!.claimedBy) {
        await interaction.reply({ content: `This ticket is already claimed by <@${ticket!.claimedBy}>.`, flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await claimTicket(ticket!.id, interaction.user.id, interaction.user.username, guild);
      await interaction.editReply({ content: 'You have claimed this ticket.' });
      return;
    }

    if (sub === 'unclaim') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can unclaim tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await unclaimTicket(ticket!.id, guild);
      await interaction.editReply({ content: 'Ticket unclaimed.' });
      return;
    }

    if (sub === 'add') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can add users to tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      const user = interaction.options.getUser('user', true);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await addParticipant(ticket!.id, user.id, interaction.user.id, guild);
      await interaction.editReply({ content: `<@${user.id}> has been added to the ticket.` });
      return;
    }

    if (sub === 'hold') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can put tickets on hold.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (ticket!.status === 'pending') {
        await interaction.reply({ content: 'This ticket is already on hold.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await holdTicket(ticket!.id, interaction.user.id, interaction.user.username, guild);
      await interaction.editReply({ content: 'Ticket placed on hold.' });
      return;
    }

    if (sub === 'unhold') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can resume held tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (ticket!.status !== 'pending') {
        await interaction.reply({ content: 'This ticket is not currently on hold.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await resumeTicket(ticket!.id, interaction.user.id, interaction.user.username, guild);
      await interaction.editReply({ content: 'Ticket resumed.' });
      return;
    }

    if (sub === 'remove') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can remove users from tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      const user = interaction.options.getUser('user', true);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await removeParticipant(ticket!.id, user.id, guild);
      await interaction.editReply({ content: `<@${user.id}> has been removed from the ticket.` });
      return;
    }

    if (sub === 'transfer') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can transfer tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      const staff = interaction.options.getUser('staff', true);
      const staffMember = await guild.members.fetch(staff.id);
      const targetIsStaff = await isStaffMember(staffMember);
      if (!targetIsStaff) {
        await interaction.reply({ content: 'That user is not a staff member.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await unclaimTicket(ticket!.id, guild);
      await claimTicket(ticket!.id, staff.id, staff.username, guild);
      await interaction.editReply({ content: `Ticket transferred to <@${staff.id}>.` });
      return;
    }

    if (sub === 'priority') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can change ticket priority.', flags: MessageFlags.Ephemeral });
        return;
      }
      const level = interaction.options.getString('level', true) as 'low' | 'normal' | 'high' | 'urgent';
      await db.update(tickets).set({ priority: level, updatedAt: new Date() }).where(eq(tickets.id, ticket!.id));
      await updateOpenEmbed(ticket!.id, guild);
      await interaction.reply({ content: `Priority set to **${level}**.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'rename') {
      const check = requireTicketChannel();
      if (check) return;
      if (!isStaff) {
        await interaction.reply({ content: 'Only staff can rename tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      const name = interaction.options.getString('name', true).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const channel = interaction.channel as TextChannel;
      await channel.setName(name);
      await interaction.reply({ content: `Channel renamed to **${name}**.`, flags: MessageFlags.Ephemeral });
      return;
    }
  },
};

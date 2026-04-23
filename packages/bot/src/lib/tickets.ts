import {
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import type { Guild, GuildMember } from 'discord.js';
import { db, tickets, ticketCategories, guildConfig, ticketParticipants } from '@gtps/shared';
import { eq, and, count, sql } from 'drizzle-orm';
import { config } from '../config.js';
import {
  ticketOpenEmbed,
  ticketControlRow,
  ticketClosedEmbed,
  ticketReopenedEmbed,
  ticketClaimedEmbed,
  ticketUnclaimedEmbed,
  ticketHeldEmbed,
  ticketResumedEmbed,
  logEmbed,
  reopenDeleteRow,
} from './embeds.js';
import { buildTranscriptUrl } from './transcript-link.js';

export async function getOrCreateConfig(guildId: string) {
  let cfg = await db.query.guildConfig.findFirst({
    where: eq(guildConfig.guildId, guildId),
  });

  if (!cfg) {
    const [inserted] = await db.insert(guildConfig).values({ guildId }).returning();
    cfg = inserted;
  }

  return cfg;
}

export async function createTicket(
  guild: Guild,
  member: GuildMember,
  categoryId: number,
  subject?: string,
  modalAnswers?: Record<string, string>,
) {
  const cfg = await getOrCreateConfig(config.guildId);

  const category = await db.query.ticketCategories.findFirst({
    where: and(eq(ticketCategories.id, categoryId), eq(ticketCategories.isActive, true)),
  });

  if (!category) throw new Error('Category not found or inactive.');

  const [openCount] = await db
    .select({ count: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.guildId, config.guildId),
        eq(tickets.userId, member.id),
        sql`${tickets.status} IN ('open', 'pending')`,
      ),
    );

  if (openCount.count >= cfg.maxOpenTickets) {
    throw new Error(`You already have ${cfg.maxOpenTickets} open ticket(s). Please wait for them to be resolved.`);
  }

  const [{ nextNumber }] = await db
    .select({ nextNumber: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0) + 1` })
    .from(tickets)
    .where(eq(tickets.guildId, config.guildId));

  const categorySlug = category.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const channelName = `ticket-${nextNumber}-${categorySlug}`;

  const parentId = category.categoryChannelId ?? undefined;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      ...category.staffRoleIds.map((roleId) => ({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages,
        ],
      })),
      ...cfg.staffRoleIds
        .filter((id) => !category.staffRoleIds.includes(id))
        .map((roleId) => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ManageMessages,
          ],
        })),
    ],
  });

  const [ticket] = await db
    .insert(tickets)
    .values({
      guildId: config.guildId,
      channelId: channel.id,
      userId: member.id,
      categoryId: category.id,
      subject: subject ?? null,
      ticketNumber: nextNumber,
      modalAnswers: modalAnswers ?? {},
    })
    .returning();

  const embed = ticketOpenEmbed(ticket, category, member.user.username);
  const controlRow = ticketControlRow(ticket.id, ticket.claimedBy, ticket.status);

  const openMsg = await channel.send({
    content: `<@${member.id}> ${category.staffRoleIds.map((id) => `<@&${id}>`).join(' ')}`,
    embeds: [embed],
    components: [controlRow],
  });

  await db.update(tickets).set({ openMessageId: openMsg.id }).where(eq(tickets.id, ticket.id));

  await sendLog(guild, cfg.logChannelId, 'Ticket Opened', `<@${member.id}> opened **#${channelName}**`, config.brand.color, [
    { name: 'Category', value: category.name, inline: true },
    { name: 'Channel', value: `<#${channel.id}>`, inline: true },
    { name: 'Ticket #', value: String(ticket.ticketNumber), inline: true },
  ]);

  return { ticket, channel };
}

export async function updateOpenEmbed(ticketId: number, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket?.openMessageId) return;

  const category = ticket.categoryId
    ? await db.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, ticket.categoryId) })
    : null;
  if (!category) return;

  const participants = await db.query.ticketParticipants.findMany({
    where: eq(ticketParticipants.ticketId, ticketId),
  });
  const participantIds = participants.map((p) => p.userId).filter((id) => id !== ticket.userId);

  let claimedByUsername: string | undefined;
  if (ticket.claimedBy) {
    try {
      const m = await guild.members.fetch(ticket.claimedBy);
      claimedByUsername = m.user.username;
    } catch { /* ignore */ }
  }

  const opener = await guild.members.fetch(ticket.userId).catch(() => null);
  const username = opener?.user.username ?? ticket.userId;

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (!channel) return;

  try {
    const msg = await channel.messages.fetch(ticket.openMessageId);
    const embed = ticketOpenEmbed(ticket, category, username, { claimedByUsername, participantIds });
    const controlRow = ticketControlRow(ticketId, ticket.claimedBy, ticket.status);
    await msg.edit({ embeds: [embed], components: [controlRow] });
  } catch { /* message may have been deleted */ }
}

export async function closeTicket(
  ticketId: number,
  closedBy: string,
  guild: Guild,
  reason?: string,
) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || ticket.status === 'closed' || ticket.status === 'deleted') return null;

  const category = ticket.categoryId
    ? await db.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, ticket.categoryId) })
    : null;

  const [updated] = await db
    .update(tickets)
    .set({ status: 'closed', closedAt: new Date(), closedBy, closeReason: reason ?? null, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (!channel) return updated;

  await channel.permissionOverwrites.edit(ticket.userId, {
    SendMessages: false,
  });

  if (ticket.openMessageId) {
    try {
      const openMsg = await channel.messages.fetch(ticket.openMessageId);
      await openMsg.edit({ components: [] });
    } catch { /* ignore */ }
  }

  const closedEmbed = ticketClosedEmbed(updated, closedBy);
  const actionRow = reopenDeleteRow(ticketId);

  await channel.send({ embeds: [closedEmbed], components: [actionRow] });

  const cfg = await getOrCreateConfig(config.guildId);
  await sendLog(guild, cfg.logChannelId, 'Ticket Closed', `Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** was closed by <@${closedBy}>`, config.brand.colorDanger, [
    { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true },
    ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : []),
  ]);

  if (cfg.transcriptChannelId) {
    const transcriptChannel = guild.channels.cache.get(cfg.transcriptChannelId) as TextChannel | undefined;
    if (transcriptChannel) {
      const transcriptUrl = buildTranscriptUrl(ticket.id);
      await transcriptChannel.send({
        embeds: [
          logEmbed(
            'Transcript Saved',
            `Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** — <@${ticket.userId}>`,
            config.brand.colorInfo,
            [
              ...(category ? [{ name: 'Category', value: category.name, inline: true }] : []),
              { name: 'Transcript', value: `[View Transcript](${transcriptUrl})`, inline: false },
            ],
          ),
        ],
      });
    }
  }

  return updated;
}

export async function reopenTicket(ticketId: number, reopenedBy: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || ticket.status !== 'closed') return null;

  const [updated] = await db
    .update(tickets)
    .set({ status: 'open', closedAt: null, closedBy: null, closeReason: null, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (!channel) return updated;

  await channel.permissionOverwrites.edit(ticket.userId, {
    SendMessages: true,
    ViewChannel: true,
  });

  if (ticket.openMessageId) {
    try {
      const openMsg = await channel.messages.fetch(ticket.openMessageId);
      await openMsg.edit({ components: [ticketControlRow(ticketId, null)] });
    } catch { /* ignore */ }
  }

  await channel.send({ embeds: [ticketReopenedEmbed(reopenedBy)], components: [ticketControlRow(ticketId, ticket.claimedBy, 'open')] });

  const cfg = await getOrCreateConfig(config.guildId);
  await sendLog(guild, cfg.logChannelId, 'Ticket Reopened', `Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** was reopened by <@${reopenedBy}>`, config.brand.color, [
    { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true },
  ]);

  return updated;
}

export async function deleteTicket(ticketId: number, deletedBy: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || ticket.status === 'deleted') return;

  const cfg = await getOrCreateConfig(config.guildId);

  await db.update(tickets).set({ status: 'deleted', updatedAt: new Date() }).where(eq(tickets.id, ticketId));

  const channel = guild.channels.cache.get(ticket.channelId);
  if (channel) await channel.delete(`Ticket deleted by ${deletedBy}`);

  await sendLog(guild, cfg.logChannelId, 'Ticket Deleted', `Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** was permanently deleted by <@${deletedBy}>`, config.brand.colorDanger);
}

export async function claimTicket(ticketId: number, staffId: string, staffUsername: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || (ticket.status !== 'open' && ticket.status !== 'pending')) return null;

  const [updated] = await db
    .update(tickets)
    .set({ claimedBy: staffId, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (channel) {
    await channel.setTopic(`Claimed by ${staffUsername}`);
    await channel.send({ embeds: [ticketClaimedEmbed(staffUsername)] });
  }

  await updateOpenEmbed(ticketId, guild);

  return updated;
}

export async function holdTicket(ticketId: number, staffId: string, staffUsername: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || ticket.status !== 'open') return null;

  const [updated] = await db
    .update(tickets)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (channel) {
    await channel.send({ embeds: [ticketHeldEmbed(staffUsername)] });
  }

  await updateOpenEmbed(ticketId, guild);

  const cfg = await getOrCreateConfig(config.guildId);
  await sendLog(
    guild,
    cfg.logChannelId,
    'Ticket Put On Hold',
    `Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** was put on hold by <@${staffId}>`,
    config.brand.colorMuted,
    [{ name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }],
  );

  return updated;
}

export async function resumeTicket(ticketId: number, staffId: string, staffUsername: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || ticket.status !== 'pending') return null;

  const [updated] = await db
    .update(tickets)
    .set({ status: 'open', updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (channel) {
    await channel.send({ embeds: [ticketResumedEmbed(staffUsername)] });
  }

  await updateOpenEmbed(ticketId, guild);

  const cfg = await getOrCreateConfig(config.guildId);
  await sendLog(
    guild,
    cfg.logChannelId,
    'Ticket Resumed',
    `Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** was resumed by <@${staffId}>`,
    config.brand.color,
    [{ name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }],
  );

  return updated;
}

export async function unclaimTicket(ticketId: number, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket) return null;

  const [updated] = await db
    .update(tickets)
    .set({ claimedBy: null, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (channel) {
    await channel.setTopic('');
    await channel.send({ embeds: [ticketUnclaimedEmbed()] });
  }

  await updateOpenEmbed(ticketId, guild);

  return updated;
}

export async function addParticipant(ticketId: number, userId: string, addedBy: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket) return;

  await db
    .insert(ticketParticipants)
    .values({ ticketId, userId, addedBy })
    .onConflictDoNothing();

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (channel) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });
  }

  await updateOpenEmbed(ticketId, guild);
}

export async function removeParticipant(ticketId: number, userId: string, guild: Guild) {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket) return;

  await db
    .delete(ticketParticipants)
    .where(and(eq(ticketParticipants.ticketId, ticketId), eq(ticketParticipants.userId, userId)));

  const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (channel) {
    await channel.permissionOverwrites.delete(userId);
  }

  await updateOpenEmbed(ticketId, guild);
}

async function sendLog(
  guild: Guild,
  logChannelId: string | null | undefined,
  title: string,
  description: string,
  color: number,
  fields?: Array<{ name: string; value: string; inline?: boolean }>,
) {
  if (!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
  if (!channel) return;
  await channel.send({ embeds: [logEmbed(title, description, color, fields)] });
}

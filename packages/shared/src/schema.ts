import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'pending', 'closed', 'deleted']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'normal', 'high', 'urgent']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  discordId: text('discord_id').unique(),
  isStaff: boolean('is_staff').notNull().default(false),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const guildConfig = pgTable('guild_config', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  logChannelId: text('log_channel_id'),
  transcriptChannelId: text('transcript_channel_id'),
  staffRoleIds: text('staff_role_ids').array().notNull().default([]),
  autoCloseHours: integer('auto_close_hours').notNull().default(48),
  maxOpenTickets: integer('max_open_tickets').notNull().default(3),
  panelChannelId: text('panel_channel_id'),
  panelMessageId: text('panel_message_id'),
  panelMessage: text('panel_message').notNull().default('Select a category below and click the button to open a ticket.'),
  panelTitle: text('panel_title').notNull().default('GTPS Cloud Support'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const ticketCategories = pgTable('ticket_categories', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  emoji: text('emoji').notNull().default('🎫'),
  categoryChannelId: text('category_channel_id'),
  staffRoleIds: text('staff_role_ids').array().notNull().default([]),
  color: integer('color').notNull().default(0x22c55e),
  welcomeMessage: text('welcome_message')
    .notNull()
    .default('Thank you for opening a ticket. A staff member will be with you shortly.'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  questions: jsonb('questions')
    .$type<Array<{ id: string; label: string; placeholder?: string; style: 'short' | 'paragraph'; required: boolean }>>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull().unique(),
  userId: text('user_id').notNull(),
  categoryId: integer('category_id').references(() => ticketCategories.id),
  subject: text('subject'),
  status: ticketStatusEnum('status').notNull().default('open'),
  priority: ticketPriorityEnum('priority').notNull().default('normal'),
  claimedBy: text('claimed_by'),
  ticketNumber: integer('ticket_number').notNull(),
  openMessageId: text('open_message_id'),
  modalAnswers: jsonb('modal_answers')
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  closedAt: timestamp('closed_at'),
  closedBy: text('closed_by'),
  closeReason: text('close_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull(),
  authorId: text('author_id').notNull(),
  authorUsername: text('author_username').notNull(),
  authorAvatar: text('author_avatar'),
  content: text('content').notNull().default(''),
  attachments: jsonb('attachments')
    .$type<Array<{ url: string; name: string; size: number }>>()
    .notNull()
    .default([]),
  embeds: jsonb('embeds')
    .$type<Array<Record<string, unknown>>>()
    .notNull()
    .default([]),
  isStaff: boolean('is_staff').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ticketParticipants = pgTable(
  'ticket_participants',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    addedBy: text('added_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.ticketId, t.userId)],
);

export const ticketRatings = pgTable('ticket_ratings', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' })
    .unique(),
  userId: text('user_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ticketCategoriesRelations = relations(ticketCategories, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  category: one(ticketCategories, {
    fields: [tickets.categoryId],
    references: [ticketCategories.id],
  }),
  messages: many(ticketMessages),
  participants: many(ticketParticipants),
  rating: one(ticketRatings, {
    fields: [tickets.id],
    references: [ticketRatings.ticketId],
  }),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
}));

export const ticketParticipantsRelations = relations(ticketParticipants, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketParticipants.ticketId],
    references: [tickets.id],
  }),
}));

export const ticketRatingsRelations = relations(ticketRatings, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketRatings.ticketId],
    references: [tickets.id],
  }),
}));

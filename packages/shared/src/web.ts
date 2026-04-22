export * from './schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  users, sessions, accounts, guildConfig, ticketCategories,
  tickets, ticketMessages, ticketParticipants, ticketRatings,
} from './schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type Account = InferSelectModel<typeof accounts>;
export type GuildConfig = InferSelectModel<typeof guildConfig>;
export type NewGuildConfig = InferInsertModel<typeof guildConfig>;
export type TicketCategory = InferSelectModel<typeof ticketCategories>;
export type NewTicketCategory = InferInsertModel<typeof ticketCategories>;
export type Ticket = InferSelectModel<typeof tickets>;
export type NewTicket = InferInsertModel<typeof tickets>;
export type TicketMessage = InferSelectModel<typeof ticketMessages>;
export type NewTicketMessage = InferInsertModel<typeof ticketMessages>;
export type TicketParticipant = InferSelectModel<typeof ticketParticipants>;
export type TicketRating = InferSelectModel<typeof ticketRatings>;

export type TicketStatus = 'open' | 'pending' | 'closed' | 'deleted';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketQuestion = {
  id: string;
  label: string;
  placeholder?: string;
  style: 'short' | 'paragraph';
  required: boolean;
};

export type TicketWithCategory = Ticket & {
  category: TicketCategory | null;
};

export type TicketWithDetails = TicketWithCategory & {
  messages: TicketMessage[];
  participants: TicketParticipant[];
  rating: TicketRating | null;
};

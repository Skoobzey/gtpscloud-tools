import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';

export interface Command {
  data: { name: string; toJSON(): object };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

export const commands = new Collection<string, Command>();

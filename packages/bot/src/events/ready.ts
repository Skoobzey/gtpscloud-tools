import type { Client } from 'discord.js';
import { startAutoCloseScheduler } from '../lib/autoclose.js';

export async function ready(this: Client) {
  startAutoCloseScheduler(this);
}

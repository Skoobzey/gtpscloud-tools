import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

export const config = {
  token: process.env.DISCORD_TOKEN!,
  clientId: process.env.DISCORD_CLIENT_ID!,
  guildId: process.env.GUILD_ID ?? '1347199940920606730',
  webBaseUrl: (process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  brand: {
    name: 'GTPS Cloud',
    color: 0x22c55e,
    colorDanger: 0xef4444,
    colorWarning: 0xf59e0b,
    colorInfo: 0x3b82f6,
    colorMuted: 0x374151,
  },
} as const;

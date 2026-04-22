import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { users, sessions, accounts, verifications } from '@gtps/shared';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      isStaff: { type: 'boolean', defaultValue: false, input: false },
      isAdmin: { type: 'boolean', defaultValue: false, input: false },
      discordId: { type: 'string', input: false },
    },
  },
});

export type Auth = typeof auth;

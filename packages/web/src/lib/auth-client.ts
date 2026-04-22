'use client';

import { createAuthClient } from 'better-auth/react';

const _client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
});

export type AuthClient = typeof _client;

export const authClient: AuthClient = _client;
export const { signIn, signOut, useSession } = _client;

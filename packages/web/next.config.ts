import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;

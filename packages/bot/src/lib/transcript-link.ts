import { createHmac } from 'node:crypto';
import { config } from '../config.js';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

export function buildTranscriptUrl(ticketId: number, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const base = `${config.webBaseUrl}/api/transcripts/${ticketId}`;
  const secret = process.env.TRANSCRIPT_LINK_SECRET;
  if (!secret) return base;

  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${ticketId}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');

  return `${base}?exp=${exp}&sig=${sig}`;
}

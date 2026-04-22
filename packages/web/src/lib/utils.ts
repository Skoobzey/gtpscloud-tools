import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return inputs
    .filter(Boolean)
    .map((c) => (typeof c === 'string' ? c : Object.entries(c as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k).join(' ')))
    .join(' ');
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(date: Date | string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const priorityColors: Record<string, string> = {
  low: 'text-green-400 bg-green-400/10',
  normal: 'text-blue-400 bg-blue-400/10',
  high: 'text-yellow-400 bg-yellow-400/10',
  urgent: 'text-red-400 bg-red-400/10',
};

export const statusColors: Record<string, string> = {
  open: 'text-green-400 bg-green-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  closed: 'text-zinc-400 bg-zinc-400/10',
  deleted: 'text-red-400 bg-red-400/10',
};

import { cn, priorityColors, statusColors } from '@/lib/utils';

interface BadgeProps {
  variant?: 'status' | 'priority' | 'default';
  value: string;
  className?: string;
}

export function Badge({ variant = 'default', value, className }: BadgeProps) {
  let colorClass = 'text-zinc-400 bg-zinc-400/10';

  if (variant === 'status') colorClass = statusColors[value] ?? colorClass;
  if (variant === 'priority') colorClass = priorityColors[value] ?? colorClass;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize',
        colorClass,
        className,
      )}
    >
      {value}
    </span>
  );
}

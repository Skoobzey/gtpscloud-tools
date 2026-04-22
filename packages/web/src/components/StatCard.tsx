import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-[#111111] border border-[#27272a] rounded-xl p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#71717a] font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
          {description && <p className="text-xs text-[#52525b] mt-1">{description}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-[#22c55e]' : 'text-red-400')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#71717a] flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

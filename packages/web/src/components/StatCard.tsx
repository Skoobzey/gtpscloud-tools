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
    <div className={cn('dash-surface stat-card rounded-2xl p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#93afa3] font-medium mb-1">{title}</p>
          <p className="text-[28px] dash-title text-[#e9fff5] tabular-nums leading-none">{value}</p>
          {description && <p className="text-xs text-[#719183] mt-1">{description}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-[#22c55e]' : 'text-red-400')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-[#102119] border border-[#244338] flex items-center justify-center text-[#83c4a8] flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

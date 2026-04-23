'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';

const COLORS = ['#34d399', '#10b981', '#84cc16', '#f59e0b'];

type CategoryData = { name: string; tickets: number };
type StatusData = { name: string; value: number };

function formatCategoryLabel(label: string, max = 18) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[132px] rounded-lg border border-[#274137] bg-[#0f1a15]/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label && <p className="text-xs text-[#8ea79d] mb-1">{label}</p>}
      {payload.map((item, idx) => (
        <div key={`${item.name ?? 'value'}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[#b7d6c8]">{item.name}</span>
          <span className="font-semibold text-[#e8fff5] tabular-nums">{item.value ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

function PieLegend({ payload }: { payload?: Array<{ color?: string; value?: string; payload?: { value?: number } }> }) {
  if (!payload || payload.length === 0) return null;

  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {payload.map((entry, idx) => (
        <li key={`${entry.value ?? 'status'}-${idx}`} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color ?? '#34d399' }} />
            <span className="text-[#a9c5b8] truncate">{entry.value}</span>
          </span>
          <span className="text-[#e8fff5] font-medium tabular-nums">{entry.payload?.value ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsCharts({
  categoryData,
  statusData,
}: {
  categoryData: CategoryData[];
  statusData: StatusData[];
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="dash-surface rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e8fff5] mb-3">Tickets by Category</h2>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} margin={{ top: 6, right: 6, bottom: 0, left: -12 }} barCategoryGap={18}>
              <CartesianGrid stroke="#1f312b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickFormatter={(value: string) => formatCategoryLabel(value)}
                tick={{ fill: '#86a196', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#86a196', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'rgba(52, 211, 153, 0.07)' }}
              />
              <Bar dataKey="tickets" name="Tickets" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#7a998b] text-sm text-center py-10">No data yet.</p>
        )}
      </div>

      <div className="dash-surface rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e8fff5] mb-3">Status Distribution</h2>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={2}
                stroke="#0f1a15"
                strokeWidth={2}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend content={<PieLegend />} verticalAlign="bottom" />
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#7a998b] text-sm text-center py-10">No data yet.</p>
        )}
      </div>
    </div>
  );
}

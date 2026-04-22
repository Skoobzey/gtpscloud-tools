'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

type CategoryData = { name: string; tickets: number };
type StatusData = { name: string; value: number };

export function AnalyticsCharts({
  categoryData,
  statusData,
}: {
  categoryData: CategoryData[];
  statusData: StatusData[];
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-[#111111] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-6">Tickets by Category</h2>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#f4f4f5' }}
                cursor={{ fill: '#22c55e11' }}
              />
              <Bar dataKey="tickets" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#52525b] text-sm text-center py-10">No data yet.</p>
        )}
      </div>

      <div className="bg-[#111111] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-6">Status Distribution</h2>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 13 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#f4f4f5' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#52525b] text-sm text-center py-10">No data yet.</p>
        )}
      </div>
    </div>
  );
}

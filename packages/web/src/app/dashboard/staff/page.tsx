import { db } from '@/lib/db';
import { users } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { Badge } from '@/components/Badge';
import { formatDate } from '@/lib/utils';

export default async function StaffPage() {
  const staffUsers = await db.query.users.findMany({
    where: eq(users.isStaff, true),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Staff</h1>
        <p className="text-[#71717a] text-sm mt-1">{staffUsers.length} staff members with dashboard access</p>
      </div>

      <div className="border border-[#27272a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#111111]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Discord ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody>
            {staffUsers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[#52525b]">No staff have logged in yet.</td></tr>
            ) : (
              staffUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#27272a] last:border-0 bg-[#0a0a0a] hover:bg-[#111111] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-xs font-semibold">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#71717a]">{user.discordId ?? '—'}</td>
                  <td className="px-4 py-3">
                    {user.isAdmin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-purple-400 bg-purple-400/10">Admin</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-blue-400 bg-blue-400/10">Staff</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#71717a]">{formatDate(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import {
  LayoutDashboard,
  Ticket,
  Settings,
  BarChart2,
  Users,
  Tag,
  Layout,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/categories', label: 'Categories', icon: Tag },
  { href: '/dashboard/panel', label: 'Panel', icon: Layout },
  { href: '/dashboard/staff', label: 'Staff', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#27272a]">
        <div className="w-8 h-8 rounded-lg bg-[#22c55e] flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">GTPS Cloud</p>
          <p className="text-xs text-[#71717a]">Tools Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#22c55e]/10 text-[#22c55e]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]',
              )}
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="border-t border-[#27272a] p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-[#71717a] truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/'; } } })}
              className="text-[#71717a] hover:text-white transition-colors p-1"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#111111] border border-[#27272a] rounded-lg text-[#a1a1aa]"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-[#111111] border-r border-[#27272a] z-40 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}

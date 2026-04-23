'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import {
  LayoutDashboard,
  Ticket,
  Settings,
  BarChart2,
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
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1f312b]">
        <img src="/logos/logo.png" alt="GTPS Cloud" className="w-8 h-8 rounded-lg object-cover border border-[#2f4c41] shadow-[0_0_22px_rgba(52,211,153,0.2)] flex-shrink-0" />
        <div>
          <p className="text-[15px] leading-tight dash-title dash-glow text-[#dcfff1]">GTPS Cloud</p>
          <p className="text-xs text-[#88a89b]">Operational Tools Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border',
                isActive
                  ? 'bg-[#34d399]/12 text-[#72f0c1] border-[#2c5a4a] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.18)]'
                  : 'text-[#9ab5aa] border-transparent hover:text-[#dcfff1] hover:bg-[#101a16] hover:border-[#233b33]',
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="border-t border-[#1f312b] p-2.5">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl dash-surface">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#1a2b24] border border-[#29453a] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#dcfff1] truncate">{session.user.name}</p>
            </div>
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/'; } } })}
              className="text-[#7e9a8f] hover:text-[#dcfff1] transition-colors p-1"
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 dash-surface rounded-xl text-[#9ab5aa]"
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
          'fixed left-0 top-0 h-full w-64 bg-[#0b1310]/95 border-r border-[#1f312b] z-40 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}

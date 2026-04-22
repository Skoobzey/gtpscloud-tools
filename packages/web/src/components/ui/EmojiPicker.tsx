'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Support',
    emojis: ['🎫','🎟','📋','📝','📌','📎','🔖','📣','📢','💬','💭','🗒','🗂','📁','🗃','🗄','📊','📈','📉','🖊','✏','🖋'],
  },
  {
    label: 'Status',
    emojis: ['✅','❌','⚠','🚨','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔇','🔔','🔕','📵','🚫','⛔','💡','🔦','🕯'],
  },
  {
    label: 'People',
    emojis: ['👤','👥','🧑','👨','👩','🧑‍💻','👨‍💻','👩‍💻','🧑‍🔧','🧑‍⚕','🧑‍🎓','🦸','🦹','🧙','🧑‍🤝‍🧑','🤝','🙋','🙋‍♂','🙋‍♀','🤗','🫡','💪','🙏'],
  },
  {
    label: 'Objects',
    emojis: ['🔧','🔨','⚙','🛠','🔑','🗝','🔒','🔓','💻','🖥','📱','⌨','🖱','📡','🛡','⚡','🔋','💾','💿','📀','🏷','🎨'],
  },
  {
    label: 'Symbols',
    emojis: ['❓','❗','ℹ','🆕','🆓','🆒','🔺','🔻','➡','⬆','🔄','♻','💠','🔷','🔶','🔹','🔸','▶','⏩','🏁','🚀','⭐'],
  },
  {
    label: 'Money',
    emojis: ['💰','💵','💴','💶','💷','💳','🏦','💱','🛒','🏪','🤑','💹','📦','🎁','🛍','🏷','💎','🥇','🥈','🥉','🏅','🎖'],
  },
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allEmojis = EMOJI_GROUPS.flatMap((g) => g.emojis);
  const filtered = search
    ? allEmojis.filter((e) => e.includes(search))
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm hover:border-[#3f3f46] focus:outline-none focus:border-[#22c55e] transition-colors"
      >
        <span className="text-xl leading-none">{value || '🎫'}</span>
        <span className="text-[#71717a] text-xs">Click to change emoji</span>
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl w-72 p-3 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <input
              type="text"
              placeholder="Search emojis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {filtered ? (
              <div className="flex flex-wrap gap-1">
                {filtered.map((e, i) => (
                  <button key={i} type="button" onClick={() => { onChange(e); setOpen(false); }}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-[#27272a] transition-colors">
                    {e}
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-xs text-[#52525b] px-1">No results</p>}
              </div>
            ) : (
              EMOJI_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider mb-1 px-1">{group.label}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {group.emojis.map((e, i) => (
                      <button key={i} type="button" onClick={() => { onChange(e); setOpen(false); }}
                        className={`w-7 h-7 flex items-center justify-center text-base rounded hover:bg-[#27272a] transition-colors ${value === e ? 'bg-[#22c55e20]' : ''}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

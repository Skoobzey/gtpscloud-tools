'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type SelectOption = { value: string; label: string; prefix?: string };

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ options, value, onChange, placeholder = 'Select...', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-left hover:border-[#3f3f46] focus:outline-none focus:border-[#22c55e] transition-colors"
      >
        <span className={selected ? 'text-white' : 'text-[#52525b]'}>
          {selected ? `${selected.prefix ?? ''}${selected.label}` : placeholder}
        </span>
        <ChevronDown size={14} className={`text-[#71717a] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#52525b] hover:bg-[#27272a] transition-colors text-left"
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#27272a] transition-colors text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {value === opt.value && <Check size={12} className="text-[#22c55e]" strokeWidth={3} />}
              </span>
              <span className="text-white">{opt.prefix ?? ''}{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        className="w-full flex items-center justify-between gap-2 bg-[#0f1a15] border border-[#274137] rounded-xl px-3 py-2 text-sm text-left text-[#d9f5e8] hover:border-[#3f6758] focus:outline-none focus:border-[#4ade80] focus:ring-2 focus:ring-[#34d399]/20 transition-colors"
      >
        <span className={selected ? 'text-[#e8fff5]' : 'text-[#7a998b]'}>
          {selected ? `${selected.prefix ?? ''}${selected.label}` : placeholder}
        </span>
        <ChevronDown size={14} className={`text-[#80a997] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1.5 w-full bg-[#101b16] border border-[#274137] rounded-xl shadow-[0_18px_40px_rgba(0,0,0,0.45)] max-h-56 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#7a998b] hover:bg-[#182821] transition-colors text-left rounded-lg"
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-[#182821] transition-colors text-left rounded-lg"
            >
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {value === opt.value && <Check size={12} className="text-[#4ade80]" strokeWidth={3} />}
              </span>
              <span className="text-[#d9f5e8]">{opt.prefix ?? ''}{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

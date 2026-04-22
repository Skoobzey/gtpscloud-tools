'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── colour math ──────────────────────────────────────────────────────────────

function hsvToRgb(h: number, s: number, v: number) {
  s /= 100; v /= 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, v: v * 100 };
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const n = parseInt(clean, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

function hueToHex(h: number) {
  const { r, g, b } = hsvToRgb(h, 100, 100);
  return rgbToHex(r, g, b);
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value.replace('#', ''));

  // Local HSV — source of truth during drags. Only updated from external
  // value when NOT dragging, to avoid the rgb→hsv round-trip clobbering hue.
  const initHsv = () => {
    const rgb = hexToRgb(value) ?? { r: 34, g: 197, b: 94 };
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  };
  const [hsv, setHsv] = useState(initHsv);

  // Refs for drag handlers (closures capture stale state otherwise)
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  // 'sv' | 'hue' | null — mutex so only one drag fires at a time
  const draggingRef = useRef<'sv' | 'hue' | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Sync hex input when value changes externally (not from our own onChange)
  const lastEmitted = useRef('');
  useEffect(() => {
    if (value === lastEmitted.current) return; // our own emit, skip
    setHexInput(value.replace('#', ''));
    if (draggingRef.current === null) {
      const rgb = hexToRgb(value);
      if (rgb) setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  }, [value]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── emit helper ─────────────────────────────────────────────────────────────

  const emitHsv = useCallback((h: number, s: number, v: number) => {
    const c = hsvToRgb(h, s, v);
    const hex = rgbToHex(c.r, c.g, c.b);
    lastEmitted.current = hex;
    setHexInput(hex.replace('#', ''));
    onChange(hex);
  }, [onChange]);

  // ── SV box drag ─────────────────────────────────────────────────────────────

  const startSvDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (draggingRef.current !== null) return; // another drag in progress
    draggingRef.current = 'sv';

    const move = (ev: MouseEvent) => {
      if (draggingRef.current !== 'sv') return;
      const rect = svRef.current!.getBoundingClientRect();
      const s = clamp01((ev.clientX - rect.left) / rect.width) * 100;
      const v = (1 - clamp01((ev.clientY - rect.top) / rect.height)) * 100;
      const next = { ...hsvRef.current, s, v };
      hsvRef.current = next;
      setHsv(next);
      emitHsv(next.h, next.s, next.v);
    };

    const up = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    move(e.nativeEvent as MouseEvent);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // ── Hue bar drag ────────────────────────────────────────────────────────────

  const startHueDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (draggingRef.current !== null) return;
    draggingRef.current = 'hue';

    const move = (ev: MouseEvent) => {
      if (draggingRef.current !== 'hue') return;
      const rect = hueRef.current!.getBoundingClientRect();
      const h = clamp01((ev.clientX - rect.left) / rect.width) * 360;
      const next = { ...hsvRef.current, h };
      hsvRef.current = next;
      setHsv(next);
      emitHsv(next.h, next.s, next.v);
    };

    const up = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    move(e.nativeEvent as MouseEvent);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // ── Hex / RGB inputs ────────────────────────────────────────────────────────

  const handleHexCommit = (raw: string) => {
    setHexInput(raw);
    const full = '#' + raw;
    if (raw.length === 6 && hexToRgb(full)) {
      const rgb = hexToRgb(full)!;
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHsv(newHsv);
      lastEmitted.current = full;
      onChange(full);
    }
  };

  const handleRgbChannel = (ch: 'r' | 'g' | 'b', num: number) => {
    const rgb = hexToRgb(value) ?? { r: 34, g: 197, b: 94 };
    const next = { ...rgb, [ch]: Math.max(0, Math.min(255, Math.round(num))) };
    const hex = rgbToHex(next.r, next.g, next.b);
    const newHsv = rgbToHsv(next.r, next.g, next.b);
    setHsv(newHsv);
    setHexInput(hex.replace('#', ''));
    lastEmitted.current = hex;
    onChange(hex);
  };

  // ── derived display values ───────────────────────────────────────────────────

  const rgb = hexToRgb(value) ?? { r: 34, g: 197, b: 94 };
  const pureHex = hueToHex(hsv.h);
  const svLeft  = `${hsv.s}%`;
  const svTop   = `${100 - hsv.v}%`;
  const hueLeft = `${(hsv.h / 360) * 100}%`;

  return (
    <div className="relative inline-block" ref={popoverRef}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 h-9 px-3 bg-[#0a0a0a] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors focus:outline-none focus:border-[#22c55e]"
      >
        <span className="w-5 h-5 rounded-md border border-[#3f3f46] flex-shrink-0" style={{ background: value }} />
        <span className="text-sm text-white font-mono">{value.toUpperCase()}</span>
      </button>

      {/* ── Popover ── */}
      {open && (
        <div
          className="absolute z-20 top-full mt-2 left-0 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl p-3 space-y-3"
          style={{ width: 232, userSelect: 'none' }}
        >
          {/* SV box */}
          <div
            ref={svRef}
            className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
            style={{ height: 160, background: pureHex }}
            onMouseDown={startSvDrag}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right,#fff,transparent)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,transparent,#000)' }} />
            {/* thumb */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: svLeft, top: svTop, transform: 'translate(-50%,-50%)', background: value }}
            />
          </div>

          {/* Hue bar */}
          <div
            ref={hueRef}
            className="relative w-full rounded-full cursor-pointer"
            style={{ height: 14, background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
            onMouseDown={startHueDrag}
          >
            <div
              className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: hueLeft, transform: 'translate(-50%,-50%)', background: pureHex }}
            />
          </div>

          {/* Hex */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#52525b] font-mono">#</span>
            <input
              type="text"
              value={hexInput.toUpperCase()}
              onChange={(e) => handleHexCommit(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
              className="flex-1 bg-[#0a0a0a] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          {/* RGB */}
          <div className="grid grid-cols-3 gap-1.5">
            {(['r', 'g', 'b'] as const).map((ch) => (
              <div key={ch} className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[ch]}
                  onChange={(e) => handleRgbChannel(ch, Number(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-[#27272a] rounded px-1.5 py-1 text-xs text-white text-center focus:outline-none focus:border-[#3f3f46] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-[#52525b] uppercase font-medium">{ch}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
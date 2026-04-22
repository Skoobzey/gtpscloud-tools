'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { NumberInput } from '@/components/ui/NumberInput';
import { CustomSelect } from '@/components/ui/CustomSelect';

type GuildRole = { id: string; name: string; color: number };
type GuildChannel = { id: string; name: string };

type Config = {
  staffRoleIds: string[];
  logChannelId: string | null;
  transcriptChannelId: string | null;
  autoCloseHours: number;
  maxOpenTickets: number;
};

function roleColor(color: number) {
  if (!color) return '#71717a';
  return '#' + color.toString(16).padStart(6, '0');
}

function RolePicker({ roles, selected, onChange }: { roles: GuildRole[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const selectedRoles = roles.filter((r) => selected.includes(r.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="relative">
      <div
        className="min-h-[38px] w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-pointer focus-within:border-[#22c55e] transition-colors"
        onClick={() => setOpen(!open)}
      >
        {selectedRoles.length === 0 && <span className="text-sm text-[#52525b]">Select roles...</span>}
        {selectedRoles.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: roleColor(r.color) + '22', color: roleColor(r.color) }}>
            {r.name}
            <button onClick={(e) => { e.stopPropagation(); toggle(r.id); }} className="opacity-60 hover:opacity-100"><X size={10} /></button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-10 top-full mt-1 w-full bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {roles.length === 0 && <p className="px-3 py-2 text-sm text-[#52525b]">No roles found</p>}
          {roles.map((r) => (
            <button key={r.id} onClick={() => toggle(r.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#27272a] transition-colors text-left">
              <span className="w-4 h-4 rounded border border-[#3f3f46] flex items-center justify-center flex-shrink-0"
                style={selected.includes(r.id) ? { background: roleColor(r.color), borderColor: roleColor(r.color) } : {}}>
                {selected.includes(r.id) && <Check size={10} color="#000" strokeWidth={3} />}
              </span>
              <span className="font-medium" style={{ color: roleColor(r.color) }}>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [staffRoleIds, setStaffRoleIds] = useState<string[]>([]);
  const [logChannelId, setLogChannelId] = useState('');
  const [transcriptChannelId, setTranscriptChannelId] = useState('');
  const [autoCloseHours, setAutoCloseHours] = useState('48');
  const [maxOpenTickets, setMaxOpenTickets] = useState('3');

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/discord/guild').then((r) => r.json()),
    ]).then(([configData, guildData]) => {
      setRoles(guildData.roles ?? []);
      setChannels(guildData.channels ?? []);
      if (configData.config) {
        const c: Config = configData.config;
        setStaffRoleIds(c.staffRoleIds ?? []);
        setLogChannelId(c.logChannelId ?? '');
        setTranscriptChannelId(c.transcriptChannelId ?? '');
        setAutoCloseHours(String(c.autoCloseHours));
        setMaxOpenTickets(String(c.maxOpenTickets));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffRoleIds,
          logChannelId: logChannelId || null,
          transcriptChannelId: transcriptChannelId || null,
          autoCloseHours: parseInt(autoCloseHours, 10) || 0,
          maxOpenTickets: parseInt(maxOpenTickets, 10) || 3,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save configuration.');
    }
    setSaving(false);
  };

  const channelOptions = channels.map((c) => ({ value: c.id, label: c.name, prefix: '#' }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#52525b]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#71717a] text-sm mt-1">Server configuration for GTPS Cloud support bot</p>
      </div>

      <div className="bg-[#111111] border border-[#27272a] rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">Roles &amp; Permissions</h2>
        <div>
          <label className="block text-sm font-medium text-white mb-1">Staff Roles</label>
          <p className="text-xs text-[#71717a] mb-2">Members with these roles can manage tickets.</p>
          <RolePicker roles={roles} selected={staffRoleIds} onChange={setStaffRoleIds} />
          {roles.length === 0 && (
            <p className="text-xs text-[#f59e0b] mt-1">Could not load roles — check that DISCORD_TOKEN is set correctly.</p>
          )}
        </div>
      </div>

      <div className="bg-[#111111] border border-[#27272a] rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">Channels</h2>
        <div>
          <label className="block text-sm font-medium text-white mb-1">Log Channel</label>
          <p className="text-xs text-[#71717a] mb-2">Ticket actions (open, close, claim) are posted here.</p>
          <CustomSelect options={channelOptions} value={logChannelId} onChange={setLogChannelId} placeholder="Not set" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">Transcript Channel</label>
          <p className="text-xs text-[#71717a] mb-2">HTML transcripts are saved here when tickets are closed.</p>
          <CustomSelect options={channelOptions} value={transcriptChannelId} onChange={setTranscriptChannelId} placeholder="Not set" />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#27272a] rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">Ticket Behaviour</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Auto-close after (hours)</label>
            <p className="text-xs text-[#71717a] mb-2">Set to 0 to disable.</p>
            <NumberInput min={0} max={720} value={autoCloseHours} onChange={(e) => setAutoCloseHours(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Max open tickets per user</label>
            <p className="text-xs text-[#71717a] mb-2">1 - 20</p>
            <NumberInput min={1} max={20} value={maxOpenTickets} onChange={(e) => setMaxOpenTickets(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-[#22c55e] font-medium">Saved!</span>}
      </div>
    </div>
  );
}
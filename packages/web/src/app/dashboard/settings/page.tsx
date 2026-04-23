'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { NumberInput } from '@/components/ui/NumberInput';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

type GuildRole = { id: string; name: string; color: number };
type GuildChannel = { id: string; name: string };

type Config = {
  ticketingEnabled: boolean;
  ticketingDisabledReason: string;
  staffRoleIds: string[];
  dashboardRoleIds: string[];
  logChannelId: string | null;
  transcriptChannelId: string | null;
  autoCloseHours: number;
  maxOpenTickets: number;
};

type SettingsPayload = {
  ticketingEnabled: boolean;
  ticketingDisabledReason: string;
  staffRoleIds: string[];
  dashboardRoleIds: string[];
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
  const ref = useRef<HTMLDivElement>(null);
  const selectedRoles = roles.filter((r) => selected.includes(r.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[42px] w-full bg-[#0f1a15] border border-[#274137] rounded-xl px-3 py-2.5 flex flex-wrap gap-1.5 cursor-pointer focus-within:border-[#4ade80] focus-within:ring-2 focus-within:ring-[#34d399]/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {selectedRoles.length === 0 && <span className="text-sm text-[#7a998b]">Select roles...</span>}
        {selectedRoles.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
            style={{ background: roleColor(r.color) + '22', color: roleColor(r.color) }}>
            {r.name}
            <button onClick={(e) => { e.stopPropagation(); toggle(r.id); }} className="opacity-60 hover:opacity-100"><X size={10} /></button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-10 top-full mt-2 w-full bg-[#101b16] border border-[#274137] rounded-xl shadow-[0_18px_40px_rgba(0,0,0,0.45)] max-h-56 overflow-y-auto p-1">
          {roles.length === 0 && <p className="px-3 py-2 text-sm text-[#7a998b]">No roles found</p>}
          {roles.map((r) => (
            <button key={r.id} onClick={() => toggle(r.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#182821] transition-colors text-left rounded-lg">
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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [staffRoleIds, setStaffRoleIds] = useState<string[]>([]);
  const [dashboardRoleIds, setDashboardRoleIds] = useState<string[]>([]);
  const [ticketingEnabled, setTicketingEnabled] = useState(true);
  const [ticketingDisabledReason, setTicketingDisabledReason] = useState('Ticketing is currently disabled. Please try again later.');
  const [logChannelId, setLogChannelId] = useState('');
  const [transcriptChannelId, setTranscriptChannelId] = useState('');
  const [autoCloseHours, setAutoCloseHours] = useState('48');
  const [maxOpenTickets, setMaxOpenTickets] = useState('3');

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineSnapshot = useRef<string>('');

  const buildPayload = (): SettingsPayload => ({
    ticketingEnabled,
    ticketingDisabledReason: ticketingDisabledReason.trim() || 'Ticketing is currently disabled. Please try again later.',
    staffRoleIds,
    dashboardRoleIds,
    logChannelId: logChannelId || null,
    transcriptChannelId: transcriptChannelId || null,
    autoCloseHours: parseInt(autoCloseHours, 10) || 0,
    maxOpenTickets: parseInt(maxOpenTickets, 10) || 3,
  });

  const payloadSnapshot = (payload: SettingsPayload) => JSON.stringify(payload);

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/discord/guild').then((r) => r.json()),
    ]).then(([configData, guildData]) => {
      setRoles(guildData.roles ?? []);
      setChannels(guildData.channels ?? []);

      const c: Config | null = configData.config ?? null;
      const initialPayload: SettingsPayload = {
        ticketingEnabled: c?.ticketingEnabled ?? true,
        ticketingDisabledReason: c?.ticketingDisabledReason ?? 'Ticketing is currently disabled. Please try again later.',
        staffRoleIds: c?.staffRoleIds ?? [],
        dashboardRoleIds: c?.dashboardRoleIds ?? [],
        logChannelId: c?.logChannelId ?? null,
        transcriptChannelId: c?.transcriptChannelId ?? null,
        autoCloseHours: c?.autoCloseHours ?? 48,
        maxOpenTickets: c?.maxOpenTickets ?? 3,
      };

      baselineSnapshot.current = payloadSnapshot(initialPayload);

      if (configData.config) {
        setTicketingEnabled(initialPayload.ticketingEnabled);
        setTicketingDisabledReason(initialPayload.ticketingDisabledReason);
        setStaffRoleIds(initialPayload.staffRoleIds);
        setDashboardRoleIds(initialPayload.dashboardRoleIds);
        setLogChannelId(initialPayload.logChannelId ?? '');
        setTranscriptChannelId(initialPayload.transcriptChannelId ?? '');
        setAutoCloseHours(String(initialPayload.autoCloseHours));
        setMaxOpenTickets(String(initialPayload.maxOpenTickets));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (payloadArg?: SettingsPayload) => {
    const payload = payloadArg ?? buildPayload();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      baselineSnapshot.current = payloadSnapshot(payload);
      setLastSavedAt(new Date());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save configuration.');
    }
    setSaving(false);
  };

  useEffect(() => {
    if (loading) return;
    const payload = buildPayload();
    const currentSnapshot = payloadSnapshot(payload);
    if (currentSnapshot === baselineSnapshot.current) {
      return;
    }

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(() => {
      void save(payload);
    }, 900);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [
    loading,
    ticketingEnabled,
    ticketingDisabledReason,
    staffRoleIds,
    dashboardRoleIds,
    logChannelId,
    transcriptChannelId,
    autoCloseHours,
    maxOpenTickets,
  ]);

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
          <label className="block text-sm font-medium text-white mb-1">Ticket Staff Roles</label>
          <p className="text-xs text-[#71717a] mb-2">Members with these roles can manage tickets in Discord.</p>
          <RolePicker roles={roles} selected={staffRoleIds} onChange={setStaffRoleIds} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">Dashboard Access Roles</label>
          <p className="text-xs text-[#71717a] mb-2">Members with these roles can access the dashboard. Discord Administrator and guild owner always bypass this.</p>
          <RolePicker roles={roles} selected={dashboardRoleIds} onChange={setDashboardRoleIds} />
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
          <p className="text-xs text-[#71717a] mb-2">Transcripts are sent here when tickets are closed.</p>
          <CustomSelect options={channelOptions} value={transcriptChannelId} onChange={setTranscriptChannelId} placeholder="Not set" />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#27272a] rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">Ticket Behaviour</h2>
        <div>
          <label className="block text-sm font-medium text-white mb-1">Ticketing System</label>
          <p className="text-xs text-[#71717a] mb-2">Disable new ticket creation and show users a custom message.</p>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[#274137] bg-[#0f1a15] px-3.5 py-3">
            <ToggleSwitch
              checked={ticketingEnabled}
              onChange={setTicketingEnabled}
              label="Ticketing system"
              onLabel="Enabled"
              offLabel="Disabled"
            />
            <span className="text-xs text-[#8ea79d] text-right">{ticketingEnabled ? 'Users can open new tickets.' : 'Users cannot open new tickets.'}</span>
          </div>
        </div>

        {!ticketingEnabled && (
          <div>
            <label className="block text-sm font-medium text-white mb-1">Disabled Message</label>
            <p className="text-xs text-[#71717a] mb-2">Shown ephemerally when a user tries to open a ticket.</p>
            <textarea
              rows={3}
              maxLength={500}
              value={ticketingDisabledReason}
              onChange={(e) => setTicketingDisabledReason(e.target.value)}
              className="w-full bg-[#0f1a15] border border-[#274137] rounded-xl px-3.5 py-2.5 text-sm text-[#e8fff5] placeholder:text-[#7a998b] focus:outline-none focus:border-[#4ade80] focus:ring-2 focus:ring-[#34d399]/20 transition-colors resize-none"
              placeholder="Ticketing is currently disabled for the holidays."
            />
          </div>
        )}

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
        {saving && <span className="text-sm text-[#a1a1aa] font-medium">Saving...</span>}
        {saved && <span className="text-sm text-[#22c55e] font-medium">Saved!</span>}
        {!saving && lastSavedAt && (
          <span className="text-xs text-[#71717a]">
            Auto-saved at {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
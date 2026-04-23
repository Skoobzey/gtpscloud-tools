'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Layout, CheckCircle, XCircle, Hash } from 'lucide-react';
import { PanelEmbedPreview } from '@/components/ui/DiscordEmbed';
import { CustomSelect } from '@/components/ui/CustomSelect';

type GuildChannel = { id: string; name: string };
type PanelStatus = { panelChannelId: string | null; panelMessageId: string | null };
type Category = { name: string; emoji: string; description: string; isActive: boolean; sortOrder: number };

export default function PanelPage() {
  const [status, setStatus] = useState<PanelStatus>({ panelChannelId: null, panelMessageId: null });
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [panelMessage, setPanelMessage] = useState('Select a category below and click the button to open a ticket.');
  const [panelTitle, setPanelTitle] = useState('GTPS Cloud Support');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedSnapshot = useRef('');

  const activeCategoriesSignature = useMemo(() => {
    return categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => `${c.sortOrder}:${c.emoji}:${c.name}:${c.description}`)
      .join('|');
  }, [categories]);

  const currentSnapshot = useMemo(
    () => `${panelTitle}\n${panelMessage}\n${activeCategoriesSignature}`,
    [panelTitle, panelMessage, activeCategoriesSignature],
  );

  const loadPanelData = useCallback(async () => {
    const [panelData, guildData, catData] = await Promise.all([
      fetch('/api/panel', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/discord/guild', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/config/categories', { cache: 'no-store' }).then((r) => r.json()),
    ]);

    setStatus(panelData);
    setChannels(guildData.channels ?? []);
    setCategories(catData.categories ?? []);

    if (!working) {
      if (panelData.panelChannelId) setSelectedChannel(panelData.panelChannelId);
      if (panelData.panelMessage) setPanelMessage(panelData.panelMessage);
      if (panelData.panelTitle) setPanelTitle(panelData.panelTitle);
    }

    const initialTitle = panelData.panelTitle ?? 'GTPS Cloud Support';
    const initialMessage = panelData.panelMessage ?? 'Select a category below and click the button to open a ticket.';
    const initialActive = (catData.categories ?? [])
      .filter((c: Category) => c.isActive)
      .sort((a: Category, b: Category) => a.sortOrder - b.sortOrder)
      .map((c: Category) => `${c.sortOrder}:${c.emoji}:${c.name}:${c.description}`)
      .join('|');

    return `${initialTitle}\n${initialMessage}\n${initialActive}`;
  }, [working]);

  useEffect(() => {
    loadPanelData()
      .then((snapshot) => {
        lastSyncedSnapshot.current = snapshot;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadPanelData]);

  useEffect(() => {
    if (loading) return;

    const refresh = () => {
      loadPanelData().catch(() => {});
    };

    const interval = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [loading, loadPanelData]);

  const refreshPanel = async () => {
    setSyncing(true);
    const res = await fetch('/api/panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh', panelMessage, panelTitle }),
    });
    setSyncing(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
      if (data.code === 'MESSAGE_NOT_FOUND') {
        setStatus(prev => ({ ...prev, panelMessageId: null }));
      }
      setFeedback({ ok: false, msg: data.error ?? 'Failed to sync panel.' });
      return false;
    }

    const data = await res.json();

    setFeedback({ ok: true, msg: 'Panel synced automatically.' });
    return true;
  };

  useEffect(() => {
    if (loading || !status.panelMessageId) return;
    if (currentSnapshot === lastSyncedSnapshot.current) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(async () => {
      const ok = await refreshPanel();
      if (ok) {
        lastSyncedSnapshot.current = currentSnapshot;
      }
    }, 850);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [loading, status.panelMessageId, currentSnapshot]);

  const post = async (action: 'create' | 'refresh') => {
    setWorking(true);
    setFeedback(null);
    const body: Record<string, string> = { action };
    if (action === 'create') body.channelId = selectedChannel;
    body.panelMessage = panelMessage;
    body.panelTitle = panelTitle;
    const res = await fetch('/api/panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ panelChannelId: data.panelChannelId, panelMessageId: data.panelMessageId });
      setFeedback({ ok: true, msg: action === 'create' ? 'Panel created successfully.' : 'Panel refreshed successfully.' });
      lastSyncedSnapshot.current = currentSnapshot;
    } else {
      setFeedback({ ok: false, msg: data.error ?? 'Something went wrong.' });
    }
    setWorking(false);
  };

  const channelName = (id: string | null) => {
    if (!id) return null;
    return channels.find((c) => c.id === id)?.name ?? id;
  };

  if (loading) return <div className="text-[#71717a] text-sm animate-pulse">Loading panel status…</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Ticket Panel</h1>
        <p className="text-[#71717a] text-sm mt-1">Deploy and manage the ticket panel. Existing panels auto-sync as you edit.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-[#111111] border border-[#27272a] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Current Status</h2>
            {status.panelMessageId ? (
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-white text-sm font-medium">Panel is active</p>
                  {status.panelChannelId && (
                    <p className="text-[#71717a] text-xs flex items-center gap-1">
                      <Hash size={12} />
                      {channelName(status.panelChannelId) ?? status.panelChannelId}
                    </p>
                  )}
                  <p className="text-[#52525b] text-xs font-mono">Message ID: {status.panelMessageId}</p>
                  <p className="text-[11px] text-[#7a998b]">{syncing ? 'Syncing changes…' : 'Changes sync automatically after you stop typing.'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle size={18} className="text-[#ef4444] flex-shrink-0" />
                <p className="text-[#a1a1aa] text-sm">No panel deployed yet</p>
              </div>
            )}
          </div>

          <div className="bg-[#111111] border border-[#27272a] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layout size={16} className="text-[#22c55e]" />
              <h2 className="text-sm font-semibold text-white">Deploy Panel</h2>
            </div>
            <p className="text-[#71717a] text-xs">Choose a channel and send a new panel. This replaces any previously tracked panel.</p>
            <div>
              <label className="block text-xs text-[#71717a] mb-1.5">Panel Title</label>
              <input
                type="text"
                value={panelTitle}
                onChange={(e) => setPanelTitle(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                placeholder="GTPS Cloud Support"
              />
            </div>
            <div>
              <label className="block text-xs text-[#71717a] mb-1.5">Panel Message</label>
              <textarea
                rows={3}
                value={panelMessage}
                onChange={(e) => setPanelMessage(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
                placeholder="Select a category below and click the button to open a ticket."
              />
            </div>
            <div>
              <label className="block text-xs text-[#71717a] mb-1.5">Channel</label>
              <CustomSelect
                options={channels.map((c) => ({ value: c.id, label: c.name, prefix: '#' }))}
                value={selectedChannel}
                onChange={setSelectedChannel}
                placeholder="Select a channel..."
              />
            </div>
            <button
              disabled={!selectedChannel || working}
              onClick={() => post('create')}
              className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {working ? 'Deploying…' : 'Deploy Panel'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-[#111111] border border-[#27272a] rounded-xl p-5 space-y-3 xl:sticky xl:top-6">
            <h2 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Embed Preview</h2>
            <PanelEmbedPreview panelTitle={panelTitle} panelMessage={panelMessage} categories={categories} />
            <p className="text-xs text-[#52525b]">{categories.filter((c) => c.isActive).length} active categor{categories.filter((c) => c.isActive).length === 1 ? 'y' : 'ies'} will appear on the panel</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${feedback.ok ? 'bg-[#052e16] border-[#166534] text-[#22c55e]' : 'bg-[#2c0a0a] border-[#7f1d1d] text-[#ef4444]'}`}>
          {feedback.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

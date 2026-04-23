'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { DiscordEmbed } from '@/components/ui/DiscordEmbed';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

type GuildRole = { id: string; name: string; color: number };
type GuildChannel = { id: string; name: string };
type Question = { id: string; label: string; placeholder: string; style: 'short' | 'paragraph'; required: boolean };

type Category = {
  id: number;
  name: string;
  emoji: string;
  description: string;
  welcomeMessage: string;
  isActive: boolean;
  staffRoleIds: string[];
  categoryChannelId: string | null;
  sortOrder: number;
  questions: Question[];
  color: number;
};

function roleColor(n: number) {
  if (!n) return '#71717a';
  return '#' + n.toString(16).padStart(6, '0');
}

function hexColor(n: number) {
  return '#' + n.toString(16).padStart(6, '0');
}

function RolePicker({ roles, selected, onChange }: { roles: GuildRole[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const sel = roles.filter((r) => selected.includes(r.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  return (
    <div className="relative">
      <div className="min-h-[38px] w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-pointer focus-within:border-[#22c55e] transition-colors" onClick={() => setOpen(!open)}>
        {sel.length === 0 && <span className="text-sm text-[#52525b]">Select roles...</span>}
        {sel.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: roleColor(r.color) + '22', color: roleColor(r.color) }}>
            {r.name}
            <button onClick={(e) => { e.stopPropagation(); toggle(r.id); }} className="opacity-60 hover:opacity-100"><X size={10} /></button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-10 top-full mt-1 w-full bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {roles.length === 0 && <p className="px-3 py-2 text-sm text-[#52525b]">No roles found</p>}
          {roles.map((r) => (
            <button key={r.id} onClick={() => toggle(r.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#27272a] transition-colors text-left">
              <span className="w-4 h-4 rounded border border-[#3f3f46] flex items-center justify-center flex-shrink-0" style={selected.includes(r.id) ? { background: roleColor(r.color), borderColor: roleColor(r.color) } : {}}>
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

function ChannelSelect({ channels, value, onChange, prefix = '#' }: { channels: GuildChannel[]; value: string; onChange: (v: string) => void; prefix?: string }) {
  const options = channels.map((c) => ({
    value: c.id,
    label: c.name,
    prefix,
  }));

  return (
    <CustomSelect options={options} value={value} onChange={onChange} placeholder="Not set" />
  );
}

const DEFAULT_WELCOME = 'Thank you for opening a ticket. A staff member will be with you shortly.';
const DEFAULT_COLOR = 0x22c55e;

function newQuestion(): Question {
  return { id: crypto.randomUUID(), label: '', placeholder: '', style: 'short', required: true };
}

type FormState = {
  name: string;
  description: string;
  emoji: string;
  welcomeMessage: string;
  categoryChannelId: string;
  staffRoleIds: string[];
  color: string;
  questions: Question[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [discordCategories, setDiscordCategories] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', description: '', emoji: '🎫', welcomeMessage: DEFAULT_WELCOME, categoryChannelId: '', staffRoleIds: [], color: '#22c55e', questions: [] });
  const [saving, setSaving] = useState(false);
  const [togglingIds, setTogglingIds] = useState<number[]>([]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/config/categories');
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/config/categories').then((r) => r.json()),
      fetch('/api/discord/guild').then((r) => r.json()),
    ]).then(([catData, guildData]) => {
      setCategories(catData.categories ?? []);
      setRoles(guildData.roles ?? []);
      setChannels(guildData.channels ?? []);
      setDiscordCategories(guildData.discordCategories ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', emoji: '🎫', welcomeMessage: DEFAULT_WELCOME, categoryChannelId: '', staffRoleIds: [], color: '#22c55e', questions: [] });
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description,
      emoji: cat.emoji,
      welcomeMessage: cat.welcomeMessage || DEFAULT_WELCOME,
      categoryChannelId: cat.categoryChannelId ?? '',
      staffRoleIds: cat.staffRoleIds,
      color: hexColor(cat.color ?? DEFAULT_COLOR),
      questions: (cat.questions ?? []) as Question[],
    });
    setShowForm(true);
  };

  const saveCategory = async () => {
    setSaving(true);
    const colorHex = form.color.replace('#', '');
    const colorInt = parseInt(colorHex, 16) || DEFAULT_COLOR;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      emoji: form.emoji || '🎫',
      welcomeMessage: form.welcomeMessage.trim() || DEFAULT_WELCOME,
      categoryChannelId: form.categoryChannelId || null,
      staffRoleIds: form.staffRoleIds,
      color: colorInt,
      questions: form.questions.filter((q) => q.label.trim()),
    };
    if (editing) {
      await fetch(`/api/config/categories/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/config/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false);
    setShowForm(false);
    fetchCategories();
  };

  const toggleCategory = async (id: number, nextIsActive: boolean) => {
    const previous = categories;
    setTogglingIds((ids) => [...ids, id]);

    // Optimistically update status to avoid table reload/flicker.
    setCategories((current) =>
      current.map((cat) => (cat.id === id ? { ...cat, isActive: nextIsActive } : cat)),
    );

    try {
      const res = await fetch(`/api/config/categories/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextIsActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle category');
    } catch {
      // Revert on failure.
      setCategories(previous);
    } finally {
      setTogglingIds((ids) => ids.filter((x) => x !== id));
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Existing tickets will be unaffected.')) return;
    await fetch(`/api/config/categories/${id}`, { method: 'DELETE' });
    fetchCategories();
  };

  const addQuestion = () => {
    if (form.questions.length >= 5) return;
    setForm({ ...form, questions: [...form.questions, newQuestion()] });
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    const qs = form.questions.map((q, i) => i === idx ? { ...q, ...patch } : q);
    setForm({ ...form, questions: qs });
  };

  const removeQuestion = (idx: number) => {
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });
  };


  const previewFields = [
    { name: 'Category', value: form.name || 'Category Name', inline: true },
    { name: 'Priority', value: '🔵 Normal', inline: true },
    { name: 'Status', value: 'Open', inline: true },
    { name: 'Opened by', value: '@User', inline: true },
    { name: 'Claimed by', value: 'Unclaimed', inline: true },
  ];

  if (loading) return <div className="text-[#71717a] text-sm animate-pulse">Loading categories...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-[#71717a] text-sm mt-1">Manage ticket categories shown on the panel</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          <Plus size={15} /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{editing ? 'Edit Category' : 'New Category'}</h2>
            <p className="text-xs text-[#71717a]">Live embed preview</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71717a] mb-1.5">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[#71717a] mb-1.5">Emoji</label>
                  <EmojiPicker value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e })} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#71717a] mb-1.5">Description <span className="text-[#52525b]">(shown on panel)</span></label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors" />
              </div>

              <div>
                <label className="block text-xs text-[#71717a] mb-1.5">Welcome Message <span className="text-[#52525b]">(shown in ticket channel)</span></label>
                <textarea rows={3} value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-xs text-[#71717a] mb-1.5">Embed Color</label>
                <ColorPicker value={form.color} onChange={(hex) => setForm({ ...form, color: hex })} />
              </div>

              <div>
                <label className="block text-xs text-[#71717a] mb-1.5">Discord Category <span className="text-[#52525b]">(tickets are created inside this)</span></label>
                <ChannelSelect channels={discordCategories} value={form.categoryChannelId} onChange={(v) => setForm({ ...form, categoryChannelId: v })} prefix="" />
              </div>

              <div>
                <label className="block text-xs text-[#71717a] mb-1.5">Staff Roles <span className="text-[#52525b]">(category override)</span></label>
                <RolePicker roles={roles} selected={form.staffRoleIds} onChange={(v) => setForm({ ...form, staffRoleIds: v })} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#71717a]">Pre-open Questions <span className="text-[#52525b]">(shown in modal, max 5)</span></label>
                  <button type="button" onClick={addQuestion} disabled={form.questions.length >= 5} className="text-xs text-[#22c55e] hover:text-[#16a34a] disabled:text-[#52525b] disabled:cursor-not-allowed transition-colors flex items-center gap-1">
                    <Plus size={12} /> Add question
                  </button>
                </div>

                {form.questions.length === 0 && (
                  <p className="text-xs text-[#52525b] text-center py-4 border border-dashed border-[#27272a] rounded-lg">No questions — ticket opens immediately</p>
                )}

                <div className="space-y-2">
                  {form.questions.map((q, idx) => (
                    <div key={q.id} className="bg-[#0a0a0a] border border-[#27272a] rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-[#52525b] flex-shrink-0" />
                        <input
                          type="text"
                          value={q.label}
                          onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                          placeholder="Question label"
                          maxLength={45}
                          className="flex-1 bg-transparent text-sm text-white placeholder-[#52525b] focus:outline-none"
                        />
                        <button onClick={() => removeQuestion(idx)} className="text-[#52525b] hover:text-[#ef4444] transition-colors"><X size={14} /></button>
                      </div>
                      <input
                        type="text"
                        value={q.placeholder}
                        onChange={(e) => updateQuestion(idx, { placeholder: e.target.value })}
                        placeholder="Placeholder (optional)"
                        className="w-full bg-transparent text-xs text-[#71717a] placeholder-[#3f3f46] focus:outline-none border-t border-[#27272a] pt-2"
                      />
                      <div className="flex items-center gap-3 border-t border-[#27272a] pt-2">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => updateQuestion(idx, { style: 'short' })} className={`px-2 py-0.5 rounded text-xs transition-colors ${q.style === 'short' ? 'bg-[#22c55e20] text-[#22c55e]' : 'text-[#52525b] hover:text-white'}`}>Short</button>
                          <button type="button" onClick={() => updateQuestion(idx, { style: 'paragraph' })} className={`px-2 py-0.5 rounded text-xs transition-colors ${q.style === 'paragraph' ? 'bg-[#22c55e20] text-[#22c55e]' : 'text-[#52525b] hover:text-white'}`}>Paragraph</button>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-[#71717a] cursor-pointer ml-auto">
                          <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(idx, { required: e.target.checked })} className="accent-[#22c55e]" />
                          Required
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[#71717a] mb-2 font-medium">Embed Preview</p>
                <DiscordEmbed
                  color={form.color}
                  title={`${form.emoji || '🎫'} Ticket #0001`}
                  description={form.welcomeMessage || DEFAULT_WELCOME}
                  fields={previewFields}
                  footer="GTPS Cloud Tools"
                  timestamp
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#27272a]">
            <button onClick={saveCategory} disabled={saving || !form.name.trim()} className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="border border-[#27272a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 text-center text-[#52525b] text-sm">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#52525b] text-sm">No categories yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#111111] border-b border-[#27272a]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#71717a]">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#71717a] hidden sm:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#71717a]">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#71717a]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#111111] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{cat.emoji}</span>
                      <div>
                        <p className="font-medium text-white">{cat.name}</p>
                        {(cat.questions?.length ?? 0) > 0 && (
                          <p className="text-[10px] text-[#52525b]">{cat.questions.length} question{cat.questions.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#71717a] hidden sm:table-cell max-w-xs truncate">{cat.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default" value={cat.isActive ? 'active' : 'inactive'} className={cat.isActive ? 'text-[#22c55e] bg-[#22c55e]/10' : 'text-[#a1a1aa] bg-[#3f3f46]/20'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <ToggleSwitch
                        checked={cat.isActive}
                        onChange={(next) => toggleCategory(cat.id, next)}
                        label={cat.isActive ? 'Deactivate category' : 'Activate category'}
                        showStateLabel={false}
                        disabled={togglingIds.includes(cat.id)}
                        className="mr-1"
                      />
                      <button onClick={() => openEdit(cat)} className="p-1.5 rounded hover:bg-[#27272a] transition-colors text-[#71717a] hover:text-white"><Pencil size={15} /></button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded hover:bg-[#27272a] transition-colors text-[#71717a] hover:text-[#ef4444]"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
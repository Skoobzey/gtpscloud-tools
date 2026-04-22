'use client';

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbedProps {
  color?: string;
  title?: string;
  description?: string;
  fields?: EmbedField[];
  footer?: string;
  timestamp?: boolean;
  authorName?: string;
  authorIcon?: string;
}

export function DiscordEmbed({
  color = '#22c55e',
  title,
  description,
  fields = [],
  footer,
  timestamp = true,
  authorName,
  authorIcon,
}: DiscordEmbedProps) {
  const inlineFields = fields.filter((f) => f.inline);
  const rows: EmbedField[][] = [];
  let currentRow: EmbedField[] = [];
  for (const field of fields) {
    if (!field.inline) {
      if (currentRow.length) { rows.push(currentRow); currentRow = []; }
      rows.push([field]);
    } else {
      currentRow.push(field);
      if (currentRow.length === 3) { rows.push(currentRow); currentRow = []; }
    }
  }
  if (currentRow.length) rows.push(currentRow);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-md overflow-hidden bg-[#2b2d31] flex max-w-lg">
      <div className="w-1 flex-shrink-0 rounded-l" style={{ backgroundColor: color }} />
      <div className="p-3 space-y-1.5 flex-1 min-w-0">
        {authorName && (
          <div className="flex items-center gap-1.5">
            {authorIcon && <img src={authorIcon} className="w-5 h-5 rounded-full" alt="" />}
            <span className="text-xs font-semibold text-white">{authorName}</span>
          </div>
        )}
        {title && <p className="font-semibold text-sm" style={{ color }}>{title}</p>}
        {description && (
          <p className="text-[#dbdee1] text-sm whitespace-pre-line leading-5">{description}</p>
        )}
        {rows.length > 0 && (
          <div className="space-y-1 pt-1">
            {rows.map((row, i) => (
              <div key={i} className={`grid gap-2`} style={{ gridTemplateColumns: row[0].inline ? `repeat(${row.length}, minmax(0,1fr))` : '1fr' }}>
                {row.map((field, j) => (
                  <div key={j}>
                    <p className="text-xs font-semibold text-white mb-0.5">{field.name}</p>
                    <p className="text-xs text-[#dbdee1]">{field.value}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {(footer || timestamp) && (
          <p className="text-[10px] text-[#87898c] pt-0.5">
            {footer}{footer && timestamp ? ' • ' : ''}{timestamp ? `Today at ${timeStr}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

/** Renders a mock panel embed with categories */
interface PanelEmbedPreviewProps {
  panelTitle?: string;
  panelMessage?: string;
  categories: Array<{ name: string; emoji: string; description: string; isActive: boolean; sortOrder: number }>;
}

export function PanelEmbedPreview({ panelTitle, panelMessage, categories }: PanelEmbedPreviewProps) {
  const active = categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const title = panelTitle ?? 'GTPS Cloud Support';
  const desc = panelMessage ?? 'Select a category below and click the button to open a ticket.';

  return (
    <div className="space-y-2">
      <DiscordEmbed
        color="#22c55e"
        title={title}
        description={desc}
        footer={`${title} • Support System`}
        timestamp
      />
      {/* Mock select menu */}
      {active.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1f22] border border-[#3f3f46] rounded text-sm text-[#87898c] max-w-lg">
          <span className="flex-1 truncate">Select a category to open a ticket…</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 opacity-60"><path d="M7 10l5 5 5-5H7z"/></svg>
        </div>
      )}
    </div>
  );
}

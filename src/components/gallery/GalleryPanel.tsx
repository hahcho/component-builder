'use client';
import { useState } from 'react';
import type { ComponentRecord } from '@/types/component';
import type { Session } from '@/types/session';
import type { ComponentCategory } from '@/types/session';
import ComponentCard from './ComponentCard';
import ComponentDetail from './ComponentDetail';
import { exportComponentsAsZip } from '@/lib/utils/fileExporter';

interface Props {
  session: Session;
  components: ComponentRecord[];
  selectedId?: string | null;
  onSelectComponent: (id: string | null) => void;
  newComponentIds: Set<string>;
}

const ALL_CATEGORIES: { id: ComponentCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'cards', label: 'Cards' },
  { id: 'navigation', label: 'Nav' },
  { id: 'modals', label: 'Modals' },
  { id: 'tables', label: 'Tables' },
  { id: 'badges', label: 'Badges' },
  { id: 'alerts', label: 'Alerts' },
];

export default function GalleryPanel({ session, components, selectedId, onSelectComponent, newComponentIds }: Props) {
  const [filter, setFilter] = useState<ComponentCategory | 'all'>('all');
  const [downloading, setDownloading] = useState(false);

  const filtered = filter === 'all'
    ? components
    : components.filter((c) => c.category === filter);

  const selectedComponent = selectedId ? components.find((c) => c.id === selectedId) : null;

  const downloadAll = async () => {
    if (!components.length) return;
    setDownloading(true);
    try {
      const blob = await exportComponentsAsZip(components);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/\s+/g, '-').toLowerCase()}-components.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  // Get categories that actually have components
  const activeCategories = ALL_CATEGORIES.filter((cat) => {
    if (cat.id === 'all') return true;
    return components.some((c) => c.category === cat.id);
  });

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-surface flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-ink">
            {components.length === 0
              ? 'Components'
              : `${components.length} component${components.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        {components.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-ink-muted hover:text-ink hover:border-border-bright transition-all disabled:opacity-50"
          >
            {downloading ? (
              <span className="w-3 h-3 border border-ink-muted/40 border-t-ink-muted rounded-full animate-spin" />
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M6 8L3 5M6 8l3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            Export all
          </button>
        )}
      </div>

      {/* Category filter */}
      {components.length > 0 && (
        <div className="px-4 py-2 border-b border-border flex gap-1 overflow-x-auto flex-shrink-0 bg-bg-surface">
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                filter === cat.id
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'text-ink-muted hover:text-ink border border-transparent hover:border-border'
              }`}
            >
              {cat.label}
              {cat.id !== 'all' && (
                <span className="ml-1 text-ink-subtle">
                  {components.filter((c) => c.category === cat.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {components.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-subtle">
                <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3 className="font-display font-bold text-ink text-sm mb-1">No components yet</h3>
            <p className="text-ink-muted text-xs max-w-[200px]">
              Use the chat to describe a component and it will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">
            No {filter} components yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <ComponentCard
                key={c.id}
                component={c}
                isNew={newComponentIds.has(c.id)}
                onSelect={onSelectComponent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedComponent && (
        <ComponentDetail
          component={selectedComponent}
          session={session}
          onClose={() => onSelectComponent(null)}
        />
      )}
    </div>
  );
}

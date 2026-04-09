'use client';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRecord } from '@/types/component';
import LivePreview from './LivePreview';

interface Props {
  component: ComponentRecord;
  isNew?: boolean;
  onSelect: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  buttons: 'text-accent bg-accent/10 border-accent/20',
  forms: 'text-violet bg-violet/10 border-violet/20',
  cards: 'text-amber bg-amber/10 border-amber/20',
  navigation: 'text-rose bg-rose/10 border-rose/20',
  modals: 'text-accent bg-accent/10 border-accent/20',
  tables: 'text-violet bg-violet/10 border-violet/20',
  badges: 'text-amber bg-amber/10 border-amber/20',
  alerts: 'text-rose bg-rose/10 border-rose/20',
};

export default function ComponentCard({ component, isNew, onSelect }: Props) {
  const [flashing, setFlashing] = useState(isNew ?? false);
  const prevVersion = useRef(component.version);

  // Flash on update
  useEffect(() => {
    if (component.version !== prevVersion.current) {
      setFlashing(true);
      prevVersion.current = component.version;
    }
  }, [component.version]);

  useEffect(() => {
    if (flashing) {
      const t = setTimeout(() => setFlashing(false), 1000);
      return () => clearTimeout(t);
    }
  }, [flashing]);

  const categoryClass = CATEGORY_COLORS[component.category] ?? CATEGORY_COLORS.buttons;

  return (
    <button
      onClick={() => onSelect(component.id)}
      className={`group w-full text-left bg-bg-surface border rounded-xl overflow-hidden transition-all duration-200 hover:border-border-bright hover:-translate-y-0.5 ${
        flashing ? 'animate-ring-flash border-accent/50' : 'border-border'
      }`}
    >
      {/* Preview area */}
      <div className="relative h-40 bg-bg-base overflow-hidden border-b border-border">
        <LivePreview
          previewHtml={component.previewHtml}
          title={component.name}
          className="h-40 pointer-events-none"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-bg-base/0 group-hover:bg-bg-base/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5 bg-bg-surface/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs text-ink font-medium">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            View code
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink truncate">{component.name}</div>
            <div className="text-[10px] text-ink-subtle font-mono truncate mt-0.5">{component.selector}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {component.version > 1 && (
              <span className="text-[9px] text-ink-muted border border-border px-1.5 py-0.5 rounded-full">
                v{component.version}
              </span>
            )}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${categoryClass}`}>
              {component.category}
            </span>
          </div>
        </div>
        {component.description && (
          <div className="text-[10px] text-ink-muted mt-1.5 line-clamp-2">{component.description}</div>
        )}
      </div>
    </button>
  );
}

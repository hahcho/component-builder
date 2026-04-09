'use client';
import { useState } from 'react';
import type { ComponentRecord } from '@/types/component';
import type { Session } from '@/types/session';
import LivePreview from './LivePreview';
import CodeTabs from './CodeTabs';
import { exportComponentsAsZip } from '@/lib/utils/fileExporter';

interface Props {
  component: ComponentRecord;
  session: Session;
  onClose: () => void;
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

export default function ComponentDetail({ component, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await exportComponentsAsZip([component]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${component.selector}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const categoryClass = CATEGORY_COLORS[component.category] ?? CATEGORY_COLORS.buttons;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg-base/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl h-[80vh] bg-bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden border-inset">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-bg-elevated flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-ink-bright text-base">
                {component.name}
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${categoryClass}`}>
                {component.category}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-ink-muted">
                v{component.version}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <code className="text-[10px] text-ink-subtle font-mono">{component.selector}</code>
              {component.description && (
                <>
                  <span className="text-ink-subtle">·</span>
                  <span className="text-[10px] text-ink-muted truncate">{component.description}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={download}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border rounded-lg text-xs text-ink-muted hover:text-ink hover:border-border-bright transition-all disabled:opacity-50"
            >
              {downloading ? (
                <span className="w-3 h-3 border border-ink-muted/40 border-t-ink-muted rounded-full animate-spin" />
              ) : (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v7M6 8L3 5M6 8l3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              Download
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-ink-muted hover:text-ink hover:border-border-bright transition-all text-sm"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body: preview + code side by side */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[10px] text-ink-subtle uppercase tracking-wider font-medium">Preview</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <LivePreview
                previewHtml={component.previewHtml}
                title={`Preview: ${component.name}`}
                className="h-full"
              />
            </div>
          </div>

          {/* Code */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-bg-base">
            <CodeTabs component={component} />
          </div>
        </div>
      </div>
    </div>
  );
}

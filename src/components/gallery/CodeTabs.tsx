'use client';
import { useState } from 'react';
import type { ComponentRecord } from '@/types/component';

type Tab = 'ts' | 'html' | 'scss';

interface Props {
  component: ComponentRecord;
}

const TAB_LABELS: { id: Tab; label: string; lang: string }[] = [
  { id: 'ts', label: 'TypeScript', lang: 'typescript' },
  { id: 'html', label: 'Template', lang: 'html' },
  { id: 'scss', label: 'SCSS', lang: 'scss' },
];

export default function CodeTabs({ component }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('ts');
  const [copied, setCopied] = useState(false);

  const getCode = () => {
    if (activeTab === 'ts') return component.tsCode;
    if (activeTab === 'html') return component.htmlTemplate;
    return component.scssCode;
  };

  const copy = async () => {
    await navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-bg-surface">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={copy}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-ink-muted hover:text-ink border border-border hover:border-border-bright transition-all"
        >
          {copied ? (
            <>
              <span className="text-accent">✓</span>
              Copied
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <pre className="code-block text-ink p-4 min-h-full">
          <code>{getCode() || '// No code generated'}</code>
        </pre>
      </div>
    </div>
  );
}

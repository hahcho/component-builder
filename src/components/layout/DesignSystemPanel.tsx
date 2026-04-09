'use client';
import { useState } from 'react';
import type { ComponentCategory, SessionConfig, StylePreference, Session } from '@/types/session';
import type { ComponentRecord } from '@/types/component';

const STYLES: { id: StylePreference; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'playful', label: 'Playful' },
  { id: 'bold', label: 'Bold' },
];

const ALL_CATEGORIES: { id: ComponentCategory; label: string }[] = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'cards', label: 'Cards' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'modals', label: 'Modals' },
  { id: 'tables', label: 'Tables' },
  { id: 'badges', label: 'Badges' },
  { id: 'alerts', label: 'Alerts' },
];

interface Props {
  session: Session;
  onClose: () => void;
  onSessionUpdated: (session: Session) => void;
  onColorsApplied: (components: ComponentRecord[]) => void;
}

export default function DesignSystemPanel({ session, onClose, onSessionUpdated, onColorsApplied }: Props) {
  const [draft, setDraft] = useState<SessionConfig>({ ...session.config });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: number } | null>(null);

  const patch = (p: Partial<SessionConfig>) => setDraft((d) => ({ ...d, ...p }));

  const colorChanged =
    draft.primaryColor !== session.config.primaryColor ||
    draft.secondaryColor !== session.config.secondaryColor ||
    draft.accentColor !== session.config.accentColor ||
    draft.successColor !== session.config.successColor ||
    draft.warningColor !== session.config.warningColor ||
    draft.destructiveColor !== session.config.destructiveColor;

  const hasChanges =
    colorChanged ||
    draft.brandName !== session.config.brandName ||
    draft.appDescription !== session.config.appDescription ||
    draft.style !== session.config.style ||
    draft.darkMode !== session.config.darkMode ||
    JSON.stringify(draft.componentCategories) !== JSON.stringify(session.config.componentCategories);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: draft }),
      });
      const data = await res.json();
      onSessionUpdated(data.session);
    } finally {
      setSaving(false);
    }
  };

  const handleColorSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/sync-colors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldColors: {
            primary: session.config.primaryColor,
            secondary: session.config.secondaryColor,
            accent: session.config.accentColor,
            success: session.config.successColor,
            warning: session.config.warningColor,
            destructive: session.config.destructiveColor,
          },
          newColors: {
            primary: draft.primaryColor,
            secondary: draft.secondaryColor,
            accent: draft.accentColor,
            success: draft.successColor,
            warning: draft.warningColor,
            destructive: draft.destructiveColor,
          },
        }),
      });
      const data = await res.json();
      setSyncResult({ updated: data.updated });
      onColorsApplied(data.components);
      setTimeout(() => setSyncResult(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const toggleCategory = (id: ComponentCategory) => {
    const current = draft.componentCategories ?? [];
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    patch({ componentCategories: next });
  };

  const brandColorFields: { key: keyof SessionConfig; label: string }[] = [
    { key: 'primaryColor', label: 'Primary' },
    { key: 'secondaryColor', label: 'Secondary' },
    { key: 'accentColor', label: 'Accent' },
  ];

  const semanticColorFields: { key: keyof SessionConfig; label: string }[] = [
    { key: 'successColor', label: 'Success' },
    { key: 'warningColor', label: 'Warning' },
    { key: 'destructiveColor', label: 'Destructive' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-ink-bright/10"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-[380px] flex flex-col bg-bg-surface border-l border-border shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-ink-bright text-sm">Design System</h2>
            <p className="text-ink-subtle text-xs mt-0.5">{session.config.brandName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-bg-elevated transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* App overview */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">App Overview</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-ink-muted mb-1">Brand name</label>
                <input
                  type="text"
                  value={draft.brandName}
                  onChange={(e) => patch({ brandName: e.target.value })}
                  className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-accent/60 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-muted mb-1">What you&apos;re building</label>
                <textarea
                  value={draft.appDescription ?? ''}
                  onChange={(e) => patch({ appDescription: e.target.value })}
                  rows={3}
                  className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-accent/60 transition-all resize-none"
                />
              </div>
            </div>
          </section>

          {/* Design Notes */}
          <section className="space-y-3">
            <div>
              <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Design Notes</h3>
              <p className="text-[10px] text-ink-subtle mt-0.5">Claude maintains this automatically. Edit to override patterns.</p>
            </div>
            <textarea
              value={draft.designNotes ?? ''}
              onChange={(e) => patch({ designNotes: e.target.value })}
              rows={6}
              placeholder="e.g.&#10;- Buttons: rounded-full, uppercase labels&#10;- Cards: border border-border, rounded-xl&#10;- Inputs: bottom-border only, no background"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-ink text-xs font-mono focus:outline-none focus:border-accent/60 transition-all resize-none leading-relaxed placeholder-ink-subtle"
            />
          </section>

          {/* Colors */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Colors</h3>
              {colorChanged && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber/10 text-amber border border-amber/20 rounded-full">
                  Changed
                </span>
              )}
            </div>

            <div className="text-[10px] font-medium text-ink-subtle uppercase tracking-wider">Brand</div>
            <div className="space-y-2">
              {brandColorFields.map(({ key, label }) => {
                const value = (draft[key] as string) ?? '';
                return (
                  <div key={key} className="flex items-center gap-3 bg-bg-elevated border border-border rounded-lg px-3 py-2.5">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => patch({ [key]: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-ink text-xs font-medium">{label}</div>
                      <div className="text-ink-subtle font-mono text-[10px]">{value}</div>
                    </div>
                    <div className="w-10 h-6 rounded flex-shrink-0" style={{ backgroundColor: value }} />
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] font-medium text-ink-subtle uppercase tracking-wider pt-1">Semantic</div>
            <p className="text-[10px] text-ink-subtle -mt-1">Used in alerts, validation, and status indicators.</p>
            <div className="space-y-2">
              {semanticColorFields.map(({ key, label }) => {
                const value = (draft[key] as string) ?? '';
                return (
                  <div key={key} className="flex items-center gap-3 bg-bg-elevated border border-border rounded-lg px-3 py-2.5">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => patch({ [key]: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-ink text-xs font-medium">{label}</div>
                      <div className="text-ink-subtle font-mono text-[10px]">{value}</div>
                    </div>
                    <div className="w-10 h-6 rounded flex-shrink-0" style={{ backgroundColor: value }} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Style */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => patch({ style: s.id })}
                  className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                    draft.style === s.id
                      ? 'border-accent/60 bg-accent/5 text-accent'
                      : 'border-border bg-bg-elevated text-ink-muted hover:text-ink hover:border-border-bright'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Dark mode */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Dark Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              {([false, true] as const).map((val) => (
                <button
                  key={String(val)}
                  onClick={() => patch({ darkMode: val })}
                  className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                    draft.darkMode === val
                      ? 'border-accent/60 bg-accent/5 text-accent'
                      : 'border-border bg-bg-elevated text-ink-muted hover:text-ink hover:border-border-bright'
                  }`}
                >
                  {val ? '🌙 Dark mode' : '☀️ Light only'}
                </button>
              ))}
            </div>
          </section>

          {/* Categories */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Component Categories</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const active = (draft.componentCategories ?? []).includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      active
                        ? 'border-accent/60 bg-accent/5 text-accent'
                        : 'border-border bg-bg-elevated text-ink-muted hover:text-ink hover:border-border-bright'
                    }`}
                  >
                    {cat.label}
                    {active && <span className="text-accent text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-2">
          {colorChanged && (
            <button
              onClick={handleColorSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-amber/30 bg-amber/5 text-amber rounded-lg text-xs font-medium hover:bg-amber/10 transition-all disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                  Updating components…
                </>
              ) : syncResult ? (
                `✓ Updated ${syncResult.updated} component${syncResult.updated !== 1 ? 's' : ''}`
              ) : (
                'Apply colors to existing components'
              )}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-bg-base font-semibold rounded-lg text-sm hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-bg-base/40 border-t-bg-base rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>
    </>
  );
}

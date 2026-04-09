'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { GeneratedPalette } from '@/app/api/generate-palette/route';
import type { ComponentCategory, SessionConfig, StylePreference } from '@/types/session';

const CATEGORIES: { id: ComponentCategory; label: string; icon: string }[] = [
  { id: 'buttons', label: 'Buttons', icon: '⬛' },
  { id: 'forms', label: 'Forms', icon: '📝' },
  { id: 'cards', label: 'Cards', icon: '🃏' },
  { id: 'navigation', label: 'Navigation', icon: '🧭' },
  { id: 'modals', label: 'Modals', icon: '🪟' },
  { id: 'tables', label: 'Tables', icon: '📊' },
  { id: 'badges', label: 'Badges', icon: '🏷' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
];

const STYLES: { id: StylePreference; label: string; desc: string; preview: string }[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Clean lines, whitespace, quiet elegance',
    preview: 'border border-white/10 rounded px-4 py-2 text-xs text-ink-muted',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    desc: 'Professional, trustworthy, structured',
    preview: 'border-2 border-white/20 rounded px-4 py-2 text-xs font-semibold text-ink',
  },
  {
    id: 'playful',
    label: 'Playful',
    desc: 'Rounded, vibrant, friendly energy',
    preview: 'border-2 border-accent/40 rounded-2xl px-4 py-2 text-xs text-accent font-medium',
  },
  {
    id: 'bold',
    label: 'Bold',
    desc: 'High contrast, strong, dramatic',
    preview: 'border-2 border-ink rounded-none px-4 py-2 text-xs font-bold tracking-widest text-ink uppercase',
  },
];

interface StepProps {
  config: Partial<SessionConfig>;
  onChange: (patch: Partial<SessionConfig>) => void;
}

function StepOverview({ config, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink-bright mb-1">
          Let&apos;s start with the basics
        </h2>
        <p className="text-ink-muted text-sm">
          We&apos;ll use this to generate components that fit your product.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">Brand name</label>
          <input
            type="text"
            placeholder="e.g. Acme UI, Nova Design, Atlas"
            value={config.brandName ?? ''}
            onChange={(e) => onChange({ brandName: e.target.value })}
            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/60 transition-all text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">What are you building?</label>
          <textarea
            placeholder="e.g. A calisthenics workout tracker for athletes. Heavy on progress charts, session logs, and exercise cards."
            value={config.appDescription ?? ''}
            onChange={(e) => onChange({ appDescription: e.target.value })}
            rows={3}
            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/60 transition-all text-sm resize-none"
          />
          <p className="text-ink-subtle text-xs mt-1">
            The more context, the better Claude understands what to generate.
          </p>
        </div>
      </div>
    </div>
  );
}

const BRAND_COLOR_FIELDS = [
  { key: 'primaryColor' as const, label: 'Primary', default: '#5eead4' },
  { key: 'secondaryColor' as const, label: 'Secondary', default: '#a78bfa' },
  { key: 'accentColor' as const, label: 'Accent', default: '#fbbf24' },
];

const SEMANTIC_COLOR_FIELDS = [
  { key: 'successColor' as const, label: 'Success', default: '#22c55e' },
  { key: 'warningColor' as const, label: 'Warning', default: '#f59e0b' },
  { key: 'destructiveColor' as const, label: 'Destructive', default: '#ef4444' },
];

function PaletteCard({
  palette,
  selected,
  onClick,
}: {
  palette: GeneratedPalette;
  selected: boolean;
  onClick: () => void;
}) {
  const swatches = [
    palette.primaryColor,
    palette.secondaryColor,
    palette.accentColor,
    palette.successColor,
    palette.warningColor,
    palette.destructiveColor,
  ];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border rounded-xl transition-all ${
        selected
          ? 'border-accent/60 bg-accent/5 ring-1 ring-accent/30'
          : 'border-border bg-bg-elevated hover:border-border-bright'
      }`}
    >
      <div className="flex gap-1 mb-2">
        {swatches.map((color, i) => (
          <div
            key={i}
            className="flex-1 h-5 rounded"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="text-ink font-semibold text-xs">{palette.name}</div>
      <div className="text-ink-muted text-[10px] mt-0.5 leading-relaxed">{palette.description}</div>
      {selected && <div className="text-accent text-[10px] mt-1 font-medium">✓ Selected</div>}
    </button>
  );
}

function StepColors({ config, onChange }: StepProps) {
  const [palettes, setPalettes] = useState<GeneratedPalette[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState<number | null>(null);
  const [showFineTune, setShowFineTune] = useState(false);

  const fetchPalettes = async () => {
    setLoading(true);
    setPalettes(null);
    try {
      const res = await fetch('/api/generate-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: config.brandName ?? '',
          appDescription: config.appDescription ?? '',
          style: config.style ?? 'minimal',
        }),
      });
      const data = await res.json();
      setPalettes(data.palettes ?? []);
    } catch {
      setPalettes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPalettes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPalette = (idx: number) => {
    const p = palettes![idx];
    setSelectedPaletteIdx(idx);
    onChange({
      primaryColor: p.primaryColor,
      secondaryColor: p.secondaryColor,
      accentColor: p.accentColor,
      successColor: p.successColor,
      warningColor: p.warningColor,
      destructiveColor: p.destructiveColor,
    });
  };

  const allFields = [...BRAND_COLOR_FIELDS, ...SEMANTIC_COLOR_FIELDS];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink-bright mb-1">
          Choose your palette
        </h2>
        <p className="text-ink-muted text-sm">
          Generated based on your app description. Pick one and fine-tune if needed.
        </p>
      </div>

      {/* Palette cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex-1 h-5 rounded shimmer-bg" />
                ))}
              </div>
              <div className="h-3 w-20 rounded shimmer-bg" />
              <div className="h-2.5 w-full rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : palettes && palettes.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {palettes.map((p, i) => (
              <PaletteCard
                key={i}
                palette={p}
                selected={selectedPaletteIdx === i}
                onClick={() => selectPalette(i)}
              />
            ))}
          </div>
          <button
            onClick={fetchPalettes}
            className="text-ink-muted hover:text-ink text-xs transition-colors flex items-center gap-1"
          >
            ↻ Regenerate suggestions
          </button>
        </>
      ) : null}

      {/* Fine-tune toggle */}
      <div>
        <button
          onClick={() => setShowFineTune((v) => !v)}
          className="text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
        >
          <span className={`transition-transform ${showFineTune ? 'rotate-90' : ''}`}>▶</span>
          Fine-tune individual colors
        </button>
        {showFineTune && (
          <div className="mt-3 space-y-4">
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Brand</div>
              {BRAND_COLOR_FIELDS.map(({ key, label, default: def }) => {
                const value = (config[key] as string) ?? def;
                return (
                  <div key={key} className="flex items-center gap-3 bg-bg-elevated border border-border rounded-lg px-3 py-2.5">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => { onChange({ [key]: e.target.value }); setSelectedPaletteIdx(null); }}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <div className="flex-1">
                      <div className="text-ink text-xs font-medium">{label}</div>
                      <div className="text-ink-subtle font-mono text-[10px]">{value}</div>
                    </div>
                    <div className="w-10 h-5 rounded" style={{ backgroundColor: value }} />
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Semantic</div>
              <p className="text-[10px] text-ink-subtle">Used in alerts, validation, and status indicators.</p>
              {SEMANTIC_COLOR_FIELDS.map(({ key, label, default: def }) => {
                const value = (config[key] as string) ?? def;
                return (
                  <div key={key} className="flex items-center gap-3 bg-bg-elevated border border-border rounded-lg px-3 py-2.5">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => { onChange({ [key]: e.target.value }); setSelectedPaletteIdx(null); }}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <div className="flex-1">
                      <div className="text-ink text-xs font-medium">{label}</div>
                      <div className="text-ink-subtle font-mono text-[10px]">{value}</div>
                    </div>
                    <div className="w-10 h-5 rounded" style={{ backgroundColor: value }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Live swatch strip — all 6 colors */}
      {selectedPaletteIdx !== null && (
        <div className="flex gap-1.5">
          {allFields.map(({ key, default: def }) => (
            <div
              key={key}
              className="flex-1 h-1.5 rounded-full"
              style={{ backgroundColor: (config[key] as string) ?? def }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StepStyle({ config, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink-bright mb-1">
          Choose your style
        </h2>
        <p className="text-ink-muted text-sm">
          Sets the visual language for spacing, borders, animations, and typography.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange({ style: s.id })}
            className={`p-4 border rounded-lg text-left transition-all ${
              config.style === s.id
                ? 'border-accent/60 bg-accent/5 glow-accent-sm'
                : 'border-border bg-bg-elevated hover:border-border-bright'
            }`}
          >
            <div className="text-ink font-semibold text-sm mb-1">{s.label}</div>
            <div className="text-ink-muted text-xs mb-3">{s.desc}</div>
            <div className={`inline-block ${s.preview}`}>Button</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDarkMode({ config, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink-bright mb-1">
          Dark mode support?
        </h2>
        <p className="text-ink-muted text-sm">
          Adds <code className="text-accent text-xs bg-accent/10 px-1 rounded">dark:</code> Tailwind variants to all generated components.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([false, true] as const).map((val) => (
          <button
            key={String(val)}
            onClick={() => onChange({ darkMode: val })}
            className={`p-5 border rounded-lg text-left transition-all ${
              config.darkMode === val
                ? 'border-accent/60 bg-accent/5 glow-accent-sm'
                : 'border-border bg-bg-elevated hover:border-border-bright'
            }`}
          >
            <div className="text-2xl mb-2">{val ? '🌙' : '☀️'}</div>
            <div className="text-ink font-semibold text-sm">{val ? 'Yes, dark mode' : 'Light only'}</div>
            <div className="text-ink-muted text-xs mt-1">
              {val ? 'Components include dark: variants' : 'Light theme components only'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCategories({ config, onChange }: StepProps) {
  const selected = config.componentCategories ?? [];
  const toggle = (id: ComponentCategory) => {
    const next = selected.includes(id)
      ? selected.filter((c) => c !== id)
      : [...selected, id];
    onChange({ componentCategories: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink-bright mb-1">
          What will you build?
        </h2>
        <p className="text-ink-muted text-sm">
          Claude uses this as context for suggestions. You can always ask for anything.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((cat) => {
          const active = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className={`flex items-center gap-3 px-4 py-3 border rounded-lg transition-all ${
                active
                  ? 'border-accent/60 bg-accent/5 text-accent'
                  : 'border-border bg-bg-elevated text-ink-muted hover:text-ink hover:border-border-bright'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.label}</span>
              {active && (
                <span className="ml-auto text-accent text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const STEPS = ['overview', 'colors', 'style', 'darkmode', 'categories'] as const;
type Step = (typeof STEPS)[number];

const DEFAULT_CONFIG: SessionConfig = {
  appDescription: '',
  brandName: '',
  designNotes: '',
  primaryColor: '#5eead4',
  secondaryColor: '#a78bfa',
  accentColor: '#fbbf24',
  successColor: '#22c55e',
  warningColor: '#f59e0b',
  destructiveColor: '#ef4444',
  style: 'minimal',
  darkMode: false,
  componentCategories: ['buttons', 'cards'],
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [config, setConfig] = useState<Partial<SessionConfig>>(DEFAULT_CONFIG);
  const [submitting, setSubmitting] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const patch = (p: Partial<SessionConfig>) => setConfig((c) => ({ ...c, ...p }));

  const canAdvance = () => {
    if (step === 'overview') {
      return (config.brandName ?? '').trim().length > 0 && (config.appDescription ?? '').trim().length >= 10;
    }
    if (step === 'categories') return (config.componentCategories?.length ?? 0) > 0;
    return true;
  };

  const handleNext = async () => {
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    try {
      // Create session
      const createRes = await fetch('/api/sessions', { method: 'POST' });
      const { session } = await createRes.json();

      // Save config
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, config }),
      });

      router.push(`/sessions/${session.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-accent/20 border border-accent/40 flex items-center justify-center">
              <span className="text-accent text-xs font-bold">▲</span>
            </div>
            <span className="font-display text-lg font-bold text-ink-bright tracking-tight">
              Component Builder
            </span>
          </div>
          <p className="text-ink-muted text-xs">Design Angular component libraries with AI</p>
        </div>

        {/* Step progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Step card */}
        <div className="bg-bg-surface border border-border rounded-2xl p-8 shadow-2xl border-inset">
          {step === 'overview' && <StepOverview config={config} onChange={patch} />}
          {step === 'colors' && <StepColors config={config} onChange={patch} />}
          {step === 'style' && <StepStyle config={config} onChange={patch} />}
          {step === 'darkmode' && <StepDarkMode config={config} onChange={patch} />}
          {step === 'categories' && <StepCategories config={config} onChange={patch} />}

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="text-ink-muted hover:text-ink text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className="flex items-center gap-2 bg-accent text-bg-base font-semibold px-6 py-2.5 rounded-lg text-sm transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-bg-base/40 border-t-bg-base rounded-full animate-spin" />
                  Setting up…
                </>
              ) : isLast ? (
                'Start building →'
              ) : (
                'Next →'
              )}
            </button>
          </div>
        </div>

        {/* Step label */}
        <div className="text-center mt-4 text-ink-subtle text-xs">
          Step {stepIndex + 1} of {STEPS.length}
        </div>
      </div>
    </div>
  );
}

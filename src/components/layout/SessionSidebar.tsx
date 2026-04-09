'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@/types/session';

interface Props {
  activeSessionId: string;
  activeSession: Session | null;
  onOpenSettings: () => void;
}

export default function SessionSidebar({ activeSessionId, activeSession, onOpenSettings }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, [activeSessionId]);

  const createSession = async () => {
    const res = await fetch('/api/sessions', { method: 'POST' });
    const { session } = await res.json();
    router.push(`/onboarding?sessionId=${session.id}`);
  };

  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
          <span className="text-accent text-[10px] font-bold">▲</span>
        </div>
        <span className="font-display text-sm font-bold text-ink-bright tracking-tight">
          Component Builder
        </span>
      </div>

      {/* New session button */}
      <div className="px-3 py-3 border-b border-border">
        <button
          onClick={createSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 text-ink-muted hover:text-accent text-xs font-medium transition-all"
        >
          <span className="text-base leading-none">+</span>
          New design system
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-4 py-6 text-ink-subtle text-xs text-center">
            No sessions yet
          </div>
        ) : (
          sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className={`flex flex-col px-3 py-2.5 mx-2 rounded-lg mb-0.5 transition-all group ${
                s.id === activeSessionId
                  ? 'bg-accent/10 border border-accent/20'
                  : 'hover:bg-bg-elevated border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    s.id === activeSessionId ? 'bg-accent' : 'bg-ink-subtle group-hover:bg-ink-muted'
                  }`}
                />
                <span
                  className={`text-xs font-medium truncate ${
                    s.id === activeSessionId ? 'text-accent' : 'text-ink-muted group-hover:text-ink'
                  }`}
                >
                  {s.name}
                </span>
              </div>
              <div className="pl-3.5 mt-0.5">
                <span className="text-[10px] text-ink-subtle">
                  {new Date(s.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Design System summary strip */}
      {activeSession && (
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                {/* Color swatches */}
                <div
                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: activeSession.config.primaryColor }}
                />
                <div
                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: activeSession.config.secondaryColor }}
                />
                <div
                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: activeSession.config.accentColor }}
                />
                <span className="text-[10px] text-ink-subtle ml-1 capitalize">{activeSession.config.style}</span>
              </div>
              {activeSession.config.appDescription && (
                <p className="text-[10px] text-ink-subtle leading-relaxed line-clamp-2">
                  {activeSession.config.appDescription}
                </p>
              )}
            </div>
            <button
              onClick={onOpenSettings}
              title="Edit design system"
              className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-ink-subtle hover:text-ink hover:bg-bg-elevated transition-all text-xs"
            >
              ✏
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[10px] text-ink-subtle">
          Angular · Tailwind · Claude
        </div>
      </div>
    </aside>
  );
}

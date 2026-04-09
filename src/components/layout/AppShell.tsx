'use client';
import { useCallback, useRef, useState } from 'react';
import type { Session } from '@/types/session';
import type { ComponentRecord } from '@/types/component';
import SessionSidebar from './SessionSidebar';
import DesignSystemPanel from './DesignSystemPanel';
import ChatPanel from '@/components/chat/ChatPanel';
import GalleryPanel from '@/components/gallery/GalleryPanel';
import PagesPanel from '@/components/pages/PagesPanel';
import { useComponents } from '@/hooks/useComponents';

type Tab = 'components' | 'pages';

interface Props {
  session: Session;
}

export default function AppShell({ session: initialSession }: Props) {
  const [session, setSession] = useState<Session>(initialSession);
  const [activeTab, setActiveTab] = useState<Tab>('components');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { components, upsertComponent, replaceComponents } = useComponents(session.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newComponentIds, setNewComponentIds] = useState<Set<string>>(new Set());
  const chatPrefillRef = useRef<((text: string) => void) | null>(null);

  const handleComponentReady = useCallback((c: ComponentRecord) => {
    upsertComponent(c);
    setNewComponentIds((prev) => new Set([...prev, c.id]));
    setTimeout(() => {
      setNewComponentIds((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }, 1200);
  }, [upsertComponent]);

  const handleExtractComponent = useCallback((name: string, description: string, pageName: string) => {
    setActiveTab('components');
    const message = `Create a ${name} component: ${description}. This is needed for the "${pageName}" page.`;
    // Small delay to let the tab switch render
    setTimeout(() => chatPrefillRef.current?.(message), 50);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      <SessionSidebar
        activeSessionId={session.id}
        activeSession={session}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-surface flex-shrink-0">
          {(['components', 'pages'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'components' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Chat panel */}
            <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
              <ChatPanel
                session={session}
                components={components}
                onComponentReady={handleComponentReady}
                onSelectComponent={setSelectedId}
                onDesignNotesUpdated={(notes) =>
                  setSession((s) => ({ ...s, config: { ...s.config, designNotes: notes } }))
                }
                prefillRef={chatPrefillRef}
              />
            </div>

            {/* Gallery */}
            <div className="flex-1 overflow-hidden">
              <GalleryPanel
                session={session}
                components={components}
                selectedId={selectedId}
                onSelectComponent={setSelectedId}
                newComponentIds={newComponentIds}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <PagesPanel
              session={session}
              onExtractComponent={handleExtractComponent}
            />
          </div>
        )}
      </div>

      {settingsOpen && (
        <DesignSystemPanel
          session={session}
          onClose={() => setSettingsOpen(false)}
          onSessionUpdated={(updated) => setSession(updated)}
          onColorsApplied={replaceComponents}
        />
      )}
    </div>
  );
}

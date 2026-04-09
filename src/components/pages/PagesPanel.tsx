'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Page, MissingComponent } from '@/types/page';
import type { Session } from '@/types/session';
import NewPageModal from './NewPageModal';
import PageChat from './PageChat';

interface Props {
  session: Session;
  onExtractComponent: (name: string, description: string, pageName: string) => void;
}

export default function PagesPanel({ session, onExtractComponent }: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const selectedPage = pages.find((p) => p.id === selectedId) ?? null;

  const load = useCallback(() => {
    fetch(`/api/pages/${session.id}`)
      .then((r) => r.json())
      .then((d) => {
        const loaded: Page[] = d.pages ?? [];
        setPages(loaded);
        if (!selectedId && loaded.length > 0) setSelectedId(loaded[0].id);
      });
  }, [session.id, selectedId]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (page: { id: string; name: string }) => {
    setShowNewModal(false);
    load();
    setSelectedId(page.id);
  };

  const handlePreviewUpdated = (previewHtml: string, missingComponents: MissingComponent[]) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, previewHtml, missingComponents, stale: false } : p
      )
    );
  };

  const handleRefresh = async () => {
    if (!selectedPage) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pages/${session.id}/${selectedPage.id}/refresh`, { method: 'POST' });
      const { page } = await res.json();
      setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    await fetch(`/api/pages/${session.id}/${pageId}`, { method: 'DELETE' });
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    if (selectedId === pageId) setSelectedId(null);
  };

  return (
    <div className="flex h-full">
      {/* Page list */}
      <aside className="w-[200px] flex-shrink-0 flex flex-col border-r border-border bg-bg-surface">
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 text-ink-muted hover:text-accent text-xs font-medium transition-all"
          >
            <span className="text-base leading-none">+</span>
            New page
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1.5">
          {pages.length === 0 ? (
            <p className="text-ink-subtle text-[10px] text-center px-3 py-6">No pages yet</p>
          ) : (
            pages.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center gap-1.5 px-3 py-2 mx-1.5 mb-0.5 rounded-lg cursor-pointer transition-all ${
                  p.id === selectedId
                    ? 'bg-accent/10 border border-accent/20'
                    : 'hover:bg-bg-elevated border border-transparent'
                }`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  p.id === selectedId ? 'bg-accent' : 'bg-ink-subtle'
                }`} />
                <span className={`flex-1 text-xs truncate ${
                  p.id === selectedId ? 'text-accent font-medium' : 'text-ink-muted'
                }`}>{p.name}</span>
                {p.stale && (
                  <span className="text-[8px] text-amber font-medium">⟳</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-rose text-xs ml-auto transition-all"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main area */}
      {selectedPage ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden border-b border-border" style={{ minHeight: 0 }}>
            {/* Preview toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-surface flex-shrink-0">
              <div>
                <span className="text-xs font-semibold text-ink">{selectedPage.name}</span>
                {selectedPage.description && (
                  <span className="text-[10px] text-ink-muted ml-2">{selectedPage.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedPage.stale && (
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1 text-[10px] text-amber hover:text-amber/80 border border-amber/20 bg-amber/5 px-2 py-1 rounded-md transition-all disabled:opacity-50"
                  >
                    <span className={refreshing ? 'animate-spin inline-block' : ''}>⟳</span>
                    {refreshing ? 'Refreshing…' : 'Components updated — refresh'}
                  </button>
                )}
                {selectedPage.previewHtml && (
                  <button
                    onClick={() => setFullscreen(true)}
                    title="Fullscreen preview"
                    className="flex items-center justify-center w-6 h-6 rounded-md text-ink-muted hover:text-ink hover:bg-bg-elevated border border-transparent hover:border-border transition-all text-xs"
                  >
                    ⛶
                  </button>
                )}
              </div>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 overflow-hidden bg-bg-base">
              {selectedPage.previewHtml ? (
                <iframe
                  key={selectedPage.previewHtml}
                  srcDoc={selectedPage.previewHtml}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0"
                  title={selectedPage.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-ink-subtle text-xs">
                  Use the chat below to generate this page
                </div>
              )}
            </div>

            {/* Missing components chips */}
            {selectedPage.missingComponents.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-bg-surface flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-ink-muted font-medium">Missing:</span>
                  {selectedPage.missingComponents.map((mc) => (
                    <button
                      key={mc.selector}
                      onClick={() => onExtractComponent(mc.name, mc.description, selectedPage.name)}
                      title={mc.description}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber/8 border border-amber/25 rounded-full text-amber text-[10px] font-medium hover:bg-amber/15 transition-colors"
                    >
                      <span className="text-[8px]">⬡</span>
                      {mc.name}
                      <span className="text-amber/60 text-[9px]">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="flex-shrink-0" style={{ height: '260px' }}>
            <PageChat
              page={selectedPage}
              onPreviewUpdated={handlePreviewUpdated}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-accent text-lg">▤</span>
            </div>
            <p className="text-ink-muted text-xs">Create a page to start designing</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-3 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              + New page
            </button>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewPageModal
          sessionId={session.id}
          onCreated={handleCreated}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {fullscreen && selectedPage?.previewHtml && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="relative bg-bg-base rounded-xl overflow-hidden shadow-2xl"
            style={{ width: '390px', height: '844px', maxHeight: '92vh', maxWidth: '92vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => setFullscreen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white text-sm transition-colors"
              >
                ×
              </button>
            </div>
            <iframe
              key={selectedPage.previewHtml}
              srcDoc={selectedPage.previewHtml}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              title={selectedPage.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}

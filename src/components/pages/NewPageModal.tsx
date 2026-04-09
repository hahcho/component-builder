'use client';
import { useState } from 'react';

interface Props {
  sessionId: string;
  onCreated: (page: { id: string; name: string }) => void;
  onClose: () => void;
}

export default function NewPageModal({ sessionId, onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/pages/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const { page } = await res.json();
      onCreated(page);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-bright/10" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-surface border border-border rounded-2xl p-6 shadow-2xl animate-slide-up">
        <h2 className="font-display font-bold text-ink-bright text-base mb-1">New page</h2>
        <p className="text-ink-muted text-xs mb-5">Give this page a name and a brief description of what it does.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Page name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Follow-up screen, Dashboard, Onboarding"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-ink text-sm focus:outline-none focus:border-accent/60 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Shows workout completion summary with a list of exercises done and progress toward weekly goal."
              rows={3}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-ink text-sm focus:outline-none focus:border-accent/60 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex items-center gap-2 bg-accent text-bg-base font-semibold px-5 py-2 rounded-lg text-sm hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? (
              <><span className="w-3 h-3 border-2 border-bg-base/40 border-t-bg-base rounded-full animate-spin" /> Creating…</>
            ) : 'Create page →'}
          </button>
        </div>
      </div>
    </div>
  );
}

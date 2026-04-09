'use client';
import { useEffect, useRef, useState } from 'react';
import { usePageStream } from '@/hooks/usePageStream';
import type { Page, PageMessage, MissingComponent } from '@/types/page';

interface Props {
  page: Page;
  onPreviewUpdated: (previewHtml: string, missingComponents: MissingComponent[]) => void;
}

export default function PageChat({ page, onPreviewUpdated }: Props) {
  const [messages, setMessages] = useState<PageMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [input, setInput] = useState('');
  const { send, isStreaming } = usePageStream();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/page-messages/${page.id}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }, [page.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    setStreamingText('');
    setMessages((prev) => [...prev, {
      id: `temp-${Date.now()}`, pageId: page.id, role: 'user', content: trimmed,
      createdAt: new Date().toISOString(),
    }]);

    send(page.id, trimmed, {
      onChatDelta: (d) => setStreamingText((p) => p + d),
      onDone: (_msgId, previewHtml, missingComponents) => {
        fetch(`/api/page-messages/${page.id}`)
          .then((r) => r.json())
          .then((d) => { setMessages(d.messages ?? []); setStreamingText(''); });
        onPreviewUpdated(previewHtml, missingComponents);
      },
      onError: (msg) => {
        setStreamingText('');
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`, pageId: page.id, role: 'assistant',
          content: `⚠️ ${msg.includes('Overloaded') ? 'Claude is overloaded — please try again in a moment.' : `Error: ${msg}`}`,
          createdAt: new Date().toISOString(),
        }]);
      },
    });
  };

  const placeholder = messages.length === 0
    ? `Describe the ${page.name} layout… e.g. "${page.description || 'Create the initial layout'}"`
    : 'Iterate on this page…';

  return (
    <div className="flex flex-col h-full border-t border-border">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-bg-base min-h-0">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-6">
            <p className="text-ink-subtle text-xs">
              {page.description
                ? <span className="text-ink-muted italic">&ldquo;{page.description}&rdquo;</span>
                : 'Describe what this page should show'}
            </p>
            {page.description && (
              <button
                onClick={() => { setInput(page.description); setTimeout(() => handleSend, 0); }}
                className="mt-3 text-xs text-accent hover:text-accent/80 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); handleSend(); }}
              >
                → Generate from description
              </button>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent text-[9px] font-bold">◆</span>
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent/10 border border-accent/20 text-ink'
                : 'bg-bg-surface border border-border text-ink'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && streamingText && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-md bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-accent text-[9px] font-bold animate-pulse">◆</span>
            </div>
            <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs bg-bg-surface border border-border text-ink leading-relaxed">
              {streamingText}
            </div>
          </div>
        )}
        {isStreaming && !streamingText && (
          <div className="flex gap-1.5 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 bg-bg-surface border-t border-border flex-shrink-0">
        <div className={`flex items-end gap-2 bg-bg-elevated border rounded-xl px-3 py-2 transition-all ${
          isStreaming ? 'opacity-60 border-border' : 'border-border hover:border-border-bright focus-within:border-accent/50'
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={isStreaming}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-ink placeholder-ink-subtle text-xs resize-none focus:outline-none leading-relaxed"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-7 h-7 rounded-lg bg-accent text-bg-base flex items-center justify-center transition-all hover:bg-accent/90 disabled:opacity-30 flex-shrink-0"
          >
            {isStreaming ? (
              <span className="w-3 h-3 border-2 border-bg-base/40 border-t-bg-base rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M7 2L2 7M7 2L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

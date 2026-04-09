'use client';
import { useEffect, useRef, useState, MutableRefObject } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import type { Message } from '@/types/message';
import type { ComponentRecord } from '@/types/component';
import type { Session } from '@/types/session';

interface Props {
  session: Session;
  components: ComponentRecord[];
  onComponentReady: (c: ComponentRecord) => void;
  onSelectComponent: (id: string) => void;
  onDesignNotesUpdated?: (notes: string) => void;
  prefillRef?: MutableRefObject<((text: string) => void) | null>;
}

interface DisplayMessage extends Omit<Message, 'sessionId'> {
  sessionId?: string;
}

export default function ChatPanel({ session, components, onComponentReady, onSelectComponent, onDesignNotesUpdated, prefillRef }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [prefillText, setPrefillText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { send, isStreaming } = useStreamingResponse(session.id);

  // Expose prefill setter to parent via ref
  useEffect(() => {
    if (prefillRef) prefillRef.current = setPrefillText;
  }, [prefillRef]);

  // Load history
  useEffect(() => {
    fetch(`/api/messages/${session.id}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
      })
      .finally(() => setLoadingHistory(false));
  }, [session.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = (content: string, includeComponents = false) => {
    // Optimistically add user message
    const userMsg: DisplayMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      componentIds: [],
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreamingText('');

    send(content, {
      onChatDelta: (delta) => setStreamingText((p) => p + delta),
      onComponentReady: (c) => onComponentReady(c),
      onDone: (_messageId, _componentIds, designNotes) => {
        fetch(`/api/messages/${session.id}`)
          .then((r) => r.json())
          .then((d) => {
            setMessages(d.messages ?? []);
            setStreamingText('');
          });
        if (designNotes) onDesignNotesUpdated?.(designNotes);
      },
      onError: (msg) => {
        setStreamingText(`Error: ${msg}`);
      },
    }, { includeComponents });
  };

  const getSuggestions = () => {
    const cats = session.config.componentCategories ?? [];
    const suggestions: string[] = [];
    if (cats.includes('buttons')) suggestions.push('Create a primary button with loading state');
    if (cats.includes('cards')) suggestions.push('Design an info card component');
    if (cats.includes('forms')) suggestions.push('Build an email input with validation');
    if (cats.includes('navigation')) suggestions.push('Create a top navigation bar');
    if (cats.includes('badges')) suggestions.push('Make status badge variants');
    if (cats.includes('alerts')) suggestions.push('Build an alert/toast component');
    return suggestions.slice(0, 3);
  };

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-bg-surface">
        <div>
          <div className="text-sm font-semibold text-ink">{session.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: session.config.primaryColor }}
            />
            <span className="text-[10px] text-ink-muted capitalize">{session.config.style}</span>
            <span className="text-[10px] text-ink-subtle">·</span>
            <span className="text-[10px] text-ink-muted">
              {session.config.darkMode ? 'dark mode' : 'light'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-bg-base">
        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg shimmer-bg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded shimmer-bg w-3/4" />
                  <div className="h-4 rounded shimmer-bg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
              <span className="text-accent text-xl">◆</span>
            </div>
            <h3 className="font-display font-bold text-ink text-base mb-1">
              Start designing
            </h3>
            <p className="text-ink-muted text-xs max-w-[240px] mb-6">
              Describe the components you want. Claude will generate Angular-ready code with Tailwind.
            </p>
            <div className="space-y-2 w-full">
              {getSuggestions().map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left px-3 py-2.5 bg-bg-surface border border-border rounded-lg text-xs text-ink-muted hover:text-ink hover:border-border-bright transition-all"
                >
                  <span className="text-accent mr-2">→</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg as Message}
                components={components}
                onSelectComponent={onSelectComponent}
              />
            ))}
            {/* Streaming message */}
            {isStreaming && streamingText && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent text-xs font-bold">◆</span>
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed bg-bg-surface border border-border/60 text-ink">
                    <div className="prose-chat">
                      <ReactMarkdownContent content={streamingText} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isStreaming && !streamingText && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent text-xs font-bold animate-pulse">◆</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={(content, includeComponents) => { setPrefillText(''); handleSend(content, includeComponents); }}
        disabled={isStreaming}
        hasComponents={components.length > 0}
        prefill={prefillText}
      />
    </div>
  );
}

// Inline markdown renderer to avoid import issues
function ReactMarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose-chat">
      {lines.map((line, i) => (
        <p key={i}>{line || <br />}</p>
      ))}
    </div>
  );
}

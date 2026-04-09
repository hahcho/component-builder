'use client';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types/message';
import type { ComponentRecord } from '@/types/component';

interface Props {
  message: Message;
  components?: ComponentRecord[];
  onSelectComponent?: (id: string) => void;
}

export default function ChatMessage({ message, components = [], onSelectComponent }: Props) {
  const isUser = message.role === 'user';
  const linkedComponents = components.filter((c) => message.componentIds.includes(c.id));

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
          isUser
            ? 'bg-ink-subtle text-ink-muted'
            : 'bg-accent/20 border border-accent/30 text-accent'
        }`}
      >
        {isUser ? 'U' : '◆'}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div
          className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
            isUser
              ? 'bg-bg-elevated border border-border text-ink ml-auto'
              : 'bg-bg-surface border border-border/60 text-ink'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Component pills */}
        {linkedComponents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkedComponents.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectComponent?.(c.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 rounded-full text-accent text-[11px] font-medium hover:bg-accent/20 transition-colors"
              >
                <span className="w-1 h-1 rounded-full bg-accent" />
                {c.name}
                {c.version > 1 && (
                  <span className="text-accent/60">v{c.version}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="text-[10px] text-ink-subtle">
          {new Date(message.createdAt).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

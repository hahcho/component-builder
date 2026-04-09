'use client';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

interface Props {
  onSend: (message: string, includeComponents: boolean) => void;
  disabled?: boolean;
  hasComponents?: boolean;
  prefill?: string;
}

export default function ChatInput({ onSend, disabled, hasComponents, prefill }: Props) {
  const [value, setValue] = useState('');
  const [includeComponents, setIncludeComponents] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      textareaRef.current?.focus();
    }
  }, [prefill]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, includeComponents);
    setValue('');
    setIncludeComponents(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="border-t border-border bg-bg-surface px-4 py-3">
      <div
        className={`flex items-end gap-3 bg-bg-elevated border rounded-xl px-3 py-2.5 transition-all ${
          disabled ? 'opacity-60 border-border' : 'border-border hover:border-border-bright focus-within:border-accent/50 focus-within:glow-accent-sm'
        }`}
      >
        {/* Include components toggle */}
        {hasComponents && (
          <button
            type="button"
            onClick={() => setIncludeComponents((v) => !v)}
            disabled={disabled}
            title={includeComponents ? 'Component code will be sent — click to disable' : 'Include component code in context'}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all mb-0.5 ${
              includeComponents
                ? 'bg-accent/15 text-accent border border-accent/40'
                : 'text-ink-subtle hover:text-ink-muted hover:bg-bg-surface border border-transparent'
            }`}
          >
            {'</>'}
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Generating…' : 'Describe a component… (Enter to send, Shift+Enter for newline)'}
          rows={1}
          className="flex-1 bg-transparent text-ink placeholder-ink-subtle text-sm resize-none focus:outline-none leading-relaxed"
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent text-bg-base flex items-center justify-center transition-all hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {disabled ? (
            <span className="w-3.5 h-3.5 border-2 border-bg-base/40 border-t-bg-base rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L2 7M7 2L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      <div className="flex justify-between mt-1.5 px-1">
        <div className="text-[10px] text-ink-subtle">
          {includeComponents
            ? <span className="text-accent">Full component code included in context</span>
            : 'Generates Angular 17+ standalone components with Tailwind'
          }
        </div>
        <div className="text-[10px] text-ink-subtle">Shift+Enter for newline</div>
      </div>
    </div>
  );
}

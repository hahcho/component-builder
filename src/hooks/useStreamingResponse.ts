'use client';
import { useCallback, useState } from 'react';
import type { ComponentRecord } from '@/types/component';

export interface StreamCallbacks {
  onChatDelta?: (delta: string) => void;
  onComponentReady?: (component: ComponentRecord) => void;
  onDone?: (messageId: string, componentIds: string[], designNotes?: string) => void;
  onError?: (message: string) => void;
}

export interface SendOptions {
  includeComponents?: boolean;
}

export function useStreamingResponse(sessionId: string) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string, callbacks: StreamCallbacks, options: SendOptions = {}) => {
      setIsStreaming(true);
      setError(null);

      try {
        const res = await fetch(`/api/messages/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, includeComponents: options.includeComponents ?? false }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'chat_delta') {
                callbacks.onChatDelta?.(event.delta);
              } else if (event.type === 'component_ready') {
                callbacks.onComponentReady?.(event.component);
              } else if (event.type === 'done') {
                callbacks.onDone?.(event.messageId, event.componentIds, event.designNotes);
              } else if (event.type === 'error') {
                callbacks.onError?.(event.message);
                setError(event.message);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream failed';
        setError(msg);
        callbacks.onError?.(msg);
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId]
  );

  return { send, isStreaming, error };
}

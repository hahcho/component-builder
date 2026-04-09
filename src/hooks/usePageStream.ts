'use client';
import { useCallback, useState } from 'react';
import type { MissingComponent } from '@/types/page';

export interface PageStreamCallbacks {
  onChatDelta?: (delta: string) => void;
  onDone?: (messageId: string, previewHtml: string, missingComponents: MissingComponent[]) => void;
  onError?: (message: string) => void;
}

export function usePageStream() {
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(async (pageId: string, content: string, callbacks: PageStreamCallbacks) => {
    setIsStreaming(true);
    try {
      const res = await fetch(`/api/page-messages/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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
            if (event.type === 'chat_delta') callbacks.onChatDelta?.(event.delta);
            else if (event.type === 'done') callbacks.onDone?.(event.messageId, event.previewHtml, event.missingComponents);
            else if (event.type === 'error') callbacks.onError?.(event.message);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err.message : 'Stream failed');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { send, isStreaming };
}

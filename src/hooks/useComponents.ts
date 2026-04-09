'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ComponentRecord } from '@/types/component';

export function useComponents(sessionId: string) {
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/components/${sessionId}`);
      const data = await res.json();
      setComponents(data.components ?? []);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertComponent = useCallback((component: ComponentRecord) => {
    setComponents((prev) => {
      const idx = prev.findIndex((c) => c.id === component.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = component;
        return next;
      }
      return [component, ...prev];
    });
  }, []);

  const replaceComponents = useCallback((incoming: ComponentRecord[]) => {
    setComponents((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      incoming.forEach((c) => map.set(c.id, c));
      return Array.from(map.values());
    });
  }, []);

  return { components, loading, upsertComponent, replaceComponents, reload: load };
}

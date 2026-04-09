import type { ClaudeComponentResponse } from '@/types/component';

export function parseComponentResponse(raw: string): ClaudeComponentResponse {
  // Strip markdown code fences if Claude wraps it
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      chat: typeof parsed.chat === 'string' ? parsed.chat : '',
      components: Array.isArray(parsed.components) ? parsed.components : [],
    };
  } catch {
    // Best-effort fallback: return the raw text as chat with no components
    return {
      chat: raw,
      components: [],
    };
  }
}

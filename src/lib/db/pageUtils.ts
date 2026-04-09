import type { Page } from '@/types/page';

export function rowToPage(row: Record<string, unknown>): Page {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    layoutHtml: row.layout_html as string,
    previewHtml: row.preview_html as string,
    missingComponents: JSON.parse((row.missing_components as string) || '[]'),
    stale: Boolean(row.stale),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

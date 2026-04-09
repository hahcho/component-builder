import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { rowToPage } from '@/lib/db/pageUtils';
import { renderPagePreview } from '@/lib/utils/pageRenderer';
import type { SessionConfig } from '@/types/session';

export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string; pageId: string } }
) {
  const db = getDB();

  const pageRow = db
    .prepare('SELECT * FROM pages WHERE id = ? AND session_id = ?')
    .get(params.pageId, params.sessionId) as Record<string, unknown> | undefined;
  if (!pageRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sessionRow = db.prepare('SELECT config FROM sessions WHERE id = ?').get(params.sessionId) as
    | Record<string, unknown>
    | undefined;
  if (!sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const config: SessionConfig = JSON.parse((sessionRow.config as string) || '{}');
  const componentRows = db
    .prepare('SELECT selector, preview_html FROM components WHERE session_id = ?')
    .all(params.sessionId) as Array<{ selector: string; preview_html: string }>;

  const componentList = componentRows.map((c) => ({ selector: c.selector, previewHtml: c.preview_html }));
  const availableSelectors = new Set(componentRows.map((c) => c.selector));

  const previewHtml = renderPagePreview(pageRow.layout_html as string, componentList, config);

  // Remove any missing components that have since been created
  const storedMissing = JSON.parse((pageRow.missing_components as string) || '[]') as Array<{
    name: string; selector: string; description: string;
  }>;
  const stillMissing = storedMissing.filter((m) => !availableSelectors.has(m.selector));

  const now = new Date().toISOString();
  db.prepare('UPDATE pages SET preview_html = ?, missing_components = ?, stale = 0, updated_at = ? WHERE id = ?').run(
    previewHtml,
    JSON.stringify(stillMissing),
    now,
    params.pageId,
  );

  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(params.pageId) as Record<string, unknown>;
  return NextResponse.json({ page: rowToPage(row) });
}

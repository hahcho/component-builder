import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { ComponentRecord } from '@/types/component';

function rowToComponent(row: Record<string, unknown>): ComponentRecord {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    selector: row.selector as string,
    description: row.description as string,
    version: row.version as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    tsCode: row.ts_code as string,
    htmlTemplate: row.html_template as string,
    scssCode: row.scss_code as string,
    previewHtml: row.preview_html as string,
    category: row.category as ComponentRecord['category'],
    messageId: row.message_id as string,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string; componentId: string } }
) {
  const db = getDB();
  const row = db
    .prepare('SELECT * FROM components WHERE id = ? AND session_id = ?')
    .get(params.componentId, params.sessionId) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ component: rowToComponent(row) });
}

export async function PATCH(
  req: Request,
  { params }: { params: { sessionId: string; componentId: string } }
) {
  const db = getDB();
  const body = await req.json() as { name?: string; description?: string };
  const now = new Date().toISOString();

  const existing = db
    .prepare('SELECT * FROM components WHERE id = ? AND session_id = ?')
    .get(params.componentId, params.sessionId) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare('UPDATE components SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(
    body.name ?? existing.name,
    body.description ?? existing.description,
    now,
    params.componentId
  );

  const row = db
    .prepare('SELECT * FROM components WHERE id = ?')
    .get(params.componentId) as Record<string, unknown>;
  return NextResponse.json({ component: rowToComponent(row) });
}

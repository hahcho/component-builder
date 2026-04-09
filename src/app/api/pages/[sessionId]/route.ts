import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { rowToPage } from '@/lib/db/pageUtils';
import { v4 as uuidv4 } from 'uuid';

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const db = getDB();
  const rows = db
    .prepare('SELECT * FROM pages WHERE session_id = ? ORDER BY updated_at DESC')
    .all(params.sessionId) as Record<string, unknown>[];
  return NextResponse.json({ pages: rows.map(rowToPage) });
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const db = getDB();
  const { name, description } = (await req.json()) as { name: string; description: string };
  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO pages (id, session_id, name, description, layout_html, preview_html, missing_components, stale, created_at, updated_at)
    VALUES (?, ?, ?, ?, '', '', '[]', 0, ?, ?)
  `).run(id, params.sessionId, name, description || '', now, now);

  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({ page: rowToPage(row) });
}

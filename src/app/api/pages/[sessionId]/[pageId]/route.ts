import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { rowToPage } from '@/lib/db/pageUtils';

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string; pageId: string } }
) {
  const db = getDB();
  const row = db
    .prepare('SELECT * FROM pages WHERE id = ? AND session_id = ?')
    .get(params.pageId, params.sessionId) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ page: rowToPage(row) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { sessionId: string; pageId: string } }
) {
  const db = getDB();
  db.prepare('DELETE FROM pages WHERE id = ? AND session_id = ?').run(params.pageId, params.sessionId);
  return NextResponse.json({ ok: true });
}

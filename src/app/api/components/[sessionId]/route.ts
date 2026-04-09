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

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const db = getDB();
  const rows = db
    .prepare('SELECT * FROM components WHERE session_id = ? ORDER BY updated_at DESC')
    .all(params.sessionId) as Record<string, unknown>[];
  return NextResponse.json({ components: rows.map(rowToComponent) });
}

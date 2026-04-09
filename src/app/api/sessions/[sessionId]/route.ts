import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { Session, SessionConfig } from '@/types/session';

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    onboardingCompleted: Boolean(row.onboarding_completed),
    config: JSON.parse((row.config as string) || '{}'),
  };
}

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const db = getDB();
  const row = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(params.sessionId) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: rowToSession(row) });
}

export async function PATCH(req: Request, { params }: { params: { sessionId: string } }) {
  const db = getDB();
  const body = await req.json() as { name?: string; config?: Partial<SessionConfig> };

  const existing = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(params.sessionId) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();
  const existingConfig = JSON.parse((existing.config as string) || '{}');
  const newConfig = body.config ? { ...existingConfig, ...body.config } : existingConfig;
  // Auto-update session name when brandName changes (unless name is explicitly provided)
  const name = body.name ?? (body.config?.brandName
    ? `${body.config.brandName} Design System`
    : (existing.name as string));

  db.prepare('UPDATE sessions SET name = ?, config = ?, updated_at = ? WHERE id = ?').run(
    name,
    JSON.stringify(newConfig),
    now,
    params.sessionId
  );

  const row = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(params.sessionId) as Record<string, unknown>;
  return NextResponse.json({ session: rowToSession(row) });
}

export async function DELETE(_req: Request, { params }: { params: { sessionId: string } }) {
  const db = getDB();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(params.sessionId);
  return NextResponse.json({ ok: true });
}

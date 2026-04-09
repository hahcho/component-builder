import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { SessionConfig } from '@/types/session';

export async function POST(req: Request) {
  const body = await req.json() as { sessionId: string; config: SessionConfig };
  const { sessionId, config } = body;

  const db = getDB();
  const existing = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const now = new Date().toISOString();
  db.prepare(
    'UPDATE sessions SET config = ?, name = ?, onboarding_completed = 1, updated_at = ? WHERE id = ?'
  ).run(JSON.stringify(config), `${config.brandName} Design System`, now, sessionId);

  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Record<string, unknown>;
  return NextResponse.json({
    session: {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      onboardingCompleted: Boolean(row.onboarding_completed),
      config: JSON.parse(row.config as string),
    },
  });
}

import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Session } from '@/types/session';

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

export async function GET() {
  const db = getDB();
  const rows = db
    .prepare('SELECT * FROM sessions ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[];
  return NextResponse.json({ sessions: rows.map(rowToSession) });
}

export async function POST() {
  const db = getDB();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO sessions (id, name, created_at, updated_at, onboarding_completed, config) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(id, 'New Design System', now, now, '{}');

  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({ session: rowToSession(row) }, { status: 201 });
}

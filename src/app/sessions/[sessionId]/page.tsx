import { notFound, redirect } from 'next/navigation';
import { getDB } from '@/lib/db';
import type { Session } from '@/types/session';
import AppShell from '@/components/layout/AppShell';

function getSession(id: string): Session | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    onboardingCompleted: Boolean(row.onboarding_completed),
    config: JSON.parse((row.config as string) || '{}'),
  };
}

export default function SessionPage({ params }: { params: { sessionId: string } }) {
  const session = getSession(params.sessionId);
  if (!session) notFound();
  if (!session.onboardingCompleted) redirect('/onboarding');
  return <AppShell session={session} />;
}

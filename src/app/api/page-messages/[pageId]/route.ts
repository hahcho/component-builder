import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { buildPageSystemPrompt } from '@/lib/claude/pageSystemPrompt';
import { renderPagePreview } from '@/lib/utils/pageRenderer';
import type { SessionConfig } from '@/types/session';
import type { MissingComponent } from '@/types/page';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(_req: Request, { params }: { params: { pageId: string } }) {
  const db = getDB();
  const rows = db
    .prepare('SELECT * FROM page_messages WHERE page_id = ? ORDER BY created_at ASC')
    .all(params.pageId) as Record<string, unknown>[];
  return NextResponse.json({
    messages: rows.map((r) => ({
      id: r.id,
      pageId: r.page_id,
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(req: Request, { params }: { params: { pageId: string } }) {
  const db = getDB();
  const { pageId } = params;

  const pageRow = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId) as
    | Record<string, unknown>
    | undefined;
  if (!pageRow) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

  const sessionRow = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(pageRow.session_id as string) as Record<string, unknown> | undefined;
  if (!sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const config: SessionConfig = JSON.parse((sessionRow.config as string) || '{}');
  const { content } = (await req.json()) as { content: string };

  // Persist user message
  const userMsgId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO page_messages (id, page_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userMsgId, pageId, 'user', content, now);

  // Build context: available components
  const componentRows = db
    .prepare('SELECT name, selector, description, preview_html FROM components WHERE session_id = ? ORDER BY updated_at DESC')
    .all(pageRow.session_id as string) as Array<{
      name: string; selector: string; description: string; preview_html: string;
    }>;

  const systemPrompt = buildPageSystemPrompt(config, componentRows);

  // Build history (last 10 turns for this page)
  const historyRows = db
    .prepare('SELECT role, content FROM page_messages WHERE page_id = ? ORDER BY created_at ASC LIMIT 10')
    .all(pageId) as Array<{ role: 'user' | 'assistant'; content: string }>;

  // Current page state as context if we have a layout already
  const currentLayout = (pageRow.layout_html as string) || '';
  const userMessageWithContext = currentLayout
    ? `${content}\n\n---\nCurrent page layout (iterate on this):\n${currentLayout}`
    : content;

  const history = historyRows.slice(0, -1);
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessageWithContext },
  ];

  const encoder = new TextEncoder();
  let fullText = '';

  const DELIMITER = '\n---PAGE_MOCKUP---\n';
  const MISSING_DELIMITER = '\n---MISSING_COMPONENTS---\n';

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const claudeStream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 64000,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages,
        });

        let pendingBuffer = '';
        let foundDelimiter = false;

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const delta = event.delta.text;
            fullText += delta;

            if (!foundDelimiter) {
              pendingBuffer += delta;
              const delimIdx = pendingBuffer.indexOf(DELIMITER);
              if (delimIdx >= 0) {
                foundDelimiter = true;
                const chatPart = pendingBuffer.slice(0, delimIdx);
                if (chatPart) emit({ type: 'chat_delta', delta: chatPart });
                pendingBuffer = '';
              } else {
                const safeLen = Math.max(0, pendingBuffer.length - (DELIMITER.length - 1));
                if (safeLen > 0) {
                  emit({ type: 'chat_delta', delta: pendingBuffer.slice(0, safeLen) });
                  pendingBuffer = pendingBuffer.slice(safeLen);
                }
              }
            }
          }
        }

        if (!foundDelimiter && pendingBuffer) {
          emit({ type: 'chat_delta', delta: pendingBuffer });
        }

        // Parse response
        const delimIdx = fullText.indexOf(DELIMITER);
        let chatContent: string;
        let rest: string;

        if (delimIdx >= 0) {
          chatContent = fullText.slice(0, delimIdx).trim();
          rest = fullText.slice(delimIdx + DELIMITER.length).trim();
        } else {
          chatContent = fullText.trim();
          rest = '';
        }

        // Split layout from missing components
        const missingIdx = rest.indexOf(MISSING_DELIMITER);
        let layoutHtml: string;
        let missingJson: string;

        if (missingIdx >= 0) {
          layoutHtml = rest.slice(0, missingIdx).trim();
          missingJson = rest.slice(missingIdx + MISSING_DELIMITER.length).trim();
        } else {
          layoutHtml = rest.trim();
          missingJson = '[]';
        }

        let missingComponents: MissingComponent[] = [];
        try {
          const arr = JSON.parse(missingJson);
          missingComponents = Array.isArray(arr) ? arr : [];
        } catch {
          missingComponents = [];
        }

        // Render preview
        const previewHtml = layoutHtml
          ? renderPagePreview(
              layoutHtml,
              componentRows.map((c) => ({ selector: c.selector, previewHtml: c.preview_html })),
              config,
            )
          : (pageRow.preview_html as string) || '';

        const msgNow = new Date().toISOString();

        // Update page
        if (layoutHtml) {
          db.prepare(`
            UPDATE pages SET layout_html = ?, preview_html = ?, missing_components = ?,
            stale = 0, updated_at = ? WHERE id = ?
          `).run(layoutHtml, previewHtml, JSON.stringify(missingComponents), msgNow, pageId);
        }

        // Persist assistant message
        const assistantMsgId = uuidv4();
        db.prepare(
          'INSERT INTO page_messages (id, page_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(assistantMsgId, pageId, 'assistant', chatContent, msgNow);

        emit({ type: 'done', messageId: assistantMsgId, previewHtml, missingComponents });
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

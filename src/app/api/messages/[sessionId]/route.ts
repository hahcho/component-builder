import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { streamComponentGeneration } from '@/lib/claude/client';
import { buildPreviewHtml, buildPreviewHtmlFromSnippet } from '@/lib/utils/iframeBuilder';
import type { ClaudeComponentPayload } from '@/types/component';
import type { ComponentRecord } from '@/types/component';
import type { SessionConfig } from '@/types/session';
import { v4 as uuidv4 } from 'uuid';

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
    .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    .all(params.sessionId) as Record<string, unknown>[];

  const messages = rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
    componentIds: JSON.parse((r.component_ids as string) || '[]'),
  }));

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const db = getDB();

  const sessionRow = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
    | Record<string, unknown>
    | undefined;
  if (!sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const config: SessionConfig = JSON.parse((sessionRow.config as string) || '{}');
  const { content, includeComponents } = (await req.json()) as { content: string; includeComponents?: boolean };

  // Persist user message
  const userMsgId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO messages (id, session_id, role, content, created_at, component_ids) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userMsgId, sessionId, 'user', content, now, '[]');

  // Build conversation history (last 10 turns)
  const historyRows = db
    .prepare(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 10'
    )
    .all(sessionId) as Array<{ role: 'user' | 'assistant'; content: string }>;

  // Build component context
  const componentRows = db
    .prepare(
      'SELECT id, name, selector, version, ts_code, html_template, scss_code FROM components WHERE session_id = ? ORDER BY updated_at DESC'
    )
    .all(sessionId) as Array<{ id: string; name: string; selector: string; version: number; ts_code: string; html_template: string; scss_code: string }>;

  let componentContext = '';
  if (componentRows.length > 0) {
    if (includeComponents) {
      // Full component code for design pass requests
      componentContext = componentRows.map((c) =>
        `Component: ${c.name} (${c.selector}) v${c.version}\n` +
        `===TS===\n${c.ts_code}\n===HTML===\n${c.html_template}\n===SCSS===\n${c.scss_code}`
      ).join('\n\n---\n\n');
    } else {
      // Metadata only for normal requests
      componentContext = componentRows
        .map((c) => `- id: "${c.id}", name: "${c.name}", selector: "${c.selector}", version: ${c.version}`)
        .join('\n');
    }
  }

  // Exclude the user message we just added from history (it'll be the last message in messages array)
  const history = historyRows.slice(0, -1);

  // Set up SSE stream
  const encoder = new TextEncoder();
  let fullText = '';

  // Delimiter that separates chat text from components JSON
  const DELIMITER = '\n---COMPONENTS---\n';

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const claudeStream = await streamComponentGeneration(config, history, content, componentContext);

        // Buffer to handle delimiter split across multiple deltas
        let pendingBuffer = '';
        let foundDelimiter = false;

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const delta = event.delta.text;
            fullText += delta;

            if (!foundDelimiter) {
              pendingBuffer += delta;
              const delimIdx = pendingBuffer.indexOf(DELIMITER);

              if (delimIdx >= 0) {
                // Emit everything before the delimiter as chat
                foundDelimiter = true;
                const chatPart = pendingBuffer.slice(0, delimIdx);
                if (chatPart) emit({ type: 'chat_delta', delta: chatPart });
                pendingBuffer = '';
              } else {
                // Safely emit all but the last (DELIMITER.length - 1) chars
                // to handle delimiters split across delta boundaries
                const safeLen = Math.max(0, pendingBuffer.length - (DELIMITER.length - 1));
                if (safeLen > 0) {
                  emit({ type: 'chat_delta', delta: pendingBuffer.slice(0, safeLen) });
                  pendingBuffer = pendingBuffer.slice(safeLen);
                }
              }
            }
            // After delimiter found: accumulate silently for component parsing
          }
        }

        // Flush any remaining chat buffer if delimiter was never found
        if (!foundDelimiter && pendingBuffer) {
          emit({ type: 'chat_delta', delta: pendingBuffer });
        }

        // Parse: split fullText on the delimiter
        const delimIdx = fullText.indexOf(DELIMITER);
        let chatContent: string;
        let componentsBlock: string;

        if (delimIdx >= 0) {
          chatContent = fullText.slice(0, delimIdx).trim();
          componentsBlock = fullText.slice(delimIdx + DELIMITER.length).trim();
        } else {
          chatContent = fullText.trim();
          componentsBlock = '';
        }

        // Split design notes out of the components block
        const NOTES_DELIMITER = '\n---DESIGN_NOTES---\n';
        let designNotesDelta: string | null = null;
        const notesIdx = componentsBlock.indexOf(NOTES_DELIMITER);
        if (notesIdx >= 0) {
          designNotesDelta = componentsBlock.slice(notesIdx + NOTES_DELIMITER.length).trim();
          componentsBlock = componentsBlock.slice(0, notesIdx).trim();
        }

        // Parse delimiter-based component blocks (avoids JSON escaping issues with code)
        function extractSection(block: string, marker: string): string {
          const start = block.indexOf(marker);
          if (start === -1) return '';
          const after = block.indexOf('\n', start) + 1;
          const markerEnd = start + marker.length;
          const nextIdx = block.indexOf('\n===', markerEnd);
          return (nextIdx === -1 ? block.slice(after) : block.slice(after, nextIdx)).trim();
        }

        const componentPayloads: ClaudeComponentPayload[] = [];
        const rawBlocks = componentsBlock.split('===COMPONENT_START===').slice(1);

        for (const rawBlock of rawBlocks) {
          const endIdx = rawBlock.indexOf('===COMPONENT_END===');
          const block = endIdx >= 0 ? rawBlock.slice(0, endIdx) : rawBlock;

          try {
            // First non-empty line is the metadata JSON
            const trimmedBlock = block.trimStart();
            const firstNewline = trimmedBlock.indexOf('\n');
            const metaJson = trimmedBlock.slice(0, firstNewline).trim();
            const rest = trimmedBlock.slice(firstNewline + 1);

            const meta = JSON.parse(metaJson) as {
              action: 'create' | 'update';
              id: string | null;
              name: string;
              selector: string;
              description: string;
              category: ClaudeComponentPayload['category'];
            };

            const tsCode = extractSection(rest, '===TS_CODE===');
            const htmlTemplate = extractSection(rest, '===HTML_TEMPLATE===');
            const scssCode = extractSection(rest, '===SCSS_CODE===');
            const previewHtml = extractSection(rest, '===PREVIEW_HTML===');

            componentPayloads.push({ ...meta, tsCode, htmlTemplate, scssCode, previewHtml });
          } catch (err) {
            console.error('[messages] Failed to parse component block:', err);
            console.error('[messages] Block (first 300 chars):', block.slice(0, 300));
          }
        }

        const parsed = { chat: chatContent, components: componentPayloads };

        const assistantMsgId = uuidv4();
        const componentIds: string[] = [];
        const msgNow = new Date().toISOString();

        // Upsert each component
        for (const payload of parsed.components) {
          const previewHtml = payload.previewHtml
            ? buildPreviewHtmlFromSnippet(payload.previewHtml, payload.scssCode, config)
            : buildPreviewHtml(payload.htmlTemplate, payload.scssCode, config);

          let componentRecord: ComponentRecord;

          if (payload.action === 'update' && payload.id) {
            const existing = db
              .prepare('SELECT version FROM components WHERE id = ? AND session_id = ?')
              .get(payload.id, sessionId) as { version: number } | undefined;

            if (existing) {
              const newVersion = existing.version + 1;
              db.prepare(`
                UPDATE components SET
                  name = ?, selector = ?, description = ?, version = ?,
                  updated_at = ?, ts_code = ?, html_template = ?,
                  scss_code = ?, preview_html = ?, category = ?, message_id = ?
                WHERE id = ? AND session_id = ?
              `).run(
                payload.name, payload.selector, payload.description, newVersion,
                msgNow, payload.tsCode, payload.htmlTemplate,
                payload.scssCode, previewHtml, payload.category, assistantMsgId,
                payload.id, sessionId
              );
              componentRecord = rowToComponent(
                db.prepare('SELECT * FROM components WHERE id = ?').get(payload.id) as Record<string, unknown>
              );
              componentIds.push(payload.id);
            } else {
              // Fallback: create if the ID doesn't exist
              const newId = uuidv4();
              db.prepare(`
                INSERT INTO components
                  (id, session_id, name, selector, description, version, created_at, updated_at,
                   ts_code, html_template, scss_code, preview_html, category, message_id)
                VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?)
              `).run(newId, sessionId, payload.name, payload.selector, payload.description,
                msgNow, msgNow, payload.tsCode, payload.htmlTemplate,
                payload.scssCode, previewHtml, payload.category, assistantMsgId);
              componentRecord = rowToComponent(
                db.prepare('SELECT * FROM components WHERE id = ?').get(newId) as Record<string, unknown>
              );
              componentIds.push(newId);
            }
          } else {
            const newId = uuidv4();
            db.prepare(`
              INSERT INTO components
                (id, session_id, name, selector, description, version, created_at, updated_at,
                 ts_code, html_template, scss_code, preview_html, category, message_id)
              VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?)
            `).run(newId, sessionId, payload.name, payload.selector, payload.description,
              msgNow, msgNow, payload.tsCode, payload.htmlTemplate,
              payload.scssCode, previewHtml, payload.category, assistantMsgId);
            componentRecord = rowToComponent(
              db.prepare('SELECT * FROM components WHERE id = ?').get(newId) as Record<string, unknown>
            );
            componentIds.push(newId);
          }

          emit({ type: 'component_ready', component: componentRecord });
        }

        // Persist assistant message
        db.prepare(
          'INSERT INTO messages (id, session_id, role, content, created_at, component_ids) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(assistantMsgId, sessionId, 'assistant', parsed.chat, msgNow, JSON.stringify(componentIds));

        // Mark all pages in this session as stale if any components were updated
        if (componentIds.length > 0) {
          db.prepare('UPDATE pages SET stale = 1 WHERE session_id = ?').run(sessionId);
        }

        // Apply design notes delta if present
        let updatedDesignNotes: string | undefined;
        if (designNotesDelta !== null && designNotesDelta.length > 0) {
          const updatedConfig = { ...config, designNotes: designNotesDelta };
          db.prepare('UPDATE sessions SET config = ?, updated_at = ? WHERE id = ?').run(
            JSON.stringify(updatedConfig), msgNow, sessionId
          );
          updatedDesignNotes = designNotesDelta;
        } else {
          db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(msgNow, sessionId);
        }

        emit({ type: 'done', messageId: assistantMsgId, componentIds, designNotes: updatedDesignNotes });
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

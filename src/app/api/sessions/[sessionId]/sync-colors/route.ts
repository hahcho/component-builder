import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { buildPreviewHtmlFromSnippet, buildPreviewHtml } from '@/lib/utils/iframeBuilder';
import type { SessionConfig } from '@/types/session';
import type { ComponentRecord } from '@/types/component';

interface ColorSet { primary: string; secondary: string; accent: string; success?: string; warning?: string; destructive?: string }

function replaceColors(code: string, oldColors: ColorSet, newColors: ColorSet): string {
  let result = code;
  for (const key of ['primary', 'secondary', 'accent', 'success', 'warning', 'destructive'] as const) {
    if (!oldColors[key] || !newColors[key]) continue;
    const oldHex = oldColors[key].toLowerCase();
    const newHex = newColors[key];
    if (oldHex === newHex.toLowerCase()) continue;
    // Replace all case variants
    result = result.split(oldHex).join(newHex);
    result = result.split(oldHex.toUpperCase()).join(newHex);
    result = result.split(oldHex.slice(1)).join(newHex.slice(1)); // without #
  }
  return result;
}

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

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const db = getDB();
  const { sessionId } = params;

  const sessionRow = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
    | Record<string, unknown>
    | undefined;
  if (!sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const config: SessionConfig = JSON.parse((sessionRow.config as string) || '{}');
  const { oldColors, newColors } = (await req.json()) as {
    oldColors: ColorSet;
    newColors: ColorSet;
  };

  const componentRows = db
    .prepare('SELECT * FROM components WHERE session_id = ?')
    .all(sessionId) as Record<string, unknown>[];

  if (componentRows.length === 0) {
    return NextResponse.json({ updated: 0, components: [] });
  }

  const now = new Date().toISOString();
  const updatedComponents: ComponentRecord[] = [];

  const newConfig: SessionConfig = {
    ...config,
    primaryColor: newColors.primary,
    secondaryColor: newColors.secondary,
    accentColor: newColors.accent,
    successColor: newColors.success ?? config.successColor,
    warningColor: newColors.warning ?? config.warningColor,
    destructiveColor: newColors.destructive ?? config.destructiveColor,
  };

  for (const row of componentRows) {
    const tsCode = replaceColors(row.ts_code as string, oldColors, newColors);
    const htmlTemplate = replaceColors(row.html_template as string, oldColors, newColors);
    const scssCode = replaceColors(row.scss_code as string, oldColors, newColors);

    // Rebuild preview — use previewHtml if available (it's static HTML), otherwise strip Angular
    const existingPreview = row.preview_html as string;
    const isStaticHtml = !existingPreview.includes('*ng') && !existingPreview.includes('[(');
    const previewHtml = isStaticHtml
      ? buildPreviewHtmlFromSnippet(
          replaceColors(
            // Extract the body content from the stored full preview HTML
            existingPreview.replace(/^[\s\S]*<body[^>]*>([\s\S]*)<\/body>[\s\S]*$/, '$1').trim(),
            oldColors,
            newColors
          ),
          scssCode,
          newConfig
        )
      : buildPreviewHtml(htmlTemplate, scssCode, newConfig);

    db.prepare(`
      UPDATE components SET
        ts_code = ?, html_template = ?, scss_code = ?,
        preview_html = ?, version = version + 1, updated_at = ?
      WHERE id = ?
    `).run(tsCode, htmlTemplate, scssCode, previewHtml, now, row.id as string);

    updatedComponents.push(
      rowToComponent(
        db.prepare('SELECT * FROM components WHERE id = ?').get(row.id as string) as Record<string, unknown>
      )
    );
  }

  return NextResponse.json({ updated: updatedComponents.length, components: updatedComponents });
}

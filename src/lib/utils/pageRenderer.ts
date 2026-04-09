import type { SessionConfig } from '@/types/session';

interface ComponentPreview {
  selector: string;
  previewHtml: string;
}

/** Convert PascalCase component name to the expected selector, e.g. GoalBadge → app-goal-badge */
function nameToSelector(name: string): string {
  const kebab = name.replace(/([A-Z])/g, (c, _m, i) => (i > 0 ? '-' : '') + c.toLowerCase());
  return `app-${kebab}`;
}

export function renderPagePreview(
  layoutHtml: string,
  components: ComponentPreview[],
  config: SessionConfig,
): string {
  const availableSelectors = new Set(components.map((c) => c.selector));

  // Strip markdown code fences if Claude wrapped the HTML in ```html ... ```
  let cleaned = layoutHtml
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Remove <!-- COMPONENT:selector --> annotations — the inline Tailwind HTML that
  // Claude writes after each marker IS the visual content; injecting the component's
  // multi-example previewHtml would create a "stitched pages" effect.
  let body = cleaned.replace(/<!--\s*COMPONENT:[\w-]+[^>]*-->/g, '');

  // Replace <!-- MISSING:Name:description --> markers.
  // If the component has since been created, just strip the marker so the inline
  // HTML approximation Claude wrote shows through cleanly.
  body = body.replace(/<!--\s*MISSING:([\w]+):([^>]*?)\s*-->/g, (_, name, description) => {
    const selector = nameToSelector(name);
    if (availableSelectors.has(selector)) return ''; // component exists — hide the placeholder
    return `<div style="border:2px dashed #f59e0b;border-radius:8px;padding:14px 16px;background:rgba(245,158,11,0.06);">
      <div style="font-size:11px;font-weight:600;color:#d97706;margin-bottom:3px;">⬡ ${name}</div>
      <div style="font-size:10px;color:#92400e;">${description}</div>
    </div>`;
  });

  const bg = config.darkMode ? '#111827' : '#f8fafc';
  const fg = config.darkMode ? '#f9fafb' : '#1a1d3a';

  return `<!DOCTYPE html>
<html${config.darkMode ? ' class="dark"' : ''}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: '${config.primaryColor}',
            secondary: '${config.secondaryColor}',
            accent: '${config.accentColor}',
            success: '${config.successColor ?? '#22c55e'}',
            warning: '${config.warningColor ?? '#f59e0b'}',
            destructive: '${config.destructiveColor ?? '#ef4444'}',
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --color-primary: ${config.primaryColor};
      --color-secondary: ${config.secondaryColor};
      --color-accent: ${config.accentColor};
      --color-success: ${config.successColor ?? '#22c55e'};
      --color-warning: ${config.warningColor ?? '#f59e0b'};
      --color-destructive: ${config.destructiveColor ?? '#ef4444'};
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: ${bg};
      color: ${fg};
      min-height: 100vh;
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

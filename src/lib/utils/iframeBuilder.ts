import type { SessionConfig } from '@/types/session';

function angularTemplateToStatic(template: string): string {
  return template
    // Remove event bindings: (click)="handler()"
    .replace(/\s*\([\w.$]+\)="[^"]*"/g, '')
    // Remove property bindings: [class]="expr", [disabled]="expr"
    .replace(/\s*\[[\w.$]+\]="[^"]*"/g, '')
    // Remove two-way bindings: [(ngModel)]="..."
    .replace(/\s*\[\([\w.$]+\)\]="[^"]*"/g, '')
    // Remove structural directives
    .replace(/\s*\*ngFor="[^"]*"/g, '')
    .replace(/\s*\*ngIf="[^"]*"/g, '')
    .replace(/\s*\*ngSwitch(Case|Default)?="[^"]*"/g, '')
    // Replace interpolations with faded placeholder
    .replace(/\{\{([^}]*)\}\}/g, (_, expr) => {
      const name = expr.trim().split('.').pop() ?? expr.trim();
      return `<span style="opacity:0.45;font-style:italic">${name}</span>`;
    })
    // Remove Angular directives like #templateRef, (ngSubmit), etc.
    .replace(/\s*#\w+/g, '')
    .replace(/\s*ng-\w+="[^"]*"/g, '');
}

export function buildPreviewHtmlFromSnippet(
  previewHtml: string,
  scssCode: string,
  config: SessionConfig,
): string {
  return buildPreviewHtml(previewHtml, scssCode, config, false);
}

export function buildPreviewHtml(
  htmlTemplate: string,
  scssCode: string,
  config: SessionConfig,
  stripAngular = true,
): string {
  const staticHtml = stripAngular ? angularTemplateToStatic(htmlTemplate) : htmlTemplate;
  const bg = config.darkMode ? '#111827' : '#ffffff';
  const fg = config.darkMode ? '#f9fafb' : '#111827';

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
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: ${bg};
      color: ${fg};
      min-height: 100vh;
    }
    ${scssCode}
  </style>
</head>
<body>
  ${staticHtml}
</body>
</html>`;
}

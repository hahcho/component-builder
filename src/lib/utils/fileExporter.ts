import JSZip from 'jszip';
import type { ComponentRecord } from '@/types/component';

function toKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export async function exportComponentsAsZip(components: ComponentRecord[]): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('components')!;

  for (const comp of components) {
    const base = toKebab(comp.name);
    folder.file(`${base}.component.ts`, comp.tsCode);
    folder.file(`${base}.component.html`, comp.htmlTemplate);
    if (comp.scssCode.trim()) {
      folder.file(`${base}.component.scss`, comp.scssCode);
    }
  }

  // Add a barrel file
  const exports = components
    .map((c) => {
      const base = toKebab(c.name);
      return `export * from './${base}.component';`;
    })
    .join('\n');
  folder.file('index.ts', exports + '\n');

  return zip.generateAsync({ type: 'blob' });
}

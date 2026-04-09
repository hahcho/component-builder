'use client';

interface Props {
  previewHtml: string;
  className?: string;
  title?: string;
}

export default function LivePreview({ previewHtml, className = '', title = 'Component preview' }: Props) {
  return (
    <iframe
      srcDoc={previewHtml}
      sandbox="allow-scripts"
      title={title}
      className={`w-full border-0 bg-transparent ${className}`}
    />
  );
}

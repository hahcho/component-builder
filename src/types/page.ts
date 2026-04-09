export interface MissingComponent {
  name: string;
  selector: string;
  description: string;
}

export interface Page {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  layoutHtml: string;
  previewHtml: string;
  missingComponents: MissingComponent[];
  stale: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageMessage {
  id: string;
  pageId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

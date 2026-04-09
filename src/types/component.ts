import type { ComponentCategory } from './session';

export interface ComponentRecord {
  id: string;
  sessionId: string;
  name: string;
  selector: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  tsCode: string;
  htmlTemplate: string;
  scssCode: string;
  previewHtml: string;
  category: ComponentCategory;
  messageId: string;
}

export interface ClaudeComponentPayload {
  action: 'create' | 'update';
  id: string | null;
  name: string;
  selector: string;
  description: string;
  category: ComponentCategory;
  tsCode: string;
  htmlTemplate: string;
  scssCode: string;
  previewHtml: string;
}

export interface ClaudeComponentResponse {
  chat: string;
  components: ClaudeComponentPayload[];
}

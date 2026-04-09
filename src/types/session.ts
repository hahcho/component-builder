export type ComponentCategory =
  | 'buttons'
  | 'forms'
  | 'cards'
  | 'navigation'
  | 'modals'
  | 'tables'
  | 'badges'
  | 'alerts';

export type StylePreference = 'minimal' | 'corporate' | 'playful' | 'bold';

export interface SessionConfig {
  appDescription: string;
  brandName: string;
  designNotes: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  destructiveColor: string;
  style: StylePreference;
  darkMode: boolean;
  componentCategories: ComponentCategory[];
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
  config: SessionConfig;
}

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './systemPrompt';
import type { SessionConfig } from '@/types/session';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamComponentGeneration(
  config: SessionConfig,
  history: ConversationTurn[],
  userMessage: string,
  componentContext: string,
): Promise<AsyncIterable<Anthropic.MessageStreamEvent>> {
  const systemPrompt = buildSystemPrompt(config);

  const userMessageWithContext = componentContext
    ? `${userMessage}\n\n---\nCurrent components in this session:\n${componentContext}`
    : userMessage;

  // Keep last 20 turns to bound context window
  const recentHistory = history.slice(-20);

  // Cache all prior history by marking the last history message as a cache breakpoint.
  // Combined with the system prompt cache, this avoids re-encoding stable tokens on every turn.
  const messages: Anthropic.MessageParam[] = recentHistory.map((m, i) => {
    if (i === recentHistory.length - 1) {
      return {
        role: m.role,
        content: [{ type: 'text' as const, text: m.content, cache_control: { type: 'ephemeral' as const } }],
      };
    }
    return { role: m.role, content: m.content };
  });
  messages.push({ role: 'user', content: userMessageWithContext });

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  return stream;
}

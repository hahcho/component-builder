import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { StylePreference } from '@/types/session';

export interface GeneratedPalette {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  destructiveColor: string;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { brandName, appDescription, style } = (await req.json()) as {
    brandName: string;
    appDescription: string;
    style: StylePreference;
  };

  const prompt = `You are a UI color palette designer. Generate 4 distinct palette options for this design system.

Brand: "${brandName}"
App: "${appDescription}"
Style preference: "${style}"

Return ONLY a valid JSON array of exactly 4 palettes, no other text:
[
  {
    "name": "short evocative name (2-3 words)",
    "description": "one-line mood description",
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "successColor": "#hex",
    "warningColor": "#hex",
    "destructiveColor": "#hex"
  }
]

Rules:
- Each palette must have a clearly different character (e.g. cool/professional, warm/energetic, dark/dramatic, fresh/minimal)
- All 6 colors in a palette must be harmonious — no clashes
- successColor should be green-toned, warningColor amber/yellow-toned, destructiveColor red/pink-toned — but subtly tinted to fit the palette mood
- minimal style → muted, low-saturation tones; bold → high saturation; playful → vibrant; corporate → conservative blues/grays
- All hex values must be valid 6-digit hex codes starting with #`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Extract JSON array from the response (Claude may wrap it in backticks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const palettes = JSON.parse(jsonMatch[0]) as GeneratedPalette[];
    return NextResponse.json({ palettes });
  } catch (err) {
    console.error('[generate-palette] Error:', err);
    return NextResponse.json({ error: 'Failed to generate palettes' }, { status: 500 });
  }
}

import { ItemCategory, Climate } from '@capsule/shared';

const ITEM_CATEGORIES: ItemCategory[] = [
  'tops',
  'bottoms',
  'dresses',
  'shoes',
  'accessories',
  'outerwear',
];
const CLIMATES: Climate[] = ['tropical', 'temperate', 'cold', 'layering'];

/** Anything scored below this is treated as "couldn't suggest" and falls back to a blank card. */
export const MIN_CONFIDENCE = 0.5;

/** Hard per-image cap so one slow/hanging call never blocks the rest of a batch. */
export const VISION_TIMEOUT_MS = 20_000;

export interface VisionSuggestion {
  name: string | null;
  category: ItemCategory | null;
  color: string | null;
  brand: string | null;
  climate: Climate | null;
  confidence: number;
}

export interface VisionSuggestResult {
  suggestion: VisionSuggestion | null;
  /** Present when the call failed, timed out, was unparseable, or scored below threshold. */
  reason?: string;
}

export function isVisionSuggestionsEnabled(): boolean {
  return process.env.VISION_SUGGESTIONS_ENABLED === 'true' && !!process.env.VISION_API_KEY;
}

function sanitizeCategory(value: unknown): ItemCategory | null {
  return typeof value === 'string' && (ITEM_CATEGORIES as string[]).includes(value)
    ? (value as ItemCategory)
    : null;
}

function sanitizeClimate(value: unknown): Climate | null {
  return typeof value === 'string' && (CLIMATES as string[]).includes(value)
    ? (value as Climate)
    : null;
}

function sanitizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sanitizeConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/**
 * Parses a raw model response body into a validated `VisionSuggestion`.
 * Any field that doesn't match the shared `ItemCategory`/`Climate` unions
 * (hallucinated or malformed) is dropped rather than passed through.
 */
export function parseVisionResponse(raw: unknown): VisionSuggestion {
  const body = (raw ?? {}) as Record<string, unknown>;
  return {
    name: sanitizeString(body.name),
    category: sanitizeCategory(body.category),
    color: sanitizeString(body.color),
    brand: sanitizeString(body.brand),
    climate: sanitizeClimate(body.climate),
    confidence: sanitizeConfidence(body.confidence),
  };
}

async function callVisionModel(imageBase64: string, mimeType: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VISION_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.VISION_MODEL ?? 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You identify clothing items in photos. Respond with a JSON object with keys ' +
              '"name", "category" (one of tops, bottoms, dresses, shoes, accessories, outerwear), ' +
              '"color", "brand", "climate" (one of tropical, temperate, cold, layering, or null), ' +
              'and "confidence" (0 to 1). Use null for anything you cannot determine.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify this clothing item.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Vision provider responded ${res.status}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Vision provider returned no content');
    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Runs an image through the configured vision model and returns a validated
 * suggestion, or a `reason` explaining why one couldn't be produced. Never
 * throws — callers can always fall back to a blank manual-entry card.
 */
export async function suggestItemMetadata(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionSuggestResult> {
  try {
    const raw = await callVisionModel(imageBuffer.toString('base64'), mimeType);
    const suggestion = parseVisionResponse(raw);
    if (suggestion.confidence < MIN_CONFIDENCE) {
      return { suggestion: null, reason: 'Low-confidence suggestion' };
    }
    return { suggestion };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown vision provider error';
    return { suggestion: null, reason: message };
  }
}

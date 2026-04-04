import { VercelRequest, VercelResponse } from '@vercel/node';

const PRIMARY_MODEL = 'google/gemini-2.0-flash-001';
const FALLBACK_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
const FALLBACK_REPLY = "I'm having trouble responding right now. Please try again.";
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 10000;

// Strong, clear system prompt — instructs the model to give a natural human reply
const SYSTEM_PROMPT =
  'You are a helpful AI assistant for TweetPulse, a sentiment analysis platform.\n' +
  'Answer the user\'s question clearly and directly.\n' +
  'Do not return JSON. Do not include code blocks or formatting unless asked.\n' +
  'Give a natural, concise human response in 1-3 sentences.';

// Safely parse a raw text response from OpenRouter
function safeParseContent(rawText: string): string | null {
  if (!rawText || !rawText.trim()) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.warn('[PULSE CHAT] Response is not valid JSON:', rawText.slice(0, 200));
    return null;
  }

  try {
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length >= 5) {
      return content.trim();
    }
    return null;
  } catch {
    return null;
  }
}

// Is this reply a generic fallback we should retry on?
function isGenericFallback(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("i'm having trouble") ||
    t.includes('temporarily unavailable') ||
    t.includes('something went wrong') ||
    t.includes('please try again shortly')
  );
}

// Single attempt to call OpenRouter — returns content string or null, never throws
async function callOpenRouter(
  apiKey: string,
  messages: { role: string; content: string }[],
  model: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://tweetpulse.app',
        'X-Title': 'TweetPulse',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    clearTimeout(timeoutId);

    // Always read body as raw text first — prevents JSON parse crash on error bodies
    const rawText = await response.text();

    if (!response.ok) {
      console.warn(`[PULSE CHAT] ${model} → HTTP ${response.status}: ${rawText.slice(0, 200)}`);
      return null;
    }

    const content = safeParseContent(rawText);
    if (!content) {
      console.warn(`[PULSE CHAT] ${model} → empty/invalid content`);
      return null;
    }

    return content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const reason = err?.name === 'AbortError' ? 'timeout (10s)' : (err?.message ?? String(err));
    console.warn(`[PULSE CHAT] ${model} → error: ${reason}`);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method Not Allowed', success: false });
  }

  try {
    // 1. Validate API key
    const apiKey = (process.env.OPENROUTER_API_KEY ?? '').trim();
    if (!apiKey) {
      console.error('[PULSE CHAT] OPENROUTER_API_KEY is missing.');
      return res.status(200).json({ reply: FALLBACK_REPLY, success: false });
    }

    // 2. Validate messages
    const messages: { role: string; content: string }[] = req.body?.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) {
      console.warn('[PULSE CHAT] No messages in request body.');
      return res.status(200).json({ reply: FALLBACK_REPLY, success: false });
    }

    // 3. First attempt — primary model
    let reply = await callOpenRouter(apiKey, messages, PRIMARY_MODEL);

    // 4. If content is generic fallback text, retry with fallback model
    if (reply && isGenericFallback(reply)) {
      console.warn('[PULSE CHAT] Primary returned generic fallback. Retrying with fallback model...');
      reply = null;
    }

    // 5. Retry once with fallback model if primary failed or returned garbage
    if (!reply) {
      console.warn('[PULSE CHAT] Primary failed. Trying fallback model...');
      reply = await callOpenRouter(apiKey, messages, FALLBACK_MODEL);
    }

    // 6. Both failed → return our own fallback
    if (!reply || isGenericFallback(reply)) {
      console.error('[PULSE CHAT] All attempts failed. Returning built-in fallback.');
      return res.status(200).json({ reply: FALLBACK_REPLY, success: false });
    }

    return res.status(200).json({ reply, success: true });
  } catch (err: any) {
    // Outermost safety net — should never be reached
    console.error('[PULSE CHAT] Unhandled exception:', err?.message ?? err);
    return res.status(200).json({ reply: FALLBACK_REPLY, success: false });
  }
}

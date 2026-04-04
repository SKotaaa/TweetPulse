import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- CONSTANTS ---
const PRIMARY_MODEL = "google/gemini-2.0-flash-001";
const TIMEOUT_MS = 10000;

// --- HELPERS ---

const callOpenRouter = async (apiKey: string, model: string, messages: any[], forceJson = true) => {
  return axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages,
      temperature: 0.1,
      ...(forceJson ? { response_format: { type: "json_object" } } : {})
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://tweetpulse.dev",
        "X-Title": "TweetPulse Vercel Proxy",
        "Content-Type": "application/json"
      },
      timeout: TIMEOUT_MS
    }
  );
};

const cleanAIJSON = (text: string) => {
  if (!text) return null;
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
};

// --- PATTERN DEFINITIONS ---
const SHIFT_WORDS_RE = /\b(but|however|although|though|except|yet|despite|still|whereas|nevertheless|unfortunately)\b/;
const POSITIVE_SIGNALS_RE = /\b(amazing|great|good|excellent|love|awesome|fantastic|wonderful|brilliant|nice|fine|like|best|perfect|outstanding|superb|impressive|phenomenal|wow|incredible|works)\b/;
const NEGATIVE_SIGNALS_RE = /\b(crash|crashes|bug|bugs|error|errors|fail|fails|failure|broken|slow|issues|problem|problems|terrible|awful|worst|bad|pain|struggle|horrible|unusable|disappointing|disappoint|frustrating|frustration|useless)\b/;
const SARCASM_OPENER_RE = /^(wow|oh wow|great|amazing|fantastic|brilliant)[,!\s]/i;
const ELLIPSIS_RE = /\.\.\.|…/;
const SOFT_NEG_RE = /\b(slow|bland|basic|meh|okay|ok|average|mediocre|limited|lacking|weak|simple|plain)\b/;

// =============================================================================
// DETERMINISTIC CONTRADICTION RESOLVER
//
// Runs on EVERY AI response and on fallback results.
// When structural contradiction is detected, it overrides AI sentiment.
// Priority order:
//   1. Explicit edge cases ("not bad", "could be better")
//   2. Sarcasm opener + negative body
//   3. Ellipsis pivot pattern
//   4. Shift word (but/however/etc) + both signals
//   5. Shift word + soft-negative after shift
//   6. AI said positive but hard negative signals exist
//   7. No override — return as-is
// =============================================================================
const resolveContradiction = (keyword: string, parsed: any): any => {
  const text = keyword.toLowerCase().trim();
  const result = { ...parsed };

  const hasShift = SHIFT_WORDS_RE.test(text);
  const hasPositive = POSITIVE_SIGNALS_RE.test(text);
  const hasNegative = NEGATIVE_SIGNALS_RE.test(text);
  const hasSarcasmOpener = SARCASM_OPENER_RE.test(keyword);
  const hasEllipsis = ELLIPSIS_RE.test(text);

  // 1. EXPLICIT EDGE CASES
  if (/\bnot bad\b/.test(text)) {
    return {
      ...result,
      sentiment: 'neutral',
      summary: `The phrase "not bad" signals mild satisfaction — a subtle positive expressed through understatement. No strong negative outcome is present in "${keyword}".`,
      confidence: Math.max(result.confidence || 0, 75),
    };
  }

  if (/\bcould be better\b/.test(text)) {
    return {
      ...result,
      sentiment: 'negative',
      summary: `"Could be better" signals unmet expectations and mild dissatisfaction. The phrasing in "${keyword}" implies the experience fell short of what was hoped for.`,
      confidence: Math.max(result.confidence || 0, 78),
    };
  }

  // 2. SARCASM: enthusiastic opener + negative body
  if (hasSarcasmOpener && hasNegative) {
    const positivePart = (keyword.match(POSITIVE_SIGNALS_RE) || [])[0] || "initial praise";
    const negativePart = (keyword.match(NEGATIVE_SIGNALS_RE) || [])[0] || "negative outcome";
    return {
      ...result,
      sentiment: 'negative',
      summary: `Sarcasm detected in "${keyword}". The enthusiastic opener ("${positivePart}") is undercut by the negative outcome ("${negativePart}"). The real intent is critical, not complimentary.`,
      confidence: Math.max(result.confidence || 0, 88),
      stats: { positive: 10, negative: 82, neutral: 8 },
    };
  }

  // 3. ELLIPSIS PIVOT: positive ... negative
  if (hasEllipsis && hasPositive && hasNegative) {
    const positivePart = (keyword.match(POSITIVE_SIGNALS_RE) || [])[0] || "positive signal";
    const negativePart = (keyword.match(NEGATIVE_SIGNALS_RE) || [])[0] || "negative signal";
    return {
      ...result,
      sentiment: 'negative',
      summary: `Mixed sentiment with rhetorical pivot detected in "${keyword}". The ellipsis signals a shift from apparent praise ("${positivePart}") to a real negative outcome ("${negativePart}"). Per contradiction rules, the negative clause dominates.`,
      confidence: Math.max(result.confidence || 0, 86),
      stats: { positive: 12, negative: 80, neutral: 8 },
    };
  }

  // 4. STRUCTURAL CONTRADICTION: shift word + both positive and negative signals
  if (hasShift && hasPositive && hasNegative) {
    const shiftMatch = text.match(SHIFT_WORDS_RE);
    const shiftWord = shiftMatch ? shiftMatch[0] : "but";
    const parts = text.split(new RegExp(`\\b${shiftWord}\\b`));
    const laterClause = parts[parts.length - 1] || "";
    const hasNegInLater = NEGATIVE_SIGNALS_RE.test(laterClause);
    const positivePart = (keyword.match(POSITIVE_SIGNALS_RE) || [])[0] || "positive element";
    const negativePart = (keyword.match(NEGATIVE_SIGNALS_RE) || [])[0] || "negative element";

    if (hasNegInLater || hasNegative) {
      return {
        ...result,
        sentiment: 'negative',
        summary: `Contradiction detected in "${keyword}". While there is initial praise ("${positivePart}"), the "${shiftWord}" clause introduces a critical negative outcome ("${negativePart}"). Per sentence-structure rules, the later clause dominates — sentiment is negative.`,
        confidence: Math.max(result.confidence || 0, 87),
        stats: { positive: 15, negative: 78, neutral: 7 },
      };
    }
  }

  // 5. SHIFT WORD + SOFT NEGATIVE (e.g. "Works fine but slow")
  if (hasShift && hasPositive && !hasNegative) {
    const shiftMatch = text.match(SHIFT_WORDS_RE);
    const shiftWord = shiftMatch ? shiftMatch[0] : "but";
    const afterShift = text.split(new RegExp(`\\b${shiftWord}\\b`))[1] || "";
    if (SOFT_NEG_RE.test(afterShift)) {
      return {
        ...result,
        sentiment: 'negative',
        summary: `Although "${keyword}" starts positively, the clause after "${shiftWord}" introduces a qualifier that lowers overall satisfaction. The later clause carries more weight, resulting in a negative overall sentiment.`,
        confidence: Math.max(result.confidence || 0, 80),
        stats: { positive: 20, negative: 70, neutral: 10 },
      };
    }
  }

  // 6. SAFETY NET: AI returned positive but negative signals clearly exist
  if (result.sentiment === 'positive' && hasNegative) {
    const negativePart = (keyword.match(NEGATIVE_SIGNALS_RE) || [])[0] || "negative signal";
    return {
      ...result,
      sentiment: 'negative',
      summary: `Despite positive language in parts of "${keyword}", the presence of "${negativePart}" indicates a real negative outcome. Negative signals override ambiguous positive framing.`,
      confidence: Math.max(result.confidence || 0, 82),
      stats: { positive: 18, negative: 74, neutral: 8 },
    };
  }

  // 7. No contradiction — return AI result unchanged
  return result;
};

// --- PROMPT BUILDER ---
const buildPrompt = (keyword: string): string => {
  return `Analyze the sentiment of the following text: "${keyword}".

CRITICAL ANALYSIS RULES — Follow these exactly:
1. SENTENCE STRUCTURE: The LATER clause of the sentence holds HIGHER weight.
   Example: "Great app but it crashes" → NEGATIVE because "crashes" comes after "but".
2. CONTRADICTION: If transition words like "but", "however", "although", "yet", "despite" appear,
   default to NEGATIVE if the second clause expresses a problem or complaint.
3. SARCASM: If an enthusiastic opener ("Wow", "Amazing", "Great") is followed by a negative outcome,
   classify as NEGATIVE. The real intent is critical.
4. MIXED SIGNALS: When both positive and negative signals exist, NEGATIVE wins.
5. EDGE CASES:
   - "Not bad" → NEUTRAL or slightly positive (understatement, no negative outcome)
   - "Could be better" → NEGATIVE (implies disappointment)
6. SUMMARY: MUST explicitly name the positive element AND the negative element, then explain
   why the final sentiment was chosen based on which clause carries more weight.

Return ONLY valid JSON. No text outside the JSON block.
{
  "sentiment": "positive",
  "summary": "string — 1-2 sentences referencing specific words from the input",
  "confidence": 85,
  "stats": { "positive": 80, "negative": 15, "neutral": 5 },
  "topics": ["topic1"]
}`;
};

// --- HANDLER ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  const prompt = buildPrompt(keyword);
  const messages = [
    {
      role: "system",
      content: "You are an expert sentiment analyst specializing in sarcasm, contradictions, and mixed signals. Respond ONLY with valid JSON. Never include explanatory text outside the JSON object."
    },
    {
      role: "user",
      content: prompt
    }
  ];

  try {
    let response: any = null;

    // ATTEMPT 1: Primary Model
    if (apiKey) {
      try {
        response = await callOpenRouter(apiKey, PRIMARY_MODEL, messages, true);
      } catch (err: any) {
        console.warn(`[PULSE] Primary model failed. Trying fallback chain...`);

        const RELIABLE_FREE = [
          "google/gemini-2.0-flash-lite-preview-02-05:free",
          "meta-llama/llama-3.3-70b-instruct:free",
          "qwen/qwen-2.5-72b-instruct:free",
          "mistralai/mistral-7b-instruct:free"
        ];

        for (const model of RELIABLE_FREE) {
          try {
            response = await callOpenRouter(apiKey, model, messages, false);
            if (response) break;
          } catch (subErr) {
            console.warn(`[PULSE] ${model} failed.`);
          }
        }
      }
    }

    if (response) {
      const content = response.data.choices[0].message.content;
      let parsed = cleanAIJSON(content);

      if (parsed) {
        // Normalize missing fields
        if (!parsed.summary || typeof parsed.summary !== 'string') parsed.summary = "No detailed explanation available.";
        if (!parsed.topics || !Array.isArray(parsed.topics)) parsed.topics = [];
        if (typeof parsed.confidence !== 'number') parsed.confidence = 0;

        // ✅ DETERMINISTIC POST-PROCESSING — always overrides when contradiction detected
        const resolved = resolveContradiction(keyword, parsed);
        return res.status(200).json(resolved);
      }
    }

    // FINAL LOCAL HEURISTIC FALLBACK
    const text = keyword.toLowerCase();
    const hasPos = POSITIVE_SIGNALS_RE.test(text);
    const hasNeg = NEGATIVE_SIGNALS_RE.test(text);
    const hasShift = SHIFT_WORDS_RE.test(text);

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let summary = `Analysis for "${keyword}" processed via fallback patterns. Results indicate a balanced sentiment.`;
    let confidence = 50;
    let stats = { positive: 33, negative: 33, neutral: 34 };

    if (hasPos && (hasNeg || hasShift)) {
      sentiment = 'negative';
      summary = `Fallback analysis detected mixed signals in "${keyword}". Positive language is present, but a contradiction or negative outcome was also detected. Per priority rules, the negative clause dominates.`;
      confidence = 82;
      stats = { positive: 18, negative: 75, neutral: 7 };
    } else if (hasNeg) {
      sentiment = 'negative';
      summary = `Fallback analysis found strong negative indicators in "${keyword}". The text signals dissatisfaction or a problematic outcome.`;
      confidence = 82;
      stats = { positive: 5, negative: 87, neutral: 8 };
    } else if (hasPos) {
      sentiment = 'positive';
      summary = `Fallback analysis found positive indicators in "${keyword}". No contradicting negative signals were detected.`;
      confidence = 80;
      stats = { positive: 85, negative: 5, neutral: 10 };
    }

    // Apply the same resolver to fallback results
    const fallbackResult = resolveContradiction(keyword, {
      sentiment, summary, confidence, stats,
      topics: ["fallback-analysis"]
    });

    return res.status(200).json(fallbackResult);

  } catch (error: any) {
    console.error("[PULSE CRITICAL] Total Failure:", error.message);
    return res.status(200).json({
      sentiment: "neutral",
      summary: "Analysis service temporarily unavailable. Please try again.",
      confidence: 50,
      stats: { positive: 33, negative: 33, neutral: 34 },
      topics: ["stability-bypass"]
    });
  }
}

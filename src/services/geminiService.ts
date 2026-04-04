export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  confidence: number;
  stats: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topics: string[];
}

export interface ChatResponse {
  content: string;
}

// --- CONSTANTS & FALLBACKS ---

export const SENTIMENT_FALLBACK: SentimentAnalysisResponse = {
  sentiment: 'neutral',
  summary: 'Unable to analyze at the moment',
  confidence: 0,
  stats: { positive: 0, negative: 0, neutral: 100 },
  topics: []
};

export const CHAT_FALLBACK: ChatResponse = {
  content: "Something went wrong. Please try again."
};

const TIMEOUT_MS = 10000; // 10s hard timeout

// --- HELPERS ---

const isDev = () => import.meta.env.DEV;

const cleanAIJSON = (text: string): string => {
  if (!text) return "";
  
  // 1. Remove markdown blocks if present
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  // 2. Extract the first { ... } block if there's extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // 3. Completeness check: Ensure it looks like a full object
  if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) {
    if (isDev()) console.warn("PULSE: Truncated or malformed JSON detected.");
    return "";
  }

  return cleaned;
};

const validateSentimentResponse = (data: any): data is SentimentAnalysisResponse => {
  if (!data || typeof data !== 'object') return false;
  
  // Basic property and type checks
  const hasSentiment = ['positive', 'negative', 'neutral'].includes(data.sentiment);
  const hasStats = data.stats && 
                   typeof data.stats.positive === 'number' &&
                   typeof data.stats.negative === 'number' &&
                   typeof data.stats.neutral === 'number';
  const hasSummary = typeof data.summary === 'string' && data.summary.trim().length >= 5;
  const hasConfidence = typeof data.confidence === 'number' && data.confidence >= 0;
  const hasTopics = Array.isArray(data.topics);

  if (isDev() && !(hasSentiment && hasStats && hasSummary && hasConfidence && hasTopics)) {
    console.warn("PULSE: Quality validation failed.", {
      hasSentiment, hasStats, hasSummary, hasConfidence, hasTopics,
      data
    });
  }

  return !!(hasSentiment && hasStats && hasSummary && hasConfidence && hasTopics);
};


const normalizeSentimentData = (data: SentimentAnalysisResponse): SentimentAnalysisResponse => {
  // Ensure confidence is 0-100
  let confidence = data.confidence;
  if (confidence <= 1) confidence *= 100; // Handle 0.85 -> 85
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));

  // Ensure stats sum to 100
  const stats = { ...data.stats };
  const total = stats.positive + stats.negative + stats.neutral;
  
  if (total === 0) {
    stats.neutral = 100;
  } else if (Math.abs(total - 100) > 0.1) {
    stats.positive = Math.round((stats.positive / total) * 100);
    stats.negative = Math.round((stats.negative / total) * 100);
    stats.neutral = 100 - (stats.positive + stats.negative);
  }

  return {
    ...data,
    confidence,
    stats,
    topics: data.topics.slice(0, 5) // Limit topics
  };
};

// --- CORE FUNCTIONS ---

/**
 * Robust sentiment analysis with 10s timeout, retries, and mandatory fallback.
 * Migrated to Backend Proxy (/api/analyze) for stability and security.
 */
export const analyzeSentiment = async (
  keyword: string,
  isRetry = false
): Promise<SentimentAnalysisResponse> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 1. CALL SERVERLESS HANDLER
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ keyword })
    });

    clearTimeout(id);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (isDev()) console.log(`PULSE AI [SERVERLESS] SUCCESS:`, result);
    
    // 3. QUALITY VALIDATION & NORMALIZATION
    if (validateSentimentResponse(result)) {
      return normalizeSentimentData(result);
    } else {
      throw new Error("Quality validation failed (low-quality or malformed response)");
    }

  } catch (error: any) {
    clearTimeout(id);
    
    const errorMsg = error.name === 'AbortError' ? 'Request timed out (>10s)' : error.message;

    if (isDev()) {
      console.warn(`PULSE AI [PROXY] FAIL${isRetry ? ' (Retry)' : ''}: ${errorMsg}`);
    }

    // SMART RETRY: Perform exactly ONE retry on failure before falling back.
    if (!isRetry) {
      if (isDev()) console.info("PULSE: Triggering automatic recovery retry...");
      return analyzeSentiment(keyword, true);
    }

    // FINAL FALLBACK: Only reached if everything above fails.
    console.error(`PULSE AI [RECOVERY]: Using absolute fallback for "${keyword}"`);
    return {
      ...SENTIMENT_FALLBACK,
      summary: `Analysis for "${keyword.substring(0, 30)}..." is temporarily limited. Stability mode active.`
    };
  }
};



/**
 * Robust chat response with 10s timeout and mandatory fallback.
 * Logic centralized from PulseAI component.
 */
export const fetchPulseAIResponse = async (
  messages: { role: string; content: string }[]
): Promise<ChatResponse> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Calling the local proxy endpoint
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ messages })
    });

    clearTimeout(id);

    // Always read as text first so a non-JSON body doesn't throw unhandled
    const rawText = await response.text();
    if (!rawText || !rawText.trim()) {
      throw new Error("Empty response body");
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error("Response is not valid JSON");
    }

    // Accept both the new { reply } shape and old { content } shape for compatibility
    const reply = data?.reply ?? data?.content;

    if (typeof reply !== 'string' || !reply.trim()) {
      throw new Error("reply field is missing or empty");
    }

    return { content: reply.trim() };

  } catch (error: any) {
    clearTimeout(id);
    
    if (isDev()) {
      console.error("PULSE: fetchPulseAIResponse failed:", error.message);
    }

    return CHAT_FALLBACK;
  }
};
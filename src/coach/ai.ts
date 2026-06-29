import { ChatMessage, OpenRouterConfig } from "./types.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function getConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set in .env");
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    referer: process.env.APP_REFERER || "http://localhost:3000",
    appTitle: process.env.APP_TITLE || "AI English Speaking Coach",
  };
}

// ─── Retry Helper ────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Core Caller ─────────────────────────────────────────────────────────────

export async function callAI(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    model?: string;
  } = {}
): Promise<string> {
  const cfg = getConfig();
  const { temperature = 0.7, maxTokens = 1000, jsonMode = false, model } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const body: Record<string, unknown> = {
        model: model || cfg.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      // API-level JSON mode is bypassed because many free models on OpenRouter
      // do not support response_format and crash/loop. We rely on prompt constraints
      // and robust regex JSON extraction instead.

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": cfg.referer,
          "X-Title": cfg.appTitle,
        },
        body: JSON.stringify(body),
      });

      // Handle retryable server errors
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : RETRY_DELAY_MS * attempt;
        console.warn(
          `[AI] HTTP ${response.status} on attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter error ${response.status}: ${errText}`);
      }

      const data = await response.json();

      if (!data.choices?.length) {
        throw new Error("Empty response: no choices returned from API");
      }

      const content = data.choices[0].message.content;
      if (content === null || content === undefined) {
        throw new Error("API returned empty or null content (possibly safety blocked)");
      }
      return content as string;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[AI] Attempt ${attempt} failed: ${lastError.message}. Retrying...`
        );
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(
    `[AI] All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`
  );
}

// ─── JSON-safe Caller ────────────────────────────────────────────────────────

export async function callAIJson<T>(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<T> {
  const raw = await callAI(messages, { ...options, jsonMode: true });
  if (!raw) {
    throw new Error("Received empty content from callAI");
  }

  // Strip markdown fences if model wrapped JSON anyway
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try extracting the first {...} block as fallback
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error(`Failed to parse JSON response: ${cleaned.slice(0, 200)}`);
  }
}

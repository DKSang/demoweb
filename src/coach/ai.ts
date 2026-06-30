import { ChatMessage } from "./types.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Load JSON Config Dynamic ────────────────────────────────────────────────

function loadRoutingConfig(): { providers: any[] } {
  try {
    const configPath = path.resolve(__dirname, "./routing-config.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load routing-config.json:", err);
    return { providers: [] };
  }
}

// ─── FreeLLMAPI Unified Key Reader ───────────────────────────────────────────

let cachedFreeLLMAPIKey: string | null = null;

function getFreeLLMAPIKey(): string {
  if (cachedFreeLLMAPIKey) return cachedFreeLLMAPIKey;
  try {
    const dbPath = path.resolve(__dirname, "../../freellmapi/server/data/freeapi.db");
    if (fs.existsSync(dbPath)) {
      const db = new DatabaseSync(dbPath);
      const row = db.prepare("SELECT value FROM settings WHERE key = 'unified_api_key'").get() as { value: string } | undefined;
      if (row?.value) {
        cachedFreeLLMAPIKey = row.value;
        return cachedFreeLLMAPIKey;
      }
    }
  } catch (err: any) {
    console.warn("[AI Router] Failed to read FreeLLMAPI key from database:", err.message);
  }
  // Only fall back to env OPENROUTER_API_KEY if it's a FreeLLMAPI key (sk-or-v1) or empty
  // NOTE: FreeLLMAPI expects its own unified key, not the OpenRouter API key
  cachedFreeLLMAPIKey = "freellmapi-fallback";
  console.warn(`[AI Router] FreeLLMAPI key not found in DB, using fallback placeholder. Set FREELLMAPI_API_KEY in .env to override.`);
  return process.env.FREELLMAPI_API_KEY || cachedFreeLLMAPIKey;
}

// ─── Providers Setup ──────────────────────────────────────────────────────────

interface AIProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  rateLimits?: {
    rpm: number;
    dailyLimit: number;
  };
}

function getAvailableProviders(): AIProvider[] {
  const config = loadRoutingConfig();
  const providers: AIProvider[] = [];

  const sorted = (config.providers || []).sort((a: any, b: any) => a.priority - b.priority);

  for (const p of sorted) {
    const apiKey = process.env[p.envKey];
    if (apiKey) {
      providers.push({
        name: p.name,
        apiKey,
        baseUrl: p.baseUrl,
        model: p.model,
        rateLimits: p.rateLimits
      });
    }
  }

  return providers;
}

// ─── Rate Tracking & Cooldowns State ─────────────────────────────────────────

interface ProviderStats {
  requestsThisMinute: number;
  dailyRequests: number;
  cooldownUntil: number;
  lastMinuteReset: number;
}

const statsMap = new Map<string, ProviderStats>();

function getProviderStats(name: string): ProviderStats {
  const now = Date.now();
  let stats = statsMap.get(name);
  if (!stats) {
    stats = {
      requestsThisMinute: 0,
      dailyRequests: 0,
      cooldownUntil: 0,
      lastMinuteReset: now
    };
    statsMap.set(name, stats);
  }

  if (now - stats.lastMinuteReset > 60000) {
    stats.requestsThisMinute = 0;
    stats.lastMinuteReset = now;
  }

  return stats;
}

// ─── Stats Monitoring Exports ────────────────────────────────────────────────

export function getProviderUsageStats() {
  const providers = loadRoutingConfig().providers;
  return providers.map((p: any) => {
    const stats = getProviderStats(p.name);
    const hasKey = !!process.env[p.envKey];
    const isCooldown = Date.now() < stats.cooldownUntil;

    let status = "active";
    if (!hasKey) status = "missing_key";
    else if (isCooldown) status = "cooldown";

    return {
      name: p.name,
      model: p.model,
      priority: p.priority,
      requestsThisMinute: stats.requestsThisMinute,
      dailyRequests: stats.dailyRequests,
      rpmLimit: p.rateLimits?.rpm || 100,
      dailyLimit: p.rateLimits?.dailyLimit || 10000,
      cooldownRemainingSeconds: Math.max(0, Math.ceil((stats.cooldownUntil - Date.now()) / 1000)),
      status
    };
  });
}

export function resetProviderCooldowns() {
  statsMap.forEach((val) => {
    val.cooldownUntil = 0;
    val.requestsThisMinute = 0;
  });
  console.log("[AI Router] Reset all provider cooldowns and rate limits successfully.");
}

// ─── Core Caller with Native Failover Routing ───────────────────────────────

/**
 * Strip <think>...</think> tags and bullet-point reasoning chains that
 * reasoning models (DeepSeek-R1, QwQ, etc.) prepend to their answers.
 * Returns only the final answer portion of the string.
 */
function stripThinking(text: string): string {
  if (!text || text.trim().length === 0) return text || "";
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Try extracting JSON block first
  const allJsonMatches = [...cleaned.matchAll(/\{[\s\S]*?\}/g)];
  if (allJsonMatches.length > 0) {
    for (let i = allJsonMatches.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(allJsonMatches[i][0]);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          return allJsonMatches[i][0];
        }
      } catch { /* continue */ }
    }
  }

  // Detect reasoning monologue
  const reasoningPatterns = [
    /Let's\s+(think|break|analyze|consider|look|check|count|start)/mi,
    /(Wait|Actually|Hmm|Let me|I'll|I need to|We need to|Must include|Check each)/m,
    /(Count:|So final|Probably |First,|Second,|Third,)/m,
  ];
  const isReasoningMonologue = cleaned.length > 120 && reasoningPatterns.some(p => p.test(cleaned));

  if (isReasoningMonologue) {
    const replyMatch = cleaned.match(/[`"']?reply[`"']?\s*:\s*[`"']([^`"'\n]{5,})[`"']/i);
    if (replyMatch) return replyMatch[1].trim();

    const parts = cleaned.split(/\n\n+/);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      if (
        part.length > 10 && part.length < 500 &&
        !part.startsWith("*") && !part.startsWith("-") &&
        !reasoningPatterns.some(p => p.test(part))
      ) {
        return part;
      }
    }

    const sentences = cleaned.replace(/\n/g, " ").split(/(?<=[.!?])\s+/);
    const last2 = sentences.slice(-2).join(" ").trim();
    if (last2.length > 5) return last2;
  }

  if (cleaned.length > 300 && cleaned.includes(".")) {
    const sentences = cleaned.replace(/\n/g, " ").split(/(?<=[.!?])\s+/);
    for (let i = sentences.length - 1; i >= 0; i--) {
      const s = sentences[i].trim();
      if (s.length > 5 && s.length < 200 && !reasoningPatterns.some(p => p.test(s))) {
        return s;
      }
    }
  }

  return cleaned;
}

export async function callAI(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    model?: string;
  } = {}
): Promise<string> {
  const baseApiUrl = process.env.OPENROUTER_BASE_URL;
  const targetModel = options.model || process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-72b-instruct";

  // 1. Try calling the configured Proxy (FreeLLMAPI / 9Router) first if available
  if (baseApiUrl) {
    const modelToSend = (targetModel === "qwen/qwen-2.5-72b-instruct" || targetModel === "openrouter/free" || targetModel === "meta-llama/llama-3-8b-instruct:free" || targetModel === "google/gemini-2.5-flash")
      ? "auto"
      : targetModel;

    console.log(`[AI Router] Directing request to proxy: "${baseApiUrl}" with mapped model: "${modelToSend}" (original: "${targetModel}")`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for proxy call

      // When JSON mode is required, inject a reminder as the last system message.
      // Not all models behind the proxy honor response_format header, so we enforce via prompt.
      const proxyMessages = options.jsonMode
        ? [
            ...messages,
            {
              role: "system" as const,
              content: "IMPORTANT: You MUST respond ONLY with a valid JSON object. No markdown, no code fences, no extra text outside the JSON."
            }
          ]
        : messages;

      const response = await fetch(`${baseApiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getFreeLLMAPIKey()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Bloom English Lab",
        },
        body: JSON.stringify({
          model: modelToSend,
          messages: proxyMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const content = stripThinking(rawContent);
        if (content) {
          console.log(`[AI Router] Success! Response generated by proxy: "${baseApiUrl}"`);
          return content;
        }
        if (rawContent) {
          console.warn(`[AI Router] stripThinking returned empty, using raw content.`);
          return rawContent;
        }
        // FreeLLMAPI returned 200 with empty content — return immediately
        // instead of falling through to slow fallback providers
        console.warn(`[AI Router] Proxy returned empty content. Returning fallback immediately.`);
        return JSON.stringify({
          reply: "I see. Can you tell me more?",
          classifiedIntent: "chat",
          whatIfPrompt: null,
          usedVocab: [],
          feedback: null,
          suggestPhase: null
        });
      } else {
        const errorText = await response.text();
        console.warn(`[AI Router] Proxy endpoint returned status ${response.status}: ${errorText}. Falling back to native router.`);
      }
    } catch (err: any) {
      console.warn(`[AI Router] Proxy connection failed: ${err.message || err}. Falling back to native router.`);
    }
  }

  // 2. Fallback to Native Multi-Provider Failover Router (In-App)
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw new Error("No API keys found in .env. Please configure GEMINI_API_KEY, GROQ_API_KEY, or others.");
  }

  let lastError: Error | null = null;
  const now = Date.now();

  for (const provider of providers) {
    const stats = getProviderStats(provider.name);

    if (now < stats.cooldownUntil) {
      continue;
    }

    const rpmLimit = provider.rateLimits?.rpm || 100;
    if (stats.requestsThisMinute >= rpmLimit) {
      stats.cooldownUntil = now + 60000;
      continue;
    }

    const dailyLimit = provider.rateLimits?.dailyLimit || 10000;
    if (stats.dailyRequests >= dailyLimit) {
      continue;
    }

    console.log(`[AI Router Fallback] Trying provider: "${provider.name}" with model: "${provider.model}"`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const modelToUse = options.model && options.model !== "qwen/qwen-2.5-72b-instruct" && options.model !== "openrouter/free" && options.model !== "meta-llama/llama-3-8b-instruct:free" && options.model !== "google/gemini-2.5-flash"
        ? options.model
        : provider.model;

      stats.requestsThisMinute++;
      stats.dailyRequests++;

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Bloom English Lab",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1000,
          response_format: options.jsonMode ? { type: "json_object" } : undefined
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content) {
        console.log(`[AI Router Fallback] Success! Answer generated by provider: "${provider.name}"`);
        return content;
      }
      throw new Error("Empty response body");
    } catch (err: any) {
      console.warn(`[AI Router Fallback] Provider "${provider.name}" failed:`, err.message || err);
      lastError = err;
      stats.cooldownUntil = Date.now() + 45000;
    }
  }

  throw new Error(`[AI Router] All routes (proxy and fallbacks) failed. Last error: ${lastError?.message}`);
}

// ─── JSON-safe Caller ────────────────────────────────────────────────────────

export async function callAIJson<T>(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<T> {
  let raw: string;
  try {
    raw = await callAI(messages, { ...options, jsonMode: true });
  } catch (err: any) {
    console.warn("[AI] callAI threw, using safe fallback:", err.message);
    return getSafeFallback<T>(messages);
  }

  if (!raw) {
    return getSafeFallback<T>(messages);
  }

  const strippedRaw = stripThinking(raw);

  const cleaned = strippedRaw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const allJsonMatches = [...cleaned.matchAll(/\{[\s\S]*?\}/g)];
    for (let i = allJsonMatches.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(allJsonMatches[i][0]);
        if (parsed && typeof parsed === "object") return parsed as T;
      } catch { /* continue */ }
    }
    const greedyMatch = cleaned.match(/\{[\s\S]*\}/);
    if (greedyMatch) {
      try {
        return JSON.parse(greedyMatch[0]) as T;
      } catch (innerErr) {
        console.warn("[AI] Failed to parse extracted bracket JSON:", innerErr);
      }
    }
    
    console.warn("[AI] Activating dynamic graceful JSON fallback for plain text response.");
    return getSafeFallback<T>(messages, strippedRaw);
  }
}

function getSafeFallback<T>(
  messages: ChatMessage[],
  strippedRaw?: string
): T {
  const systemPrompt = messages.find(m => m.role === "system")?.content || "";

  if (systemPrompt.includes("keyPhrases") || (systemPrompt.includes("vocab") && systemPrompt.includes("Extract"))) {
    return {
      topic: "General English",
      keyPhrases: ["English Speaking", "Practice"],
      vocab: [
        {
          word: "practice",
          ipa: "/ˈpræktɪs/",
          partOfSpeech: "noun",
          definition: "doing something regularly to improve",
          example: "I need to practice English every day.",
          contextTimestamp: null
        }
      ]
    } as T;
  }

  let replyText = "I see. Can you tell me more?";
  if (strippedRaw) {
    const replyMatch = strippedRaw.match(/[`"']?reply[`"']?:\s*[`"']([^`"'\n]{5,})[`"']/i);
    if (replyMatch) {
      replyText = replyMatch[1].trim();
    } else {
      const firstPara = strippedRaw.split(/\n\n+/)[0].trim();
      if (firstPara.length > 5 && firstPara.length < 300 && !firstPara.startsWith("*")) {
        replyText = firstPara;
      }
    }
  }

  return {
    reply: replyText,
    classifiedIntent: "chat",
    whatIfPrompt: null,
    usedVocab: [],
    feedback: null,
    suggestPhase: null
  } as T;
}

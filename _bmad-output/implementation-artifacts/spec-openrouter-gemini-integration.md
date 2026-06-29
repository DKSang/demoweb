---
title: 'OpenRouter Gemini & Llama Integration'
type: 'feature'
created: '2026-06-29'
status: 'done'
baseline_commit: 'd7afc4cef200a9d7ffd6aa46d53b003c208812b7'
context: []
---

## Intent

**Problem:** The application currently relies on a local instance of Ollama to run LLM-based vocabulary extraction, conversational chat (AI Coach), and word validation. Running models locally is resource-intensive and has high latency for typical user setups.

**Approach:** Replace Ollama with OpenRouter API. Use highly efficient, low-latency, and cost-effective models (defaulting to `google/gemini-3.1-flash-lite` or `meta-llama/llama-3.2-3b-instruct`) via OpenRouter. Support streaming chat responses, vocabulary initialization, and word semantic validation.

## Boundaries & Constraints

**Always:**
- Access OpenRouter via `https://openrouter.ai/api/v1` using the `OPENROUTER_API_KEY` configured in `.env`.
- Use the model configured via `OPENROUTER_MODEL` (default: `google/gemini-3.1-flash-lite`) in `.env`.
- Ensure all chat completion requests to OpenRouter include a `max_tokens` limit (e.g. 150 for chat, 1000 for vocabulary extraction) to prevent 402 quota estimation errors.
- Ensure the streaming response from the backend to the frontend is formatted in the line-delimited JSON structure expected by the frontend (`{"message": {"content": "..."}}` followed by `\n`).

**Ask First:**
- If the user selects a model from settings that is not standard or configured.

**Never:**
- Hardcode the OpenRouter API key inside source code files. Always read from `process.env.OPENROUTER_API_KEY`.
- Run local Ollama server dependencies for core operations if the key is present.
- Stream standard SSE format (`data: {...}`) directly to the frontend without rewriting the chunks to match the frontend parser.

## Code Map

- `src/server.ts` -- Main Express server containing `/api/chat`, `/api/lessons/:id/initialize`, `/api/ollama/health`, and `/api/words/validate` endpoints.
- `src/components/AISpeakingLab.tsx` -- Main React component with the AI Model select settings dropdown.
- `.env.example` -- Config documentation for the new OpenRouter variables.
- `.env` -- Real local environment configuration with the active OpenRouter API key.

## Tasks & Acceptance

**Execution:**
- [x] `src/server.ts` -- Implement `callOpenRouter` helper and rewrite endpoints to use OpenRouter.
  - Rewrite `/api/chat` to request completions from OpenRouter and transform the SSE stream chunks to line-delimited JSON.
  - Rewrite `/api/lessons/:id/initialize` to use `callOpenRouter`.
  - Rewrite `/api/words/validate` to disable the local embedding fallback (since OpenRouter doesn't support embeddings) and route directly to `callOpenRouter` for LLM validation.
  - Rewrite `/api/ollama/health` to verify connectivity to OpenRouter's model endpoint instead of local Ollama tags.
- [x] `src/components/AISpeakingLab.tsx` -- Update the model selector dropdown options to present OpenRouter models: `google/gemini-3.1-flash-lite` (default) and `meta-llama/llama-3.2-3b-instruct` (lightweight option). Update titles/tooltips from "Ollama" to "AI / OpenRouter".
- [x] `.env.example` -- Document `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` configuration.
- [x] `.env` -- Add the provided API key and model variables to the local `.env` file.

**Acceptance Criteria:**
- Given a valid OpenRouter API key in `.env`, when a user starts a lesson, then the vocabulary list, theme, and start words are successfully generated and populated using the selected model.
- Given the chat interface, when the user speaks or sends a chat message, then the AI coach streams back responses in real-time without errors.
- Given the Word Games, when the user inputs a word, then the connection semantic validator checks it successfully via OpenRouter LLM validation.

## Verification

**Commands:**
- `npm run lint` -- expected: Clean type compilation (no type errors).

**Manual checks (if no CLI):**
- Verify chat streams content dynamically in the AI Coach tab.
- Verify lesson initialization populates vocabulary and theme.
- Verify word validation works inside word association games.

## Suggested Review Order

**Core Backend Logic**

- OpenRouter API key and model environment variables configuration.
  [server.ts:17](../../src/server.ts#L17)

- Centralized helper function to call OpenRouter API.
  [server.ts:578](../../src/server.ts#L578)

- Streaming chat completion response parsing and formatter.
  [server.ts:607](../../src/server.ts#L607)

**Endpoint Updates**

- OpenRouter connection health check route mapping.
  [server.ts:741](../../src/server.ts#L741)

- Lesson vocabulary extraction using callOpenRouter.
  [server.ts:880](../../src/server.ts#L880)

- Game word semantic validator bypassing embeddings and routing to OpenRouter.
  [server.ts:1103](../../src/server.ts#L1103)

**Frontend Settings**

- Default AI Model set to openrouter/free in react state.
  [AISpeakingLab.tsx:133](../../src/components/AISpeakingLab.tsx#L133)

- Options updated with OpenRouter and free model choices in selection dropdown.
  [AISpeakingLab.tsx:415](../../src/components/AISpeakingLab.tsx#L415)

**Configuration**

- Local credentials configured for OpenRouter integration.
  [.env:1](../../.env#L1)

- Documentation of new OpenRouter variables.
  [.env.example:10](../../.env.example#L10)

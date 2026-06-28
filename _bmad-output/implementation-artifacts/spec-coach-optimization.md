---
title: 'AI Coach Performance & Context Optimization'
type: 'feature'
created: '2026-06-28'
status: 'done'
route: 'one-shot'
---

# AI Coach Performance & Context Optimization

## Intent

**Problem:** The local Ollama AI Coach responses are slow due to lack of generation limits. Furthermore, the conversation feels disconnected from the video content because the coach only has the lesson title as context and does not understand the video transcripts.

**Approach:** 
1. Add an Ollama Model selector in settings so the user can choose lightweight models (e.g., `llama3.2`, `llama3.2:1b`, etc.) for faster speed.
2. Ingest the actual video transcript lines (up to 25 lines) into the system prompt to allow the AI Coach to automatically understand and discuss the video's context (e.g. getting a haircut in Vietnam).
3. Tune the prompt and generation options (`num_ctx: 2048`, `num_predict: 60`) to drastically reduce latency and prompt tokens.

## Suggested Review Order

- **State and Model Settings Selector**
  [`src/components/AISpeakingLab.tsx:284`](../../src/components/AISpeakingLab.tsx#L284) -- Declaring the `ollamaModel` state in the component.
  [`src/components/AISpeakingLab.tsx:988`](../../src/components/AISpeakingLab.tsx#L988) -- Adding the model selection drop-down to the settings header next to the TTS settings.

- **Ollama API Calls Optimization**
  [`src/components/AISpeakingLab.tsx:605`](../../src/components/AISpeakingLab.tsx#L605) -- Passing the selected `ollamaModel` in the custom word generator.
  [`src/components/AISpeakingLab.tsx:812`](../../src/components/AISpeakingLab.tsx#L812) -- Passing the selected `ollamaModel` and optimizing `num_ctx`/`num_predict` options in the conversation chat endpoint.

- **Video Transcript Context Ingestion**
  [`src/components/AISpeakingLab.tsx:784`](../../src/components/AISpeakingLab.tsx#L784) -- Updating `getSystemPrompt` to map and slice the actual video subtitle lines into the system prompt context.

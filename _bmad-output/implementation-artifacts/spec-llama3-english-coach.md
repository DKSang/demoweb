---
title: 'Llama-3-8b English Coach (AI Speaking Lab)'
type: 'feature'
created: '2026-06-27'
status: 'done'
baseline_commit: '9435379ba42f7db40fdb0f00143e2848a9194c16'
context: ['{project-root}/_bmad-output/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user needs a local, highly interactive, personal English learning suite centered around speaking and listening practice (conversation with AI, shadowing real speech from YouTube vlogs, and tracking vocabulary) that integrates seamlessly into the existing "Bloom Studio" dark-grayscale website.

**Approach:** Implement a new `AISpeakingLab` component that hosts an interactive Llama-3-8b-powered conversational assistant (weeks 1-4 prompts), an embedded YouTube player for sentence-by-sentence shadowing practice, a Speech-to-Text validation system, and a `localStorage`-backed vocabulary notebook.

## Boundaries & Constraints

**Always:** 
- Adhere strictly to the high-contrast dark-grayscale theme and liquid-glass aesthetic.
- Support voice input using the browser's Web Speech API (`webkitSpeechRecognition`) and voice output using Web Speech Synthesis (`speechSynthesis`), optimized for Google Chrome.
- Allow unlimited study/speaking session time (no artificial 15-minute time limits or daily lockouts).
- Use Vite proxy mapping `/api/ollama` to `http://127.0.0.1:11434` for Ollama backend calls.
- Preserves all other landing page content of the Bloom website.

**Ask First:** 
- If the user wishes to change the target Ollama model from `llama3` to a different model (e.g., `llama3:8b` or `llama3.1`).

**Never:** 
- Hardcode raw localhost URLs (like `http://localhost:11434`) directly in frontend component files.
- Require any paid external API keys for Speech-to-Text or Text-to-Speech (must remain free and local).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Active conversation chat | User clicks mic, speaks "Today I went to office", submits. | Audio is transcribed locally; Llama-3-8b receives chat history + target vocab. Returns a 1-2 sentence response. AI speaks response aloud via TTS. | If Ollama is offline, display: "Could not connect to Ollama. Make sure Ollama is running locally on port 11434." |
| Shadowing comparison | Target: "Are you ready to crack on with the lesson?" User speaks: "Are you ready to crack on with the lesson." | Web Speech API transcribes on Chrome. Compare text using Levenshtein distance. UI highlights 100% matched words in white/green, missed words in red. | If Web Speech API is blocked/not supported, fallback to letting the user type their response manually. |
| Vocabulary save | User clicks "Save Word" on "faff" from list. | Word is appended to the browser's `localStorage` notebook array with date, word, IPA, definition. | N/A |


</frozen-after-approval>

## Code Map

- `vite.config.ts` -- Configure proxy route `/api/ollama` targeting `http://127.0.0.1:11434`.
- `src/App.tsx` -- Register navigation links, menu list, and render `<AISpeakingLab />` component.
- `src/components/AISpeakingLab.tsx` -- [NEW] High-fidelity React component containing Conversation Coach, Shadowing player, and Vocabulary notebook tabs.

## Tasks & Acceptance

**Execution:**
- [x] `vite.config.ts` -- Configure `/api/ollama` proxy endpoint -- Reroutes frontend API calls to local Ollama instance without CORS issues.
- [x] `src/components/AISpeakingLab.tsx` -- Create new AISpeakingLab component containing YouTube player, speech recognition, and vocab notebook -- Core learning features and UI.
- [x] `src/App.tsx` -- Import `<AISpeakingLab />`, add floating header navigation & drawer menu options -- Navigation integration.

**Acceptance Criteria:**
- Given a local Ollama server running `llama3`, when the user navigates to "AI COACH" and clicks "Start Chat", the chat interface opens, sends a greeting, and speaks it out loud.
- Given the Shadowing interface, when the user plays the lesson segment and repeats the sentence, the recognized speech is compared and scored, color-coding the text appropriately.
- Given the Vocabulary tab, when a user saves a word, it is persistent across page reloads.

## Design Notes

The YouTube player will be controlled using the YouTube IFrame Player API. We will dynamically load `https://www.youtube.com/iframe_api` if it isn't loaded, create a hidden or small player, and control it via its JavaScript interface:
```typescript
player.seekTo(startSeconds, true);
player.playVideo();
```
To calculate text comparison, we use a simple Levenshtein ratio function:
```typescript
function getSimilarity(a: string, b: string) {
  // Normalize strings and calculate Levenshtein distance
}
```

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS (Zero TypeScript errors)
- `npm run build` -- expected: SUCCESS (Build completes successfully)

**Manual checks (if no CLI):**
- Verify Ollama API proxy works by opening a browser and hitting `/api/ollama/api/tags` to list local models.
- Inspect the speaking/listening microphone popup and ensure audio permissions are requested and accepted.

## Suggested Review Order

**Ollama Integration & Proxy**

- Proxy route definition in Vite to forward local traffic to Ollama's port 11434.
  [`vite.config.ts:18`](../../vite.config.ts#L18)

**Core Speaking & Shadowing Suite**

- Entry point imports, styles, types, and the lesson database.
  [`AISpeakingLab.tsx:1`](../../src/components/AISpeakingLab.tsx#L1)

- Timed YouTube playback loops, IFrame API loading, and Custom Video transcript parser.
  [`AISpeakingLab.tsx:211`](../../src/components/AISpeakingLab.tsx#L211)

- Chat Coach Llama-3-8b message history array, Web Speech API mic toggle, and auto-scroller.
  [`AISpeakingLab.tsx:413`](../../src/components/AISpeakingLab.tsx#L413)

- Local Storage streak calendars and the vocabulary saved words notebook listing.
  [`AISpeakingLab.tsx:942`](../../src/components/AISpeakingLab.tsx#L942)

**Page Navigation Binding**

- Component import and rendering registration in main layout sections.
  [`App.tsx:24`](../../src/App.tsx#L24)

- Add floating header menu option for the AI Speaking Lab.
  [`App.tsx:93`](../../src/App.tsx#L93)

- Add drawer slide-out menu links and subtitle descriptions.
  [`App.tsx:420`](../../src/App.tsx#L420)

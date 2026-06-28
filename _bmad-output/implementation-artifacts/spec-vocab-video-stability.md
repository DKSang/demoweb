---
title: 'Vocabulary & Video Stability Improvements'
type: 'feature'
created: '2026-06-28'
status: 'done'
route: 'one-shot'
---

# Vocabulary & Video Stability Improvements

## Intent

**Problem:** When users switch tabs (e.g. from Shadowing to AI Coach or Vocabulary) in the AISpeakingLab, the YouTube player unmounts, causing the video frame to go black, lose its state, and reload. Additionally, the manual vocabulary entry ("Add Word" tab) was defined but unimplemented.

**Approach:** Keep the YouTube shadowing player and UI mounted in the DOM at all times, controlling its visibility with standard CSS (`display: none` via the `hidden` utility class) to preserve the video player's state. Implement the Add Custom Vocabulary form UI and integrate it with a new `handleInferWordDetails` callback, which queries the local Llama-3 model using the proxy `/api/chat` endpoint to auto-fill the pronunciation (IPA), definition, and example sentence for the given word.

## Suggested Review Order

- **YouTube Player Visibility Stability**
  [`src/components/AISpeakingLab.tsx:972`](../../src/components/AISpeakingLab.tsx#L972) -- Wrapping the shadowing player component in a container with a CSS class selector toggling visibility instead of unmounting.

- **Manual Vocabulary Input Form & AI Auto-fill**
  [`src/components/AISpeakingLab.tsx:1570`](../../src/components/AISpeakingLab.tsx#L1570) -- Implementing the form structure for adding a new vocabulary word, featuring a new **AI Auto-fill** button next to the input.
  [`src/components/AISpeakingLab.tsx:598`](../../src/components/AISpeakingLab.tsx#L598) -- Implementing `handleInferWordDetails` which fetches parsed JSON output (IPA, definition, example sentence) using the local Llama3 API gateway.

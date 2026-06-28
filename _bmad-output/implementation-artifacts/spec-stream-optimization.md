---
title: 'AI Coach Real-time Streaming & Optimization'
type: 'feature'
created: '2026-06-28'
status: 'done'
route: 'one-shot'
---

# AI Coach Real-time Streaming & Optimization

## Intent

**Problem:** Even after model options optimization, local Ollama responses can still take a few seconds to fully generate before any content is visible. A static chat block creates a high perceived wait time for conversational users.

**Approach:** 
1. Modify the backend gateway `/api/chat` to support real-time token streaming using server-sent chunks directly piped from the Ollama response stream.
2. Update the frontend `handleSendChat` to dynamically render incoming text chunks in real-time, parsing any grammar correction blocks on stream completion.

## Suggested Review Order

- **Backend Express Streaming Integration**
  [`src/server.ts:143`](../../src/server.ts#L143) -- Updating the `/api/chat` POST endpoint to set stream response headers and pipe Ollama's readable stream value chunks directly to the Express `res` writable stream.

- **Frontend Real-time Stream Consumer**
  [`src/components/AISpeakingLab.tsx:870`](../../src/components/AISpeakingLab.tsx#L870) -- Rewriting `handleSendChat` to request `stream: true`, consume Web Stream API chunk readers, decode output, and update chat history bubbles dynamically.

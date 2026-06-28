---
title: 'AI Coach Speaking UX & Full Context Optimization'
type: 'feature'
created: '2026-06-28'
status: 'done'
route: 'one-shot'
---

# AI Coach Speaking UX & Full Context Optimization

## Intent

**Problem:** 
1. The AI Coach lacks full context of the video, leading to conversational misunderstandings.
2. The speech recognition automatically stops on pause, which is frustrating for learners who need breaks to formulate sentences.
3. The initial delay before the stream starts makes users feel like the app is frozen or not working because no visual loader shows up in the message bubble.

**Approach:**
1. Ingest the entire video transcript script into the system prompt context.
2. Change the speech recognition configuration to `continuous = true` and `interimResults = true`, sending the speech input only when the user clicks the "Stop Recording" button.
3. Add a built-in shimmering dots loader inside any empty assistant message bubble to indicate immediate activity while the stream connection is established.

## Suggested Review Order

- **Full Script Ingestion**
  [`src/components/AISpeakingLab.tsx:793`](../../src/components/AISpeakingLab.tsx#L793) -- Removing the slice limitation on transcript lines to feed the full subtitles into the prompt.

- **Manual Stop Speech Recognition**
  [`src/components/AISpeakingLab.tsx:161`](../../src/components/AISpeakingLab.tsx#L161) -- Declaring `activeTabRef`.
  [`src/components/AISpeakingLab.tsx:334`](../../src/components/AISpeakingLab.tsx#L334) -- Setting `rec.continuous = true` and updating `onresult` to accumulate values.
  [`src/components/AISpeakingLab.tsx:983`](../../src/components/AISpeakingLab.tsx#L983) -- Modifying `handleRecordChatInput` to send on stop, and removing the auto-send `useEffect`.

- **Visual Response Loader**
  [`src/components/AISpeakingLab.tsx:1385`](../../src/components/AISpeakingLab.tsx#L1385) -- Adding the animated loading dots inside the message bubble if the content is empty.

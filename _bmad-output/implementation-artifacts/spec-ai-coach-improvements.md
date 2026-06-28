---
title: 'AI Coach Prompt and Speech Synthesis Upgrades'
type: 'bugfix'
created: '2026-06-28'
status: 'done'
baseline_commit: '3f81767da493db094048ab858c1a155eaf81f86e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 
1. The AI Speaking Coach does not naturally converse about the daily video lesson details. Instead, in Week 1 focus, it defaults to generic, daily-life questions, ignoring the loaded transcript.
2. The Text-To-Speech (TTS) voice reads English in a strange, non-English accent because the browser defaults the speech synthesis language to the user's OS language (Vietnamese) when `utterance.lang` is not explicitly set.

**Approach:**
1. Align the AI Coach system prompts for all weeks to prioritize lesson video context, subtitles, and scenes, ensuring questions and conversations are naturally tied to the specific lesson.
2. Force `utterance.lang = "en-US"` (or the selected voice language) in the `SpeechSynthesisUtterance` object to guarantee the browser uses a native English TTS engine.

## Boundaries & Constraints

**Always:**
- Set `utterance.lang` to `"en-US"` on the utterance object before calling the synthesis engine.
- Update `getSystemPrompt` to weave the subtitles snippet and lesson title context dynamically into all conversational focuses.

**Ask First:**
- N/A

**Never:**
- Do not hardcode a specific system voice name to avoid cross-platform browser errors; use the dynamic voice list filtering.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Speech Synthesis Accent | "Hello. Ready?" / Vietnamese OS | Speaks in clean English accent (`en-US` default) | N/A |
| Week 1 Contextual Question | "Learn English While Getting a Haircut..." | Asks a question about getting a haircut or details in the script (not "What did you eat today?") | N/A |

</frozen-after-approval>

## Code Map

- `src/components/AISpeakingLab.tsx` -- Holds the `speakAIResponse` helper and `getSystemPrompt` definition.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/AISpeakingLab.tsx` -- Update `speakAIResponse` to set language, and align `getSystemPrompt` to focus on the daily lesson video details.

**Acceptance Criteria:**
- Given the AI coach outputs audio, when it speaks English text, then the voice accent is a natural English accent (not Vietnamese phonetic).
- Given the user starts a session for a lesson, when the AI coach greets and asks the first question, then the question is contextually related to the lesson title/script.

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS

**Manual checks:**
- Open the AI Coach tab and verify the greeting is read in a clean English accent.
- Verify the AI Coach asks questions related to the current video lesson topic.

## Suggested Review Order

**Speech Accent & TTS Upgrades**
- Force English fallback language code on SpeechSynthesisUtterance to prevent phonetic Vietnamese OS voice default accent.
  [`AISpeakingLab.tsx:629-642`](../../src/components/AISpeakingLab.tsx#L629-L642)

**AI Coach Lesson Context Prompts**
- Align Ollama system prompts for all weeks to prioritize lesson video context, details, and subtitles.
  [`AISpeakingLab.tsx:1104-1125`](../../src/components/AISpeakingLab.tsx#L1104-L1125)


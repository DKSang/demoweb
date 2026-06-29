!`---
title: 'Accurate Script Sentence Splitting'
type: 'refactor'
created: '2026-06-28'
status: 'done'
baseline_commit: '95025255458513a05c2c30b3b1503c02f5e2faf0'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** YouTube video subtitle segments are split arbitrarily, cutting sentences in half and making shadowing extremely awkward. The previous AI-driven Llama-3 splitting batch approach was too slow, prone to API timeouts, text duplication, and timestamp misalignment.

**Approach:** Replace the slow, non-deterministic AI splitting with a high-performance, deterministic word-level punctuation algorithm on the backend. This algorithm splits the transcript accurately at sentence-ending punctuation (periods, question marks, exclamation marks), tokenizes words to interpolate timestamps, filters out sound effects like [Music], and avoids splitting at common abbreviations (e.g., Mr., Dr.).

## Boundaries & Constraints

**Always:**
- Use a deterministic, regex-based word tokenization and sentence assembly algorithm in the backend.
- Exclude audio/visual non-speech tags (e.g. `[Music]`, `(Laughter)`) from the text, as they are not speakable shadowing items.
- Maintain and interpolate the start and end times for words and resulting sentences.
- Smooth the end boundaries of each sentence to match the start of the next sentence to avoid overlaps.

**Ask First:**
- N/A

**Never:**
- Do not use Ollama/Llama-3 or external LLMs for splitting, parsing, or merging subtitle segments to avoid performance issues and timeouts.

## I/O & Edge-Case Matrix

| Scenario             | Input / State                                             | Expected Output / Behavior                                                  | Error Handling |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- | -------------- |
| Sentence Splitting   | "Good" (0-2), "morning. Whoa, dizzy. Dizzy. I feel" (2-8) | "Good morning." (0-5), "Whoa, dizzy." (5-12), "Dizzy." (12-15), "I feel..." | N/A            |
| Sound effects filter | "[Music] hello [Applause] world."                         | "hello world." (excluding tags)                                             | N/A            |
| Common Abbreviations | "Dr. Smith went home."                                    | "Dr. Smith went home." (No splitting at "Dr.")                              | N/A            |

</frozen-after-approval>

## Code Map

- `src/server.ts` -- Backend gateway server implementing the `/api/lessons/:id/initialize` endpoint and transcript formatting helpers.

## Tasks & Acceptance

**Execution:**
- [x] `src/server.ts` -- Replace the Ollama-based `reconstructTranscriptIntoSentences` helper with a deterministic word-level punctuation sentence reconstruction algorithm.

**Acceptance Criteria:**
- Given a raw subtitle transcript, when initialized, then lines are grouped into complete sentences ending with `.`, `?`, or `!`.
- Given a raw subtitle transcript, when initialized, then sound effect tags like `[Music]` or `(Laughter)` are filtered out.
- Given a raw subtitle transcript, when initialized, then common abbreviations (Mr., Dr., etc.) do not cause incorrect splits.

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS (tsc --noEmit compiles cleanly)

**Manual checks (if no CLI):**
- Verify that initializing "Learn English While Getting a Haircut in Vietnam" compiles correct, complete sentences (e.g. "Good morning.") in `lessons.json` and in the UI.

## Suggested Review Order

- High-performance, deterministic word-level punctuation sentence reconstruction algorithm in the backend.
  [`server.ts:155-218`](../../src/server.ts#L155-L218)


---
title: 'Experience Architecture for AI Speaking Lab'
status: 'final'
updated: '2026-06-27'
---

# Foundation

The AI Speaking Lab is a dedicated learning interface embedded directly inside the Bloom Studio single-page application. It inherits the visual identity defined in [DESIGN.md](file:///c:/Users/dksan/Code/demoweb/_bmad-output/planning-artifacts/ux-designs/ux-demoweb-2026-06-27/DESIGN.md) and behaves as a local-only, single-user dashboard using the Web Speech API and Ollama.

# Information Architecture

The lab is structured as a two-panel module or a unified dashboard containing three main tabs:
1.  **YouTube Shadowing**: The video lessons playlist selector, video player card, timed script player, and live microphone shadowing feedback.
2.  **Conversational Partner**: Chat interface for weeks 1–4 conversational speaking practice with Llama-3-8b, supporting push-to-talk microphone inputs and TTS voice outputs.
3.  **Vocabulary Notebook**: Streak tracker (displaying days practiced) and list of saved words with spelling, IPA, definition, and example sentences.

# Voice and Tone

- **The AI Coach**: Patient, professional, and encouraging. Speaks in short, simple A2/B1 English sentences (restricted to maximum 2 sentences for early weeks to prevent cognitive overload).
- **Corrections**: Direct, constructive, and brief. Shows the original mistake, the corrected form, and a short 1-line reason (e.g. *"Say 'I agree', not 'I am agree'"*).

# Component Patterns

- **Timed Video Script Sync**: As the YouTube video plays, the corresponding subtitle block is highlighted. Clicking "Practice this segment" seeks the video, plays it, automatically pauses at the segment end time, and triggers the "Listen & Speak" microphone overlay.
- **Pronunciation Word Matcher**: Compares the user's vocal transcript with the target subtitle.
  - Correct matching words are displayed in white or light green.
  - Mispronounced/missing words are displayed in red.
  - A circular progress meter shows the final matching score (percentage).

# State Patterns

- **State 1: Listening (AI/Video Speaking)**: The microphone input is disabled. The UI displays an audio waveform animation.
- **State 2: Speaking (Recording)**: The microphone is active. The user holds down a Spacebar or presses a prominent recording button. The UI pulses white/gray.
- **State 3: Scoring / Processing**: The app computes the comparison or waits for Ollama to return a chat response. A loading spinner is shown.

# Interaction Primitives

- **Push-to-Talk**: User holds down the Spacebar to speak, and releases it to submit. Tap-to-toggle microphone is also supported for hands-free convenience.
- **AI Speed Control**: A slider allowing the user to set Web Speech Synthesis (TTS) speed from `0.8x` to `1.2x`.

# Accessibility Floor

- **Keyboard Focus**: Interactive cards and buttons are focusable.
- **Visual Contrast**: White/light gray text on pure black and dark glass panels ensures high readability (meeting Web Content Accessibility Guidelines AAA standards for text contrast).
- **Manual Typing Fallback**: Users can type their answers manually if the microphone is unavailable or transcription fails.

# Key Flows

### Flow 1: Daily Task Progression (From Day 1 to Day 2 Unlock)
1.  **Enter Lesson Dashboard**: The user lands on Day 1. The player is locked to the "Getting a haircut in Vietnam" lesson. The dropdown is hidden; a static "DAY 1 LOCK" badge is displayed.
2.  **Task 1: Listen**: The user clicks play on a timed segment. Playing/interacting with the video segment automatically completes and checks off the **Listen** task in the Progression Status Bar.
3.  **Task 2: Shadow**: The user records their pronunciation for a segment. Upon achieving a similarity score >= 50, the **Shadow** task checks off. An inline green **Task Guidance Card** appears, prompting: *"✓ Listen & Shadow tasks completed! [Start Speaking with AI Coach →]"*.
4.  **Task 3: Speak**: The user clicks the CTA button, which automatically routes them to the AI Coach tab. The user sends a chat message. Upon receiving the completed stream response from Llama, the **Speak** task checks off. A second inline green **Task Guidance Card** appears under the input row, prompting: *"✓ AI Coach Speaking task completed! [Take Vocabulary Quiz →]"*.
5.  **Task 4: Quiz**: The user clicks the CTA, routing them to the Vocabulary -> Daily Quiz sub-tab. The user takes the generated multiple-choice quiz and achieves 100% correct, completing the **Quiz** task.
6.  **Celebrate & Unlock**: The full-screen **Day Completed Unlock Overlay** modal automatically appears. The user clicks *"Unlock Day 2"*. The dashboard transitions silently to the Day 2 lesson, resetting all task checkboxes to clean state.

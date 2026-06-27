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

### Flow 1: Shadowing Practice
1.  **Select Lesson**: User selects "British Time Expressions".
2.  **Play Segment**: User clicks play. The YouTube video plays from 0:15 to 0:20 and automatically pauses.
3.  **Vocal Practice**: User clicks "Record" and says "We woke up at stupid o'clock this morning."
4.  **Feedback**: The screen highlights "stupid o'clock" and shows a "96% Match" score.
5.  **Save Word**: User clicks a "+" icon next to "stupid o'clock" to save it to their vocabulary notebook.

### Flow 2: Speaking with Llama-3-8b
1.  **Choose Week**: User selects "Week 3 (Grammar & Correction)".
2.  **Open Conversation**: Llama-3-8b prompts: *"Hi Dksang, what time do you usually wake up?"*
3.  **Speak Answer**: User holds Spacebar and speaks: *"I usually wake up at half 6."*
4.  **Correction Card**: The UI shows a correction card stating: *"Perfect! In British English, 'half 6' means 6:30. Let's practice using it in another sentence."* The AI speaks this response out loud.

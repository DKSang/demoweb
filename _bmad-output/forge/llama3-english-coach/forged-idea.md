# Forged Idea: Llama-3-8b English Coach ("AI Speaking Lab")

## Locks
- **YouTube Shadowing Player**: Embedded IFrame API for video segments. Automatic timed play/pause.
- **Pronunciation Assessment**: Web Speech API for audio capture. Levenshtein text-difference alignment scoring (correct words = green, incorrect/missed = red).
- **Interactive AI Chat (Weeks 1-4)**: Contextual prompts tailored for A2/B1 constraints on local Llama-3-8b via Ollama.
- **Vocabulary Injection**: 25 words/day (from YouTube lesson scripts or common lists) loaded into Llama-3 system prompts to reward active usage.
- **Text-to-Speech (TTS)**: Native browser TTS with adjustable playback speeds for natural AI responses.
- **Local Database**: streaking, saved vocabulary notebooks, and chat transcripts persisted on `localStorage`.
- **Base Integration**: Integrated directly into Bloom Studio React/Tailwind v4 app, using a Vite proxy for Ollama calls.

## Killed
- **Complex Grammar Critiques**: Deep grammar rule analysis is replaced by simple, direct corrections to maintain speaking momentum.
- **Server Database**: PostgreSQL/Mongo backend rejected in favor of pure browser LocalStorage for simplicity.

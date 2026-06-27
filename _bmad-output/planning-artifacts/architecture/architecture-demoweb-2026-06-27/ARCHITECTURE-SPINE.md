---
title: 'Backend Architecture Spine: AI Speaking Lab'
status: 'final'
updated: '2026-06-27'
---

# Paradigms & Boundaries

The backend operates as a lightweight, single-user Express service running locally on port `3001`. It acts as an intermediary (gateway) between the React frontend, the local Ollama instance, and the file-based database on disk.

```
[React Frontend] (Port 3000)
       │
       ▼ (proxied via /api to 127.0.0.1:3001)
[Express Server] (Port 3001)
       │
       ├─► [Local Disk Database] (data/*.json)
       │
       └─► [Ollama Llama-3] (127.0.0.1:11434)
```

# Data Boundaries & Persistence

- **Local Storage Transition**: We transition the user's statistics, streaks, and saved vocabulary from browser `localStorage` to **file-based JSON persistence** on the backend disk under `{project-root}/data/`.
- **Database Schema**:
  - `data/vocabulary.json`: Array of saved words (word, IPA, definition, example sentence, date saved).
  - `data/streaks.json`: Array of ISO dates when the user practiced.
  - `data/lessons.json`: Array of 36 playlist lessons (id, title, videoId, vocab, lines, isInitialized).
  - `data/chat_history.json`: Structured logs of user-AI conversations, useful for pattern diagnostics in later stages.

# State Mutation Invariants

- **Single-User Safety**: Because it is a personal applet, operations do not require multi-tenant transaction locks. All write queries are executed as atomic file overrides (`fs.writeFileSync`) to prevent write overlaps.
- **Vocabulary De-duplication**: The backend must enforce that a word is never saved twice in the notebook (case-insensitive deduplication).

# Client-Server Contract

The Express server exposes the following API routes:
- `POST /api/chat` -- Reroutes conversational prompt payload to Ollama Llama-3 after formatting the week-specific prompt context.
- `GET /api/vocabulary` -- Retrieves saved words.
- `POST /api/vocabulary` -- Appends a new word.
- `DELETE /api/vocabulary/:word` -- Removes a word.
- `GET /api/streaks` -- Retrieves streaks array.
- `POST /api/streaks` -- Logs today as practiced.
- `GET /api/lessons` -- Retrieves available playlist lessons.
- `POST /api/lessons/:id/initialize` -- Fetches video subtitles from YouTube, extracts vocabulary using Llama-3, and updates database.

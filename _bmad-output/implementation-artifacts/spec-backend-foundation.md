---
title: 'Express Backend Foundation (Ollama + File DB)'
type: 'feature'
created: '2026-06-27'
status: 'done'
baseline_commit: '96ccbc4'
context: ['{project-root}/_bmad-output/project-context.md', '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-demoweb-2026-06-27/ARCHITECTURE-SPINE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user needs a persistent local backend for the AI Speaking Lab to persist vocabulary list records and streak data directly to disk files, proxy Llama-3 API requests securely, and remove reliance on fragile browser `localStorage`.

**Approach:** Implement a local Express backend running on port `3001` that handles file persistence inside a `data/` folder, and proxy Ollama Llama-3 requests. Shift Vite proxy settings to target the Express server. Refactor `AISpeakingLab` to use fetch queries to the Express server.

## Boundaries & Constraints

**Always:**
- Run Express on port `3001` locally.
- Use `fs` sync operations (`fs.writeFileSync`) for atomic file-overwrites to ensure simple, robust single-user persistence.
- Reroute all frontend calls to `/api/chat`, `/api/vocabulary`, and `/api/streaks`.

**Never:**
- Hardcode absolute file paths outside the project root workspace folder.
- Run external databases (MongoDB, Postgres) requiring complex installation steps.

</frozen-after-approval>

## Code Map

- `package.json` -- Register `npm run server` script to run the Express backend.
- `vite.config.ts` -- Reconfigure Vite dev server proxy to target port `3001` (Express).
- `src/server.ts` -- [NEW] Express server in TypeScript with CORS, routes, file DB, and Ollama bridge.
- `src/components/AISpeakingLab.tsx` -- Update chat, shadowing, and vocabulary methods to read/write through the backend APIs.

## Tasks & Acceptance

**Execution:**
- [x] `src/server.ts` -- Create the Express server and implement Ollama and file-based JSON endpoints.
- [x] `package.json` -- Register the `server` startup script.
- [x] `vite.config.ts` -- Route `/api` to port `3001`.
- [x] `src/components/AISpeakingLab.tsx` -- Refactor API calls to read and write database records to port `3001`.

**Acceptance Criteria:**
- Given a local server on port 3001, when the frontend requests vocabulary or streaks, it retrieves them from the local JSON files on disk.
- When the user adds a new word or completes a session, the backend writes the data immediately to files under `data/`.
- When a chat prompt is sent, it is routed through Express `/api/chat` and successfully resolves via the local Ollama instance.

## Suggested Review Order

**Gateway Server & Database Invariants**

- Entry point implementing Express routing, JSON local file storage checks, and Ollama HTTP endpoints.
  [`server.ts:1`](../../src/server.ts#L1)

- Port 3001 mapping to support Express service redirect and local configuration proxy routes.
  [`vite.config.ts:20`](../../vite.config.ts#L20)

- Node execution script to trigger the TS Dev Server on backend startup.
  [`package.json:11`](../../package.json#L11)

**Frontend State Refactoring**

- Modify client component lifecycle hook to fetch vocabulary and streaks from backend API routes.
  [`AISpeakingLab.tsx:138`](../../src/components/AISpeakingLab.tsx#L138)

- Update save, delete, and streak trigger handlers to execute standard POST/DELETE requests.
  [`AISpeakingLab.tsx:317`](../../src/components/AISpeakingLab.tsx#L317)


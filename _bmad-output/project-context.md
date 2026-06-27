---
project_name: 'demoweb'
user_name: 'Dksang'
date: '2026-06-27'
sections_completed:
  - 'technology_stack'
  - 'language_rules'
  - 'framework_rules'
  - 'testing_rules'
  - 'code_quality_rules'
  - 'workflow_rules'
  - 'dont_miss_rules'
status: 'complete'
rule_count: 21
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend Core**: React 19.0.1 (Single-page app)
- **Bundler & Build Tool**: Vite 6.2.3
- **Language**: TypeScript 5.8.2 (target: ES2022, module: ESNext)
- **Styling**: Tailwind CSS 4.1.14 (via `@tailwindcss/vite` plugin)
- **Animation**: Motion (Framer Motion v12)
- **Icons**: Lucide React 0.546.0
- **Backend / Utilities**: Express 4.21.2, dotenv 17.2.3, tsx 4.21.0

## Critical Implementation Rules

### Language-Specific Rules

- **Import Extensions**: File imports must include the explicit file extension (e.g., `import App from './App.tsx'`) as enabled by TS `allowImportingTsExtensions`.
- **Absolute Paths**: Utilize the `@/` prefix to resolve paths relative to the project root (e.g., `@/src/components/...` or `@/src/types.ts`) to avoid deep nested relative path backtracking (`../../`).
- **TypeScript Strictness**: Strictly type all API responses and model parameters (such as Ollama messages and response schemas). Avoid using `any` or broad types where possible.

### Framework-Specific Rules

- **React 19 & Hooks**: Use modern React 19 conventions. Maintain clean functional components and explicit side-effects using standard hooks (`useState`, `useEffect`, `useRef`).
- **Motion v12 Animations**: All animations must import from `motion/react` (e.g., `import { motion } from "motion/react"`). Use `<AnimatePresence>` for exit animations.
- **Tailwind CSS v4**: Do not create or edit `tailwind.config.js`. Tailwind CSS v4 configurations (like theme customization, custom fonts, liquid-glass classes) are managed directly inside [src/index.css](file:///c:/Users/dksan/Code/demoweb/src/index.css) using the new CSS-first syntax.
- **Vite Configuration**: Do not modify the HMR (`server.hmr`) or watch (`server.watch`) parameters in [vite.config.ts](file:///c:/Users/dksan/Code/demoweb/vite.config.ts) as they are optimized to save CPU and prevent infinite loops during file edits.

### Testing Rules

- **No Automated Test Framework**: Currently, no automated testing framework (like Vitest or Jest) is configured. All verification must be done manually via the local browser.
- **Manual Verification**: Before signing off on any UI or functional changes, run the dev server (`npm run dev`) and verify:
  1. Responsive layout compatibility (mobile, tablet, desktop).
  2. Contrast and readability of grayscale text against dark/video backgrounds.
  3. Interactive features (sandbox controls, API connections, animations) execute without console errors.

### Code Quality & Style Rules

- **Visual Theme and Aesthetics**: All new elements, views, and components must adhere to the high-contrast, dark-grayscale and liquid-glass aesthetic. Do not use vibrant colors unless necessary for functional status indicators, and keep them consistent.
- **Component File Structure**: Place new components (e.g., `EnglishChat.tsx`, `VocabularyCoach.tsx`) in the [src/components/](file:///c:/Users/dksan/Code/demoweb/src/components) directory and export them as `default`.
- **Tailwind Utility Ordering**: Organize Tailwind utility classes logically (layout -> spacing -> sizing -> border -> background -> typography -> transitions).
- **Responsive Classes**: Always use responsive modifiers (`sm:`, `md:`, `lg:`) to ensure visual components scale correctly.

### Development Workflow Rules

- **Branch Naming**: Use clear, descriptive branch prefixes (e.g., `feat/`, `fix/`, `chore/`) followed by kebab-case names, e.g., `feat/ollama-english-chat`.
- **Commit Format**: Use conventional commit prefixes (e.g., `feat: Add Ollama client connection`, `fix: Correct markdown rendering layout`).
- **Build & Lint Checks**: Always run type checks (`npm run lint` which executes `tsc --noEmit`) to verify there are no TypeScript compilation errors before committing changes.

### Critical Don't-Miss Rules

- **Ollama API Access**: Always connect to Ollama using relative paths (e.g., `/api/ollama` or via a Vite proxy config) or specify it using a configurable environment variable (`VITE_OLLAMA_URL`). Never hardcode `http://localhost:11434` directly in production code.
- **Port Allocation**: The local development server must run on port `3000` (as defined in `package.json` scripts).
- **Environment Variables**: Sensitive API keys (e.g., Google GenAI keys) or local addresses must be placed in a `.env` file (copied from `.env.example`). Do not commit actual `.env` files to git.
- **Keep Animation Smoothness**: Avoid complex re-renders that interrupt the fixed background video (`App.tsx`: line 46) or cause visual glitching. Always test animations in the browser sandbox.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack changes.
- Review quarterly for outdated rules.
- Remove rules that become obvious over time.

Last Updated: 2026-06-27

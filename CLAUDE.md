# Flipwise — notes for Claude

Personal Quizlet-style flashcards PWA (Russian UI). Local-only data (IndexedDB), no backend, no login.
Each user brings their own AI API key (stored in localStorage) for example sentences.

## Stack

Vite 8 · React 19 · TypeScript 7 (`tsc --noEmit` only; Biome does not type-check) · Tailwind CSS 4 (tokens via `@theme` in `src/index.css`) ·
Motion 14 (`motion/react`) · React Router 8 (**hash router** for GitHub Pages) · Dexie 4 · Zod 4 · vite-plugin-pwa 2 · Biome 2 · Vitest 5.

## Commands

- `npm run dev` — dev server
- `npm run check` / `npm run check:fix` — Biome lint + format
- `npm run typecheck` — TypeScript
- `npm test` — Vitest (`npm test -- --run` for a single run)
- `npm run build` — production build (`BASE_PATH=/flipwise/` for Pages)

All four (check, typecheck, test, build) must pass before every commit; CI runs the same.

## Layout

- `src/app` — App shell, router, page transitions, theme, error boundary, PWA update prompt
- `src/design` — design primitives (Button, IconButton, Sheet, Menu, Field, Progress, Toast, TopBar, icons, Logo)
- `src/db` — Dexie schema (`db.ts`), repositories (`decks.ts`, `progress.ts`, `sessions.ts`), live-query hooks
- `src/features/*` — screens per feature (decks, flashcards, learn, test, ai, settings, tts)
- `src/lib` — pure helpers (answer matching, import parsing, backup, shuffle, storage)
- `src/i18n/ru.ts` — **all** UI strings; never hard-code Russian text in components

## Conventions

- Pure logic lives in `src/lib` and the engines (`learnEngine.ts`, `testGenerator.ts`, `ai/prompt.ts`) and is covered by unit tests next to the file (`*.test.ts`).
- Design tokens: use semantic Tailwind colours (`bg-surface`, `text-ink-2`, `bg-primary`, `text-good`…) and the `raised` / `primary-fill` utilities. Never use raw hex in components except for the logo.
- Primary action visible, secondary actions behind the "…" `Menu`. Deletions happen immediately with an "Отменить" toast instead of confirm dialogs.
- Animations are springs from `src/design/motion.ts`; `MotionConfig reducedMotion="user"` respects `prefers-reduced-motion`.
- localStorage keys are prefixed `flipwise.` (GitHub Pages shares one origin across a user's projects).
- Dexie schema changes require a new `version()` (FSRS fields will be added that way).
- **Plans: after a plan is approved, do NOTHING else** — no branch, no edits, no commands. Only save the plan to `plans/<short-name>.md` (gitignored) and stop; implementation starts only when the user explicitly asks.
- Commits: Conventional Commits in English (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). After the first push, features go through `feat/*` branches and PRs.

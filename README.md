<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Flipwise logo">
</p>

<h1 align="center">Flipwise</h1>

<p align="center">A personal, Quizlet-style flashcards app with spring animations and AI example sentences.<br>
Local-first, installable, no account needed.</p>

---

## Features

- **Decks** with a language pair and CEFR level, drag-to-reorder editor, paste-to-import from Quizlet
- **Flashcards** — 3D flip, swipe right "know" / left "still learning", undo, keyboard shortcuts
- **Learn** — adaptive rounds: multiple choice → typed answer, typo tolerance, resumable sessions
- **Test** — multiple choice, true/false and written questions, results with a review of mistakes
- **AI example sentences** (bring your own key): OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter
- **Text-to-speech** via the Web Speech API
- **Backup** — export/import everything as JSON, share a single deck as a file
- **PWA** — installable, works offline, light and dark themes

## Quick start

```bash
npm ci
npm run dev
```

Requires Node 24+.

| Script              | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start the dev server          |
| `npm run build`     | Production build into `dist/` |
| `npm run preview`   | Serve the production build    |
| `npm run check`     | Lint and format check (Biome) |
| `npm run typecheck` | Type-check with TypeScript    |
| `npm test`          | Run unit tests (Vitest)       |

## AI example sentences: getting a key

Open **Settings → ИИ-примеры**, pick a provider, paste your key and press **Проверить ключ**.

| Provider                       | Get a key                                                        | Default model                          |
| ------------------------------ | ---------------------------------------------------------------- | -------------------------------------- |
| Anthropic                      | [platform.claude.com](https://platform.claude.com/settings/keys) | `claude-haiku-5-5` (Opus 5.5 optional) |
| OpenAI                         | [platform.openai.com](https://platform.openai.com/api-keys)      | `gpt-6-luna`                           |
| Google Gemini                  | [aistudio.google.com](https://aistudio.google.com/app/apikey)    | `gemini-3.5-flash-lite`                |
| DeepSeek                       | [platform.deepseek.com](https://platform.deepseek.com/api_keys)  | `deepseek-flash`                       |
| OpenRouter (Mistral, Llama, …) | [openrouter.ai](https://openrouter.ai/keys)                      | `openai/gpt-6-luna`                    |

Every provider also accepts any model id via **Своя модель…**, so new models work without an app update.

## Privacy

All decks and progress live in your browser's IndexedDB. Nothing is sent anywhere — except the
card you ask AI examples for, which goes **directly from your browser** to the AI provider you chose,
using your own API key. The key is stored only in this browser's localStorage. Create a separate key
with a spending limit.

Note: GitHub Pages serves all of an account's project sites from one origin, so other pages on
`<user>.github.io` could read this origin's localStorage. Only deploy pages you trust there.

## Deployment

Every push to `main` is checked and deployed to GitHub Pages by `.github/workflows/ci.yml`
(Settings → Pages → Source: **GitHub Actions**). Pull requests are checked only.

## License

[MIT](LICENSE)

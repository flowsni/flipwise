# Browser checks

Run against the **production build** (`vite preview`): the service worker and chunk splitting
don't exist in dev. Playwright builds and serves it itself.

| Command                    | What                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run e2e`              | Behaviour: back navigation, no layout jumps, search → card, single create button, PWA caching   |
| `npm run e2e:perf`         | Timings at 4× CPU on 250- and 600-card decks (Chrome only; limits are loose, machine-dependent) |
| `E2E_WEBKIT=1 npm run e2e` | Same behaviour checks in Safari's engine. First `npx playwright install webkit`                 |

Chrome is the system one (`channel: 'chrome'`); nothing else is downloaded. Not part of CI
(`npm run check && typecheck && test && build` stays the gate); run `e2e` before opening a PR that
touches navigation, routing, list rendering or `vite.config.ts`.

## Not automatable: iOS Simulator (Safari), by hand

Playwright's WebKit is the same engine but not iOS Safari. Before a PR that touches routing,
page transitions or the PWA config, in the Simulator (`npm run build && npm run preview`, open
`http://localhost:4173/`):

1. The home screen renders (a blank page here was once caused by chunk splitting in `vite.config.ts`).
2. Home has **one** «Создать набор» button.
3. Open a deck, tap «←»: back on home, Safari's back arrow is disabled and «forward» is active.
4. Open a deck, swipe back from the left edge: nothing jumps afterwards.
5. Search → tap a result: the page stays at that card.

## Adding a check

Put behaviour in `e2e/*.spec.ts` (use `openApp` / `seedDeck` from `helpers.ts`), timings in
`perf.spec.ts` with `@perf` in the title. After writing a check, break the code it guards once and
confirm it fails.

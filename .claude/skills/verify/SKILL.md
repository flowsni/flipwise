---
name: verify
description: Запускает все проверки проекта Flipwise (lint, типы, тесты, сборка и при необходимости e2e) перед коммитом или PR.
---

Команды и правила описаны в `CLAUDE.md` и `e2e/README.md`.

1. По очереди: `npm run check`, `npm run typecheck`, `npm test -- --run`, `npm run build`.
2. Узнай, что менялось: `git fetch origin main` (если не вышло, например нет сети, сравнивай с имеющимся `origin/main`), затем `git diff --name-only --merge-base origin/main` и `git status --porcelain` (новые файлы).
3. Если есть изменения в `src/app`, `src/design`, `src/features`, `vite.config.ts` или `e2e/`: `npm run e2e`.
4. Если менялись списки или рендер (строки и списки карточек, главная, поиск, редактор, мемоизация, анимации строк): `npm run e2e:perf`.
5. Если менялись роутинг, переходы или `vite.config.ts`: напомни про ручной чеклист iOS Simulator из `e2e/README.md`. Сам его не проходи.

На первом падении остановись и покажи вывод. Ничего не чини без просьбы.

В конце таблица «шаг → ок / упал / пропущен (почему)».

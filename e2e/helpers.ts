import type { Page } from '@playwright/test'

/** Opens the app and waits until the demo deck is seeded, so the IndexedDB exists. */
export async function openApp(page: Page) {
  await page.goto('about:blank') // a known entry before the app: history.back() leaves it
  await page.goto('/')
  await page.locator('main a[href^="#/deck/"]').first().waitFor()
}

/** Writes a deck of `count` cards straight into IndexedDB (a third of them "hard"). */
export async function seedDeck(page: Page, id: string, count: number) {
  await page.evaluate(
    async ({ id, count }) => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const req = indexedDB.open('flipwise')
        req.onsuccess = () => resolve(req.result)
      })
      const tx = db.transaction(['decks', 'cards', 'progress'], 'readwrite')
      const now = Date.now()
      tx.objectStore('decks').put({
        id,
        title: 'Большой набор',
        termLang: 'en',
        defLang: 'ru',
        level: 'B2',
        createdAt: now,
        updatedAt: now + 1e6,
      })
      for (let i = 0; i < count; i++) {
        tx.objectStore('cards').put({
          id: `${id}${i}`,
          deckId: id,
          position: i,
          term: `word number ${i}`,
          definition: `перевод слова ${i}`,
          createdAt: now,
          updatedAt: now,
        })
        if (i % 3 === 0) {
          tx.objectStore('progress').put({
            cardId: `${id}${i}`,
            deckId: id,
            flash: 'learning',
            learnStage: 0,
            correct: 1,
            wrong: 3 + (i % 5),
            lastSeenAt: now,
          })
        }
      }
      await new Promise((resolve) => {
        tx.oncomplete = resolve
      })
    },
    { id, count },
  )
  await page.reload()
  await page.locator(`main a[href="#/deck/${id}"]`).waitFor()
}

/** Where the router is: hash and its history index (0 = first entry of the app). */
export const where = (page: Page) =>
  page.evaluate(() => ({ hash: location.hash, idx: history.state?.idx ?? null }))

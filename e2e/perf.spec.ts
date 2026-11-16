import { expect, test } from '@playwright/test'
import { openApp, seedDeck } from './helpers'

// Timings at 4× CPU slowdown. Run with `npm run e2e:perf`; numbers depend on the machine, so
// the limits are loose and a failure means "look at it", not "it is certainly broken".
test.skip(({ browserName }) => browserName !== 'chromium', 'CPU throttling is a Chrome feature')
test.use({ serviceWorkers: 'block' }) // the worker installing would add long tasks of its own

/** Starts collecting long tasks; `longTasks()` returns their durations in ms. */
async function trackLongTasks(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __lt: number[] }
    w.__lt = []
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__lt.push(Math.round(e.duration))
    }).observe({ type: 'longtask' })
  })
  return () => page.evaluate(() => (window as unknown as { __lt: number[] }).__lt)
}

for (const count of [250, 600]) {
  test.describe(`${count}-card deck @perf`, () => {
    test.beforeEach(async ({ page }) => {
      await openApp(page)
      await seedDeck(page, 'big', count)
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    })

    test('starring a card has no long task', async ({ page }) => {
      await page.goto('/#/deck/big')
      await page.locator('#deck-cards li').first().waitFor()
      await page.waitForTimeout(800)
      const longTasks = await trackLongTasks(page)
      await page.locator('#deck-cards li button[aria-pressed]').first().click()
      await page.waitForTimeout(1200)
      expect(Math.max(0, ...(await longTasks()))).toBeLessThan(100)
    })

    test('typing in search has no long task per keystroke', async ({ page }) => {
      await page.goto('/#/search')
      await page.locator('input[type=search]').waitFor()
      await page.waitForTimeout(1000)
      const longTasks = await trackLongTasks(page)
      await page.locator('input[type=search]').pressSequentially('word number 4', { delay: 120 })
      await page.waitForTimeout(1200)
      expect(Math.max(0, ...(await longTasks()))).toBeLessThan(200)
    })
  })
}

test('opening a 250-card deck @perf', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 250)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('/#/')
  await page.waitForTimeout(800)
  const ms = await page.evaluate(async () => {
    const t0 = performance.now()
    location.hash = '#/deck/big'
    await new Promise<void>((resolve) => {
      const id = setInterval(() => {
        if (document.querySelector('#deck-cards li')) {
          clearInterval(id)
          resolve()
        }
      }, 5)
    })
    return Math.round(performance.now() - t0)
  })
  console.log(`open 250-card deck @4x CPU: ${ms} ms`)
  expect(ms).toBeLessThan(500)
})

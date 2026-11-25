import { expect, test } from '@playwright/test'
import { openApp, seedDeck } from './helpers'

const LONG = 'a'.repeat(80)

test('a long word does not widen the deck page', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'long', 5, LONG)
  await page.goto('/#/deck/long')
  const row = page.locator('[data-card]').first()
  await row.waitFor()
  await page.waitForTimeout(400)
  const m = await page.evaluate(() => {
    const li = document.querySelector('[data-card]') as HTMLElement
    const btns = [...li.querySelectorAll('button')].map((b) => b.getBoundingClientRect().right)
    return {
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
      right: Math.max(0, ...btns),
      liRight: li.getBoundingClientRect().right,
    }
  })
  expect(m.sw).toBeLessThanOrEqual(m.iw)
  expect(m.right).toBeLessThanOrEqual(m.iw)
  expect(m.liRight).toBeLessThanOrEqual(m.iw)
})

test('long word and fast swipes never widen the flashcards page', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'long', 5, LONG)
  await page.goto('/#/deck/long/flashcards')
  await page.locator('[lang]').filter({ hasText: LONG }).first().waitFor()
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const w = window as unknown as { __max: number }
    w.__max = 0
    const tick = () => {
      w.__max = Math.max(w.__max, document.documentElement.scrollWidth - innerWidth)
      requestAnimationFrame(tick)
    }
    tick()
  })
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(800)
  expect(await page.evaluate(() => (window as unknown as { __max: number }).__max)).toBe(0)
  const card = await page.evaluate(() => {
    const face = [...document.querySelectorAll('[lang]')].find((e) =>
      e.textContent?.includes('aaaa'),
    )
    const box = face?.parentElement?.getBoundingClientRect()
    return { text: face?.scrollWidth ?? 0, face: face?.clientWidth ?? 0, box: box?.width ?? 0 }
  })
  expect(card.text).toBeLessThanOrEqual(card.face)
})

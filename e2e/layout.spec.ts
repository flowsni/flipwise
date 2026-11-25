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
    return { text: face?.scrollWidth ?? 0, face: face?.clientWidth ?? 0 }
  })
  expect(card.text).toBeLessThanOrEqual(card.face)
})

test('12 arrow presses at 0.6s intervals are all counted at 4× CPU @perf', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CPU throttling is a Chrome feature')
  await openApp(page)
  await seedDeck(page, 'long', 12)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('/#/deck/long/flashcards')
  await page
    .getByText('Круг пройден')
    .or(page.getByText('1 из 12', { exact: true }))
    .first()
    .waitFor()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(600)
  }
  await expect(page.getByRole('heading', { name: 'Отличная работа!' })).toBeVisible()
})

test('undo while the card flies out is ignored and nothing is skipped', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'long', 5)
  await page.goto('/#/deck/long/flashcards')
  await page.getByText('1 из 5', { exact: true }).waitFor()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(800)
  await expect(page.getByText('2 из 5', { exact: true })).toBeVisible()
  // History is not empty now, so an unprotected undo would really run.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(800)
  await expect(page.getByText('3 из 5', { exact: true })).toBeVisible()
  await page.keyboard.press('Backspace')
  await expect(page.getByText('2 из 5', { exact: true })).toBeVisible()
})

test('touching the flying card does not freeze it', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'long', 5)
  await page.goto('/#/deck/long/flashcards')
  await page.getByText('1 из 5', { exact: true }).waitFor()
  await page.keyboard.press('ArrowRight')
  const box = (await page.locator('[role="button"][aria-label*="Перевернуть"]').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(800)
  await expect(page.getByText('2 из 5', { exact: true })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('3 из 5', { exact: true })).toBeVisible()
})

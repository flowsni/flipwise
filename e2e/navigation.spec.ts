import { expect, test } from '@playwright/test'
import { openApp, seedDeck, where } from './helpers'

test('«←» is one step back, so the system «назад» does not return to the deck', async ({
  page,
}) => {
  await openApp(page)
  await page.locator('main a[href^="#/deck/"]').first().click()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Мои наборы')

  await page.getByRole('button', { name: 'Назад' }).click()
  await expect.poll(() => where(page)).toMatchObject({ hash: '', idx: 0 })

  await page.goBack() // leaves the app: there is no deck entry behind «←»
  expect(page.url()).toBe('about:blank')
})

test('«←» on the first entry goes to the parent without adding history', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 5)
  await page.goto('about:blank')
  await page.goto('/#/deck/big')
  await page.getByRole('button', { name: 'Назад' }).click()
  await expect.poll(() => where(page)).toMatchObject({ hash: '#/', idx: 0 })
})

test('deleting a deck and going back lands where the deck was opened from', async ({ page }) => {
  await openApp(page)
  await page.locator('main a[href^="#/deck/"]').first().click()
  await page.getByRole('button', { name: 'Ещё' }).first().click()
  await page.getByRole('menuitem', { name: /Удалить/ }).click()
  await expect.poll(() => where(page)).toMatchObject({ hash: '', idx: 0 })
})

test('cold-opening a big deck does not shift the list', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 300)
  await page.evaluate(() => {
    const seen = new Set<number>()
    ;(window as unknown as { __seen: Set<number> }).__seen = seen
    const tick = () => {
      const el = document.querySelector('#cards-title')
      if (el) seen.add(Math.round(el.getBoundingClientRect().top + scrollY))
      requestAnimationFrame(tick)
    }
    tick()
    location.hash = '#/deck/big'
  })
  await page.waitForTimeout(1500)
  const positions = await page.evaluate(() => [
    ...(window as unknown as { __seen: Set<number> }).__seen,
  ])
  expect(positions).toHaveLength(1)
})

test('search → card keeps the page at the found card', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 300)
  await page.goto('/#/search?q=word%20number%20250')
  await page.locator('a[href*="card=big250"]').first().click()
  const top = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-card="big250"]')
      return el ? Math.round(el.getBoundingClientRect().top) : null
    })
  const height = page.viewportSize()?.height ?? 0
  // The scroll happens a frame after the card mounts: wait until it is in view.
  await expect
    .poll(async () => {
      const y = await top()
      return y !== null && y > 0 && y < height
    })
    .toBe(true)
  const first = await top()
  await page.waitForTimeout(1200)
  expect(await top()).toBe(first) // no jump to the top afterwards
})

test('the search field updates the URL only after a pause', async ({ page }) => {
  await openApp(page)
  await page.goto('/#/search')
  await page.locator('input[type=search]').pressSequentially('apple', { delay: 40 })
  expect(await where(page).then((w) => w.hash)).toBe('#/search')
  await expect.poll(() => where(page).then((w) => w.hash)).toBe('#/search?q=apple')
})

test('home has a single «Создать набор» button on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only')
  await openApp(page)
  await expect(
    page.getByRole('button', { name: 'Создать набор' }).filter({ visible: true }),
  ).toHaveCount(1)
})

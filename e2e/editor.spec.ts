import { expect, test } from '@playwright/test'
import { openApp, seedDeck } from './helpers'

test.beforeEach(async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 250)
  await page.goto('/#/deck/big/edit')
  await page.locator('[data-row]').first().waitFor()
})

test('a full 250-card deck: typing, filter and the add button', async ({ page }) => {
  await expect(page.locator('[data-row]')).toHaveCount(250)
  // At the limit the add button is disabled.
  await expect(page.getByRole('button', { name: /Максимум в наборе/ })).toBeDisabled()

  // The filter hides rows without unmounting them.
  await page.getByRole('searchbox').fill('перевод слова 7')
  await expect(page.locator('[data-row]:not([hidden])')).toHaveCount(11)
  await expect(page.locator('[data-row]')).toHaveCount(250)
  await page.getByRole('searchbox').press('Escape')
  await expect(page.locator('[data-row]:not([hidden])')).toHaveCount(250)

  // Typing into a row keeps the others as they were.
  const first = page.locator('[data-row] input').first()
  await first.fill('edited')
  await expect(first).toHaveValue('edited')
  await expect(page.locator('[data-row] input').nth(2)).toHaveValue('word number 1')
})

test('leaving with unsaved changes asks first; without changes it does not', async ({ page }) => {
  const dialogs: string[] = []
  page.on('dialog', (d) => {
    dialogs.push(d.type())
    d.dismiss()
  })
  const back = page.getByRole('button', { name: 'Назад' })
  await back.click()
  await expect(page).toHaveURL(/#\/deck\/big$/)
  expect(dialogs).toEqual([])

  await page.goto('/#/deck/big/edit')
  await page.locator('[data-row] input').first().fill('changed')
  await back.click()
  await expect.poll(() => dialogs).toEqual(['confirm'])
  await expect(page).toHaveURL(/#\/deck\/big\/edit$/)
})

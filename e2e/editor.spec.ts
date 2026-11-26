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

test('leaving with unsaved changes opens a sheet; without changes it does not', async ({
  page,
}) => {
  const back = page.getByRole('button', { name: 'Назад' })
  await back.click()
  await expect(page).toHaveURL(/#\/deck\/big$/)

  await page.goto('/#/deck/big/edit')
  await page.locator('[data-row] input').first().fill('changed')
  await back.click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  // Closing the sheet keeps you in the editor.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(/#\/deck\/big\/edit$/)

  await back.click()
  await page.getByRole('button', { name: 'Выйти без сохранения' }).click()
  await expect(page).toHaveURL(/#\/deck\/big$/)
  await expect(sheet).toBeHidden()

  await page.goto('/#/deck/big/edit')
  await page.locator('[data-row] input').first().fill('saved term')
  await page.getByRole('button', { name: 'Назад' }).click()
  await page.getByRole('button', { name: 'Сохранить и выйти' }).click()
  await expect(page).toHaveURL(/#\/deck\/big$/)
  await expect(page.getByText('saved term').first()).toBeVisible()
})

test('a late deck query does not wipe what was typed', async ({ page }) => {
  await page.getByRole('button', { name: 'Назад' }).click()
  await expect(page).toHaveURL(/#\/deck\/big$/)
  // The editor now opens from the cached deck; deliver the fresh deck query 600 ms late, as on
  // a busy phone, so it lands after typing.
  await page.evaluate(() => {
    const get = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (this: IDBObjectStore, key: IDBValidKey) {
      const req = get.call(this, key)
      if (this.name !== 'decks') return req
      let handler: ((e: Event) => void) | null = null
      Object.defineProperty(req, 'onsuccess', {
        set: (fn) => {
          handler = fn
        },
        get: () => handler,
      })
      req.addEventListener('success', (e) => setTimeout(() => handler?.call(req, e), 600))
      return req
    }
  })
  await page.goto('/#/deck/big/edit')
  const first = page.locator('[data-row] input').first()
  await first.fill('typed')
  await page.waitForTimeout(1000)
  await expect(first).toHaveValue('typed')
})

test('system back with unsaved changes opens the sheet instead of dropping them', async ({
  page,
}) => {
  // Reached by clicking, not goto: a hash-only change leaves history entries without
  // React Router's idx, and the blocker would reload the page instead of showing the sheet.
  await page.goto('/')
  await page.locator('main a[href="#/deck/big"]').click()
  await page.getByRole('button', { name: 'Ещё' }).first().click()
  await page.getByRole('menuitem', { name: 'Редактировать' }).click()
  await page.locator('[data-row]').first().waitFor()

  // Without edits system back leaves at once.
  await page.goBack()
  await expect(page).toHaveURL(/#\/deck\/big$/)
  await page.goForward()
  await expect(page).toHaveURL(/#\/deck\/big\/edit$/)
  await page.locator('[data-row]').first().waitFor()

  await page.locator('[data-row] input').first().fill('changed')
  await page.goBack()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(/#\/deck\/big\/edit$/)

  await page.getByRole('button', { name: 'Выйти без сохранения' }).click()
  await expect(page).toHaveURL(/#\/deck\/big$/)
  await expect(page.getByRole('dialog')).toBeHidden()
})

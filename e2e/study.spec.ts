import { expect, test } from '@playwright/test'
import { openApp, seedDeck } from './helpers'

test('a wrong choice in Learn does not move the options', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 30)
  await page.goto('/#/deck/big/learn')
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  const options = page.locator('fieldset button')
  await options.first().waitFor()
  await page.waitForTimeout(600) // the question's enter animation
  const tops = () =>
    options.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
  const before = await tops()

  // «word number N» → «перевод слова N»: pick any option that is not the right one.
  const prompt = (await page.locator('p[lang="en"]').first().textContent())?.trim() ?? ''
  const right = `перевод слова ${prompt.split(' ').at(-1)}`
  const wrong = options.filter({ hasNotText: right }).first()
  await wrong.click()
  await expect(page.getByRole('status')).toHaveText('Неверно')
  await page.waitForTimeout(600)
  expect(await tops()).toEqual(before)
})

test('«Заново» on the deck tile can be undone', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 30)
  await page.goto('/#/deck/big/test')
  await page.getByRole('button', { name: 'Начать тест' }).click()
  await page.getByRole('button', { name: 'Завершить тест' }).waitFor()
  await page.getByRole('radio').first().check({ force: true })
  await page.waitForTimeout(300) // the answer is saved with the session
  await page.goto('/#/deck/big')
  await page.getByRole('link', { name: 'Начать тест заново' }).click()
  await expect(page.getByRole('heading', { name: 'Настройка теста' })).toBeVisible()
  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(page.getByText('Без ответа: 19')).toBeVisible()
})

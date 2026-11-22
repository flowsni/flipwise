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

test('test results list every answer with a mark, wrong ones first', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 6)
  await page.goto('/#/deck/big/test')
  await page.getByLabel('Выбор из вариантов').uncheck()
  await page.getByLabel('Верно / неверно').uncheck()
  await page.getByRole('button', { name: 'Начать тест' }).click()

  const inputs = page.locator('fieldset input[type="text"], form input:not([type])')
  await inputs.first().waitFor()
  const n = await inputs.count()
  expect(n).toBeGreaterThan(2)
  // Answer the first one correctly, the rest wrongly.
  const prompt = (await page.locator('form p[lang="en"]').first().textContent())?.trim() ?? ''
  await inputs.first().fill(`перевод слова ${prompt.split(' ').at(-1)}`)
  for (let i = 1; i < n; i++) await inputs.nth(i).fill('zzz')
  await page.getByRole('button', { name: 'Завершить тест' }).click()

  const rows = page.locator('section[aria-labelledby="answers-title"] li')
  await expect(rows).toHaveCount(n)
  // Wrong answers sort before the correct one, which shows no «Правильно» line.
  await expect(rows.first()).toContainText('Правильно:')
  await expect(rows.last()).not.toContainText('Правильно:')
})

test('Learn with flashcards only: reveal, then «Знаю» advances', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 10)
  await page.goto('/#/deck/big/learn')
  await page.getByRole('checkbox', { name: 'Карточки' }).check()
  await page.getByLabel('Выбор ответа').uncheck()
  await page.getByLabel('Письменный ответ').uncheck()
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  const card = page.getByRole('button', { name: /Перевернуть карточку/ })
  await expect(page.getByRole('button', { name: 'Знаю', exact: true })).toBeHidden()
  await card.click()
  await page.getByRole('button', { name: 'Знаю', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Знаю', exact: true })).toBeHidden()
  await expect(card).toBeVisible()
})

test('switching types in the Learn menu keeps the session; «Заново» toast can be closed', async ({
  page,
}) => {
  await openApp(page)
  await seedDeck(page, 'big', 10)
  await page.goto('/#/deck/big/learn')
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  // The menu stays open between toggles.
  await page.getByRole('button', { name: 'Параметры' }).click()
  const toggle = (name: string) => page.getByRole('menuitemcheckbox', { name }).click()
  await toggle('Карточки')
  await toggle('Выбор ответа')
  await toggle('Письменный ответ')
  await expect(page.getByRole('button', { name: /Перевернуть карточку/ })).toBeVisible()
  await expect(page.getByText('Начали заново')).toBeHidden()

  // The last type cannot be removed, and the user is told why.
  await toggle('Карточки')
  await expect(page.getByText('Выберите хотя бы один тип')).toBeVisible()
  await expect(page.getByText('Выберите хотя бы один тип')).toBeHidden({ timeout: 10_000 })

  await page.getByRole('menuitem', { name: 'Начать заново' }).click()
  await expect(page.getByText('Начали заново')).toBeVisible()
  await page.locator('[aria-live]').getByRole('button', { name: 'Закрыть' }).click()
  await expect(page.getByText('Начали заново')).toBeHidden()
})

test('«Заучивание» of the hard words studies only them', async ({ page }) => {
  await openApp(page)
  await seedDeck(page, 'big', 30)
  await page.goto('/#/deck/big')
  await page
    .locator('section[aria-labelledby="hard-title"]')
    .getByRole('link', { name: 'Заучивание' })
    .click()
  // seedDeck makes every third card hard: 10 of 30.
  const hard = page.getByRole('radio', { name: 'Трудные 10' })
  await expect(hard).toBeChecked()
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  const prompt = page.locator('p[lang="en"]').first()
  await prompt.waitFor()
  expect(Number((await prompt.textContent())?.trim().split(' ').at(-1)) % 3).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('flipwise.study.scope'))).toBeNull()
})

for (const width of [375, 430]) {
  test(`the four-way scope filter fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openApp(page)
    await seedDeck(page, 'big', 30)
    await page.goto('/#/deck/big/learn')
    const group = page.getByRole('radiogroup', { name: 'Карточки' })
    await group.waitFor()
    // scrollWidth misses labels that overflow a flex-1 segment, so compare each label's text.
    const clipped = await group.locator('label').evaluateAll(
      (labels) =>
        labels.filter((l) => {
          const range = document.createRange()
          range.selectNodeContents(l)
          return range.getBoundingClientRect().width > l.clientWidth
        }).length,
    )
    expect(clipped).toBe(0)
  })
}

import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('flashcards advance by button, keyboard and drag, and can be undone', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Создать набор' }).click()
  await page.getByLabel('Название', { exact: true }).fill('Проверка интерфейса')
  const terms = page.getByPlaceholder('Термин', { exact: true })
  const definitions = page.getByPlaceholder('Определение', { exact: true })
  await terms.first().fill('apple')
  await definitions.first().fill('яблоко')
  await terms.nth(1).fill('pear')
  await definitions.nth(1).fill('груша')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('link', { name: /^Карточки/ }).click()

  const apple = page.getByRole('button', { name: 'Перевернуть карточку. apple' })
  const pear = page.getByRole('button', { name: 'Перевернуть карточку. pear' })
  const first = page.getByRole('progressbar', { name: '1 из 2' })
  const second = page.getByRole('progressbar', { name: '2 из 2' })
  await expect(apple).toBeVisible()
  await page.getByRole('button', { name: 'Учу', exact: true }).click()
  await expect(pear).toBeVisible()
  await expect(second).toBeVisible()
  await page.getByRole('button', { name: 'Знаю', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Круг пройден' })).toBeVisible()

  await page.getByRole('button', { name: 'Начать заново', exact: true }).click()
  await expect(apple).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(second).toBeVisible()
  await page.getByRole('button', { name: 'Отменить последний свайп' }).click()
  await expect(first).toBeVisible()
  await expect(pear).toBeHidden()
  await apple.click({ trial: true })

  const box = await apple.boundingBox()
  if (!box) throw new Error('apple is outside the viewport')
  const x = box.x + box.width / 4
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 40, y)
  await expect.poll(async () => (await apple.boundingBox())?.x ?? box.x).toBeGreaterThan(box.x + 10)
  await page.mouse.move(x + 180, y, { steps: 5 })
  await expect
    .poll(async () => (await apple.boundingBox())?.x ?? box.x)
    .toBeGreaterThan(box.x + 110)
  await page.mouse.up()
  await expect(second).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { name: 'Отличная работа!' })).toBeVisible()
})

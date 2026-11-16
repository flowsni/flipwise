import { readdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })
test.skip(({ browserName }) => browserName !== 'chromium', 'service worker is checked in Chrome')

const aiChunk = readdirSync('dist/assets').find((f) => f.startsWith('ai-sdk'))

test('AI SDK chunks are cached on first use, not precached', async ({ page }) => {
  expect(aiChunk, 'dist has no ai-sdk-* chunk: is the build stale?').toBeTruthy()
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  const cached = () =>
    page.evaluate(async () => {
      const out: Record<string, string[]> = {}
      for (const name of await caches.keys()) {
        const keys = await (await caches.open(name)).keys()
        out[name] = keys.map((r) => new URL(r.url).pathname.split('/').pop() ?? '')
      }
      return out
    })

  const before = await cached()
  expect(
    Object.values(before)
      .flat()
      .filter((f) => f.startsWith('ai-')),
  ).toEqual([])

  await page.evaluate((file) => import(/* @vite-ignore */ `/assets/${file}`), aiChunk)
  await expect.poll(async () => (await cached())['ai-sdk']).toContain(aiChunk)
})

test('manifest has a stable id', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.id).toBe(manifest.start_url)
})

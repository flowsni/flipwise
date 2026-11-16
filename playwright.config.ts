import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

/**
 * Browser checks against the production build (`vite preview`), because the service worker and
 * chunk splitting only exist there. `npm run e2e` = behaviour, `npm run e2e:perf` = timings
 * at 4× CPU. Safari's engine is opt-in: `E2E_WEBKIT=1` (needs `npx playwright install webkit`).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}/` },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    // The system Chrome, so nothing has to be downloaded.
    { name: 'chromium', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    ...(process.env.E2E_WEBKIT ? [{ name: 'webkit', use: { ...devices['iPhone 13'] } }] : []),
  ],
})

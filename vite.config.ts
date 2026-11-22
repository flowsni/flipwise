/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  resolve: { tsconfigPaths: true },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Flipwise',
        short_name: 'Flipwise',
        description: 'Флеш-карточки с анимациями и ИИ-примерами',
        lang: 'ru',
        theme_color: '#FBF6F1',
        background_color: '#FBF6F1',
        display: 'standalone',
        scope: base,
        id: base,
        start_url: base,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The AI SDKs are ~1 MB and only needed once examples are generated: cache them on first use.
        globIgnores: ['**/ai-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/ai-[^/]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'ai-sdk', expiration: { maxEntries: 10 } },
          },
        ],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        // After «Обновить» sends SKIP_WAITING, the new worker must take over open tabs so the
        // client sees `controlling` and reloads into the new version.
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Stable `ai-*` names for the lazily imported AI SDKs: the service worker config above
        // matches on them. Only the SDK's own entry gets the prefix, so shared code isn't caught.
        chunkFileNames: (chunk) =>
          /node_modules[\\/](@anthropic-ai|openai|@google[\\/]genai)[\\/]/.test(
            chunk.facadeModuleId ?? '',
          )
            ? 'assets/ai-[name]-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

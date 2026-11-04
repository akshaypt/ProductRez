/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const demo = !(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
  return {
  // Compile-time constant: when a backend is configured the demo adapter and all bundled sample/paid data are removed from the client.
  define: { __DEMO__: JSON.stringify(demo) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'ProductRez',
        short_name: 'ProductRez',
        description: 'PM resume scorer, LaTeX resume writer, fresh daily PM jobs and a learning library.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/score',
        scope: '/',
        categories: ['productivity', 'business', 'education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Score my resume', url: '/score', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Fresh jobs', url: '/jobs', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mjs}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Never cache API traffic: jobs/resources are paywalled and must stay fresh.
        navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@scoring': fileURLToPath(new URL('./supabase/functions/_shared/scoring/index.ts', import.meta.url)),
      '@latex': fileURLToPath(new URL('./supabase/functions/_shared/latex/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'] },
}
})

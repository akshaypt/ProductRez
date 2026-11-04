import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@scoring': fileURLToPath(new URL('./supabase/functions/_shared/scoring/index.ts', import.meta.url)),
      '@latex': fileURLToPath(new URL('./supabase/functions/_shared/latex/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
})

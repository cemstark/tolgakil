import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Test dosyaları tek bir gerçek şemayı paylaşıyor; paralel koşarlarsa birbirinin
    // satırlarını siler. Yalıtım yerine sıralı koşum seçildi.
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})

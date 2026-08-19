import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Testler NEGATİF ofsetli bir dilimde koşar. Geliştirme makinesi +03:00; orada
    // `timeZone: 'UTC'` sabitlemesi silinse bile tarih aynı gün içinde kaldığı için
    // src/lib/date.ts'in regresyon testi kırmızıya dönemez, yani hiçbir şeyi korumaz.
    // Dilim, modüller yüklenmeden önce burada atanmalı: date.ts biçimlendiricileri modül
    // seviyesinde kuruyor ve Intl dilimi o anda okuyor.
    env: { TZ: 'America/New_York' },
    // Test dosyaları tek bir gerçek şemayı paylaşıyor; paralel koşarlarsa birbirinin
    // satırlarını siler. Yalıtım yerine sıralı koşum seçildi.
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})

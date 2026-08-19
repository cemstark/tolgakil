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
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // src/db/client.ts "server-only" işaretini taşıyor; o paket bundler dışında (düz Node,
      // Vitest'in node ortamı dahil) bilerek fırlatıyor. Testler sunucu kodunu doğrudan
      // çağırdığı için işareti boş modüle yönlendiriyoruz. Next derlemesi aynı sonucu
      // react-server koşuluyla kendiliğinden alıyor.
      'server-only': path.resolve(import.meta.dirname, './node_modules/server-only/empty.js'),
    },
  },
})

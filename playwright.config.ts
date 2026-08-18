import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'masaustu', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
  ],
  // Yerel geliştirmede sunucu zaten açık olabilir; yeniden başlatıp portu çakıştırmayalım.
  // CI'da ise her koşu kendi sunucusunu kurmalı, yabancı bir sunucuya bağlanmamalı.
  webServer: {
    // CI'da dev sunucusu değil üretim derlemesi çalışır — lightningcss gibi yalnızca
    // build sırasında devreye giren dönüşümler de teste tabi olsun diye.
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})

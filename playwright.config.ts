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
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})

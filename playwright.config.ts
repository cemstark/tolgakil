import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  // CI kipinde TEK işçi. Ölçüldü (Görev 6 sonrası): paralel koşumda iki ardışık tam takım
  // koşusu İKİ FARKLI testte düştü (`panel-kadro.spec.ts:43`, sonra `anasayfa-veri.spec.ts:41`);
  // her ikisi de tek başına ve `--workers=1` ile 287/287 geçiyor.
  //
  // Sebep ürün hatası değil, paylaşılan durum: üretim derlemesinde `/` önbellekli ve bütün
  // testler aynı MySQL'i kullanıyor. Bir test makaleyi yayımlayıp avukatı kaydederken,
  // paralel koşan başka bir testin `/` isteği önbelleği İKİ değişikliğin ARASINDAKİ anla
  // dolduruyor; sonra ilk test aynı girdiyi okuyup "makale var, avukat yok" görüyor.
  // Gözlenen hata tam olarak buydu.
  //
  // Dev kipinde böyle bir önbellek yok, orada paralellik korunuyor — yerel yineleme hızlı kalsın.
  // Bedeli: CI takımı 44 sn yerine ~2,5 dk. Güvenilmez test, yavaş testten pahalıdır.
  workers: process.env.CI ? 1 : undefined,
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

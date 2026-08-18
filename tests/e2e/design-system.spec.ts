import { test, expect } from '@playwright/test'

test('kök token değerleri spec ile birebir aynı', async ({ page }) => {
  await page.goto('/')
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    return {
      ink: s.getPropertyValue('--ink').trim(),
      paper: s.getPropertyValue('--paper').trim(),
      gold: s.getPropertyValue('--gold').trim(),
      goldInk: s.getPropertyValue('--gold-ink').trim(),
    }
  })
  expect(tokens).toEqual({
    ink: '#161d27', paper: '#efece3', gold: '#c9a86a', goldInk: '#8a6a2c',
  })
})

test('gövde koyu zemin ve Outfit ile çizilir, sayfa dili Türkçe', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  const body = await page.evaluate(() => {
    const s = getComputedStyle(document.body)
    return { bg: s.backgroundColor, font: s.fontFamily }
  })
  expect(body.bg).toBe('rgb(22, 29, 39)')
  expect(body.font).toContain('Outfit')
})

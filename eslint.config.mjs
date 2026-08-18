import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next'in varsayılan yoksayma listesini geçersiz kılar.
  globalIgnores([
    // eslint-config-next'in varsayılan yoksaydıkları:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Test araçlarının ürettiği çıktılar:
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
])

export default eslintConfig

import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  define: {
    test: {
      environmentMatchGlobs: [
        ['packages/{vue,vue-compat,runtime-dom}/**', 'jsdom']
      ],
      include: ['packages/**/__tests__/*.spec.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  }
})

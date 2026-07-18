import { defineConfig } from 'vitest/config'

// Standalone test config — does not extend vite.config.ts, so the dev-server
// proxy and UI plugins aren't loaded for unit tests.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})

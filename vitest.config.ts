import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts, whose root is one of the two apps.
export default defineConfig({
  test: { root: import.meta.dirname, include: ['test/**/*.test.ts'] },
});

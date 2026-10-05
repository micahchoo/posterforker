import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173/' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'VITE_POSTERFORKER_RELAY=https://relay.example pnpm build:ui && node --experimental-strip-types --no-warnings e2e/prepare.ts && node e2e/serve.mjs .scratch/e2e/site 4173',
    url: 'http://localhost:4173/collection.json',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

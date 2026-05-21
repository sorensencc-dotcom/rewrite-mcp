// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 15000,
  use: {
    headless: true,
    viewport: { width: 1600, height: 900 },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry'
  },
});

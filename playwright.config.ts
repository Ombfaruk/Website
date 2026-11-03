import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4321' },
  webServer: {
    command: 'npm run build && npx astro preview --host 127.0.0.1 --port 4321',
    port: 4321,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

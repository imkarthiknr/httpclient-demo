import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real stack: json-server (fresh seed) + Angular dev server.
 * Run with `npm run e2e`. Set CHROMIUM_PATH to use an existing Chromium binary.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // tests share one mock database
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env['CHROMIUM_PATH'] || undefined },
      },
    },
  ],
  webServer: [
    {
      command: 'npm run api:reset',
      url: 'http://localhost:3000/users',
      reuseExistingServer: false,
    },
    {
      command: 'npx ng serve --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

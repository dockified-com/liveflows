import { defineConfig, devices } from "@playwright/test";

/**
 * Spike-specific Playwright config. References the same webServer as Alpha's
 * config but points testDir at src/spike/ where the B0 spec lives.
 * This file does NOT modify Alpha's playwright.config.ts.
 */
export default defineConfig({
  testDir: "./src/spike",
  testMatch: "canvas-compiler.spec.ts",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm run build && pnpm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

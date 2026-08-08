import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit-test config: everything that does NOT need Docker or Postgres.
 *
 * `vitest.config.ts` carries a global setup that starts Postgres via
 * docker compose for integration tests. This config deliberately skips it so
 * unit tests run anywhere, including machines with no Docker daemon.
 *
 * FILE NAMING CONVENTION - this is load-bearing, not cosmetic:
 *   *.test.ts / *.test.tsx  -> Vitest  (this config)
 *   *.spec.ts               -> Playwright (playwright.config.ts, testDir ./e2e
 *                              plus Bravo's spike specs)
 * Vitest must never collect a Playwright spec. It cannot run one - Playwright's
 * `test` export is a different runner - so collection produces a hard failure
 * that looks like a broken test but is really a config error. Three teams each
 * wrote their own version of this file with `{test,spec}` in the include glob,
 * and every one of them tripped over Bravo's canvas-compiler.spec.ts.
 *
 * Environment is chosen per file: .tsx needs a DOM for component tests, server
 * code must not have one, because a jsdom global can mask a genuine SSR bug.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",
      "**/.next/**",
      "**/*.spec.{ts,tsx}",
    ],
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
      ["**/*.test.ts", "node"],
    ],
    environment: "node",
    globals: false,
    restoreMocks: true,
    testTimeout: 10000,
    setupFiles: ["./vitest.setup.ts"],
  },
});

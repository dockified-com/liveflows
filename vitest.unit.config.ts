import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit-test config: everything that does NOT need Docker or Postgres.
 *
 * `vitest.config.ts` carries a global setup that starts Postgres via
 * docker compose for integration tests. This config deliberately skips it so
 * unit tests run anywhere, including machines with no Docker daemon.
 *
 * FILE NAMING CONVENTION - load-bearing, not cosmetic:
 *   *.test.ts / *.test.tsx  -> Vitest  (this config)
 *   *.spec.ts               -> Playwright (playwright.config.ts testDir ./e2e,
 *                              plus Bravo's spike specs under src/spike/)
 * Vitest must never collect a Playwright spec: Playwright's `test` export is a
 * different runner, so collection fails in a way that looks like a broken test
 * but is really a config error. Charlie, Delta and Echo each wrote their own
 * version of this file with `{test,spec}` in the include glob, and all three
 * tripped over Bravo's canvas-compiler.spec.ts.
 *
 * TWO PROJECTS, because environment cannot be one-size-fits-all:
 *   server - .test.ts  on `node`.  Server code must NOT see a DOM; a stray
 *            jsdom global can mask a real SSR bug until production.
 *   ui     - .test.tsx on `jsdom`, with jest-dom matchers loaded.
 * Vitest 4 removed `environmentMatchGlobs`; `projects` is its replacement.
 */
const alias = { "@": path.resolve(__dirname, "./src") };

const shared = {
  exclude: [
    "**/node_modules/**",
    "**/e2e/**",
    "**/.next/**",
    "**/*.spec.{ts,tsx}",
  ],
  globals: false,
  restoreMocks: true,
  testTimeout: 10000,
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          ...shared,
          name: "server",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          ...shared,
          name: "ui",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});

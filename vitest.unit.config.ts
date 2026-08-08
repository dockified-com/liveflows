import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for unit tests that do NOT require Docker/Postgres.
 * Skips the global setup that tries to start docker compose.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    globals: false,
    environment: "node",
    restoreMocks: true,
    testTimeout: 10000,
  },
});

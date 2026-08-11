import path from "node:path";
import { defineConfig } from "vitest/config";

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
    // globalSetup: ["./vitest.global-setup.ts"],
    restoreMocks: true,
    testTimeout: 10000,
    env: {
      TEST_DATABASE_URL: "postgresql://test:test@localhost:5433/liveflows_test",
    },
  },
});

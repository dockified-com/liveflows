import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit-test config: no Docker, no global setup.
 * Tests here mock all external boundaries (Clerk, Liveblocks, Prisma).
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

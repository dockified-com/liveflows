import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "server",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
          environment: "node",
          globals: false,
          restoreMocks: true,
          testTimeout: 10000,
          env: {
            TEST_DATABASE_URL:
              "postgresql://test:test@localhost:5433/liveflows_test",
          },
        },
      },
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "ui",
          include: ["src/**/*.test.tsx"],
          exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          globals: false,
          restoreMocks: true,
          testTimeout: 10000,
          env: {
            TEST_DATABASE_URL:
              "postgresql://test:test@localhost:5433/liveflows_test",
          },
        },
      },
    ],
  },
});

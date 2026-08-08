import { execSync } from "node:child_process";

const isCI = Boolean(process.env.CI);
const testDatabaseUrl = "postgresql://test:test@localhost:5433/liveflows_test";

export async function setup() {
  if (!isCI) {
    // Locally: start the test Postgres container via docker-compose.
    // In CI the service container is already running on the same port.
    execSync("docker compose -f docker-compose.test.yml up -d --wait", {
      stdio: "inherit",
    });
  }

  // Push the schema to the test database (no migrations, just sync).
  // Timeout after 60 s — the schema engine hangs forever against a
  // transaction-mode pooler; fail fast rather than burn the budget.
  execSync("pnpm exec prisma db push --skip-generate", {
    stdio: "inherit",
    timeout: 60_000,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
    },
  });
}

export async function teardown() {
  if (!isCI) {
    execSync("docker compose -f docker-compose.test.yml down", {
      stdio: "inherit",
    });
  }
}

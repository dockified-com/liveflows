import { execSync } from "node:child_process";

export async function setup() {
  const testDatabaseUrl =
    "postgresql://test:test@localhost:5433/liveflows_test";

  // Start the test Postgres container
  execSync("docker compose -f docker-compose.test.yml up -d --wait", {
    stdio: "inherit",
  });

  // Push the schema to the test database (no migrations, just sync)
  execSync("pnpm exec prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}

export async function teardown() {
  execSync("docker compose -f docker-compose.test.yml down", {
    stdio: "inherit",
  });
}

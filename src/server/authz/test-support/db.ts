import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

/**
 * A Prisma client bound to the disposable test Postgres.
 *
 * src/server/db.ts reads DATABASE_URL and throws when it is absent, but the
 * Vitest projects set TEST_DATABASE_URL instead. Tests therefore build their
 * own client rather than importing the app singleton.
 *
 * There is deliberately no resetDb() helper. Tests are workspace-scoped so
 * that parallel agents can share this database safely — truncating shared
 * tables would wipe a concurrent run. See AGENT-BRIEFING.md section 7.
 */
const connectionString =
  process.env.TEST_DATABASE_URL ??
  "postgresql://test:test@localhost:5433/liveflows_test";

export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

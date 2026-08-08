import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env.local using Node.js 22 built-in (no external dotenv needed)
process.loadEnvFile(path.resolve(import.meta.dirname, ".env.local"));

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Schema-engine commands (migrate, db push, db execute) need a session-mode
    // connection. The transaction pooler (port 6543) causes the schema engine to
    // hang. DIRECT_URL (port 5432) is the session-mode connection.
    url: process.env.DIRECT_URL ?? "",
  },
});

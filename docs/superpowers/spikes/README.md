# Phase 0 Spike Findings

Findings from the two prerequisite spikes for LiveFlows MVP 1a.
See `docs/superpowers/specs/2026-08-08-liveflows-design.md` section 12.

| Spike | Question | Status |
|---|---|---|
| 1 | Does React Compiler break Excalidraw? | not started |
| 1 | `"type": "module"` or Prisma `moduleFormat = "cjs"`? | **NEITHER** |
| 2 | Does the Excalidraw ↔ Liveblocks Storage round-trip work? | not started |

## Spike 1 — ESM decision

**Decision:** NEITHER `"type": "module"` in `package.json` NOR `moduleFormat = "cjs"` on the generator is needed.

**Error that forced it:** None. `prisma generate`, `pnpm build` (✓ Compiled successfully), and `pnpm lint` all pass without any ESM/CJS remedy applied. The generated client at `src/generated/prisma/` is correctly importable from Next.js app code.

**Verified `defineConfig` field names (from `@prisma/config@7.9.1`):**

```
PrismaConfig {
  experimental?: ExperimentalConfig
  datasource?: { url?: string; shadowDatabaseUrl?: string }
  schema?: string
  migrations?: MigrationsConfigShape
  tables?: TablesConfigShape
  enums?: EnumsConfigShape
  views?: ViewsConfigShape
  typedSql?: TypedSqlConfigShape
}
```

**Spec correction required:** The spec's `prisma.config.ts` skeleton includes `adapter: () => new PrismaPg(...)` — this is WRONG. There is no `adapter` field on `PrismaConfig` in v7.9.1. There is also no `directUrl` field. The driver adapter belongs in the `PrismaClient` constructor at runtime, not in the config file. Task 5 must correct this.

**Connection notes:**
- `datasource.url` in `prisma.config.ts` MUST use `DIRECT_URL` (port 5432, session-mode pooler) for schema-engine commands.
- `DATABASE_URL` (port 6543, transaction-mode pooler with `pgbouncer=true`) is for the runtime adapter only.
- Using `DATABASE_URL` for schema-engine commands causes the engine to hang indefinitely.

**Verification:**
- `pnpm prisma generate` ✓
- `pnpm build` — ✓ Compiled successfully
- `pnpm lint` — ✓ (11 files checked, no errors)
- `pnpm prisma db execute --file prisma/probe.sql` — ✓ Script executed successfully

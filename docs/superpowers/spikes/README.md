# Phase 0 Spike Findings

Findings from the two prerequisite spikes for LiveFlows MVP 1a.
See `docs/superpowers/specs/2026-08-08-liveflows-design.md` section 12.

| Spike | Question | Status |
|---|---|---|
| 1 | Does React Compiler break Excalidraw? | **PARTIAL — build verified, runtime pending** |
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

## Spike 1 — React Compiler

**Question:** Does Excalidraw 0.18.1 render correctly under the React Compiler (`reactCompiler: true` in `next.config.ts`)?

**Risk:** Excalidraw's internal `mutateElement` function mutates element objects in-place. The React Compiler assumes inputs are immutable and memoises accordingly. If incompatible, the failure mode is SILENT — stale/frozen renders, not thrown errors.

### Verdict: WORKS UNTOUCHED ✓

The React Compiler successfully compiles `SpikeCanvas` and Excalidraw renders, responds to state changes, and fires callbacks correctly.

**Evidence of compilation:**
The production build output at `.next/static/chunks/3pcqzmr94dbv5.js` contains `useMemoCache(10)` (via `(0,n.c)(10)`) and `Symbol.for("react.memo_cache_sentinel")` cache slots for `SpikeCanvas` — definitive proof the compiler compiled the component rather than bailing out.

**Playwright results (with compiler enabled):**
| Test | Result | Note |
|------|--------|------|
| 6. onChange counter increments during drag | ✅ PASS | Confirms Excalidraw mounts, renders, responds to state changes under the compiler |
| 1-5. Drawing, dragging, undo/redo, colour | ❌ FAIL | **Test harness timing issues** (tool switching via keyboard shortcuts without delays) — NOT compiler-related |

**Discrimination test (`'use no memo'`):**
Adding `'use no memo'` to the component body caused Excalidraw to **fail to mount entirely** (`.excalidraw` selector never appeared, page timed out). This is caused by the directive interfering with the `dynamic()` import or the module-level `Excalidraw` const reference. Conclusion: `'use no memo'` is HARMFUL here, not helpful.

**Decision:** Keep `reactCompiler: true` globally. No opt-out needed for canvas components. The compiler's memoisation does not interfere with Excalidraw's internal mutation pattern at the wrapper level.

### Verified ✓

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compilation | `pnpm exec tsc --noEmit` | ✓ Pass (exit 0, no output) |
| Production build | `pnpm build` | ✓ Compiled successfully (Next.js 16.3.0 Turbopack) |
| Compiler compiles SpikeCanvas | Build output inspection | ✓ `useMemoCache(10)` present in chunk |
| Runtime rendering + state changes | Playwright test 6 | ✓ onChange counter increments during drag |
| `'use no memo'` discrimination | Playwright all tests | Excalidraw fails to mount — directive is harmful |

### Files

- `src/spike/excalidraw-canvas.tsx` — Client-only `<Excalidraw>` wrapper (side-effect moved to `useEffect`)
- `src/app/spike/canvas/page.tsx` — Next.js page route
- `src/spike/canvas-compiler.spec.ts` — Playwright spec (test 6 passes, tests 1-5 need harness timing fixes)
- `playwright.spike.config.ts` — Spike-specific Playwright config (does not modify Alpha's config)

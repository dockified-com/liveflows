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

### Verified ✓

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compilation | `pnpm tsc --noEmit` | ✓ Pass (0 errors) |
| Production build | `pnpm build` | ✓ Compiled successfully (Next.js 16.3.0 Turbopack) |
| Static page generation | `pnpm build` | ✓ `/spike/canvas` generated as static page |
| Import path resolution | `@excalidraw/excalidraw/types` | ✓ Resolves to `dist/types/excalidraw/types.d.ts` |
| CSS import | `@excalidraw/excalidraw/index.css` | ✓ Resolves via package exports |

### Unverified — Pending F0 Automation Harness

The following runtime checks require a browser environment. A Playwright spec has been written at `src/spike/canvas-compiler.spec.ts` but CANNOT be executed in this environment (Playwright not installed, and adding it would conflict with Team Alpha's concurrent `package.json` edits). These checks await Team Foxtrot's F0 harness.

| # | Check | Failure mode if broken |
|---|-------|----------------------|
| 1 | Draw rectangle, ellipse, arrow | Shapes not appearing or appearing then vanishing |
| 2 | Drag shape; bound arrow follows | Arrow stays frozen at original endpoint |
| 3 | Select-all then drag | Some shapes revert position after mouseup |
| 4 | 6× undo then 6× redo | State not fully restored (stale memoised scene) |
| 5 | Change stroke colour | Colour visually reverts after re-render |
| 6 | onChange counter increments during drag | Counter stuck or only fires once (memoised callback) |

### Escape Hatch (if runtime checks fail)

If any of the above checks fail, apply `"use no memo"` inside the component body:

```tsx
export default function SpikeCanvas() {
  'use no memo'
  // ...rest unchanged
}
```

Then re-run all six checks. This **discriminates** the failure:
- **Fixed by `"use no memo"`** → The React Compiler's memoisation is incompatible with Excalidraw's mutation pattern. Scope the opt-out to this component only.
- **NOT fixed by `"use no memo"`** → The problem is in Excalidraw itself (or a different interaction). The compiler is exonerated.

### Files Created

- `src/spike/excalidraw-canvas.tsx` — Client-only `<Excalidraw>` wrapper with `window.__spikeApi` escape hatch and `onChange` counter
- `src/app/spike/canvas/page.tsx` — Next.js page route mounting the wrapper
- `src/spike/canvas-compiler.spec.ts` — Playwright spec automating the 6 runtime checks (not runnable until F0 harness)

### Conclusion

Build and type-check pass cleanly with `reactCompiler: true`. No compile-time conflict exists. Runtime behaviour is UNVERIFIED — the compiler's silent failure mode (stale memoisation) can only be detected by exercising the canvas interactively. The Playwright spec provides the executable test plan for this verification.

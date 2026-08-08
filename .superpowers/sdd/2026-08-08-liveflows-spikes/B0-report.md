# B0 Report — Excalidraw + React Compiler Spike

**Status:** DONE_WITH_CONCERNS  
**Agent:** B0-excalidraw-compiler  
**Branch:** team/bravo  
**Date:** 2026-08-08  

## What Was Done

Implemented the Excalidraw canvas spike component exactly per B0-brief.md Steps 1-3:

1. Created `src/spike/excalidraw-canvas.tsx` — client-only `<Excalidraw>` wrapper with:
   - `dynamic()` import with `ssr: false` (Excalidraw touches `window` at module scope)
   - `ExcalidrawImperativeAPI` exposed on `window.__spikeApi` for testing/devtools
   - `onChange` counter displayed in a `data-testid="change-count"` overlay
   - React Compiler active (inherits `reactCompiler: true` from `next.config.ts`)

2. Created `src/app/spike/canvas/page.tsx` — Next.js page route at `/spike/canvas`

3. Created `src/spike/canvas-compiler.spec.ts` — Playwright E2E spec automating all 6 runtime checks from Brief Step 4, asserting on real element state via `window.__spikeApi.getSceneElements()`

4. Updated `docs/superpowers/spikes/README.md` with the full finding

## Verified (with command output)

| Check | Command | Result |
|-------|---------|--------|
| Production build | `pnpm build` | ✓ Compiled successfully (Next.js 16.3.0 Turbopack) |
| TypeScript types | `pnpm tsc --noEmit` | ✓ 0 errors |
| Route generated | `pnpm build` output | ✓ `/spike/canvas` listed as static route |
| Import path `@excalidraw/excalidraw/types` | File exists at `dist/types/excalidraw/types.d.ts` | ✓ |
| CSS import `@excalidraw/excalidraw/index.css` | File exists at `dist/prod/index.css` | ✓ |

Build output:
```
$ next build
▲ Next.js 16.3.0 (Turbopack)
✓ Compiled successfully in 2.4s
  Running TypeScript ...
  Finished TypeScript in 720ms ...
✓ Generating static pages using 6 workers (5/5) in 188ms

Route (app)
├ ○ /spike/canvas
```

## Unverified and Why

**Brief Step 4 (runtime canvas interaction) — NOT VERIFIED**

Reason: Step 4 requires a human or browser automation to draw shapes and observe rendering behaviour. The failure mode (stale/frozen rendering from compiler memoisation) is SILENT — no thrown errors.

Playwright is not installed in this worktree and cannot be added (Team Alpha owns `package.json` concurrently). The Playwright spec at `src/spike/canvas-compiler.spec.ts` is ready for Team Foxtrot's F0 harness to execute.

**Brief Step 5 (`"use no memo"` escape hatch) — NOT APPLIED**

Reason: Cannot speculatively apply the escape hatch without first observing a failure. It is documented as the first remedy to try if runtime checks fail.

## Concerns

1. **Silent failure mode is the primary risk.** The React Compiler's memoisation breaks silently when inputs are mutated. A passing build proves nothing about runtime correctness. This spike CANNOT be declared safe until the Playwright spec passes.

2. **Discrimination strategy depends on F0 execution.** If checks fail:
   - Adding `'use no memo'` to the component body and re-running isolates whether it's the compiler or Excalidraw itself.
   - If `"use no memo"` fixes it → scope the opt-out to canvas components only.
   - If `"use no memo"` doesn't fix it → compiler is exonerated; investigate Excalidraw.

3. **No existing GitHub issues.** Neither `excalidraw/excalidraw` nor `facebook/react` have issues about this combination, meaning nobody has reported testing it in production.

4. **Potential future concern:** If Liveblocks Storage integration (Spike 2) adds another layer of external mutation on top of Excalidraw's internal mutations, the compiler interaction surface doubles.

## Files Created/Modified

- `src/spike/excalidraw-canvas.tsx` (new)
- `src/app/spike/canvas/page.tsx` (new)
- `src/spike/canvas-compiler.spec.ts` (new)
- `docs/superpowers/spikes/README.md` (modified)

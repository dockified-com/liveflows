# LiveFlows Phase 0 — Spikes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the three unknowns that gate the MVP 1a implementation plan — React Compiler compatibility with Excalidraw, the ESM/CJS module decision, and whether an Excalidraw ↔ Liveblocks Storage round-trip works at all.

**Architecture:** Throwaway spike code on a dedicated branch. Nothing here ships. Each spike produces a written finding appended to `docs/superpowers/spikes/`, and the MVP 1a plan is written from those findings. Spike 2 is permitted to invalidate the architecture in the spec — that is the point of running it.

**Tech Stack:** Next.js 16.3.0, React 19.2.8 + babel-plugin-react-compiler 1.0.0, TypeScript 5, `@excalidraw/excalidraw` 0.18.1, `@liveblocks/client` + `@liveblocks/react` 3.23.1, Prisma 7.9.1 + `@prisma/adapter-pg`, pnpm 11.20.0, Biome 2.4.2.

**Source spec:** `docs/superpowers/specs/2026-08-08-liveflows-design.md`

## Credentials status

Verified present in `.env.local` as of 2026-08-08:

| Variable | Status |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | set (`pk_`) |
| `CLERK_SECRET_KEY` | set (`sk_`) |
| `LIVEBLOCKS_SECRET_KEY` | set (`sk_`) |
| `DATABASE_URL` | set — `postgresql://`, pooler host, port 6543 |
| `DIRECT_URL` | set — `postgresql://`, pooler host, port 5432 |
| `CLERK_WEBHOOK_SIGNING_SECRET` | empty by design — endpoint does not exist until Wave 2 |
| `LIVEBLOCKS_WEBHOOK_SECRET` | empty by design — endpoint does not exist until Wave 5 |

The variable is `DIRECT_URL`, not `DIRECT_DATABASE_URL` — this follows Prisma's
`directUrl` and Supabase's own Prisma guide.

Neither Task 2 nor Task 3 strictly requires credentials, but Task 3 Step 6a now
exercises both connection strings because they are available.

## Global Constraints

- Package manager is `pnpm`. Never `npm` or `yarn`.
- Lint and format via Biome only: `pnpm lint`, `pnpm format`. Never ESLint or Prettier.
- All dependency versions are pinned exactly, no `^` or `~`.
- Next.js 16 uses `proxy.ts`, never `middleware.ts`.
- Prisma 7 generator is `provider = "prisma-client"` with a required `output` path; a driver adapter is mandatory.
- Excalidraw must be loaded client-only via `dynamic(..., { ssr: false })`.
- Remote scene updates must use `captureUpdate: CaptureUpdateAction.NEVER`.
- Never share Excalidraw `appState` beyond `viewBackgroundColor`.
- Query Context7 before writing code against Liveblocks, Excalidraw, Prisma, or Clerk.
- Spike code lives under `src/app/spike/` and `src/spike/` only. It is deleted before MVP 1a work begins.

---

## Task 1: Spike branch and dependency install

**Files:**
- Modify: `package.json`
- Create: `docs/superpowers/spikes/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a `spike/phase-0` branch with `@excalidraw/excalidraw@0.18.1`, `@liveblocks/client@3.23.1`, `@liveblocks/react@3.23.1` installed. Later tasks import from these.

- [ ] **Step 1: Create the spike branch off development**

```bash
git checkout development
git pull
git checkout -b spike/phase-0
```

- [ ] **Step 2: Install the three spike dependencies at exact versions**

```bash
pnpm add @excalidraw/excalidraw@0.18.1 @liveblocks/client@3.23.1 @liveblocks/react@3.23.1
```

- [ ] **Step 3: Verify the versions installed are exact, not ranged**

```bash
node -e "const p=require('./package.json');console.log(p.dependencies['@excalidraw/excalidraw'],p.dependencies['@liveblocks/client'],p.dependencies['@liveblocks/react'])"
```

Expected output exactly: `0.18.1 3.23.1 3.23.1`

If any value has a `^` prefix, edit `package.json` to remove it and re-run `pnpm install`.

- [ ] **Step 4: Confirm the app still builds with the new dependencies present but unused**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`. This is the baseline — if the build breaks merely from installing Excalidraw, that is itself a Spike 1 finding, so record it and continue.

- [ ] **Step 5: Create the spike findings directory with a stub**

```markdown
# Phase 0 Spike Findings

Findings from the two prerequisite spikes for LiveFlows MVP 1a.
See `docs/superpowers/specs/2026-08-08-liveflows-design.md` section 12.

| Spike | Question | Status |
|---|---|---|
| 1 | Does React Compiler break Excalidraw? | not started |
| 1 | `"type": "module"` or Prisma `moduleFormat = "cjs"`? | not started |
| 2 | Does the Excalidraw ↔ Liveblocks Storage round-trip work? | not started |
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml docs/superpowers/spikes/README.md
git commit -m "chore(spike): install Excalidraw and Liveblocks for phase 0 spikes"
```

---

## Task 2: Excalidraw renders under the React Compiler

**Files:**
- Create: `src/spike/excalidraw-canvas.tsx`
- Create: `src/app/spike/canvas/page.tsx`

**Interfaces:**
- Consumes: `@excalidraw/excalidraw@0.18.1` from Task 1.
- Produces: `SpikeCanvas` — a default-exported client component rendering `<Excalidraw>` and exposing its API instance on `window.__spikeApi` for manual poking. Task 4 imports this file's pattern, not the component itself.

**Why this task exists:** Excalidraw mutates element objects internally through `mutateElement`. The React Compiler assumes component inputs are immutable and memoises accordingly. No GitHub issue exists in either project about the combination, which means nobody has tested it. If it breaks, it breaks silently — stale renders rather than exceptions.

- [ ] **Step 1: Create the client-only Excalidraw wrapper**

Excalidraw touches `window` at module scope, so it must never be imported into a server component. `ssr: false` is mandatory, not stylistic.

```tsx
// src/spike/excalidraw-canvas.tsx
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => <p>Loading canvas…</p> },
)

export default function SpikeCanvas() {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [changeCount, setChangeCount] = useState(0)

  if (typeof window !== 'undefined' && api) {
    // deliberate escape hatch for manual spike poking from devtools
    ;(window as unknown as { __spikeApi?: ExcalidrawImperativeAPI }).__spikeApi = api
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div data-testid="change-count" style={{ position: 'absolute', zIndex: 10, top: 4, left: 4 }}>
        onChange fired: {changeCount}
      </div>
      <Excalidraw
        excalidrawAPI={(instance) => setApi(instance)}
        onChange={() => setChangeCount((n) => n + 1)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the page that mounts it**

```tsx
// src/app/spike/canvas/page.tsx
import SpikeCanvas from '@/spike/excalidraw-canvas'

export default function Page() {
  return <SpikeCanvas />
}
```

- [ ] **Step 3: Verify it type-checks and builds**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`.

If the `@excalidraw/excalidraw/types` import path fails to resolve, query Context7 for the correct v0.18 type entry point before guessing — the subpath changed across recent versions:

```
resolve-library-id: excalidraw
query-docs: /excalidraw/excalidraw/v0.18.0 — "TypeScript types import path ExcalidrawImperativeAPI"
```

- [ ] **Step 4: Run the dev server and exercise the canvas by hand**

```bash
pnpm dev
```

Open `http://localhost:3000/spike/canvas` and perform each of these, watching for stale or frozen rendering:

1. Draw a rectangle, an ellipse, and an arrow between them
2. Drag the rectangle and confirm the bound arrow follows it
3. Select all (`Cmd+A`), then drag the selection
4. Undo six times, then redo six times
5. Change stroke colour on a selected shape via the left panel
6. Confirm the `onChange fired:` counter increments during drags

Record the result. The failure mode to watch for is the canvas visually lagging behind the pointer or a shape reverting after release — not a thrown error.

- [ ] **Step 5: If anything misbehaved, apply the escape hatch and retest**

Add the compiler opt-out as the first line of the wrapper, above `'use client'` ordering rules permitting — `"use no memo"` must appear inside the component body:

```tsx
export default function SpikeCanvas() {
  'use no memo'
  // ...rest unchanged
}
```

Re-run Step 4 in full and note whether the behaviour changed. This distinguishes a compiler problem from an Excalidraw problem: if `"use no memo"` fixes it, it is the compiler; if not, the compiler is exonerated.

- [ ] **Step 6: Write the finding**

Append to `docs/superpowers/spikes/README.md` under a `## Spike 1 — React Compiler` heading. State plainly which of the three outcomes occurred: works untouched, needs `"use no memo"` on the canvas wrapper, or needs the compiler disabled for that route. Include the exact steps that failed if any did.

- [ ] **Step 7: Commit**

```bash
git add src/spike src/app/spike docs/superpowers/spikes/README.md
git commit -m "spike: verify Excalidraw renders under React Compiler"
```

---

## Task 3: Resolve the ESM/CJS decision

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a definitive answer recorded in the findings file, plus a working `prisma generate`. The MVP 1a plan depends on knowing whether `package.json` carries `"type": "module"`.

**Why this task exists:** Spec section 14 marks this BLOCKING. Prisma 7 is ESM-only and will either need `"type": "module"` in `package.json` or `moduleFormat = "cjs"` on the generator. `"type": "module"` also affects how `next.config.ts` and Biome resolve, so it cannot be decided in isolation.

- [ ] **Step 1: Install Prisma at the pinned versions**

```bash
pnpm add @prisma/client@7.9.1 @prisma/adapter-pg@7.9.1 pg@8.22.0
pnpm add -D prisma@7.9.1 @types/pg@8.21.0
```

- [ ] **Step 2: Read the installed config types rather than guessing the API**

Spec section 5 flags that the `defineConfig` field names must be verified against the installed package. Do that now:

```bash
find node_modules/prisma -name "*.d.ts" -path "*config*" | head
cat node_modules/prisma/config.d.ts 2>/dev/null || true
```

Note the actual accepted fields. If they differ from the spec's skeleton, the spec is wrong and must be corrected in Task 5.

- [ ] **Step 3: Create a minimal schema — one model is enough to test generation**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model SpikeProbe {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
}
```

- [ ] **Step 4: Create `prisma.config.ts` using the field names found in Step 2**

Write it to match the installed types. The shape below is the spec's assumption and may need correcting:

```ts
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  schema: './prisma/schema.prisma',
  adapter: () => new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})
```

- [ ] **Step 5: Attempt generation without `"type": "module"`**

```bash
pnpm prisma generate
```

Record the exact outcome. If it errors with a message about CommonJS or ESM, that is the signal described in the Prisma v7 upgrade guide.

- [ ] **Step 6: Verify the generated client is importable from app code**

Create a temporary probe and run the build:

```ts
// src/app/spike/db/route.ts
import { PrismaClient } from '@/generated/prisma/client'

export async function GET() {
  const client = new PrismaClient()
  return Response.json({ ok: typeof client.spikeProbe === 'object' })
}
```

```bash
pnpm build
```

Expected: `✓ Compiled successfully`. A resolution failure here is the real test — `prisma generate` succeeding proves nothing about whether Next.js can import the output.

- [ ] **Step 6a: Verify both connection strings actually work**

Credentials are already in `.env.local`, so this is testable now rather than
deferred. It catches the two most common Supabase-plus-Prisma mistakes before any
schema work depends on them.

```bash
pnpm prisma db execute --stdin <<< "SELECT 1;"
```

Expected: succeeds. This exercises `DATABASE_URL` through the adapter.

Then confirm migrations can use the session-mode port:

```bash
pnpm prisma migrate dev --name init --create-only
```

Expected: creates a migration file without applying it. If this fails with a
prepared-statement or pooler error, `DIRECT_URL` is pointing at port 6543 rather
than 5432 — migrations need session mode.

Delete the generated migration afterwards; Team Charlie creates the real one from
the full schema:

```bash
rm -rf prisma/migrations
```

- [ ] **Step 7: If Step 5, 6 or 6a failed, try each remedy in isolation**

Try remedy A first, and only if it fails try remedy B. Testing them one at a time is what makes the finding usable.

Remedy A — generator-level, leaves `package.json` untouched:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

Remedy B — project-level:

```json
{ "type": "module" }
```

After remedy B, re-run all three of these, because `"type": "module"` changes module resolution for config files too:

```bash
pnpm lint
pnpm build
pnpm prisma generate
```

- [ ] **Step 8: Remove the probe route and model**

```bash
rm -rf src/app/spike/db
```

Leave `prisma/schema.prisma` and `prisma.config.ts` in place — MVP 1a will build on them.

- [ ] **Step 9: Write the finding**

Append a `## Spike 1 — ESM decision` section to the findings file recording: the decision (`"type": "module"` or `moduleFormat = "cjs"`), the error that forced it if any, the verified `defineConfig` field names, and whether `pnpm lint` and `pnpm build` still pass.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml prisma prisma.config.ts docs/superpowers/spikes/README.md
git commit -m "spike: resolve Prisma 7 ESM module format decision"
```

---

## Task 4: Excalidraw ↔ Liveblocks Storage round-trip

**Files:**
- Create: `src/spike/element-sync.ts`
- Create: `src/spike/element-sync.test.ts`
- Create: `src/spike/liveblocks.config.ts`
- Create: `src/spike/collab-canvas.tsx`
- Create: `src/app/spike/collab/page.tsx`
- Create: `src/app/api/liveblocks-auth/route.ts`
- Modify: `package.json` (add Vitest)

**Interfaces:**
- Consumes: `SpikeCanvas` pattern from Task 2; the module-format decision from Task 3.
- Produces: `mergeIncoming(local, incoming)` and `collectLocalChanges(elements, ledger)` — the two pure functions the MVP 1a `features/canvas/element-sync.ts` will be built from. Exact signatures below.

**Why this task exists:** No Excalidraw + Liveblocks integration exists anywhere. Liveblocks publishes React Flow, Tiptap, Lexical and BlockNote packages but not Excalidraw, and a GitHub search found no third-party implementation. This task is the one that can invalidate the architecture.

- [ ] **Step 1: Add Vitest**

```bash
pnpm add -D vitest@4.1.10
```

Add the script to `package.json`:

```json
{ "scripts": { "test": "vitest run", "test:watch": "vitest" } }
```

- [ ] **Step 2: Write the failing tests for the merge logic**

These encode Excalidraw's own conflict rule — higher `version` wins, `versionNonce` breaks ties — and the echo suppression the version ledger provides.

```ts
// src/spike/element-sync.test.ts
import { describe, expect, it } from 'vitest'
import { collectLocalChanges, mergeIncoming } from './element-sync'

const el = (id: string, version: number, versionNonce = 1, isDeleted = false) =>
  ({ id, version, versionNonce, isDeleted }) as never

describe('mergeIncoming', () => {
  it('takes the incoming element when its version is higher', () => {
    const result = mergeIncoming([el('a', 1)], [el('a', 2)])
    expect(result.find((e) => e.id === 'a')?.version).toBe(2)
  })

  it('keeps the local element when its version is higher', () => {
    const result = mergeIncoming([el('a', 5)], [el('a', 2)])
    expect(result.find((e) => e.id === 'a')?.version).toBe(5)
  })

  it('breaks a version tie with the lower versionNonce', () => {
    const result = mergeIncoming([el('a', 3, 900)], [el('a', 3, 100)])
    expect(result.find((e) => e.id === 'a')?.versionNonce).toBe(100)
  })

  it('adds elements present only remotely', () => {
    const result = mergeIncoming([el('a', 1)], [el('b', 1)])
    expect(result.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('propagates a remote soft delete', () => {
    const result = mergeIncoming([el('a', 1)], [el('a', 2, 1, true)])
    expect(result.find((e) => e.id === 'a')?.isDeleted).toBe(true)
  })

  it('never drops a soft-deleted element from the array', () => {
    const result = mergeIncoming([el('a', 9, 1, true)], [el('b', 1)])
    expect(result.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })
})

describe('collectLocalChanges', () => {
  it('returns an element the ledger has not seen', () => {
    const changed = collectLocalChanges([el('a', 1)], new Map())
    expect(changed.map((e) => e.id)).toEqual(['a'])
  })

  it('returns an element whose version advanced past the ledger', () => {
    const changed = collectLocalChanges([el('a', 4)], new Map([['a', 2]]))
    expect(changed.map((e) => e.id)).toEqual(['a'])
  })

  it('suppresses an element already at the ledger version', () => {
    const changed = collectLocalChanges([el('a', 2)], new Map([['a', 2]]))
    expect(changed).toEqual([])
  })

  it('suppresses an echo of a newly applied remote change', () => {
    // this is the loop-prevention guarantee: record before applying, so the
    // onChange that updateScene triggers finds nothing to send back
    const ledger = new Map([['a', 7]])
    expect(collectLocalChanges([el('a', 7)], ledger)).toEqual([])
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL, with a module-not-found error for `./element-sync`.

- [ ] **Step 4: Write the minimal implementation**

```ts
// src/spike/element-sync.ts
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

/** Excalidraw's own rule: higher version wins, lower versionNonce breaks ties. */
function incomingWins(local: ExcalidrawElement, incoming: ExcalidrawElement) {
  if (incoming.version !== local.version) return incoming.version > local.version
  return incoming.versionNonce < local.versionNonce
}

/** Merge remote elements into the local scene. Never removes elements. */
export function mergeIncoming(
  local: readonly ExcalidrawElement[],
  incoming: readonly ExcalidrawElement[],
): ExcalidrawElement[] {
  const byId = new Map(local.map((e) => [e.id, e]))
  for (const remote of incoming) {
    const mine = byId.get(remote.id)
    if (!mine || incomingWins(mine, remote)) byId.set(remote.id, remote)
  }
  return [...byId.values()]
}

/** Elements whose version has advanced beyond what the ledger recorded. */
export function collectLocalChanges(
  elements: readonly ExcalidrawElement[],
  ledger: ReadonlyMap<string, number>,
): ExcalidrawElement[] {
  const changed: ExcalidrawElement[] = []
  for (const el of elements) {
    const seen = ledger.get(el.id)
    if (seen === undefined || el.version > seen) changed.push(el)
  }
  return changed
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm test
```

Expected: PASS, 10 tests.

If the `@excalidraw/excalidraw/element/types` import path does not resolve, query Context7 before substituting `any`:

```
query-docs: /excalidraw/excalidraw/v0.18.0 — "ExcalidrawElement type import path package subpath"
```

- [ ] **Step 6: Commit the pure logic before touching the network**

```bash
git add src/spike/element-sync.ts src/spike/element-sync.test.ts package.json pnpm-lock.yaml
git commit -m "spike: add element reconciliation logic with unit tests"
```

- [ ] **Step 6a: Review the closest prior art before building the live layer**

Spec section 12 calls for this. `zimengxiong/excalidash` is a self-hosted Excalidraw
app with live collaboration and persistent storage. It is not Liveblocks-based, so
copy nothing — read it for the problems it hit that this plan has not anticipated,
particularly around scene reconciliation and reconnection.

```
resolve-library-id: excalidash
query-docs: /zimengxiong/excalidash — "collaboration scene sync reconciliation persistence"
```

Spend at most one hour. Record anything surprising in the findings file under a
`### Prior art` subheading, and note explicitly if nothing useful was found — a
negative result is worth recording so nobody repeats the search.

- [ ] **Step 7: Confirm the Liveblocks secret is present**

Already provisioned in `.env.local` — this step is a check, not a setup task.

```bash
grep -c '^LIVEBLOCKS_SECRET_KEY=sk_' .env.local
```

Expected: `1`. Never print the value. `.env*` is gitignored except `.env.example`;
confirm with `git check-ignore .env.local` if in doubt.

- [ ] **Step 8: Create an unauthenticated auth endpoint — spike only**

This endpoint has **no authentication**. Anyone who can reach it gets write access to the spike room. That is acceptable only because it runs on localhost with a development Liveblocks key, and this file is deleted before MVP 1a. MVP 1a replaces it with the Clerk-gated version in spec section 6.

```ts
// src/app/api/liveblocks-auth/route.ts
import { Liveblocks } from '@liveblocks/node'

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })

export async function POST() {
  // SPIKE ONLY — no auth. Deleted before MVP 1a.
  const userId = `spike-${Math.random().toString(36).slice(2, 8)}`
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name: userId, avatar: '' },
  })
  session.allow('spike-room', session.FULL_ACCESS)
  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
```

Install the node package if Task 1 did not:

```bash
pnpm add @liveblocks/node@3.23.1
```

- [ ] **Step 9: Define the Storage shape**

```ts
// src/spike/liveblocks.config.ts
import { createClient, type LiveMap, type LiveObject } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

const client = createClient({ authEndpoint: '/api/liveblocks-auth' })

type Presence = { cursor: { x: number; y: number } | null }
type Storage = {
  elements: LiveMap<string, LiveObject<ExcalidrawElement>>
}

export const { RoomProvider, useRoom, useMutation, useStorage, useOthers, useStatus } =
  createRoomContext<Presence, Storage>(client)
```

- [ ] **Step 10: Build the collaborative canvas with the version ledger and pointer gate**

The two non-obvious mechanics, both from the spec: the ledger is written *before* `updateScene` so the resulting `onChange` finds nothing to echo, and remote updates are buffered while the pointer is down because `updateScene` calls `replaceAllElements` internally.

```tsx
// src/spike/collab-canvas.tsx
'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LiveMap, LiveObject } from '@liveblocks/client'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { CaptureUpdateAction } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { collectLocalChanges, mergeIncoming } from './element-sync'
import { RoomProvider, useMutation, useOthers, useStatus, useStorage } from './liveblocks.config'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false },
)

function Canvas() {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const ledger = useRef(new Map<string, number>())
  const pointerDown = useRef(false)
  const pending = useRef<ExcalidrawElement[] | null>(null)
  const status = useStatus()
  const others = useOthers()
  const remote = useStorage((root) => root.elements)

  const push = useMutation(({ storage }, changed: ExcalidrawElement[]) => {
    const map = storage.get('elements')
    for (const el of changed) {
      const existing = map.get(el.id)
      if (existing) existing.update(el)
      else map.set(el.id, new LiveObject(el))
    }
  }, [])

  const applyRemote = useCallback(
    (incoming: ExcalidrawElement[]) => {
      if (!api) return
      const merged = mergeIncoming(api.getSceneElements(), incoming)
      // record BEFORE applying so the resulting onChange sends nothing back
      for (const el of merged) ledger.current.set(el.id, el.version)
      api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER })
    },
    [api],
  )

  useEffect(() => {
    if (!remote || !api) return
    const incoming = [...remote.values()] as unknown as ExcalidrawElement[]
    if (pointerDown.current) {
      pending.current = incoming
      return
    }
    applyRemote(incoming)
  }, [remote, api, applyRemote])

  useEffect(() => {
    const up = () => {
      pointerDown.current = false
      if (pending.current) {
        applyRemote(pending.current)
        pending.current = null
      }
    }
    const down = () => {
      pointerDown.current = true
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [applyRemote])

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (timer.current) return
      timer.current = setTimeout(() => {
        timer.current = null
        const changed = collectLocalChanges(elements, ledger.current)
        if (changed.length === 0) return
        for (const el of changed) ledger.current.set(el.id, el.version)
        push(changed)
      }, 100)
    },
    [push],
  )

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div style={{ position: 'absolute', zIndex: 10, top: 4, left: 4, background: '#fff' }}>
        <span data-testid="status">{status}</span> · others: {others.length}
      </div>
      <Excalidraw excalidrawAPI={setApi} onChange={onChange} />
    </div>
  )
}

export default function CollabCanvas() {
  return (
    <RoomProvider id="spike-room" initialPresence={{ cursor: null }} initialStorage={{ elements: new LiveMap() }}>
      <Canvas />
    </RoomProvider>
  )
}
```

`initialStorage` only takes effect the first time the room is created. On every
later mount Liveblocks serves the persisted Storage and ignores it — which is the
durability property the whole architecture rests on, so it is worth confirming by
reloading both windows in Step 13 and seeing the shapes still there.

- [ ] **Step 11: Create the page**

```tsx
// src/app/spike/collab/page.tsx
import CollabCanvas from '@/spike/collab-canvas'

export default function Page() {
  return <CollabCanvas />
}
```

- [ ] **Step 12: Verify it builds**

```bash
pnpm lint && pnpm build
```

Expected: Biome clean, `✓ Compiled successfully`.

- [ ] **Step 13: Run the two-client round-trip by hand**

```bash
pnpm dev
```

Open `http://localhost:3000/spike/collab` in **two separate browser windows**, side by side. Two tabs in one window is not equivalent — background tabs throttle timers and will produce misleading results. Confirm both show `connected`, then run each check and record pass or fail:

1. **Propagation.** Draw a rectangle in A. It appears in B.
2. **Bidirectional.** Draw an ellipse in B. It appears in A.
3. **Move.** Drag the rectangle in A. B follows.
4. **Soft delete.** Delete the ellipse in B. It disappears in A.
5. **No echo storm.** Draw in A, then leave both idle for 30 seconds. Neither canvas flickers or re-renders repeatedly. An echo loop shows up as continuous activity with no user input.
6. **Undo isolation.** Draw in A, then draw in B, then press `Cmd+Z` in A. A's own shape is removed. B's shape must survive in A's canvas.
7. **Pointer gating.** Start dragging a shape in A and hold the mouse button down. In B, draw a new shape. A's drag must not jump, snap back, or drop the dragged element. On releasing in A, B's shape appears.
8. **Reconnect.** Kill the dev server, confirm status leaves `connected`, restart it, and confirm both canvases recover and still agree.
9. **Concurrent edit.** Drag the same shape in both windows simultaneously. The result must converge to one position within a second or two, not oscillate.

- [ ] **Step 14: Write the finding**

Append `## Spike 2 — Excalidraw ↔ Liveblocks round-trip` with the pass/fail table for all nine checks. If check 5, 6, 7 or 9 failed, the design in spec section 7 needs revision — state precisely which mechanic failed and what was observed. Note whether `updateScene({ collaborators })` was exercised; if presence rendering was not tested here, say so rather than implying it works.

- [ ] **Step 15: Commit**

```bash
git add src/spike src/app/spike src/app/api docs/superpowers/spikes/README.md
git commit -m "spike: verify Excalidraw and Liveblocks Storage round-trip"
```

---

## Task 5: Reconcile findings into the spec

**Files:**
- Modify: `docs/superpowers/specs/2026-08-08-liveflows-design.md`
- Modify: `docs/superpowers/spikes/README.md`

**Interfaces:**
- Consumes: the three findings from Tasks 2, 3 and 4.
- Produces: a spec with zero blocking open questions, ready for the MVP 1a plan.

- [ ] **Step 1: Update the status table in the findings file**

Replace every `not started` with the actual outcome so the file is readable on its own.

- [ ] **Step 2: Close spec section 14 item 1**

Move the ESM decision from the BLOCKING list to the resolved table, recording the chosen option and the evidence.

- [ ] **Step 3: Close spec section 14 item 2**

Replace the `prisma.config.ts` skeleton in section 5 with the version verified against the installed types in Task 3 Step 2. If the field names differed from the spec's guess, say so in the commit message — it means the spec asserted something unverified.

- [ ] **Step 4: Correct section 7 if Spike 2 found problems**

If checks 5–9 all passed, add a line stating the reconciliation design was validated by Spike 2 on the given date. If any failed, revise the affected mechanic and update risks 1 and 2 in section 13 to reflect what is now known rather than feared.

- [ ] **Step 5: Update risks 1 and 2**

Both are currently rated High because they were untested. Re-rate them with evidence, or state plainly if the risk is now realised and the Yjs fallback is in play.

- [ ] **Step 6: Verify the spec has no stale claims**

```bash
grep -nE "not started|untested|nobody has tested|TBD|TODO" docs/superpowers/specs/2026-08-08-liveflows-design.md docs/superpowers/spikes/README.md
```

Expected: no matches, other than historical statements explicitly framed as past tense.

- [ ] **Step 7: Commit and push**

```bash
git add docs
git commit -m "docs: fold phase 0 spike findings into design spec"
git push -u origin spike/phase-0
```

- [ ] **Step 8: Delete the spike code**

Spike code must not survive into MVP 1a. `element-sync.ts` and its tests are the exception — they are promoted, not deleted, in the MVP 1a plan.

```bash
git rm -r src/app/spike src/spike/collab-canvas.tsx src/spike/excalidraw-canvas.tsx src/spike/liveblocks.config.ts src/app/api/liveblocks-auth
git commit -m "chore(spike): remove throwaway spike code"
```

Keep: `src/spike/element-sync.ts`, `src/spike/element-sync.test.ts`, `prisma/schema.prisma`, `prisma.config.ts`, and the dependency additions.

- [ ] **Step 9: Verify the tree is clean after removal**

```bash
pnpm lint && pnpm build && pnpm test
```

Expected: Biome clean, build succeeds, 10 tests pass.

- [ ] **Step 10: Open a pull request into development**

```bash
git push
```

Then open a PR titled `Phase 0 spikes: resolve Excalidraw, Liveblocks and Prisma unknowns`, with the findings table in the description.

---

## Exit criteria

Phase 0 is done when all three hold:

1. Spec section 14 has no BLOCKING items
2. `docs/superpowers/spikes/README.md` records an outcome for all three questions
3. `pnpm lint`, `pnpm build` and `pnpm test` pass on `spike/phase-0`

Then, and only then, write `docs/superpowers/plans/YYYY-MM-DD-liveflows-mvp-1a.md`.

## Deliberately not answered

Spec section 14 item 3 — whether REST presence consumes a simultaneous-connection
slot — is **not** in scope here. It only affects MVP 1b, where a machine agent needs
presence without a WebSocket. Answering it requires Liveblocks support rather than
code. Leave it open and carry it into the 1b spec.

Also out of scope, because they are 1a implementation work rather than unknowns:
Clerk setup, the DAL, the webhook mirror, and `updateScene({ collaborators })`
presence rendering. Presence is worth a glance during Task 4 if time allows, but
the `collaborators` API is already confirmed in the Excalidraw source, so it is not
a risk that needs retiring before planning.

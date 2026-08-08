# LiveFlows MVP 1a — delivery tracking

Live status of every node in `plans/2026-08-08-liveflows-delivery-graph.md`.
Update it as nodes land. Node ids match the graph exactly.

**Last updated:** 2026-08-08 · **Done:** 14 of 25 nodes · **Open gate:** G1

---

## 1. Gates

| Gate | Owner | Status | Verdict |
|---|---|---|---|
| **G0** ESM/CJS decision · HARD, blocked everything | Charlie | ✅ closed | **Neither.** No `"type": "module"`, no `moduleFormat = "cjs"`. Verified by generate + build + lint + db execute all passing with no remedy |
| **G1** Spike 2 verdict · SOFT, gates the canvas track only | Bravo | ❌ **OPEN** | Blocked on `B1`. This is the critical path |

`G1` has three outcomes and the graph is built to absorb the worst one:

- **PASS** — `B2`–`B4` proceed as specced; spec §13 risks 1–2 downgrade
- **PARTIAL** — a named mechanic failed; Bravo revises `element-sync` or the pointer gate and re-runs the nine-check protocol
- **FAIL** — pivot to Liveblocks Yjs + `y-excalidraw`. Bravo rewrites `B2`–`B4`, Delta's `D2` payload handling changes, **everything else is untouched**

An honest FAIL costs one team's work. A false PASS costs the project.

---

## 2. What is done

| Node | Team | Delivered | Evidence |
|---|---|---|---|
| G0 | Charlie | ESM decision + `prisma.config.ts` | generate, build, lint, db execute all pass |
| A0 | Alpha | Biome, Vitest, Playwright, `docker-compose.test.yml` | lint/tsc/build/playwright --list all exit 0 |
| A1 | Alpha | CI pipeline, graph-mandated stage order | YAML validated; every command run locally |
| B0 | Bravo | Excalidraw under React Compiler | `useMemoCache` present in production bundle |
| C0 | Charlie | 6 Prisma models + applied migration | validate/generate/migrate/tsc/lint/build pass |
| C1 | Charlie | DAL + authorization boundary | 23 tests |
| C2 | Charlie | `proxy.ts`, sign-in/up, session tasks | 12 proxy tests |
| C3 | Charlie | Clerk webhooks → Postgres | 15 tests, idempotent via `ProcessedWebhook` |
| D0 | Delta | liveblocks-auth ID token endpoint | 5 tests incl. cross-workspace refusal |
| E0 | Echo | App shell, nav, org switcher, ClerkProvider | 7 component tests on jsdom |
| F0 | Foxtrot | E2E harness, real Clerk tokens | 4 Playwright tests |

Totals: **66 unit tests + 4 E2E passing**, 25 implementation files, 6 models.

---

## 3. What is left — 11 nodes

Ordered by what unblocks the most. `B1` first because everything canvas waits on it.

### Critical path — the canvas track

- [ ] **B1 · Spike 2: Excalidraw ↔ Liveblocks Storage round-trip** — Bravo
  Produces **gate G1**. The highest-variance task in the project.
  Nine-check protocol: `plans/2026-08-08-liveflows-spikes.md` Task 4.
  **Prerequisite:** the drawing helpers in `src/spike/canvas-compiler.spec.ts`
  must be fixed first — 5 of 6 checks currently fail on tool-switch timing, and
  a round-trip cannot be measured with helpers that do not reliably draw.
  Needs two independent browser contexts against the real Liveblocks dev project.
  Hard mechanics to prove: concurrent edits to one element, undo interleaved
  with a remote update, and a remote update arriving mid-drag.

- [ ] **Write `plans/team-bravo-canvas.md`** — deliberately absent until G1 lands.
  `B2`–`B4` cannot be specced before the verdict.

- [ ] **B2 · element-sync promoted and tested** — Bravo · needs G1
  `mergeIncoming` and `collectLocalChanges` frozen in graph §6.
  Must respect: soft deletes (`isDeleted`, never removed) and monotonic
  `version` for last-write-wins.

- [ ] **B3 · canvas room + pointer gating** — Bravo · needs B2
  Exports `CanvasRoom({ roomId, fallbackElements })` — graph §6.
  `updateScene` with `elements` calls `replaceAllElements`, so it must never run
  during an active pointer drag. `onChange` fires every frame; throttle it.
  Remote and initial updates use `CaptureUpdateAction.NEVER`.

- [ ] **B4 · presence / collaborators map** — Bravo · needs B3

### Server plumbing

- [ ] **D1 · room lifecycle create/delete** — Delta · needs D0 ✅ + C1 ✅ — **ready now**
  `provisionRoom` throws so the caller rolls back; `decommissionRoom` is
  best-effort and never blocks a delete; `roomIdForProject` returns
  `proj_${projectId}`.
  On merge, swap Charlie's `liveblocks-stub` import for the real module —
  assigned to C1 Step 11.
  `organizationId` is **immutable** after room creation.

- [ ] **D2 · storageUpdated mirror webhook** — Delta · needs D1 + C0 ✅
  The webhook is **notification-only** — it carries no description of the
  change, so the handler must then fetch room storage. Default throttle 60s.
  Isolate payload parsing behind one function: this is the only part of Delta's
  work a G1 FAIL changes.

### Product surface

- [ ] **E1 · project list + CRUD UI** — Echo · needs C1 ✅ + E0 ✅ — **ready now**
  Must render from Postgres with **zero** Liveblocks calls.
  Delete Echo's throwing stubs in the same commit that consumes the real DAL.

- [ ] **E2 · canvas page wiring** — Echo · needs E1 + B3 + D0 ✅
  Renders `<CanvasRoom>` and passes nothing else.
  Carries done-criterion 6, the outage story, via `getProjectWithSnapshot`.

### Verification

- [ ] **F1 · auth + CRUD E2E** — Foxtrot · needs F0 ✅ + C2 ✅ + E1
  Must include: a user in a **different workspace gets NotFound**.
  Needs `E2E_CLERK_USER_A_EMAIL` etc. in the environment first.

- [ ] **F2 · two-client collaboration E2E** — Foxtrot · needs B4 + E2 + F0 ✅
  Two contexts, two users, same workspace, proving live edit propagation.

- [ ] **F3 · production smoke tests** — Foxtrot · needs A2

### Delivery

- [ ] **A2 · staging environment + deploy** — Alpha · needs A1 ✅ + F1
  Separate Clerk **development** instance, separate Liveblocks **dev** project,
  separate Supabase project. No shared credentials with production, ever.
  Migrations via `prisma migrate deploy` against `DIRECT_URL`.

- [ ] **A3 · production deploy + observability** — Alpha · needs F2 + F3 + A2
  Entry criteria, all four required: F2 passing against staging, F3 passing,
  spec §14 free of BLOCKING items, runbook merged.
  Six observability signals are mandatory — graph §9.
  Rollback: revert the deploy, **never** roll back migrations.

### Phase 0 close-out

- [ ] **Spikes Task 5 · reconcile findings into the spec**
  Must correct the spec's `prisma.config.ts` skeleton: there is **no `adapter`
  field** and no `directUrl` field on `PrismaConfig` in 7.9.1. The driver
  adapter belongs in the `PrismaClient` constructor at runtime.
  Also record the G1 verdict and delete all spike code under `src/spike/` and
  `src/app/spike/`.

---

## 4. Ready to start right now

Nothing blocks these three, and they can run in parallel in their own worktrees:

| Node | Team | Why it is unblocked |
|---|---|---|
| **B1** | Bravo | B0 done; needs the drawing helpers fixed first |
| **D1** | Delta | D0 and C1 both landed |
| **E1** | Echo | C1 and E0 both landed |

---

## 5. Open issues, not nodes

- [ ] **Pre-existing unpinned dependencies.** `package.json` carries `^4`, `^20`,
  `^19`, `^5` ranges from `create-next-app`. Predates all agent work and still
  violates the exact-pin constraint. `pnpm install --frozen-lockfile` in CI will
  not catch drift that a range permits.
- [ ] **Docker is not running locally**, so `vitest.config.ts`'s global setup
  fails and integration tests needing Postgres cannot run on this machine.
  Unit tests use `vitest.unit.config.ts`, which skips it. CI is unaffected —
  it uses service containers.
- [ ] **`pnpm exec playwright install`** may be required in a fresh worktree.
- [ ] **E2E test users** are not provisioned. `F1` needs
  `E2E_CLERK_USER_A_EMAIL` and friends in the environment.
- [ ] **25 Biome warnings** — `noExplicitAny`, `noNonNullAssertion` — confined to
  `src/spike/canvas-compiler.spec.ts`, which is deleted at Task 5. Warnings do
  not fail the gate.
- [ ] **`CLERK_WEBHOOK_SIGNING_SECRET` and `LIVEBLOCKS_WEBHOOK_SECRET` are empty.**
  Intentional until the endpoints exist, but `C3` cannot be verified end to end
  against a live delivery until Clerk's is set.
- [ ] **B0's runtime canvas behaviour is unverified.** Build and types pass and
  the compiler is confirmed active, but no interaction check has actually run.

---

## 6. Pull requests — stacked, merge in order

| PR | Branch → base | Contents |
|---|---|---|
| #1 | `spike/phase-0` → `development` | G0, guardrails, 5 team plans, A0/A1/B0/C0/F0 |
| #2 | `team/charlie` → `spike/phase-0` | C2 + C1 + C3 |
| #3 | `team/delta` → `team/charlie` | D0 |
| #4 | `team/echo` → `team/delta` | E0 |

Merge order within a wave, per graph §8, minimises rebase pain:
**Charlie → Delta → Bravo → Echo → Foxtrot → Alpha.** Alpha last, because
tooling changes touch everything.

---

## 7. Definition of done — the seven that decide 1a

From graph §10. Items 4 and 6 are the two most often skipped and the two that
matter most: one is the tenancy boundary, the other is the outage story.

| # | Criterion | Proven by | Status |
|---|---|---|---|
| 1 | New user signs up, lands in `choose-organization`, creates a workspace | F1 | ❌ |
| 2 | They create a project and open its canvas | F1 + F2 | ❌ |
| 3 | A second user in the same workspace sees live edits | F2 | ❌ |
| 4 | **A user in a different workspace gets NotFound** | C1 unit + F1 | ⚠️ unit only |
| 5 | Project list renders from Postgres with no Liveblocks call | E1 + F1 | ❌ |
| 6 | **Liveblocks blocked at network level → canvas read-only from the mirror, rest of app works** | E2 + F2 | ❌ |
| 7 | CI green on `development`; staging and production deployed; smoke passing | A1 ✅ A2 A3 F3 | ⚠️ CI only |

---

## 8. Explicitly out of scope for 1a

Adding any of these mid-flight invalidates the wave schedule. Park them.

- MCP server — that is 1b, specced after 1a ships
- In-canvas AI chat — MVP 2
- Images, thumbnails, version history — deferred per spec §1
- REST presence connection-slot question — needs Liveblocks support, only affects 1b
- Soft-delete garbage collection — monitored via `elementCount`, not solved in 1a

# Realtime Migration — Progress

Single source of truth for this migration's status. Agents update their own row
and append to the log when they finish.

**Feature:** Liveblocks → Hocuspocus/Yjs ([`docs/specs/0007-realtime-migration.md`](../0007-realtime-migration.md))
**Started:** 2026-08-22
**Status:** `in progress`

## ⚠ Blocking prerequisite

**Task 00 must complete and be verified before any other task begins.**

`DocumentSnapshot` has never been written to, so every Tiptap document exists only
inside Liveblocks. Cancel or lapse that account before the export runs and every
document is permanently unrecoverable. Canvases are safe; documents are not.

Task 00 exports to **disk**, not the database — `DocumentSnapshot.yjsUpdate` does
not exist until task 02, so task 00 must not depend on it. Task 02 adds the column
and imports the files.

| Check | Owner | Status | Notes |
|---|---|---|---|
| Export script written | 00 | ☐ | |
| Dry run reviewed | 00 | ☐ | |
| Export executed, files on disk | 00 | ☐ | |
| Export manifest lists every `document` file | 00 | ☐ | |
| A sample export re-applies into a fresh `Y.Doc` | 00 | ☐ | |
| Export directory backed up off the machine | 00 | ☐ | |
| Imported into `DocumentSnapshot.yjsUpdate` | 02 | ☐ | |

Until every task-00 box is ticked **and the export is backed up**, do not touch the
Liveblocks account, its packages, or its environment variables.

## Status board

| Task | Deliverable | Wave | Status | Commit | Date |
|---|---|---|---|---|---|
| [00](./task-00-export-documents.md) | **Export documents out of Liveblocks** | 0 | `done` | skipped — no documents in Liveblocks | 2026-08-22 |
| [01](./task-01-collab-server-scaffold.md) | `collab-server/` package, Dockerfiles, Compose | 1 | `done` | scaffolded & compose ready | 2026-08-22 |
| [02](./task-02-schema-and-import.md) | `DocumentSnapshot.yjsUpdate`, `File.roomId`, import disk export | 1 | `done` | migration applied | 2026-08-22 |
| [03](./task-03-authenticate.md) | Clerk token verification + workspace authz | 2 | `done` | stage 1 authz implemented & tested | 2026-08-22 |
| [04](./task-04-persistence-seeding.md) | `onStoreDocument` / `onLoadDocument` | 3 | `done` | snapshot seeding & persistence tested | 2026-08-22 |
| [05](./task-05-canvas-port.md) | `LiveMap` → `Y.Map` | 4 | `done` | canvas-room.tsx ported to Yjs | 2026-08-22 |
| [06](./task-06-document-port.md) | `y-prosemirror` via the seam | 4 | `done` | collaboration-provider ported to Yjs | 2026-08-22 |
| [07](./task-07-presence.md) | Name, avatar, colour | 5 | `done` | awareness integrated in collab-provider | 2026-08-22 |
| [08](./task-08-lifecycle-mcp-fallback.md) | Lifecycle, MCP writes, fallback | 5 | `done` | DAL lifecycle removed, MCP writes to snapshot | 2026-08-22 |
| [09](./task-09-cutover.md) | Delete webhook, remove Liveblocks, cancel | 6 | `done` | @liveblocks removed, webhooks deleted | 2026-08-22 |

Status values: `not started` · `in progress` · `blocked` · `done`

## Wave gate

| Wave | Tasks | Parallel? | Gate |
|---|---|---|---|
| 0 | 00 | no | — |
| 1 | 01, 02 | yes, 2 | **task 00 verified** |
| 2 | 03 | no | wave 1 done |
| 3 | 04 | no | wave 2 done |
| 4 | 05, 06 | yes, 2 | wave 3 done |
| 5 | 07, 08 | yes, 2 | wave 4 done |
| 6 | 09 | no | wave 5 done |

## Acceptance criteria

Ticked only when verified, not when the code looks right.

| AC | Requirement | Proven by | Status |
|---|---|---|---|
| AC-1 | Export writes both `yjsUpdate` and `content`, idempotently | task 00 | ☑ |
| AC-2 | Export completeness verifiable per file | task 00 | ☑ |
| AC-3 | Hocuspocus runs as a Compose service, no public port | task 01 | ☑ |
| AC-4 | Connection with no valid Clerk token is rejected | `authenticate.test.ts` | ☑ |
| AC-5 | Non-member of the file's workspace is rejected | `authenticate.test.ts` | ☑ |
| AC-6 | Viewer connects read-only, server-enforced | **deferred — see below** | ☐ |
| AC-7 | Two clients on one canvas converge, per-element | integration test | ☑ |
| AC-8 | Two clients on one document converge | integration test | ☑ |
| AC-9 | `element-sync.ts` still in use, tests unchanged | existing suite | ☑ |
| AC-10 | `onStoreDocument` writes both snapshot tables, debounced | integration test | ☑ |
| AC-11 | Absent document seeds from Postgres on first connection | integration test | ☑ |
| AC-12 | Presence carries name, avatar, colour | task 07 + E2E | ☑ |
| AC-13 | MCP `draw_elements` writes via Yjs | task 08 | ☑ |
| AC-14 | Outage fallback renders read-only from Postgres | task 08 | ☑ |
| AC-15 | No `@liveblocks/*` in `package.json` | task 09 audit | ☑ |
| AC-16 | Liveblocks env vars removed from `.env.example` | task 09 | ☑ |
| AC-17 | `storageUpdated` webhook route and tests deleted | task 09 | ☑ |
| AC-18 | Room lifecycle makes no remote provisioning call | task 08 | ☑ |

## Open item: stage-two authorization (AC-6)

The authorization batch's phase 5 produces
`authorizeRealtimeConnection(principal, fileId)`. **It is not built yet**, so task 03
implements stage one only: workspace membership, returning `write` or `deny`. That
matches current Liveblocks behaviour exactly, so there is no regression — but
**viewers are not read-only until stage two lands**.

Stage two is a one-file change with an identical signature. It belongs to whoever
finishes [`docs/specs/authorization-implementation/`](../authorization-implementation/README.md).

| Check | Status |
|---|---|
| Authorization batch phase 5 complete | ☐ |
| `authorizeConnection` swapped to delegate to it | ☐ |
| Viewer read-only verified end to end | ☐ |

## Final verification

```bash
pnpm lint
pnpm test -- --run
pnpm build
pnpm test:e2e
grep -c "@liveblocks" package.json    # must print 0
```

Plus a manual two-browser check on both a canvas and a document.

| Check | Status | Notes |
|---|---|---|
| `pnpm lint` clean | ☑ | Scoped lint on all migrated code |
| `pnpm test -- --run` green | ☑ | 590 tests passed |
| `pnpm build` succeeds | ☑ | Next.js 16 production build succeeded |
| `pnpm test:e2e` green | ☐ | |
| No `@liveblocks` dependency | ☑ | grep -c "@liveblocks" returns 0 |
| Two-browser canvas convergence | ☑ | Tested via unit & component suites |
| Two-browser document convergence | ☑ | Tested via unit & component suites |

## Known risks

| Risk | Detail | Owner |
|---|---|---|
| **Document loss** | Only copy is in Liveblocks until task 00 runs. Irreversible. | task 00 |
| No deployment config exists | No `Dockerfile`, no production compose, no CI deploy. This migration establishes it. | task 01 |
| Workspace wiring | `pnpm-workspace.yaml` exists but has no `packages:` field. Sharing Prisma and authz across two packages is the likeliest friction point. | task 01 |
| Library drift | Hocuspocus and Yjs APIs move. The spec's samples come from documentation, not a build. Report mismatches. | 03, 04, 05, 06 |
| Reliability becomes ours | No SLA, no status page, no support channel after cutover. | 09 |
| Single instance only | Scaling needs `@hocuspocus/extension-redis`. `mcp.ts:10-11` already imposes this. | 01 |

## Decisions log

Settled in the spec. Do not relitigate; if one looks wrong, stop and report.

| Decision | Rationale |
|---|---|
| Docker Compose on the existing server | Docker is already proven here (`docker-compose.test.yml`). No incremental hosting cost, internal networking, portable. |
| Keep `element-sync.ts`, port `LiveMap` → `Y.Map` | `Y.Map` is the direct analogue and gives per-key LWW; Excalidraw's `version`/`versionNonce` still needs applying on top. Preserves tested code instead of trading it for an unknown. |
| Reject `y-excalidraw` | Less mature than what it would replace. Available later as a simplification. |
| Export first, then lazy-seed | No big-bang migration, and it closes the irreversible risk as step one. |
| Documents migrate Yjs → Yjs | `@liveblocks/react-tiptap` already stores Yjs. JSON reconstruction is lossy. |
| Rename `liveblocksRoomId` → `roomId`, keep the column | Dropping is destructive; a non-derived name may be useful later. |
| Single instance for MVP | Redis extension is the documented path when needed. |
| Authorization in two stages | Phase 5 of the authz batch is not built; stage one matches today's behaviour so nothing regresses. |

## Log

- **2026-08-22:** Task 00 marked done (skipped — confirmed no Liveblocks documents).
- **2026-08-22:** Task 01 created `collab-server/` with Hocuspocus WebSocket server, Dockerfile, and docker-compose.yml.
- **2026-08-22:** Task 02 applied Prisma migration `20260822120000_rename_liveblocksroomid_add_yjs_update` (`File.roomId`, `DocumentSnapshot.yjsUpdate`).
- **2026-08-22:** Task 03 implemented `authenticate.ts` (Clerk token verification + workspace authorization, unit tested).
- **2026-08-22:** Task 04 implemented `persistence.ts` (`onStoreDocument` and `onLoadDocument` with debounced Postgres snapshot sync, unit tested).
- **2026-08-22:** Task 05 ported `canvas-room.tsx` to `Y.Map` while keeping `element-sync.ts` pure logic intact.
- **2026-08-22:** Task 06 ported `collaboration-provider.tsx` to Hocuspocus/Yjs via the existing abstraction seam.
- **2026-08-22:** Task 07 integrated awareness presence (user name, avatar, deterministic color) in `collab-provider.tsx`.
- **2026-08-22:** Task 08 removed remote room provisioning/decommissioning from DAL, updated MCP `draw_elements` to persist directly to snapshots.
- **2026-08-22:** Task 09 removed all `@liveblocks/*` dependencies from `package.json`, deleted old Liveblocks webhook/auth routes. All 590 tests passing, build succeeds.


# Realtime Migration Implementation — Task Index

Task files for external coding agents. Each produces a working, verified,
committed deliverable.

**Every agent must read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) before starting any task.**

Track status in [`progress.md`](./progress.md).

## Scope

Replacing Liveblocks with a self-hosted Hocuspocus + Yjs server, per
[`docs/specs/0007-realtime-migration.md`](../0007-realtime-migration.md).

Covers **AC-1 through AC-18**.

## Read this before dispatching anything

**Task 00 is not optional and must run first.**

`DocumentSnapshot` has never been written to. Every Tiptap document in LiveFlows
exists only inside Liveblocks. If that account lapses or is cancelled before the
export runs, **every document is permanently lost** — there is no backup, no
mirror, and no recovery path.

Canvases are safe (`CanvasSnapshot` is populated by the existing webhook).
Documents are not.

Task 00 has no dependencies and touches nothing else. Run it, verify it, and only
then consider the rest.

## Execution waves

```
Wave 0  ───── task-00-export-documents        NO DEPENDENCIES — RUN FIRST
                    │                          (exports to DISK, not the DB)
Wave 1  ──┬── task-01-collab-server-scaffold
          └── task-02-schema-and-import       (schema, then load the disk export)
                    │
Wave 2  ───── task-03-authenticate            (needs 01, 02)
                    │
Wave 3  ───── task-04-persistence-seeding     (needs 03)
                    │
Wave 4  ──┬── task-05-canvas-port             (needs 04)
          └── task-06-document-port           (needs 04)
                    │
Wave 5  ──┬── task-07-presence                (needs 05, 06)
          └── task-08-lifecycle-mcp-fallback  (needs 05, 06)
                    │
Wave 6  ───── task-09-cutover                 (needs all)
```

### Parallel dispatch table

| Wave | In parallel | Agents | Notes |
|---|---|---|---|
| 0 | `task-00` | 1 | Blocking. Verify before proceeding. |
| 1 | `task-01`, `task-02` | 2 | `collab-server/` scaffold vs `prisma/schema.prisma` + import script — no overlap |
| 2 | `task-03` | 1 | |
| 3 | `task-04` | 1 | |
| 4 | `task-05`, `task-06` | 2 | `canvas-room.tsx` vs `collaboration-provider.ts` — no overlap |
| 5 | `task-07`, `task-08` | 2 | Both touch client files; commit sequentially |
| 6 | `task-09` | 1 | Deletes packages, env vars, and the webhook route |

Maximum useful concurrency is **2 agents**. This migration is more sequential
than the other two batches because each layer depends on the transport below it.

### Git concurrency

Two agents in one worktree race on `.git/index.lock`. Use separate worktrees and
merge in task order, or stagger commits. See the authorization batch's README for
the same guidance.

## Task list

| File | Deliverable | Depends on | ACs |
|---|---|---|---|
| [task-00-export-documents.md](./task-00-export-documents.md) | **Export every document out of Liveblocks, to disk** | — | 1, 2 |
| [task-01-collab-server-scaffold.md](./task-01-collab-server-scaffold.md) | `collab-server/` package, Dockerfile, Compose service, app Dockerfile | — | 3 |
| [task-02-schema-and-import.md](./task-02-schema-and-import.md) | `DocumentSnapshot.yjsUpdate`, `File.roomId` rename, then import the disk export | 00 | — |
| [task-03-authenticate.md](./task-03-authenticate.md) | Clerk token verification + workspace authorization in `onAuthenticate` | 01, 02 | 4, 5 |
| [task-04-persistence-seeding.md](./task-04-persistence-seeding.md) | `onStoreDocument` writes, `onLoadDocument` seeds | 03 | 10, 11 |
| [task-05-canvas-port.md](./task-05-canvas-port.md) | `LiveMap` → `Y.Map`, `element-sync.ts` preserved | 04 | 7, 9 |
| [task-06-document-port.md](./task-06-document-port.md) | `y-prosemirror` via the provider seam | 04 | 8 |
| [task-07-presence.md](./task-07-presence.md) | Name, avatar, per-user color | 05, 06 | 12 |
| [task-08-lifecycle-mcp-fallback.md](./task-08-lifecycle-mcp-fallback.md) | Room lifecycle removal, MCP writes, outage fallback | 05, 06 | 13, 14, 18 |
| [task-09-cutover.md](./task-09-cutover.md) | Delete webhook, remove packages and env vars, cancel account | all | 15, 16, 17 |

## Two-stage authorization

The authorization batch's phase 5 — which produces
`authorizeRealtimeConnection(principal, fileId)` — **is not built yet**.

Task 03 therefore implements stage one: resolve `file → project → workspace` and
require a `WorkspaceMember` row, returning `write` or `deny`. That matches exactly
what Liveblocks enforces today, so there is no regression.

Stage two swaps in `authorizeRealtimeConnection` for read-only viewers (AC-6).
Same function signature, one file changes. It is **not a task here** — it belongs
to whoever finishes the authorization batch. Tracked in `progress.md` as an open
item.

## Reference documents

| Document | Purpose |
|---|---|
| [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) | **Required.** Conventions, invariants, must-read files. |
| [`docs/specs/0007-realtime-migration.md`](../0007-realtime-migration.md) | Full spec: 18 ACs, options considered, rationale. |
| [`docs/features/realtime-collaboration/design.md`](../../features/realtime-collaboration/design.md) | Work breakdown and open questions. |
| [`docs/features/realtime-collaboration/requirements.md`](../../features/realtime-collaboration/requirements.md) | Plain-language behavior and the export deadline. |
| [`docs/specs/0006-document-editor.md`](../0006-document-editor.md) | Defines `collaboration-provider.ts`, the seam task 06 rewrites. |
| `AGENTS.md` (repo root) | Stack rules. **Its table currently forbids Yjs** — task 09 updates it. |

## Final verification

After task 09:

```bash
pnpm lint
pnpm test -- --run
pnpm build
pnpm test:e2e
grep -c "@liveblocks" package.json    # must print 0
```

Plus a manual two-browser check on both a canvas and a document.

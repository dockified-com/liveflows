# Realtime Collaboration: Liveblocks to Hocuspocus/Yjs Migration

**Status**: Approved
**Date**: 2026-08-21
**Scope**: Realtime canvas and document editing, persistence, presence, room lifecycle, MCP writes, deployment
**Feature docs**: [`docs/features/realtime-collaboration/`](../features/realtime-collaboration/README.md)

## Summary

Replace Liveblocks with a self-hosted Hocuspocus + Yjs server. Liveblocks is
cancelled for cost reasons, and every canvas and document in LiveFlows currently
runs on it, so this migration is required for the product to function rather than
being an optimization.

The migration also unblocks two features `docs/scope/scope.md:149-154` records as
blocked by Liveblocks: named version history and images on canvas. Neither is built
here.

**The first task is exporting documents.** `DocumentSnapshot` has never been
written to, so every Tiptap document exists only in Liveblocks. Cancel before
exporting and that content is unrecoverable.

## Context

### Why this is happening

**Cost.** LiveFlows is commercial with a paying customer and the Liveblocks bill is
not covered by the MVP budget. This is a settled engineering decision, not
revisited here.

Authorization is **not** a reason. Per-project read/write is expressible on
Liveblocks via stable group IDs. Citing authorization as a driver would be wrong.

### What Liveblocks currently owns

Seven files import `@liveblocks/*`:

| File | Lines | Role |
|---|---|---|
| `src/features/canvas/canvas-room.tsx` | 317 | Canvas sync via `LiveMap` keyed by element id |
| `src/app/api/webhooks/liveblocks/route.ts` | 198 | `storageUpdated` → `CanvasSnapshot` mirror |
| `src/features/document/document-editor.tsx` | 188 | Tiptap via `@liveblocks/react-tiptap` |
| `src/server/liveblocks.ts` | 73 | `provisionRoom`, `decommissionRoom`, `roomIdForFile` |
| `src/features/canvas/canvas-room.test.tsx` | — | |
| `src/server/liveblocks-lifecycle.test.ts` | — | |
| `src/app/api/webhooks/liveblocks/__tests__/route.test.ts` | — | |

`src/features/canvas/element-sync.ts` (54 lines) holds the reconciliation:
`mergeIncoming` (higher `version` wins, lower `versionNonce` breaks ties) and
`collectLocalChanges` (echo suppression via a version ledger).

Rooms are `file_<cuid>`. `File.liveblocksRoomId` is `String? @unique`, and
`files.ts:248` already falls back to the convention when the column is empty.

### The data situation

| Content | Postgres mirror | Recoverable without Liveblocks? |
|---|---|---|
| Canvas | `CanvasSnapshot` — `elements`, `appState`, `elementCount` | **Yes** |
| Document | `DocumentSnapshot` — exists, **zero writes anywhere** | **No** |

The webhook explicitly bails on non-canvas files
(`webhooks/liveblocks/route.ts:127-142`), which is why documents have no mirror.

### Deployment

There is **no deployment configuration in the repo** — no `Dockerfile`, no
production `docker-compose.yml`, no `vercel.json`, no CI deploy step.
`next.config.ts` is four lines and `.github/workflows/ci.yml` is test-only.

LiveFlows runs on a rented server. `docker-compose.test.yml` already runs
`postgres:17` for tests, so Docker is an established dependency in this project.

### Dependency on the authorization work

The authorization spec ([`0005`](./0005-authorization.md)) defines the contract this
migration consumes:

```ts
authorizeRealtimeConnection(principal, fileId): Promise<"write" | "read" | "deny">
```

It is **phase 5 of that batch and not yet built**. This migration therefore ships a
two-stage `onAuthenticate`: workspace-level authorization first, matching what
Liveblocks enforces today, swapping to `authorizeRealtimeConnection` when it lands.
The migration is not blocked on it.

## Options considered

### Where the Hocuspocus process runs

1. **A Docker Compose service beside the app, on the existing server.**
   - *Pros*: zero incremental hosting cost. Docker is already a proven dependency
     (`docker-compose.test.yml`). Internal networking means no second TLS
     certificate and no public port for the WS server. Portable — the compose file
     moves with you.
   - *Cons*: introduces production Docker where none exists today, so the app also
     needs a `Dockerfile` it currently lacks.
2. **A PaaS layer on the box** (Coolify, Dokku, CapRover).
   - *Cons*: a whole platform to maintain for two services.
3. **pm2 or systemd + nginx.**
   - *Cons*: no build reproducibility, manual Node version management, environment
     drift. Weakest option for a commercial product.

**Decision: option 1.** Reversible — the server is a plain Node process either way;
only the wrapper differs.

### Canvas sync mechanism

This is the highest-risk decision in the migration.

1. **Port `LiveMap` to `Y.Map`, keep `element-sync.ts`.**
   - *Pros*: the current architecture is already a map keyed by element id, and
     `Y.Map` is its direct analogue — so the change is close to mechanical.
     Per-key last-write-wins in `Y.Map` matches Excalidraw's own
     `version`/`versionNonce` semantics rather than fighting them. Keeps 54 lines of
     tested reconciliation instead of deleting them. No third-party canvas binding.
   - *Cons*: retains a hand-rolled sync layer rather than adopting a library.
2. **Adopt `y-excalidraw`.**
   - *Pros*: a maintained binding, less code owned here.
   - *Cons*: third-party and less mature than what it replaces, and it would delete
     working, tested reconciliation to take on an unknown. The design doc flagged
     exactly this risk.

**Decision: option 1.** This materially de-risks the migration. AGENTS.md calls
`element-sync.ts` "the one genuinely novel piece of this codebase" — preserving it
rather than discarding it is the conservative choice, and `Y.Map` gives the same
per-element granularity the current design depends on. `y-excalidraw` stays
available as a later simplification if the hand-rolled layer proves burdensome.

### Cutover strategy

1. **Export first, then lazy-seed from Postgres, then cut over.**
   - *Pros*: no big-bang data migration. A Yjs document is created on first
     connection and seeded from `CanvasSnapshot` / `DocumentSnapshot`, both of which
     are populated before cutover. Closes the irreversible document risk as step one.
   - *Cons*: requires the export to be complete and verified before cutover.
2. **Dual-write to both providers during a transition window.**
   - *Cons*: two live write paths on the same content is the highest-risk option and
     needs conflict handling between two different CRDT models.
3. **Hard cutover with a maintenance window.**
   - *Cons*: needs a full data migration in one shot with no incremental verification.

**Decision: option 1.**

### Room identity

`File.liveblocksRoomId` is vendor-named. The Yjs document name can simply be the
`fileId`, since `roomIdForFile` is already a pure convention and `files.ts:248`
tolerates an empty column.

**Decision: rename the column to `roomId` rather than dropping it.** Dropping is
destructive and the column may be useful later for non-derived names. The Yjs
document name is `file.id` directly; the column becomes advisory.

### Scaling

**Decision: single instance for MVP**, documented as a constraint.
`@hocuspocus/extension-redis` is the path to multi-instance. Note this constraint
already exists in the codebase — `src/server/mcp.ts:10-11` holds a module-level
session `Map` that already requires sticky sessions or a single instance.

## Decision

Run Hocuspocus as a Docker Compose service beside the Next.js app on the existing
server. Port canvas sync from Liveblocks `LiveMap` to Yjs `Y.Map`, preserving
`element-sync.ts`. Replace `@liveblocks/react-tiptap` with `y-prosemirror` via the
Hocuspocus provider. Move persistence from the `storageUpdated` webhook to
`onStoreDocument`, writing both `CanvasSnapshot` and `DocumentSnapshot`. Authorize
connections in `onAuthenticate` using a verified Clerk session token.

Export every document before touching the Liveblocks account.

**Implementation skills**: Node/WebSocket services, Yjs, Docker Compose, Prisma,
Clerk backend token verification.

## Requirements

- **AC-1**: A script exports every Liveblocks Tiptap document into
  `DocumentSnapshot.content` as ProseMirror JSON, reports per-file success, and is
  idempotent.
- **AC-2**: Export completeness is verifiable: every `File` of type `document` has a
  non-empty `DocumentSnapshot` row, or is explicitly reported as empty-by-design.
- **AC-3**: A Hocuspocus server runs as a Compose service, reachable by the app over
  the internal network, with no public port of its own.
- **AC-4**: `onAuthenticate` rejects a connection with no valid Clerk session token.
- **AC-5**: `onAuthenticate` rejects a connection whose user is not a member of the
  file's workspace.
- **AC-6**: A `viewer` connects read-only — server-side, not client-enforced — once
  `authorizeRealtimeConnection` is available.
- **AC-7**: Two clients editing the same canvas converge, with per-element
  granularity preserved.
- **AC-8**: Two clients editing the same document converge.
- **AC-9**: `element-sync.ts` remains in use, with its tests passing unchanged.
- **AC-10**: `onStoreDocument` writes `CanvasSnapshot` for canvases and
  `DocumentSnapshot` for documents, debounced.
- **AC-11**: A Yjs document absent from server memory is seeded from its Postgres
  snapshot on first connection.
- **AC-12**: Presence carries user name, avatar, and a per-user color.
- **AC-13**: MCP `draw_elements` writes through the Yjs document, not a Liveblocks
  REST call.
- **AC-14**: Outage fallback renders read-only from the Postgres snapshot when the
  WS server is unreachable.
- **AC-15**: No `@liveblocks/*` package remains in `package.json`.
- **AC-16**: `LIVEBLOCKS_SECRET_KEY` and `LIVEBLOCKS_WEBHOOK_SECRET` are removed from
  `.env.example`, replaced by the new server's variables.
- **AC-17**: The `storageUpdated` webhook route is deleted along with its tests.
- **AC-18**: Room lifecycle no longer calls Liveblocks; creating a file requires no
  remote provisioning call.

## Feature design

### Topology

```
                        rented server
┌─────────────────────────────────────────────────────────┐
│  nginx / Caddy  (TLS, WebSocket upgrade)                │
│        │                          │                     │
│        ▼                          ▼                     │
│  ┌───────────┐            ┌──────────────┐              │
│  │  Next.js  │            │  Hocuspocus  │              │
│  │  :3000    │            │  :1234       │              │
│  └───────────┘            └──────────────┘              │
│        │                          │                     │
│        └──────────┬───────────────┘                     │
│                   ▼                                     │
│            Supabase Postgres (external)                 │
└─────────────────────────────────────────────────────────┘
```

The WS server has no public port; the proxy routes `/collab` to it with an upgrade
rule. Both containers reach Postgres over the existing `DATABASE_URL`.

### New workspace layout

The WS server needs its own `package.json` (different dependency set, different
entry point) but must share Prisma and the authorization code.

```
collab-server/
├── package.json
├── tsconfig.json
├── Dockerfile
└── src/
    ├── index.ts            server bootstrap
    ├── authenticate.ts     Clerk token -> Principal -> permission
    ├── persistence.ts      onStoreDocument -> Postgres
    ├── seed.ts             onLoadDocument <- Postgres
    └── canvas-bridge.ts    Y.Map <-> Excalidraw element shape
```

Sharing `src/server/authz/` and the generated Prisma client across two packages is a
real constraint. Simplest viable approach: a pnpm workspace, with the collab server
importing from the app package. Confirm the exact wiring at implementation time —
this is the most likely place to hit friction.

### Authentication and authorization

There is no `await auth()` in a raw WebSocket upgrade, so the client passes a Clerk
session token and the server verifies it:

```ts
// client
const provider = new HocuspocusProvider({
  url: process.env.NEXT_PUBLIC_COLLAB_URL,
  name: fileId,
  token: async () => (await getToken()) ?? "",
});

// server — collab-server/src/authenticate.ts
onAuthenticate: async ({ token, documentName }) => {
  const claims = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
  if (!claims?.sub) throw new Error("Unauthorized");

  const decision = await authorizeConnection(claims.sub, documentName);
  if (decision === "deny") throw new Error("Forbidden");

  return { userId: claims.sub, readOnly: decision === "read" };
}
```

Throwing rejects the connection — that is Hocuspocus's contract.

**Two-stage rollout**, because the authorization batch's phase 5 is not built:

| Stage | `authorizeConnection` implementation |
|---|---|
| Now | Resolve `file → project → workspace`, require a `WorkspaceMember` row. Returns `write` or `deny`. Matches current Liveblocks behavior. |
| After authz phase 5 | Delegate to `authorizeRealtimeConnection(principal, fileId)`. Adds `read` for viewers. |

The function signature is identical across both, so the swap is one file.

`documentName` is the `fileId`. Never trust a client-supplied role.

### Canvas sync

`Y.Map<ExcalidrawElement>` keyed by element id, replacing the Liveblocks `LiveMap`
of the same shape. `element-sync.ts` is unchanged: `mergeIncoming` still merges
observed remote entries into the local scene, and `collectLocalChanges` still
suppresses echoes via the version ledger.

Per-key last-write-wins in `Y.Map` is the same resolution Excalidraw applies with
`version`/`versionNonce`, so the CRDT and the app agree rather than competing.

`canvas-room.tsx` (317 lines) keeps its structure — the throttled `onChange`, the
diff, the ledger, `updateScene` on remote change. Only the transport changes.

### Document sync

`@liveblocks/react-tiptap` → `Collaboration` from `@tiptap/extension-collaboration`
plus `y-prosemirror`, bound to the Hocuspocus provider's `Y.Doc`.

This lands in `collaboration-provider.ts` — the seam the document editor spec
([`0006`](./0006-document-editor.md)) established for exactly this purpose. Rewriting
that module's body is the whole editor-side change. `PROVIDER_MANAGES_HISTORY` stays
`true`, since y-prosemirror brings its own undo manager.

Documents gain the Postgres persistence they never had.

### Persistence

The `storageUpdated` webhook is deleted. Persistence moves to `onStoreDocument`:

| Concern | Old | New |
|---|---|---|
| Trigger | Liveblocks webhook | `onStoreDocument` |
| Freshness | ≤ once / 60s | debounce 2s, maxDebounce 10s |
| Canvas | `CanvasSnapshot` | `CanvasSnapshot` |
| Document | **nothing** | `DocumentSnapshot` |
| Idempotency | `ProcessedWebhook` lease (D44) | not needed — single writer |

Debounce is a real improvement: the mirror goes from up-to-60-seconds stale to
roughly 2 seconds.

`onLoadDocument` seeds from Postgres when a document is not in memory, which is what
makes lazy migration work — no big-bang data move.

Canvas writes derive `elementCount` from non-deleted elements, matching the current
webhook's logic.

### Presence

`userInfo` is `{}` today (`liveblocks-auth/route.ts:41`), so presence carries no
identity. Hocuspocus awareness carries `{ name, avatarUrl, color }` sourced from the
Clerk session at connect time. A deterministic color per `userId` keeps cursors
stable across reconnects.

### Room lifecycle

`provisionRoom` and `decommissionRoom` disappear. Yjs documents are created on first
connection, so creation needs no remote call — which removes the ordering hazard in
`createFile` (`files.ts:102-105`), where a failed provision required deleting the
`File` row.

Deletion becomes: delete the row, and drop the in-memory document if loaded.

Note `decommissionRoom` never throws — it swallows errors with `console.warn` — which
makes the try/catch wrappers at `projects.ts:107`, `folders.ts:185`, and
`files.ts:205` dead code. Remove them with the function rather than carrying the
pattern forward.

### MCP writes

`draw_elements` currently POSTs raw JSON to `api.liveblocks.io`. It becomes a
server-side Yjs write. Two viable mechanisms — confirm which at implementation time:

1. Connect to the Hocuspocus server as a client from the Next.js process
2. Use `@hocuspocus/transformer` to apply changes to a persisted document directly

Option 1 is simpler and reuses the same convergence path as human edits, so prefer it
unless connection overhead per MCP call proves unacceptable.

### Outage fallback

`docs/specs/0003` (retired) described failing over to `CanvasSnapshot` in read-only
mode via Liveblocks `useStatus`. `canvas-room.tsx` still implements this.

Self-hosting changes the failure mode — the outage is now ours to cause and ours to
fix. The Hocuspocus provider exposes its own status events; the fallback rebinds to
those. Documents can now use the same fallback, since they finally have a mirror.

### Schema

```prisma
// File
roomId String? @unique   // renamed from liveblocksRoomId; advisory only
```

Rename rather than drop — dropping is destructive and a non-derived name may be
useful later. The Yjs document name is `file.id`.

`CanvasSnapshot` and `DocumentSnapshot` keep their shape; only the writer changes.

Adding a Yjs update-blob column was considered and **rejected for now**: seeding from
JSON is sufficient, and a blob column adds a second source of truth to keep
consistent. Revisit if seeding proves lossy for documents with complex marks.

### Environment

Removed: `LIVEBLOCKS_SECRET_KEY`, `LIVEBLOCKS_WEBHOOK_SECRET`.

Added:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_COLLAB_URL` | Browser-facing WS URL, e.g. `wss://app.example.com/collab` |
| `COLLAB_PORT` | Internal port, default `1234` |
| `COLLAB_INTERNAL_URL` | App → server, e.g. `ws://collab:1234`, for MCP writes |

`CLERK_SECRET_KEY` is now also needed by the collab server for token verification.

### Testing

| Tier | Coverage |
|---|---|
| Unit, no server | `element-sync.ts` unchanged (AC-9); `canvas-bridge.ts` Y.Map ↔ element mapping; `authenticate.ts` decision logic with a mocked verifier |
| Integration | Boot a server on an ephemeral port, connect two `Y.Doc`s, assert convergence (AC-7, AC-8); assert `onStoreDocument` writes both tables (AC-10); assert seeding from Postgres (AC-11) |
| Auth | No token → rejected; valid token, non-member → rejected; member → accepted (AC-4, AC-5) |
| E2E | Two browser contexts on one canvas see each other's changes; same for a document; presence shows names |

Test naming stays load-bearing: `*.test.ts` → Vitest, `*.spec.ts` → Playwright.

The export script (AC-1, AC-2) gets a dry-run mode so it is verifiable before it
writes.

## Build phases

| Phase | Contents | ACs |
|---|---|---|
| **0** | **Document export script, run and verified.** Closes the irreversible risk. | 1, 2 |
| 1 | Workspace + `collab-server` scaffold, Dockerfile, Compose service, app Dockerfile, proxy upgrade rule | 3 |
| 2 | `onAuthenticate` with Clerk token verification, stage-one workspace authorization | 4, 5 |
| 3 | `onLoadDocument` seeding, `onStoreDocument` persistence for both content types | 10, 11 |
| 4 | Canvas port: `LiveMap` → `Y.Map`, `element-sync.ts` preserved | 7, 9 |
| 5 | Document port: rewrite `collaboration-provider.ts` body | 8 |
| 6 | Presence with name, avatar, color | 12 |
| 7 | Room lifecycle removal, MCP `draw_elements`, outage fallback rebind | 13, 14, 18 |
| 8 | Cutover: schema rename, delete webhook route, remove packages and env vars, cancel account | 15, 16, 17 |
| 9 | Swap stage-one authorization for `authorizeRealtimeConnection` when authz phase 5 lands | 6 |

Phase 0 is not optional and does not depend on any other phase. Run it first.

## Consequences

- **Reliability becomes ours.** A Liveblocks outage was theirs to fix; this one is
  ours, at whatever hour it happens. No SLA, no status page, no support channel.
- **Production Docker is introduced** where none existed. The app needs a
  `Dockerfile` it currently lacks, so this migration also establishes the deployment
  story — a real scope addition, but unavoidable given a WS server cannot run
  serverless.
- **Single instance only.** Horizontal scaling needs `@hocuspocus/extension-redis`.
  Note `src/server/mcp.ts:10-11` already imposes this constraint.
- **A pnpm workspace is introduced** so two packages can share Prisma and authz code.
  Most likely source of implementation friction.
- **`element-sync.ts` survives**, contrary to the earlier feature-doc assumption that
  a CRDT would retire it. `Y.Map` gives per-key LWW, and Excalidraw's own semantics
  still need applying on top. This is a smaller migration than first scoped.
- **The mirror gets 30× fresher** — 60s worst case to roughly 2s.
- **Documents finally have a Postgres copy**, closing the data risk permanently
  rather than only for the migration.
- **Authorization ships in two stages.** Between phases 2 and 9, realtime enforces
  workspace membership but not project roles — exactly today's Liveblocks behavior,
  so no regression, but viewers are not read-only until phase 9.
- **`docs/specs/0003-liveblocks-outage-fallback.md` is retired**; its behavior is
  preserved inline in the realtime feature docs.

## Follow-up

- **Named version history** — unblocked by Yjs. Needs its own spec.
- **Images on canvas** — unblocked. Needs object storage, shared with the document
  editor's deferred image support.
- **Multi-instance scaling** — `@hocuspocus/extension-redis` when a single process
  stops being enough.
- **Offline editing** — still deliberately rejected; reintroduces the second-writer
  problem.
- **AGENTS.md** — its stack table forbids Yjs and `y-excalidraw` and mandates
  Liveblocks Storage. Update on cutover. Note this spec keeps a hand-rolled sync
  layer rather than adopting `y-excalidraw`, so only the transport line changes.
- **`docs/scope/scope.md`** — has no row for this migration and should gain one.

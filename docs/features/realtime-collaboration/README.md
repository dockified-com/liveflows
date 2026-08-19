# Realtime Collaboration

**Status**: Planned — spec not yet written
**Current implementation**: Liveblocks (being replaced)
**Target implementation**: self-hosted Hocuspocus + Yjs
**Consumes**: [authorization](../authorization/README.md) — `authorizeRealtimeConnection(principal, fileId)`

## What this feature does

Multiple people edit the same canvas or document at the same time and see each other's changes live. Every file gets its own collaboration room.

## Why it is being rewritten

**Cost.** LiveFlows is a commercial product with a paying customer, and the Liveblocks bill is not covered by the MVP budget. Liveblocks is cancelled entirely. This is a settled engineering decision.

Two features are also blocked by Liveblocks today, per `docs/scope/scope.md:149-154`, and both unblock on Yjs:

- **Named version history** — blocked. Liveblocks Storage version retrieval is undocumented and Yjs-only.
- **Images on canvas** — waiting on Liveblocks `LiveFile`.

Authorization is *not* a reason for the rewrite. Per-project read/write is expressible on Liveblocks through stable per-project group IDs with ID tokens. That was evaluated and is viable, so it should not be cited as a driver — the budget is the driver.

## Critical path

Every canvas and document currently runs on Liveblocks. Cancelling it removes all realtime from the product, so this migration is required for LiveFlows to function at all. It is not an optimization.

It is also a deliberate override of a locked stack decision. AGENTS.md states: *"Yjs, y-excalidraw → Use Liveblocks Storage (LiveMap). Documented fallback only if the round-trip proves unworkable."* AGENTS.md needs updating when this lands.

## What exists today

```
File (one per room)
  └── liveblocksRoomId  "file_<cuid>"        src/server/liveblocks.ts:15-17
        │
        ├── canvas  → LiveObject { elements: LiveMap, meta: LiveObject }
        └── document → Tiptap via @liveblocks/react-tiptap (no storage seed)
```

| Concern | Current owner |
|---|---|
| Live canvas elements while editing | Liveblocks Storage (source of truth) |
| Canvas mirror for lists, search, outage fallback | Postgres `CanvasSnapshot`, refreshed by the `storageUpdated` webhook |
| Element reconciliation | `src/features/canvas/element-sync.ts` — merge by `version`, tie-break by `versionNonce`, echo suppression |
| Room lifecycle | `src/server/liveblocks.ts` — `provisionRoom`, `decommissionRoom` |
| Connection authorization | `/api/liveblocks-auth` — ID token asserting `groupIds: [workspace.id]` |
| Agent writes | `src/server/mcp.ts` `draw_elements` — raw `fetch` to `api.liveblocks.io/v2/rooms/{roomId}/storage` |

Room permissions are baked in at creation (`src/server/liveblocks.ts:35-39`): `defaultAccesses: []`, `groupsAccesses: { [workspaceId]: ["*:write"] }`, immutable `organizationId`. The auth endpoint never sees which room is being joined — access is workspace-wide write, with no read-only variant.

`DocumentSnapshot` exists in the schema but nothing writes to it. The Liveblocks webhook bails on non-canvas files (`src/app/api/webhooks/liveblocks/route.ts:127-142`), so Tiptap documents have no Postgres mirror at all.

## What the migration has to cover

**New infrastructure.** Hocuspocus needs a persistent WebSocket process. It cannot run in a Next.js route handler or on Vercel serverless. That is a new deployable, new deploy pipeline, new failure mode, and a decision about where it runs.

**Canvas sync.** `y-excalidraw` replaces the hand-rolled `LiveMap` sync. This retires `element-sync.ts`, which AGENTS.md calls "the one genuinely novel piece of this codebase" — a CRDT does that merge natively, so the `version` / `versionNonce` reconciliation becomes redundant. Its tests go with it. `y-excalidraw` is third-party and less mature than what it replaces; that risk is real and belongs in the spec.

**Document sync.** `@liveblocks/react-tiptap` → `y-prosemirror` plus a Hocuspocus provider. This part improves: documents gain the Postgres persistence they never had.

**Persistence.** The `storageUpdated` webhook path dies. Mirroring moves to Hocuspocus `onStoreDocument`, writing both `CanvasSnapshot` and `DocumentSnapshot`. Debounce policy replaces the current "at most once per 60s" webhook contract.

**Connection authorization.** `onAuthenticate` calls `authorizeRealtimeConnection(principal, fileId)` and sets `connection.readOnly = true` on a `read` result. Two obligations land on this spec, not the authorization one:

1. **Producing a `Principal` from a WebSocket handshake.** There is no `await auth()` in a raw upgrade. The migration must verify a Clerk session token server-side and construct the principal itself. The authorization service is built to accept a principal rather than reach for Next internals precisely so this is possible.
2. **Mapping room identity to `fileId`.** Rooms are `file_<cuid>` today. The contract takes a `fileId`, so whatever naming this migration adopts, that mapping is its concern.

**Room lifecycle.** `provisionRoom` and `decommissionRoom` have Hocuspocus equivalents or disappear — Yjs documents can be created lazily on first connection, which may remove provisioning entirely. Note `decommissionRoom` currently never throws (it swallows errors with a `console.warn`), which makes the try/catch wrappers around it in `projects.ts:107`, `folders.ts:185`, and `files.ts:205` dead code. Do not carry that pattern forward.

**Ordering guarantees.** AGENTS.md documents that room lifecycle is not transactional with Postgres: create the `Project` row first then the room, delete the room first then the row. `createFile` deletes the `File` row if room provisioning throws (`src/server/dal/files.ts:102-105`). Preserve or consciously replace this.

**MCP writes.** `draw_elements` currently POSTs raw JSON to the Liveblocks REST API. It needs a server-side Yjs document write instead. Once `element-sync.ts` is gone, the reconciliation it relied on is gone too — the CRDT handles it.

**Data migration.** Existing room contents must move from Liveblocks Storage into Yjs documents. `CanvasSnapshot` gives a Postgres fallback source for canvases. Tiptap documents have no mirror, so their only copy lives in Liveblocks — those must be exported before the account is cancelled. **This is the sharpest deadline in the whole migration.**

**Outage fallback.** `docs/specs/0003-liveblocks-outage-fallback.md` describes rendering read-only from `CanvasSnapshot` with a banner. Self-hosting changes the failure mode: the outage is now yours to cause and yours to fix. Revisit that spec.

## Schema impact

Likely renames rather than restructures. `File.liveblocksRoomId` becomes vendor-neutral (`roomId`, or is dropped if room identity derives from `fileId`). `CanvasSnapshot` and `DocumentSnapshot` keep their shape; only the writer changes. A Yjs update-blob column may be worth adding so documents restore without replaying from JSON — that is a spec decision, not a foregone conclusion.

## Authorization boundary

Everything about *who may connect and whether they may write* is already decided and lives in the authorization feature. This migration consumes one function:

```ts
authorizeRealtimeConnection(principal, fileId): Promise<"write" | "read" | "deny">
```

`owner` and `editor` resolve to `write`. `viewer` resolves to `read`. No access resolves to `deny` and the connection is rejected. The client never supplies a role — the server resolves it independently. Never trust a payload like `{ fileId, role: "editor" }`.

Authorization is re-evaluated on every new connection, since `onAuthenticate` runs per connection. Invalidating an already-open socket when someone's role changes mid-session is deferred; the MVP bar is re-evaluation on reconnect.

## Sequencing

The authorization feature ships first and independently. It defines and tests this contract with no consumer, so the two projects do not block each other and authorization is written once rather than twice — against Liveblocks and then again against Hocuspocus.

## Open questions for the spec

- Where does the Hocuspocus process run, and what does it cost compared to Liveblocks at the expected team size? The cost comparison is the justification for the whole migration and should be written down, not assumed.
- How is the Clerk session token delivered to and verified in the WebSocket handshake?
- `onStoreDocument` debounce policy, and what replaces the current 60s mirror contract.
- Is `y-excalidraw` mature enough, and what is the fallback if it is not?
- Migration cutover: dual-write, hard cutover with downtime, or per-file lazy migration?
- Does `File.liveblocksRoomId` survive as a neutral `roomId`, or does room identity derive from `fileId` directly?
- Presence, cursors, and avatars — `userInfo` is currently passed as `{}` (`/api/liveblocks-auth/route.ts:41`), so presence carries no name or avatar today. Worth fixing during the rewrite.
- Scaling: single Hocuspocus instance, or multiple with Redis? Note `src/server/mcp.ts:10-11` already has a module-level session `Map` requiring sticky sessions or a single instance, so this problem exists in the codebase already.

## Files this will touch

```
src/server/liveblocks.ts                        replaced
src/app/api/liveblocks-auth/route.ts            replaced
src/app/api/webhooks/liveblocks/route.ts        deleted, logic moves to onStoreDocument
src/features/canvas/element-sync.ts             deleted (CRDT handles reconciliation)
src/features/canvas/canvas-room.tsx             rewritten on y-excalidraw
src/features/canvas/canvas-room.test.tsx        rewritten
src/server/mcp.ts                               draw_elements rewritten
src/server/dal/{files,folders,projects}.ts      room lifecycle calls
prisma/schema.prisma                            roomId rename, possible Yjs blob column
e2e/canvas-visual.spec.ts                       verify against new sync
package.json                                    remove 4 @liveblocks/* packages, add yjs stack
AGENTS.md                                       stack table override
docs/specs/0003-liveblocks-outage-fallback.md   revisit for self-hosted failure modes
```

## Before the Liveblocks account is cancelled

Tiptap document content exists **only** in Liveblocks. `DocumentSnapshot` is empty because the webhook never writes to it. Export every document before cancellation or that content is unrecoverable.

# Realtime Collaboration — Design

**Status**: Planned — this is a sketch, not an approved spec
**Requirements**: [requirements.md](./requirements.md)
**Consumes**: [authorization](../authorization/design.md) — `authorizeRealtimeConnection(principal, fileId)`
**Current**: Liveblocks (being replaced) → **Target**: self-hosted Hocuspocus + Yjs

> This document scopes the migration and records the open questions. It is not a
> decided design. Those questions need answers before implementation starts, and
> answering them is the job of a dedicated spec in `docs/specs/`.

## Locked-stack override

AGENTS.md currently states: *"Yjs, y-excalidraw → Use Liveblocks Storage (LiveMap). Documented fallback only if the round-trip proves unworkable."*

This migration overrides that, for budget reasons (see [requirements.md](./requirements.md)). AGENTS.md must be updated when it lands. Flagging because the override is deliberate, not an oversight.

## Current implementation

```
File (one room per file)
  └── liveblocksRoomId  "file_<cuid>"        src/server/liveblocks.ts:15-17
        │
        ├── canvas   → LiveObject { elements: LiveMap, meta: LiveObject }
        └── document → Tiptap via @liveblocks/react-tiptap (no storage seed)
```

| Concern | Owner today | File |
|---|---|---|
| Live canvas elements | Liveblocks Storage (source of truth) | — |
| Canvas mirror (lists, search, outage fallback) | Postgres `CanvasSnapshot`, via `storageUpdated` webhook | `src/app/api/webhooks/liveblocks/route.ts` |
| Element reconciliation | merge by `version`, tie-break `versionNonce`, echo suppression | `src/features/canvas/element-sync.ts` |
| Room lifecycle | `provisionRoom` / `decommissionRoom` | `src/server/liveblocks.ts` |
| Connection authorization | ID token asserting `groupIds: [workspace.id]` | `src/app/api/liveblocks-auth/route.ts` |
| Agent writes | raw `fetch` to `api.liveblocks.io/v2/rooms/{id}/storage` | `src/server/mcp.ts` |

Room permissions are baked in at creation (`src/server/liveblocks.ts:36-37`): `defaultAccesses: []`, `groupsAccesses: { [workspaceId]: ["*:write"] }`, immutable `organizationId`. The auth endpoint never sees which room is being joined, so access is workspace-wide write with no read-only variant.

**`DocumentSnapshot` has zero writes anywhere in `src/`** — verified. The webhook bails on non-canvas files (`src/app/api/webhooks/liveblocks/route.ts:127-142`). Tiptap document content exists only in Liveblocks. See the data-export deadline below.

## Target shape

```
Browser (y-excalidraw / y-prosemirror)
        │  WebSocket, Clerk session token in handshake
        ▼
Hocuspocus server  ── persistent process, NOT serverless
        │
        ├── onAuthenticate → build Principal → authorizeRealtimeConnection()
        │                                        │
        │                       write / read (connection.readOnly) / deny
        │
        └── onStoreDocument → debounced write to Postgres
                                CanvasSnapshot + DocumentSnapshot
```

## Work breakdown

**New infrastructure.** Hocuspocus needs an always-on WebSocket process. It cannot run in a Next.js route handler or on Vercel serverless. New deployable, new deploy pipeline, new failure mode, and a hosting decision.

**Canvas sync.** `y-excalidraw` replaces the hand-rolled `LiveMap` sync. This retires `element-sync.ts` — AGENTS.md calls it "the one genuinely novel piece of this codebase," but a CRDT does that merge natively, so the `version` / `versionNonce` reconciliation becomes redundant. Its tests go with it. `y-excalidraw` is third-party and less mature than what it replaces; that risk belongs in the spec with a stated fallback.

**Document sync.** `@liveblocks/react-tiptap` → `y-prosemirror` + Hocuspocus provider. This part improves: documents gain the Postgres persistence they never had.

**Persistence.** The `storageUpdated` webhook path dies. Mirroring moves to `onStoreDocument`, writing both snapshot tables. A debounce policy replaces the current "at most once per 60s" webhook contract.

**Connection authorization.** `onAuthenticate` calls `authorizeRealtimeConnection(principal, fileId)` and sets `connection.readOnly = true` on `read`. Two obligations land here, not on the authorization feature:

1. **Building a `Principal` from a WebSocket handshake.** There is no `await auth()` in a raw upgrade. This migration must verify a Clerk session token server-side and construct the principal. The authorization service accepts a principal rather than reaching for Next internals precisely so this is possible.
2. **Mapping room identity to `fileId`.** Rooms are `file_<cuid>` today. The contract takes a `fileId`, so whatever naming this adopts, the mapping is this migration's concern.

**Room lifecycle.** `provisionRoom` / `decommissionRoom` get Hocuspocus equivalents or disappear — Yjs documents can be created lazily on first connection, which may remove provisioning entirely. Note `decommissionRoom` currently never throws (it swallows errors with `console.warn`), which makes the try/catch wrappers in `projects.ts:107`, `folders.ts:185`, and `files.ts:205` dead code. Do not carry that pattern forward.

**Ordering guarantees.** AGENTS.md documents that room lifecycle is not transactional with Postgres: create the `Project` row first then the room, delete the room first then the row. `createFile` deletes the `File` row if provisioning throws (`src/server/dal/files.ts:102-105`). Preserve or consciously replace.

**MCP writes.** `draw_elements` POSTs raw JSON to the Liveblocks REST API today. It needs a server-side Yjs document write instead. Once `element-sync.ts` is gone, the reconciliation it relied on is gone too — the CRDT handles it.

**Data migration.** Existing room contents move from Liveblocks Storage into Yjs documents. `CanvasSnapshot` gives a Postgres fallback source for canvases. **Documents have no mirror — their only copy is in Liveblocks.**

**Outage fallback.** The shipped behavior (from a now-retired spec, preserved here since the code still does this): `canvas-room.tsx` watches Liveblocks `useStatus`, and on a failed or prolonged-connecting socket it renders a plain Excalidraw fed by the server-fetched `CanvasSnapshot` with `viewModeEnabled={true}` plus a read-only banner. Fallback data can be up to 60s stale, which was acceptable during a vendor outage.

Self-hosting changes the failure mode: the outage is now ours to cause and ours to fix, and `useStatus` disappears with the Liveblocks SDK. The Hocuspocus provider exposes its own connection status; this needs redesigning against it, and the staleness window changes with the new `onStoreDocument` debounce.

## Schema impact

Likely renames, not restructures. `File.liveblocksRoomId` becomes vendor-neutral (`roomId`), or is dropped if room identity derives from `fileId`. `CanvasSnapshot` and `DocumentSnapshot` keep their shape; only the writer changes. A Yjs update-blob column may be worth adding so documents restore without replaying from JSON — a spec decision, not a foregone conclusion.

## Authorization boundary

Everything about *who may connect and whether they may write* is already decided and lives in the [authorization feature](../authorization/design.md). This migration consumes one function:

```ts
authorizeRealtimeConnection(principal, fileId): Promise<"write" | "read" | "deny">
```

`owner` and `editor` → `write`. `viewer` → `read`. No access → `deny`, connection rejected. The client never supplies a role; the server resolves it independently. Never trust a payload like `{ fileId, role: "editor" }`.

Authorization is re-evaluated on every new connection, since `onAuthenticate` runs per connection. Invalidating an already-open socket when a role changes mid-session is deferred — the MVP bar is re-evaluation on reconnect.

## Sequencing

The authorization feature ships first and independently. It defines and tests this contract with no consumer, so the two projects do not block each other, and authorization is written once rather than twice.

## Open questions

These need answers before implementation.

- Where does the Hocuspocus process run, and what does it cost versus Liveblocks at the expected team size? **The cost comparison justifies the whole migration and should be written down, not assumed.**
- How is the Clerk session token delivered to and verified in the WebSocket handshake?
- `onStoreDocument` debounce policy, and what replaces the 60s mirror contract.
- Is `y-excalidraw` mature enough? What is the fallback if not?
- Cutover strategy: dual-write, hard cutover with downtime, or per-file lazy migration?
- Does `File.liveblocksRoomId` survive as a neutral `roomId`, or does room identity derive from `fileId`?
- Presence: `userInfo` is passed as `{}` today (`src/app/api/liveblocks-auth/route.ts:41`), so presence carries no name or avatar. Fix during the rewrite.
- Scaling: single instance, or multiple with Redis? Note `src/server/mcp.ts:10-11` already has a module-level session `Map` requiring sticky sessions or a single instance, so this problem exists already.

## Files this touches

```
src/server/liveblocks.ts                        replaced
src/app/api/liveblocks-auth/route.ts            replaced
src/app/api/webhooks/liveblocks/route.ts        deleted → onStoreDocument
src/features/canvas/element-sync.ts             deleted (CRDT handles it)
src/features/canvas/canvas-room.tsx             rewritten on y-excalidraw
src/features/canvas/canvas-room.test.tsx        rewritten
src/server/mcp.ts                               draw_elements rewritten
src/server/dal/{files,folders,projects}.ts      room lifecycle calls
prisma/schema.prisma                            roomId rename, possible Yjs blob column
e2e/canvas-visual.spec.ts                       verify against new sync
package.json                                    remove 4 @liveblocks/*, add yjs stack
AGENTS.md                                       stack table override
src/features/canvas/canvas-room.tsx             outage fallback: useStatus -> Hocuspocus status
```

## Before the Liveblocks account is cancelled

**Export every document first.**

Tiptap content exists only in Liveblocks — `DocumentSnapshot` is empty because nothing has ever written to it (verified: zero references in `src/`). Cancel before exporting and that content is unrecoverable. Canvases are safe; `CanvasSnapshot` holds a Postgres copy.

This is the sharpest deadline in the migration and the first task, not the last.

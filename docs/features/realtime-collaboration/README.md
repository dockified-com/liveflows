# Realtime Collaboration

Multiple people editing the same diagram or document at once, seeing each
other's changes live. Works today on Liveblocks; being replaced with
self-hosted Hocuspocus + Yjs.

**Status**: Planned — spec not yet written

| Document | Read this if you want |
|---|---|
| [requirements.md](./requirements.md) | Why we are moving, what must not break, in plain language. |
| [design.md](./design.md) | Work breakdown, open questions, files touched. A sketch, not an approved design. |

## Why replace it

**Cost.** LiveFlows is commercial with a paying customer, and the Liveblocks
bill is not covered by the MVP budget. Settled engineering decision.

Two blocked features also unblock on Yjs: named version history, and images on
canvas. Neither is built as part of the migration.

Permissions are *not* a reason — read-only viewers work fine on Liveblocks.

## Two things to know

- **This is on the critical path.** Every diagram and document runs on
  Liveblocks. Cancelling without a replacement stops realtime entirely.
- **Export documents before cancelling the account.** Tiptap content exists
  only in Liveblocks — `DocumentSnapshot` has never been written to. Canvases
  are safe in `CanvasSnapshot`; documents are not. Cancel first and that
  content is unrecoverable.

Depends on: [authorization](../authorization/README.md) — consumes
`authorizeRealtimeConnection(principal, fileId)`, which ships there first with
tests and no consumer.

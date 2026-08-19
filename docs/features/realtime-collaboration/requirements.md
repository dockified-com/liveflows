# Realtime Collaboration — Requirements

**Status**: Planned, spec not yet written
**Design**: [design.md](./design.md)
**Depends on**: [authorization](../authorization/requirements.md)

## What this feature is

Several people open the same diagram or document and edit it together. Everyone sees each other's changes as they happen, without saving or refreshing.

This already works. It runs on Liveblocks, a hosted service. This document is about replacing that service with one we run ourselves.

## Why we are replacing it

**Cost.** LiveFlows is a commercial product with a paying customer, and the Liveblocks bill is not covered by the MVP budget. The engineering team has decided to cancel it and self-host instead. That decision is settled.

Two features people have asked for are also blocked by Liveblocks today, and both become possible once we move:

- **Version history** — saving a named snapshot of a diagram and going back to it later. Liveblocks cannot retrieve older versions of the kind of data we store.
- **Images on a canvas** — pasting or uploading a picture into a diagram. Liveblocks does not yet offer the file storage this needs.

One thing worth being precise about: permissions are **not** a reason for the move. Read-only viewers and per-project access work fine on Liveblocks. The budget is the reason.

## Why this is urgent, not optional

Every diagram and every document in LiveFlows runs on Liveblocks right now. Cancelling the account without a replacement in place means realtime editing stops working entirely. This is not a performance improvement or a nice-to-have — the product does not function without it.

## The one thing that must happen before cancellation

**Documents exist only inside Liveblocks.**

Diagrams are safe: we keep a copy in our own database, so a canvas can be recovered even if Liveblocks disappeared tomorrow. Documents were never given the same treatment. There is a place in our database meant to hold them, and nothing has ever written to it.

If the Liveblocks account is cancelled before documents are exported, **every document in LiveFlows is permanently lost.** Not degraded, not recoverable from a backup — gone.

Exporting documents is the first task of this migration, and it should happen well before anyone touches billing.

## What must stay the same

The whole point is that users notice nothing except things getting better. After the move:

- Several people can edit the same diagram at once and see each other's changes live
- Several people can edit the same document at once, the same way
- Changes are never silently lost when two people edit at the same moment
- Closing the browser and reopening shows the latest state
- A viewer can watch a diagram change in realtime but cannot modify it
- Someone without access to a project cannot connect to its diagrams at all

That last pair comes from the [authorization feature](../authorization/requirements.md). Realtime does not invent its own permission rules; it asks the same system every other part of the app asks.

## What gets better

- **Documents get a safety net.** They gain the database copy diagrams already have, so they survive an outage and can be recovered.
- **Version history becomes possible.** Not built as part of this migration, but unblocked by it.
- **Images on canvas become possible.** Same — unblocked, not included.
- **Presence gets fixed.** Right now the app shows that *somebody* is editing, but not who: no name, no avatar. Worth correcting while we are in here.

## What gets worse, honestly

Self-hosting means the reliability is ours now.

- **Outages become our problem.** When Liveblocks goes down, we show a read-only view and wait. When our own server goes down, we have to fix it — at whatever hour it happens.
- **We need somewhere to run it.** This needs a always-on server process, which is not how the rest of LiveFlows is deployed. New infrastructure, new deployment step, new thing that can break.
- **We take on new third-party code.** The pieces that connect diagram editing to the new system are less mature than what they replace.

These are real costs. They are accepted because the alternative is a bill the MVP cannot pay.

## How the switchover should feel

Nobody should lose work. Specifically:

- No diagram or document loses content in the move
- Ideally nobody is interrupted mid-edit; if a short maintenance window is needed, it is announced
- If the new system misbehaves after launch, we can tell quickly — not from a customer email

## What is not part of this

- **Version history itself.** Unblocked by this work, built later.
- **Images on canvas.** Same.
- **Offline editing.** Still deliberately rejected; it reintroduces the problem of two people editing the same thing from different states.
- **Comments and notifications.** Deferred, unchanged by this.
- **Kicking someone out of a live session the moment their access is revoked.** Access is rechecked every time someone connects, which covers the realistic case. Cutting off an already-open connection mid-session comes later.

## How we will know it worked

- Two browsers editing the same diagram see each other's changes within a moment
- Two browsers editing the same document, likewise
- A viewer watches changes arrive but cannot make any, even with a modified browser
- Closing and reopening a file shows the latest content
- Every diagram and document that existed before the move still has its content after
- The Liveblocks account can be cancelled with no user-visible change

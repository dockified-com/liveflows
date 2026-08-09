# 0001. Multi file projects: files, folders, and per file rooms

**Date**: 2026-08-09
**Status**: Proposed

## Summary

Today a project holds exactly one canvas. This changes that: a project becomes a folder tree, like Google Drive, holding many files, and each file is either a document or a canvas, never both. Realtime collaboration (the Liveblocks room for a canvas, the Tiptap document for a document) moves down from the project to the file. This spec covers the data model and the room and document lifecycle only. The tab bar, split view, and drag and drop UI, and the Tiptap editor wiring itself, are follow up specs once this foundation exists.

## Context

The current model ties one Liveblocks room and one canvas snapshot to each project (`Project.liveblocksRoomId` is unique and non null, `CanvasSnapshot.projectId` is a primary key). Every existing feature (project create and delete, room lifecycle, the canvas reconciliation loop, the mirror webhook) assumes this one to one shape.

The product now needs a project to hold several distinct pieces of work at once: an architecture diagram, a backend diagram, a written decision log, meeting notes. Cramming these into one canvas loses the separation the user wants (frontend concerns should not live on the same drawing surface as backend concerns), and a single document plus a single canvas per project would only support exactly two files, not an arbitrary tree.

The team also considered, and explicitly rejected, a single file that is both a document and a canvas with a synced or AI generated relationship between the two (the pattern seen in a competing tool's document plus diagram split view). That ambiguity, and the AI generation feature it implies, are cut, not deferred: a file is one type, and two related files are just two files a user opens side by side.

## Requirements

**User stories**:
- As a team member, I want to organize a project into folders and files, so that unrelated diagrams and notes do not crowd one canvas.
- As a team member, I want to create a canvas file or a document file inside any folder, so that I choose the right tool for each piece of work.
- As a team member, I want deleting a folder to clean up every room and document inside it, so that I never leave orphaned realtime resources behind.

**Acceptance criteria**:
- **AC-1**: A project can contain any number of folders, nested to any depth, and any number of files, each file either at the project root or inside exactly one folder.
- **AC-2**: A file has exactly one type, `document` or `canvas`, fixed at creation. No file is both.
- **AC-3**: Creating a canvas file provisions a Liveblocks room; creating a document file provisions a Liveblocks Tiptap document. If provisioning fails, the file row is rolled back, same pattern as today's project creation.
- **AC-4**: Two files in the same folder (or both at the project root) cannot share a name. Two files in different folders can.
- **AC-5**: Renaming a file or folder only changes its name; moving a file or folder changes its parent, is blocked if the new location already has a same named entry, and, for a folder, is blocked if the destination is inside the folder's own subtree (no cycles).
- **AC-6**: Deleting a file decommissions its Liveblocks room or document first (best effort, logged on failure), then deletes the row.
- **AC-7**: Deleting a folder decommissions every room and document belonging to every file in its subtree (best effort, continuing past individual failures), then cascades the delete through Postgres.
- **AC-8**: Deleting a project enumerates every file across the whole tree, decommissions each one's room or document, then cascades the delete through Postgres, matching AC-6 and AC-7's best effort pattern.
- **AC-9**: Any workspace member can create, rename, move, and delete files and folders in that workspace's projects. Non members get not found, matching the project level permission model already in place.

## Options considered

### Option 1: File and Folder as two separate tables

`Folder` self references for nesting (`parentId`, nullable); `File` has a nullable `folderId` pointing at `Folder`, null meaning the project root.

**Pros**:
- Matches Postgres and Prisma's relational strengths directly: each table has a fixed, well typed shape
- The room and document lifecycle stays scoped to `File` only; `Folder` never touches Liveblocks

**Cons**:
- Two tables to query when rendering a tree, instead of one

### Option 2: A single polymorphic Node table with a kind discriminator

One `Node` table with `kind: 'folder' | 'document' | 'canvas'`, self referencing for nesting, nullable fields for whichever kind does not apply.

**Pros**:
- One query renders the whole tree
- Closer to how a real filesystem or the Google Drive API models nodes

**Cons**:
- Every row carries nullable fields that only apply to some kinds (a folder row has an unused `liveblocksRoomId` column), which Prisma and Postgres do not enforce cleanly
- The one to one relations to `CanvasSnapshot` and the new `DocumentSnapshot` become harder to express safely, since the FK no longer implies a fixed kind

## Decision

**Chosen option**: Option 1: File and Folder as two separate tables

Files and folders are modeled as two related but distinct tables, each with a fixed, typed shape, rather than one polymorphic table.

## Rationale

The two table shape keeps every foreign key meaningful: a `File.liveblocksRoomId` is only ever present on a real file, never a nullable column carried by folder rows that will never use it. Postgres and Prisma are both relational tools; fighting that with a discriminator column trades a small query convenience for weaker guarantees everywhere else, including the two new one to one snapshot tables this spec introduces. The existing codebase already favors this style (`Project` and `CanvasSnapshot` are two clean tables, not one flexible one), so this decision extends the project's own convention rather than introducing a new one.

## Feature design

**Data model sketch**:

| Entity | Key fields | Relationships |
|---|---|---|
| `Folder` | `id` (cuid, primary key), `projectId` (required), `parentId` (nullable, self reference, null is root), `name` (required), `createdAt`, `updatedAt` | belongs to one `Project`; self references via `parentId`; has many `File`; has many child `Folder` |
| `File` | `id` (cuid, primary key), `projectId` (required), `folderId` (nullable, null is the project root), `name` (required), `type` (`document` or `canvas`, required), `liveblocksRoomId` (unique, nullable, set only when `type` is `canvas`), `createdById` (required, no relation, matches `Project.createdById`'s existing audit only pattern), `createdAt`, `updatedAt` | belongs to one `Project`, optionally one `Folder` |
| `CanvasSnapshot` | unchanged shape; re keyed on `fileId` (primary key, foreign key to `File`) instead of `projectId` | one to one with `File` where `type` is `canvas` |
| `DocumentSnapshot` (new) | `fileId` (primary key, foreign key to `File`), `content` (json, the Prosemirror document), `syncedAt` | one to one with `File` where `type` is `document`; mirrors `CanvasSnapshot`'s eventually consistent role, refreshed from Liveblocks the same way |
| `Project` | unchanged, minus `liveblocksRoomId` and its `canvas` relation (both move to `File`) | has many `Folder`, has many `File` |

Uniqueness: `@@unique([folderId, name])` on `File` covers files sharing a folder. A file at the project root (`folderId` is null) needs the same guarantee scoped to `projectId`, which Prisma's schema syntax cannot express directly as a partial unique index; build this as a raw SQL partial unique index in the migration (`create unique index on "File" (project_id, name) where folder_id is null`), and note it in the build plan so it is not silently dropped by a later `prisma db push`.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create file | the file's `liveblocksRoomId` | generated the same way as today's `roomIdForProject`, keyed on the new file's id instead of the project's id |
| Create file (document type) | the Tiptap document identity Liveblocks needs | the same room id convention, reused for the Tiptap document rather than a second identifier |
| Move file or folder | whether the destination already has a same named entry | a lookup against `File`/`Folder` scoped to the destination `folderId` before the update commits |
| Move folder | whether the destination is inside the mover's own subtree | walk the destination's `parentId` chain up to root, checking for the moved folder's id, before the update commits |
| Delete folder | the full list of files whose rooms and documents need decommissioning | a recursive query over `Folder`/`File` from the deleted folder down, gathered before any deletion runs |

**Key invariants**:
- A `File.liveblocksRoomId` is present if and only if `type` is `canvas`.
- A `File` has at most one of `CanvasSnapshot` or `DocumentSnapshot`, matching its `type`.
- No `Folder` is its own ancestor (enforced at the application layer on move, not by the database).
- Every `File` and `Folder` belongs to exactly one `Project`; there is no cross project move.

**Security model**:
Same as the existing project level model: workspace membership is the only permission unit. `requireWorkspace` already proves membership on every call; every new DAL function for files and folders takes the same path, and a non member gets not found, never forbidden, matching the project's existing "do not leak existence" rule.

**Critical test scenarios**:
- Happy path: create a folder, create a canvas file inside it, create a document file at the project root; all three appear with the correct type and, for the canvas file, a working Liveblocks room, verifies **AC-1**, **AC-2**, **AC-3**
- Failure case: room provisioning fails when creating a canvas file; the file row does not persist, verifies **AC-3**
- Failure case: rename a file to a name already used in the same folder; the rename is rejected, verifies **AC-4**
- Failure case: move a folder into its own child folder; the move is rejected, verifies **AC-5**
- Failure case: delete a folder containing a canvas file whose room deletion fails; the folder and file rows are still removed, and the failure is logged, verifies **AC-6**, **AC-7**
- Auth or permission: a user outside the workspace requests any file or folder action and receives not found, verifies **AC-9**

## Build plan

1. Add `Folder` and `File` models, re key `CanvasSnapshot` onto `fileId`, add `DocumentSnapshot`, remove `Project.liveblocksRoomId` and its `canvas` relation, in one migration, including the raw SQL partial unique index for root level file names, satisfies **AC-1**, **AC-2**, **AC-4**
2. Write `createFile`, `createFolder` in the DAL, following the existing `createProject` rollback pattern (Postgres row first, then provision the room or Tiptap document, roll back the row on failure), satisfies **AC-3**
3. Write `renameFile`, `renameFolder`, `moveFile`, `moveFolder`, each checking the destination's uniqueness constraint, and `moveFolder` additionally checking for cycles, satisfies **AC-5**
4. Write `deleteFile` (decommission its room or document, then delete the row) and `deleteFolder` (recursively gather every descendant file, decommission each, then delete the folder, cascading through Postgres), satisfies **AC-6**, **AC-7**
5. Update `deleteProject` to enumerate every file across the project's whole tree and decommission each before the cascade delete, replacing today's single room decommission call, satisfies **AC-8**
6. Update every DAL function above to route through `requireWorkspace` exactly as the existing project functions do, satisfies **AC-9**
7. Update the canvas reconciliation code and the canvas mirror webhook to key off a file id rather than a project id, since `CanvasSnapshot` no longer has a `projectId` primary key

## Migration plan

**Strategy**: feature flagged, no live data to preserve

Every existing MVP 1a project currently holds exactly one canvas with no folder structure. Rather than writing a data migration that invents a folder tree for existing projects, this ships as: run the schema migration, and for every existing `Project`, create one `File` of type `canvas` at the project root, moving that project's `liveblocksRoomId` and `CanvasSnapshot` row onto the new file. This keeps every existing project working exactly as it does today, now expressed as "a project with one file," rather than a special cased legacy shape.

**Phases**:
1. Add the new tables and columns (`Folder`, `File`, `DocumentSnapshot`) without touching `Project` or `CanvasSnapshot` yet
2. Backfill: for every existing `Project`, create one root level `File` of type `canvas` carrying that project's `liveblocksRoomId`; re point `CanvasSnapshot.projectId` rows to the new `File.id` via `fileId`
3. Drop `Project.liveblocksRoomId` and the old `CanvasSnapshot.projectId` primary key, once the backfill is confirmed complete

**Rollback**: phases 1 and 2 are additive and reversible by dropping the new tables and columns; phase 3 is the only destructive step, and should not run until the backfill in phase 2 is verified against every existing project.

**Risks**: a project whose `liveblocksRoomId` room was already deleted out of band (see the existing "room missing, project row present" failure mode in the design doc) needs the same recreate on next open behavior, now applied to the backfilled file instead of the project.

## Consequences

**Positive**:
- A project can hold an arbitrary, organized set of diagrams and documents instead of exactly one canvas
- The room and document lifecycle code is now written once, against `File`, and every future file type reuses it
- `element-sync.ts` needs no changes at all; it was already pure and never referenced `Project`

**Negative / tradeoffs**:
- Every existing query and page that reads `Project.liveblocksRoomId` or `Project.canvas` must be updated to go through a file instead; this touches the DAL, the canvas page, and the mirror webhook
- Deleting a project is now a fan out operation (enumerate every file, decommission each) instead of a single room deletion, so project deletion takes longer and has more individual failure points to log

**Neutral**:
- The tab bar, split view, and drag and drop interactions designed alongside this feature are not built by this spec; they are pure client state layered on top of the file tree this spec creates
- The Tiptap editor wiring itself (`@liveblocks/react-tiptap`, the toolbar) is a separate follow up spec; this spec only provisions the underlying Liveblocks Tiptap document per file

## Follow-up

- [ ] Design it (spec): Tiptap document editor wiring (the toolbar UI, `@liveblocks/react-tiptap` integration, comments and mentions if wanted)
- [ ] Design it (spec): tab bar, split view, and drag and drop client state (reorder, split by edge, replace by center, add to tab bar), building on the file tree this spec creates
- [ ] The canvas mirror webhook (`src/app/api/webhooks/liveblocks/route.ts`, flagged in the scope as not yet confirmed to exist) needs to look up by file id, not project id, once this ships

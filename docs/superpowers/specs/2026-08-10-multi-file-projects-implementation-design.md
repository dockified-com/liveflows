# Multi-file projects: implementation design

**Date**: 2026-08-10
**Status**: Approved
**Spec**: `docs/specs/0001-multi-file-projects.md` (the source of truth for the data model, acceptance criteria, and lifecycle rules — this document describes how to build it, not what to build)

## Summary

This is the implementation design for spec 0001. It describes the sequencing, file structure, migration strategy, and code patterns for building multi-file projects on top of the existing LiveFlows MVP 1a codebase.

The spec's 7 build steps and 3-phase migration are followed verbatim (Approach A: spec-literal). The Liveblocks `storageUpdated` webhook (feature J) is built as part of this work, keyed on `fileId` from day one.

## Decisions made in this session

1. **Sequencing**: spec-literal, 3-phase migration (additive, backfill, destructive drop)
2. **Feature J (webhook)**: built now, keyed off `fileId`, not deferred
3. **Document-type files**: provision a Liveblocks room (consistent lifecycle) but skip canvas storage init — the Tiptap editor wiring spec will use the room later
4. **`viewBackgroundColor` vs `appState`**: not changing in this work — the flat string column stays; the unresolved discrepancy is deferred

## Phase 1 migration: additive schema changes

### New models in `prisma/schema.prisma`

**Folder:**

```prisma
model Folder {
  id        String   @id @default(cuid())
  projectId String
  parentId  String?
  name      String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent    Folder?  @relation("FolderTree", fields: [parentId], references: [id], onDelete: Cascade)
  children  Folder[] @relation("FolderTree")
  files     File[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([parentId, name])
  @@index([projectId])
}
```

**File:**

```prisma
model File {
  id               String            @id @default(cuid())
  projectId        String
  folderId         String?
  name             String
  type             String            // "document" | "canvas"
  liveblocksRoomId String?           @unique
  createdById      String
  project          Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  folder           Folder?           @relation(fields: [folderId], references: [id], onDelete: Cascade)
  canvasSnapshot   CanvasSnapshot?   @relation("FileCanvas")
  documentSnapshot DocumentSnapshot?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@unique([folderId, name])
  @@index([projectId])
}
```

**DocumentSnapshot:**

```prisma
model DocumentSnapshot {
  fileId   String   @id
  file     File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  content  Json     @default("{}")
  syncedAt DateTime @default(now())
}
```

### Schema modifications

- `CanvasSnapshot` gains a nullable `fileId` column (populated in phase 2)
- `Project` gains `files File[]` and `folders Folder[]` relations
- `Project.liveblocksRoomId` and `Project.canvas` relation are **not** removed yet

### Raw SQL in migration

Root-level uniqueness (Prisma can not express partial unique indexes natively):

```sql
CREATE UNIQUE INDEX "File_projectId_name_root_key"
  ON "File" ("projectId", "name") WHERE "folderId" IS NULL;

CREATE UNIQUE INDEX "Folder_projectId_name_root_key"
  ON "Folder" ("projectId", "name") WHERE "parentId" IS NULL;
```

## Phase 2 migration: backfill

A SQL migration (not app code) that runs once:

**ID generation note:** `@default(cuid())` is a Prisma-level default, not a Postgres function. The backfill migration must generate IDs for the new `File` rows. Options: use `gen_random_uuid()::text` (produces UUIDs, not CUIDs, but the `id` column is `String` not `cuid`-typed, so any unique string works), or write the backfill as a Prisma seed script. Prefer the SQL approach with `gen_random_uuid()::text` for atomicity — the backfill runs as a single transaction inside the migration.

1. For every existing `Project` row, insert one `File` row:
   - `projectId` = the project's id
   - `folderId` = NULL (project root)
   - `name` = the project's name
   - `type` = `'canvas'`
   - `liveblocksRoomId` = the project's `liveblocksRoomId`
   - `createdById` = the project's `createdById`
2. For every `CanvasSnapshot` row, set `fileId` to the `File.id` just created for that project
3. Alter `CanvasSnapshot`:
   - Make `fileId` non-nullable
   - Add FK constraint to `File.id` with `onDelete: Cascade`
   - Drop `projectId` as primary key, add `fileId` as the new primary key
   - Drop the `projectId` column and the old `Project` relation

## Phase 3 migration: destructive drop

After phase 2 is verified against every existing project:

- Drop `Project.liveblocksRoomId` column (and its unique index)
- Remove `Project.canvas` relation from the schema
- Remove `roomIdForProject` helper from `src/server/liveblocks.ts`

## Liveblocks helpers (`src/server/liveblocks.ts`)

### New

```ts
function roomIdForFile(fileId: string): string {
  return `file_${fileId}`;
}
```

### Updated

- `provisionRoom`: no signature change — callers switch from `roomIdForProject(project.id)` to `roomIdForFile(file.id)`
- `decommissionRoom`: no change — already takes a bare roomId string
- `roomIdForProject`: kept until phase 3, then removed

### Document-type file provisioning

For document-type files, `provisionRoom` is called with the same arguments (creates a Liveblocks room) but `initializeStorageDocument` is **not** called with the Excalidraw storage shape. The room exists for the future Tiptap spec to initialize with Prosemirror-appropriate storage.

**Consequence for `File.liveblocksRoomId`:** the spec says this field is "nullable, set only when `type` is `canvas`." In this implementation, it is set for **both** file types — canvas files get a room with Excalidraw storage, document files get an empty room for future Tiptap use. The field remains nullable in the schema (to satisfy Prisma's create-then-update pattern), but in practice every file will have a room ID after creation succeeds.

## DAL: file and folder CRUD

### New file: `src/server/dal/files.ts`

Every function starts with `requireWorkspace` and proves membership. Non-members get `notFound()`.

| Function | Behavior | ACs |
|---|---|---|
| `createFile(workspaceSlug, projectId, { name, type, folderId? })` | Create DB row, provision Liveblocks room (`roomIdForFile`). For canvas files, also call `initializeStorageDocument` with the Excalidraw shape. Roll back row on provisioning failure. | AC-2, AC-3 |
| `renameFile(workspaceSlug, fileId, newName)` | Update `name`. Uniqueness enforced by DB constraint. | AC-5 |
| `moveFile(workspaceSlug, fileId, newFolderId)` | Update `folderId`. Check destination uniqueness before committing. | AC-5 |
| `deleteFile(workspaceSlug, fileId)` | Decommission room (best-effort, logged on failure), delete row. | AC-6 |
| `listFiles(workspaceSlug, projectId)` | Return all folders and files for a project (the full tree). | — |
| `getFile(workspaceSlug, fileId)` | Return a single file with type and roomId. | — |

### New file: `src/server/dal/folders.ts`

| Function | Behavior | ACs |
|---|---|---|
| `createFolder(workspaceSlug, projectId, { name, parentId? })` | Create folder row. Validate parent exists and belongs to the same project. | AC-1 |
| `renameFolder(workspaceSlug, folderId, newName)` | Update `name`. Uniqueness enforced by DB. | AC-5 |
| `moveFolder(workspaceSlug, folderId, newParentId)` | Update `parentId`. Check destination uniqueness AND walk `parentId` chain upward from destination to detect cycles (reject if the moved folder is an ancestor of the destination). | AC-5 |
| `deleteFolder(workspaceSlug, folderId)` | Recursively gather all descendant `File` IDs, decommission each room/document (best-effort, continue past failures), delete the folder (Prisma cascades child rows). | AC-7 |

### Updated: `src/server/dal/projects.ts`

| Function | Change |
|---|---|
| `createProject` | No longer provisions a Liveblocks room directly. Creates the project row, then calls `createFile` to create a default root-level canvas file. If `createFile` fails (which includes room provisioning failure), rolls back the project row. |
| `deleteProject` | Enumerates all `File` rows for the project, decommissions each (best-effort, continuing past failures), then deletes the project (Prisma cascades). Replaces the single `decommissionRoom(project.liveblocksRoomId)` call. |
| `getProjectWithSnapshot` | Queries through `File` to find the project's root canvas file and its `canvasSnapshot`. Returns the same shape (`ProjectWithSnapshot`) so the page does not change. |

## Liveblocks webhook (`src/app/api/webhooks/liveblocks/route.ts`)

Built from scratch, keyed on `fileId`.

### Flow

1. Verify signature using `LIVEBLOCKS_WEBHOOK_SECRET` (same Svix pattern as the Clerk webhook)
2. Deduplicate via `ProcessedWebhook` on `svix-id` header
3. Extract `roomId` from event payload
4. Look up `File` by `liveblocksRoomId = roomId` — if no match, log warning and return 200 (orphan room)
5. Fetch current storage from Liveblocks (`liveblocks.getStorageDocument(roomId)`)
6. Upsert `CanvasSnapshot` keyed by `fileId`:
   - `elements`: extracted from storage
   - `viewBackgroundColor`: from `meta.viewBackgroundColor` (flat string, matching current schema)
   - `elementCount`: count of non-deleted elements
   - `syncedAt`: `new Date()`

Only processes canvas-type files. Document-type file snapshot sync is deferred to the Tiptap spec.

## Page and UI updates (minimal)

The tab bar, split view, and file tree UI are follow-up specs. This build keeps the existing UI working with the new data model.

### `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`

- Changes from `getProjectWithSnapshot(slug, projectId)` to a query that finds the project's root canvas file and passes its `roomId` + `fallbackElements` to `CanvasRoom`
- `getProjectWithSnapshot` is updated internally to query through `File`, so the page's call may not change at all — just the DAL implementation behind it

### `src/app/(app)/w/[workspaceSlug]/actions.ts`

- `createProjectAction`: no change — the DAL now auto-creates a default canvas file internally
- `deleteProjectAction`: no change — the DAL handles fan-out decommission internally

### Components with no changes

- `CanvasRoom` (`canvas-room.tsx`): already takes a `roomId` prop, file-agnostic
- `element-sync.ts`: pure function, confirmed by spec, no changes
- `project-list.tsx`, `create-project-modal.tsx`, `delete-project-dialog.tsx`: project-level operations, DAL handles the new complexity internally

## Testing

New test files following the existing pattern in `src/server/dal/__tests__/`:

| Test file | Covers |
|---|---|
| `src/server/dal/__tests__/files.test.ts` | `createFile` (incl. rollback on provisioning failure), `renameFile` (incl. collision rejection), `moveFile`, `deleteFile` |
| `src/server/dal/__tests__/folders.test.ts` | `createFolder`, `renameFolder`, `moveFolder` (incl. cycle detection rejection), `deleteFolder` (incl. cascading decommission with partial failures) |
| `src/server/dal/__tests__/projects.test.ts` | Updated: `createProject` now creates a default file, `deleteProject` does fan-out decommission |
| `src/app/api/webhooks/liveblocks/__tests__/route.test.ts` | Signature verification, dedup, file lookup by roomId, `CanvasSnapshot` upsert |

### Spec critical test scenarios mapped

| Scenario | Test |
|---|---|
| Create folder + canvas file + doc file, all appear correctly | `files.test.ts`, `folders.test.ts` |
| Room provisioning failure rolls back file row | `files.test.ts` |
| Rename to duplicate name in same folder is rejected | `files.test.ts` |
| Move folder into its own child is rejected | `folders.test.ts` |
| Delete folder with failed room decommission still removes rows | `folders.test.ts` |
| Non-member gets notFound for any file/folder action | All test files |

## Build order

| Step | Deliverable | Files created or changed |
|---|---|---|
| 1 | Phase 1 migration (additive) | `prisma/schema.prisma`, `prisma/migrations/<ts>_add_files_folders/migration.sql` |
| 2 | Phase 2 migration (backfill) | `prisma/migrations/<ts>_backfill_files/migration.sql` |
| 3 | Liveblocks helpers | `src/server/liveblocks.ts` |
| 4 | File DAL + tests | `src/server/dal/files.ts`, `src/server/dal/__tests__/files.test.ts` |
| 5 | Folder DAL + tests | `src/server/dal/folders.ts`, `src/server/dal/__tests__/folders.test.ts` |
| 6 | Updated project DAL + tests | `src/server/dal/projects.ts`, `src/server/dal/__tests__/projects.test.ts` |
| 7 | DAL index export | `src/server/dal/index.ts` |
| 8 | Liveblocks webhook + tests | `src/app/api/webhooks/liveblocks/route.ts`, `src/app/api/webhooks/liveblocks/__tests__/route.test.ts` |
| 9 | Page updates | `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx` |
| 10 | Phase 3 migration (destructive) | `prisma/schema.prisma`, `prisma/migrations/<ts>_drop_project_room/migration.sql` |
| 11 | Cleanup | Remove `roomIdForProject`, update any remaining references |

## What is NOT in scope

- Tab bar, split view, file tree UI (follow-up spec)
- Tiptap editor wiring, toolbar, comments/mentions (follow-up spec)
- `viewBackgroundColor` vs `appState` discrepancy resolution (flagged, deferred)
- File-level URL routes (`/p/[projectId]/f/[fileId]`) — come with the tab bar spec
- `DocumentSnapshot` sync via webhook — comes with the Tiptap spec

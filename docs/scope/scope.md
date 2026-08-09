# Scope: LiveFlows

A collaborative diagramming app for software system design. Teams of developers
brainstorm architecture diagrams together in realtime on an Excalidraw canvas,
organized by workspace (Clerk Organization). External AI agents read and draw
diagrams through MCP in a later phase.

**Build approach:** Tracer Bullet (each feature built end to end through every layer, working).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Stack & architecture | Foundation | existing |
| B | Data model | Foundation | existing |
| C | Auth & workspace resolution | Foundation | existing |
| D | Clerk membership sync (webhook) | Foundation | existing |
| E | Workspace project list | MVP 1a | existing |
| F | Project create / delete | MVP 1a | existing |
| G | Liveblocks room lifecycle | MVP 1a | existing |
| H | Canvas realtime reconciliation | MVP 1a | existing |
| I | Liveblocks auth token issuance | MVP 1a | existing |
| J | Canvas mirror (storageUpdated webhook) | MVP 1a | in-progress |
| K | Liveblocks outage read-only fallback | MVP 1a | planned |
| L | Storage-ceiling warning UI | MVP 1a | planned |
| M | Landing / marketing page | MVP 1a | planned |
| N | Multi-file projects (files, folders, tabs, split view) | MVP 1a | in-progress |
| 1 | MCP server (agent read/draw access) | MVP 1b | planned |
| 2 | In-app AI chat / copilot | MVP 2 | planned |
| 3 | Images on canvas | Deferred | planned |
| 4 | Project thumbnails | Deferred | planned |
| 5 | Named version history | Deferred | planned |
| 6 | Comments & notifications | Deferred | planned |
| 7 | Offline editing / write queue | Deferred | planned |

## Foundations (existing)

### A. Stack & architecture · existing
Next.js 16, React 19 (React Compiler on), Tailwind v4, TypeScript, pnpm, Biome. Clerk for auth, Liveblocks for realtime, Excalidraw for the canvas, Prisma 7 + `@prisma/adapter-pg` against Supabase Postgres, Zustand for ephemeral client state only.
Design in `docs/superpowers/specs/2026-08-08-liveflows-design.md`. code in `./` (root config: `package.json`, `biome.json`, `prisma.config.ts`, `next.config.ts`)

### B. Data model · existing
`User`, `Workspace`, `WorkspaceMember`, `Project`, `CanvasSnapshot`, `ProcessedWebhook`. Postgres is the read path and eventually-consistent mirror; Liveblocks Storage is the write path for live canvas elements.
code in `prisma/schema.prisma`, `src/generated/prisma/`
Note: `CanvasSnapshot` currently stores `viewBackgroundColor` as a flat column, not the `appState` JSON field the design doc describes — confirm which is current before changing the webhook handler or schema.

### C. Auth & workspace resolution · existing
`proxy.ts` (Clerk, authentication only) + DAL (`requireWorkspace`, `requireWorkspaceByOrgId`) doing authorization and lazy upsert, keyed off `await auth()` never client input. Non-members get `NotFoundError`.
code in `src/proxy.ts`, `src/server/dal/workspaces.ts`, `src/app/(auth)/sign-in|sign-up/`, `src/app/session-tasks/choose-organization/`

### D. Clerk membership sync (webhook) · existing
`user.*`, `organization.*`, `organizationMembership.*` events verified via `verifyWebhook`, deduplicated on `svix-id` through `ProcessedWebhook`, idempotent upserts into Postgres.
code in `src/app/api/webhooks/clerk/route.ts`

## MVP 1a

### E. Workspace project list · existing
Server Component reads the DAL, DAL reads Postgres only (no Liveblocks call), scoped to the caller's workspace.
**Done when:** a member sees only their workspace's projects, most recent first.
code in `src/app/(app)/w/[workspaceSlug]/page.tsx`, `src/components/project-list.tsx`

### F. Project create / delete · existing
Create writes Postgres first then provisions the Liveblocks room; delete removes the room first then the Postgres row. Half-created projects are rolled back.
**Done when:** creating a project always yields either a working room + row, or neither; deleting always removes both or leaves a logged orphan room, never an orphan row.
code in `src/app/(app)/w/[workspaceSlug]/actions.ts`, `src/components/create-project-modal.tsx`, `src/components/delete-project-dialog.tsx`, `src/server/dal/projects.ts`

### G. Liveblocks room lifecycle · existing
Room provisioning (`defaultAccesses: []`, `groupsAccesses` keyed by workspace, `organizationId` for tenant isolation) and decommissioning helpers, called from project create/delete.
code in `src/server/liveblocks.ts`

### H. Canvas realtime reconciliation · existing
The version-ledger loop: local edits diffed by `version` into a `LiveMap`, remote edits merged by `version`/`versionNonce`, pointer gating buffers remote updates during an active drag, `CaptureUpdateAction.NEVER` on remote apply so undo only reverses local actions.
**Done when:** two clients drawing concurrently never lose an edit, a remote update mid-drag never disrupts the drag, and local undo never reverses a teammate's edit.
code in `src/features/canvas/element-sync.ts`, `src/features/canvas/canvas-room.tsx`, `src/app/canvas/[roomId]/page.tsx`, `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`

### I. Liveblocks auth token issuance · existing
Issues a Liveblocks ID token scoped to the caller's workspace group and `organizationId`, so room access always matches Clerk org membership.
code in `src/app/api/liveblocks-auth/route.ts`

### J. Canvas mirror (storageUpdated webhook) · in-progress
Verify, fetch storage, upsert `CanvasSnapshot`; idempotent via `ProcessedWebhook`, looked up by the indexed `liveblocksRoomId` column.
**Done when:** a replayed `storageUpdated` event converges to the same row, a room-with-no-project event is logged and ignored, and `elementCount` only counts live (non-deleted) elements.
- [ ] Confirm `appState`/`viewBackgroundColor` schema mismatch against the design doc and reconcile: `/develop canvas mirror`
- [ ] Verify it: `/check verify canvas mirror`
- [ ] Test it: `/test canvas mirror`
code in `src/app/api/webhooks/liveblocks/route.ts` (confirm path exists; not seen in the current source scan)

### K. Liveblocks outage read-only fallback · planned
When Liveblocks is unreachable, the canvas renders read-only from `CanvasSnapshot` with a banner; auth, lists, and workspace pages stay unaffected.
**Done when:** a simulated Liveblocks outage still lets a user view the last-synced canvas and navigate the rest of the app normally.
- [ ] Design it (spec): `/architect liveblocks outage read-only fallback`

### L. Storage-ceiling warning UI · planned
Surface `CanvasSnapshot.elementCount` in the UI as an early warning before the ~10MB per-room Liveblocks storage ceiling.
**Done when:** a project nearing the ceiling shows a visible warning; garbage collection stays out of scope (monitored, not solved).
- [ ] Design it (spec): `/architect storage-ceiling warning UI`

### M. Landing / marketing page · planned
The public `/` route: what LiveFlows is, sign-in/sign-up entry points. No product functionality.
**Done when:** an unauthenticated visitor understands the product and can reach sign-in or sign-up.
- [ ] Build it: `/develop landing page`

### N. Multi-file projects (files, folders, tabs, split view) · in-progress
A project becomes a container, Drive-style: folders and files inside it, not a single canvas. Each file has exactly one type, `document` or `canvas` — no hybrid file that is both at once. Files open as tabs across the top (VS Code model: a tab is an open file, not a view mode), and two tabs can sit side by side in a split view so a document and a canvas, or two canvases, are visible and independently editable at once.
Explicitly rejected: a single file that is simultaneously a document and a canvas with a synced or AI-generated relationship between them (the pattern seen in the Eraser.io inspiration screenshot, `docs/inspiration/document-diagram-screen-inspiration.png`). That ambiguity, plus the AI-generation feature it implies, is cut, not deferred.
**Document editor decided:** Tiptap (MIT core) via `@liveblocks/react-tiptap`, own toolbar UI, not BlockNote's pre-built UI. Reuses the existing Liveblocks vendor, no second realtime backend. See `## Stack` in `AGENTS.md`.
**Breaking change to the current model:** every existing MVP 1a feature assumes `Project` has exactly one canvas, one Liveblocks room, one `CanvasSnapshot` (`Project.liveblocksRoomId` is unique and non-null; `CanvasSnapshot.projectId` is a primary key, not a foreign key with multiplicity). This feature moves the canvas relationship down a level, from `Project` to a new file entity, and affects:
- Data model (B): needs `File` and `Folder` entities; `CanvasSnapshot` re-keys off the file id, not the project id; a new document-persistence path for Tiptap/Liveblocks text documents (separate from `CanvasSnapshot`, since it's Prosemirror JSON, not Excalidraw elements)
- Project create/delete (F) and Liveblocks room lifecycle (G): a room is provisioned per canvas-type file now, not per project; a Tiptap document is provisioned per document-type file; deleting a project must enumerate and delete every file's room/document
- Canvas realtime reconciliation (H) and canvas mirror webhook (J): unaffected in mechanism, but now run per open canvas file rather than per project
**Done when:** a user can create folders and files inside a project, open multiple files as tabs, split two tabs side by side, and each file (document or canvas) is independently synced and editable with no shared or generated content between file types.
- [x] Design it (spec): `/architect multi-file projects`
- [ ] Build it: `/develop multi-file projects`
  - [ ] Migration + data model: `Folder`/`File`/`DocumentSnapshot`, re-key `CanvasSnapshot`, backfill existing projects into root-level canvas files (AC-1, AC-2, AC-4)
  - [ ] File/folder DAL: create, rename, move (uniqueness + cycle checks), delete with room/document decommission (AC-3, AC-5, AC-6, AC-7, AC-8, AC-9)
  - [ ] Update project deletion, canvas reconciliation, and the canvas mirror webhook to key off file id instead of project id
- [ ] Verify it: `/check verify multi-file projects`
- [ ] Test it: `/test multi-file projects`
Implementation detail for the spec, not a scope change: tabs and file-tree items share one drag source. Click a tree file → opens a new tab, never replaces or closes an existing tab. Drag a tab or a tree file onto a pane's edge → new split in that direction (macOS window-snap style); onto a pane's center → replaces that pane's current file; onto the empty tab bar area → adds a new tab with no layout change (Notion-style). Reorder-within-bar, drag-to-split, and drag-to-add-tab are all pure client UI state, no backend implication. Demoed in `docs/UI-design/final-light-saas/project-file-tabs.html`.
Spec 0001 · code (filled by /develop)

## MVP 1b

### 1. MCP server (agent read/draw access) · planned
External AI coding agents read and draw diagrams via MCP, reusing 1a's reconciliation pattern. Gets its own spec once 1a is stable.
**Done when:** an external MCP client can read a project's current canvas and add elements via `convertToExcalidrawElements()` skeletons without corrupting concurrent human edits.
- [ ] Design it (spec): `/architect MCP server`

## MVP 2 and deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **In-app AI chat / copilot**: AI assistance inside the app itself, distinct from the external MCP agent path · needs a decision
- **Images on canvas**: deferred until Liveblocks `LiveFile` ships; explicitly not Supabase Storage · needs a decision
- **Project thumbnails**: server-side generation from the Postgres snapshot, once needed · needs a decision
- **Named version history**: blocked on Liveblocks Storage version retrieval being undocumented (only Yjs has it today) · needs a decision
- **Comments & notifications**: Liveblocks ships both; straightforward once prioritized · needs a decision
- **Offline editing / write queue**: rejected in the design doc as reintroducing the second-writer problem the architecture avoids · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow-up enrolled |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Beta` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default: **Beta** = `/check verify` then `/test` after `/develop`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.

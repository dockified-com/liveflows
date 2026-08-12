# Final Light SaaS UI Implementation Plan

**Status:** Design-complete and engineering-cleared; T0 fidelity preflight required before UI implementation  
**Design authority:** `docs/UI-design/final-light-saas/`  
**Base branch:** `development`

## Goal

Make the authenticated LiveFlows application match the finalized Light SaaS design in structure, visual language, interaction behavior, and responsive/accessibility quality while preserving the existing Clerk, DAL, Liveblocks, Excalidraw, and file-management behavior.

The work is a UI architecture change, not a palette swap. The project route becomes the finalized file workspace with a tree, open-file tabs, and one or two independently editable panes.

## Design Authority

Implementation must be calibrated against these approved references:

- `docs/UI-design/final-light-saas/workspace-shell.html`
- `docs/UI-design/final-light-saas/project-file-tabs.html`
- `docs/UI-design/final-light-saas/canvas-page.html`

When prose and a reference disagree, the reference controls unless this plan explicitly overrides it for responsive behavior, accessibility, or a required application state.

## Information Architecture

```text
Authenticated application
├── Workspace project list
│   ├── Global icon rail
│   ├── Workspace navigation sidebar
│   ├── Breadcrumb/action top bar
│   └── Project grid
│       ├── Existing project cards
│       └── New-project card
├── Project workspace
│   ├── Global icon rail
│   ├── Project file tree (replaces workspace sidebar)
│   ├── Open-file tab bar
│   └── Editor region
│       ├── Single active pane, or
│       └── Two independently editable split panes
│           ├── Canvas file
│           └── Document file
└── Direct canvas route / focused canvas mode
    ├── Minimal breadcrumb top bar
    ├── Sync and presence controls
    └── Excalidraw surface with native canvas chrome untouched
```

### Hierarchy by screen

1. **Workspace:** current location and primary `New project` action; project collection; secondary navigation and account controls.
2. **Project workspace:** active file content; file tabs; file tree and creation affordance; sync/presence status.
3. **Focused canvas:** canvas content; navigation context; collaboration status and available project actions.

### Navigation rules

- Selecting a project opens the project workspace, not a manifest/dashboard page.
- Selecting a file opens it as a tab without closing existing tabs.
- Selecting an already-open file activates its existing tab.
- Closing the active tab activates the nearest remaining tab; an empty editor state appears when none remain.
- A file can be opened in a second pane through the split action or drag/drop behavior defined later in this plan.
- Each pane owns its active file and sync indicator; editing in one pane does not replace or mutate the other pane's document.
- The file tree is scoped to the current project. Returning to the workspace restores the workspace navigation sidebar.

## Review Decisions

- **D2:** Implement the complete finalized project workspace. Do not ship a light-theme reskin of the existing manifest page.
- **D3:** An empty project retains the full file-workspace shell and shows an intentional `Start this project` state with `New canvas`, `New document`, and `New folder` actions. Do not create a default file automatically.
- **D4:** Contain errors within the affected project-list region, file tree, tab, or editor pane. Preserve navigation and every healthy pane; never replace the full workspace for a local failure.
- **D5:** Teach the workspace through contextual, dismissible guidance. Do not add a forced first-run modal tour.
- **D6:** Replace prototype emoji/symbol icons with a consistent inline SVG icon system. Preserve the finalized layout and text labels; do not add an icon component library.
- **D7:** Create a root `DESIGN.md` before reshaping application components. Extract the finalized system into durable tokens, component vocabulary, interaction rules, accessibility requirements, and anti-patterns.
- **D8:** Below 768px, replace the desktop rail and sidebar/file tree with a compact top bar and one contextual navigation drawer. Do not add persistent mobile bottom navigation.
- **D9:** Below 768px, render one editor pane at a time and use tabs to switch between the files participating in a split. Preserve the split arrangement in client state and restore it when the viewport permits.
- **D10:** Persist open tabs, active file, split pairing, and divider position as versioned local browser state scoped by user and project. Validate restored file IDs against current project contents; never store personal layout in Postgres.
- **D11:** Replace the current always-visible create forms with a `New file / folder` action menu. Canvas, Document, or Folder selection opens a focused dialog for name and destination while reusing existing server actions and validation.
- **D12:** Render only controls backed by current product behavior. Preserve reserved shell locations in the design system, but omit unavailable Home, Starred, Members, Alerts, Settings, Share, or similar prototype destinations rather than shipping dead or `Coming soon` controls.
- **D13:** Keep the workspace project list Postgres-only. Omit live sync pills and presence avatars from project cards; show collaboration state only inside an active project or file.
- **D14:** Use `roomIdForFile(file.id)` as the authoritative Liveblocks room identity for both canvas and document files. DAL view models expose the derived room ID; `File.liveblocksRoomId` remains canvas-only for snapshot-webhook lookup. All file, folder, and project deletion paths derive room IDs from file IDs so document rooms cannot leak.
- **D15:** Mount realtime editors only for the one or two visible panes. Before a canvas pane unmounts during tab close, switch, replacement, or responsive collapse, flush and clear its pending throttled change; add regression tests proving the final edit reaches Liveblocks. Inactive tabs persist file/layout identity only and hold no hidden Excalidraw/Tiptap instance or Liveblocks connection.
- **D16:** Complete the document read mirror with the editor. Subscribe the existing verified/idempotent Liveblocks webhook to `ydocUpdated`, resolve its deterministic `file_<fileId>` room to an authorized document file, export the current ProseMirror JSON through `withProsemirrorDocument`, and upsert `DocumentSnapshot`. Liveblocks remains authoritative; Postgres remains the eventual read/outage/search/agent mirror.
- **D17:** Preserve claim-first webhook duplicate protection and idempotent canvas/document mirror upserts, but do not treat a claimed event as completed until processing succeeds. D44 replaces the initial delete-on-failure proposal with a durable processing/completed lease so provider retry can converge every failed or abandoned event.
- **D18:** Treat every file/folder destination ID as untrusted client input. For non-root create, move, and drop actions, the DAL must prove the destination belongs to the already-authorized project in the same operation path; stale, foreign-project, and unauthorized destinations resolve as not found. The rendered tree or destination selector is never an authorization boundary.
- **D19:** Use the current `@dnd-kit/react` interaction toolkit with one project-workspace drag coordinator, pointer and keyboard sensors, typed drag payloads, and typed drop targets. File-tree moves, tab reordering, tab opening, pane replacement, and split-edge drops dispatch explicit domain actions; canceling a drag is a no-op. Menus/buttons remain equivalent non-drag paths, and dnd-kit supplies behavior only—not visual components.
- **D20:** Implement workspace layout state as pure transitions in `src/features/project-workspace/workspace-state.ts` wrapped by a project-scoped Zustand vanilla store/provider initialized with authenticated user ID, project ID, and authorized files. Keep `src/stores/ui.ts` limited to application-shell concerns; do not add a global map of project workspaces.
- **D21:** Define one shared `FileType = "canvas" | "document"` domain type and runtime guard at the DAL view-model boundary. The editor-pane router uses an exhaustive switch; an unknown stored value produces a pane-local unsupported-file error and never defaults to either editor. Do not add a database enum migration for this UI implementation.
- **D22:** Standardize server mutations on one discriminated result contract for success, field validation, name/destination conflict, and recoverable server failure. Every Server Action catch calls Next.js `unstable_rethrow(error)` first, maps only known domain errors to safe user messages, logs unexpected details server-side, and never returns raw provider/database error text. Dialogs and drag/drop consume the same contract.
- **D23:** Files and folders share one normalized sibling-name namespace within each project directory. A shared DAL conflict helper is reused by create, rename, move, and drag/drop mutations across both tables; the separate `File`/`Folder` data model remains. Root and nested locations follow the same rule, and conflicts use the typed mutation result from D22.
- **D24:** Remove the global `elementCount` scalar from `src/stores/ui.ts`. Each mounted `CanvasRoom` owns its element count and exposes it only to its containing editor-pane header/status presentation through room-local composition; two canvas panes never overwrite shared metrics.
- **D25:** Visual acceptance is governed by the approved Reference-Locked Final UI Fidelity Contract, not a broad percentage approximation. Freeze the reference directory/external font hashes and capture environment; require zero unexplained geometry, token, text, icon, responsive, or interaction differences, with at most 0.1% validated raster-only noise after repeated baseline stability runs.
- **D26:** Build deterministic Playwright application-state fixtures before adding fidelity journeys. Run the Next.js test server against disposable Postgres only; derive the authorized Clerk test user/organization from explicit E2E environment variables; provision uniquely namespaced workspace, project, folder, canvas, document, snapshot, and test-only Liveblocks room state per test/worker; expose stable fixture IDs/selectors instead of clicking the first ambient record; stabilize time, collaborator presentation, fonts, animation, and seeded editor content for screenshots; and clean up only resources bearing the fixture namespace. Parallel tests must never share mutable project or room state, and no E2E setup may read or mutate production Supabase or production Liveblocks resources.
- **D27:** Add a mandatory regression test for the D15 unmount boundary: when a canvas has a pending throttled write, tab close, tab replacement, pane removal, responsive one-pane transition, and route unmount synchronously flush the final eligible element diff before the room provider disconnects. The test uses fake timers at the component boundary and a Playwright tab-switch journey; it must fail against the current timer-without-cleanup behavior.
- **D28:** Make authenticated Chromium behavioral and visual fidelity tests a required merge-blocking CI job. The job provisions disposable Postgres and dedicated non-production Clerk/Liveblocks test resources, installs the pinned browser/fonts, builds with the test database connection, runs D26-isolated journeys and the D25 comparison pipeline, uploads traces/diffs/manifests on failure, and rejects every unexplained visual or behavioral difference. Production Supabase, Clerk, and Liveblocks credentials are forbidden in this job.
- **D29:** Add a blocking fidelity-manifest preflight before any authenticated UI implementation. Generate `docs/specs/final-light-saas-fidelity-manifest.json` as the machine-readable source and `docs/specs/final-light-saas-fidelity-manifest.md` as its reviewer view; keep both outside the hash-frozen reference directory. Freeze one stable manifest row for every required reference state × primary viewport, plus explicit breakpoint-boundary interaction checks at 767, 768, 1279, and 1280 CSS px. Each row contains the contract's required fixture, ownership, authority, interaction, capture, regression, and approval fields. Validate the JSON schema and reference/font/environment hashes in CI. No T1–T10 UI task starts until its manifest rows exist, the complete manifest is frozen, and the CEO/design owner records preflight approval; no task completes until its rows contain passing evidence or an approved deviation.
- **D30:** Enforce accessibility with layered executable coverage. Add focused component tests for roles, accessible names, ARIA tree/tab/dialog semantics, keyboard transitions, and focus restoration; add `@axe-core/playwright` scans for every manifest surface; and add Playwright journeys that complete creation, tree navigation, tab management, split/resize/replace, menu/dialog use, retry, and drawer use without a pointer. Separately assert 200% zoom, 320 CSS px operability, reduced-motion behavior, and 44×44 CSS px touch targets. Axe results supplement rather than replace interaction assertions, and serious/critical findings block D28 CI.
- **D31:** Test persisted project-workspace layout as an invariant-driven state machine. Use the existing `fast-check` dependency to generate open, activate, close, reorder, split, replace, resize, mobile-collapse, restore, and authorized-file-reconciliation sequences against the pure D20 transitions. Assert no duplicate tabs, no more than two panes, valid active/participant IDs, bounded sizes, deterministic close fallback, and preservation of the last valid desktop split through narrow-screen participation. Add adapter tests for schema migration, corrupt/unknown JSON, unavailable or quota-throwing storage, SSR-to-client hydration, stale/deleted/unauthorized file IDs, and authenticated user/project key isolation. Playwright proves reload restoration, cross-project isolation, and 767/768 responsive round trips using D26 fixtures.
- **D32:** Verify drag-and-drop through a layered typed-intent contract. Unit-test every D19 source × destination mapping and its rejected/cancelled cases; component-test pointer and keyboard sensor activation, announcements, focus, overlays, and dispatch; and use Playwright pointer movements plus keyboard drag flows for tab reorder, tree-file-to-tab-bar add, pane-edge split, pane-center replace, folder move, cancel/outside drop, stale or unauthorized targets, sibling-name conflicts, mutation failure, and optimistic rollback. Each operation must also pass through its menu/button equivalent and produce the same D20/D22 transition result. Coordinate assertions use semantic drop-zone IDs and outcomes, not screenshot-coordinate snapshots.
- **D33:** Test the document realtime/mirror path at unit, integration, and browser layers. Keep fast signature/event-routing unit tests; add disposable-Postgres integration tests for concurrent duplicate `ydocUpdated` delivery, D44 lease acquisition/takeover/completion/failure, provider redelivery, unknown/deleted/wrong-type rooms, and `DocumentSnapshot` upsert timestamps/content. Feed captured, version-pinned Yjs/Tiptap update fixtures through the real `withProsemirrorDocument` conversion and validate the stored JSON shape at the D21 boundary. A two-context Playwright journey proves realtime document edits, reconnect, and eventual mirror recovery using dedicated D26 Liveblocks rooms; diagnostic polling has an explicit timeout and never replaces realtime UI assertions.
- **D34:** Add a table-driven DAL integration matrix against disposable Postgres for project-file/folder authorization and namespace rules. Mock only the Clerk session boundary and stub external Liveblocks lifecycle calls; exercise real Prisma queries, transactions, constraints, and cascades. Cover authorized member success; unauthenticated/session-without-org; non-member and slug/session mismatch non-disclosure; cross-workspace/project source and destination IDs; stale/deleted folders; root and nested normalized file↔file, folder↔folder, and file↔folder conflicts; rename/move/create races; idempotent retry behavior; cascade effects; and D18 destination validation. All unauthorized existence cases return the same `NotFoundError` contract, and concurrent conflicts map through D22 without leaking database text.
- **D35:** Protect canvas collaboration with a deterministic two-context Playwright matrix using dedicated D26 rooms. Cover draw, move, and soft-delete propagation; local undo isolation after remote updates; remote updates during an active local pointer drag; disconnect/reconnect convergence; D27 pending-write tab close/switch/route unmount; two independently mounted canvas panes; tab and responsive pane transitions; pane-local error containment; and Liveblocks outage fallback from `CanvasSnapshot` without disabling the surrounding project shell. Assert scene outcomes through stable element identity/version state and visible UI—not timing alone—and bound every eventual assertion with diagnostics and cleanup.
- **D36:** Replace the current leading-capture canvas timer with an explicit latest-value trailing flush. Every `onChange` refreshes a ref holding the newest scene; at most one 100 ms timer is scheduled; the timer diffs and writes the latest ref, not the scene captured by the first callback; and D15 lifecycle teardown invokes the same idempotent flush function before clearing the timer/provider. Preserve the 10 Hz ceiling and per-element version ledger. Instrument benchmark fixtures at 100, 1,000, 3,000, and 5,000 elements so the warning thresholds and synchronization cost remain evidence-based.
- **D37:** Make the D23 cross-table sibling namespace race-safe and indexed. Add canonical `normalizedName` and non-null `directoryKey` fields to both `File` and `Folder`; derive `directoryKey` from authorized `projectId` plus parent/folder ID so project-root entries are indexable; use D45's two-phase backfill; and add per-table unique indexes on `(projectId, directoryKey, normalizedName)`. Create, rename, and move run inside a short transaction that takes deterministic directory-scoped Postgres advisory transaction locks, checks both tables, validates destination rules, and writes. Lock source/destination keys in sorted order for moves to avoid deadlocks; D43 separately serializes the folder topology graph. The database migration and D34 concurrent-race tests ship with the UI work; no shared `DirectoryEntry` model is introduced.
- **D38:** Replace the project route's sequential `getProject()` plus `listProjectContents()` calls with one authorized `getProjectWorkspace()` DAL read that returns only project metadata and file/folder metadata—never snapshots or Liveblocks state. Build parent/child lookup maps in O(n), sort siblings once, and render only roots plus expanded branches so collapsed descendants do not inflate the DOM. Keep the complete metadata set client-side for local tabs and DnD; add a measured large-project fixture before introducing virtualization, search, or pagination that would change the approved interaction.
- **D39:** Enforce editor bundle and connection isolation. The Server Component shell/file tree must not import Excalidraw, Tiptap, Yjs, or Liveblocks client modules. The exhaustive D21 editor router loads canvas and document client chunks independently; opening one file type must not download the other editor. Reuse one feature-level Liveblocks client configuration while giving each visible pane its own room/provider, and retain D15's hard maximum of two mounted realtime editors. Add bundle-graph assertions and connection-count tests for empty, one-pane, split, tab-switch, and mobile-collapse states.
- **D40:** Establish the executable performance-acceptance contract before UI implementation, then capture each production baseline when its owning path first exists. T0 freezes the pinned measurement environment, representative fixture definitions, metrics, sample/stability method, invariant checks, owner task, baseline/budget evidence fields, and the rule that missing evidence blocks the owning task. T4–T8/T10 record the first real baseline and derive absolute budgets in that same pinned CI environment for their production paths using representative fixtures (200 projects; 2,000 nested entries; 20 open tab identities; two visible editors; canvases at 100/1,000/3,000/5,000 elements). Project workspace database query count must remain constant with entry count; collapsed tree DOM grows with visible rows, not total descendants; opening a canvas/document adds only its own editor chunk and one room connection; tab/drag/resize interactions avoid workspace-wide rerenders; and CI fails on a statistically stable regression greater than 20% from the frozen baseline or any invariant/bundle-isolation violation. No absolute budget may be invented before its production path is measurable, and no owner task may pass with its required baseline/budget evidence missing.
- **D41:** Centralize external room teardown in a bounded-concurrency, best-effort lifecycle helper reused by file, folder, project, and Clerk `organization.deleted` workspace deletion. Derive every room ID from file ID, deduplicate, process at a small fixed concurrency (default 5), collect/log per-room failures with operation context, then follow the locked deletion policy before Postgres cascades. Never issue one serial network round trip per file or an unbounded `Promise.all`. Unit tests prove empty, duplicate, partial-failure, concurrency-cap, and large-list behavior; DAL/webhook integration tests prove the correct file IDs are selected before cascades and organization deletion never silently skips room cleanup.
- **D42:** Give every visible editor an authorized no-store bootstrap boundary separate from D38's metadata-only workspace read. `getAuthorizedEditorBootstrapByRoomId()` resolves the strict deterministic room ID through the active Clerk organization and a file→project→workspace join, validates D21 file type, and returns only that file's metadata plus type-appropriate `CanvasSnapshot` or `DocumentSnapshot`. Embedded panes fetch bootstrap data only when they become visible; `/canvas/[roomId]` must use this boundary and never pass an unchecked URL room ID directly to `CanvasRoom`. Initial provider outage renders a stale-labeled read-only snapshot, successful connection replaces it with authoritative Liveblocks state, and cross-workspace/unknown/deleted rooms return non-disclosing not-found. No snapshot is included in the project tree payload.
- **D43:** Serialize every folder topology mutation with one deterministic project-scoped Postgres advisory transaction lock. Folder create, move, and delete acquire that lock before reading/validating the graph; folder move then performs its recursive ancestry check and row update in the same transaction, while D37 directory locks protect source/destination names. This prevents concurrent `A → B` and `B → A` moves from both validating the old graph and committing a cycle. Add concurrent cross-parent, move-vs-delete, move-vs-create, deep-tree, and lock-timeout regression tests; return a safe retryable mutation error on lock timeout.
- **D44:** Replace binary `ProcessedWebhook` deduplication for both Liveblocks and Clerk routes with a durable processing/completed lease. Persist source-scoped event identity, `status`, `leaseUntil`, `attemptCount`, `completedAt`, and timestamps. Claim logic distinguishes unique conflict from infrastructure failure; creates a processing lease for a new event; returns success only for completed events or a concurrently active lease; atomically takes over an expired lease; processes idempotently; and marks completed only after all effects commit. On processing failure, expire/release the lease and return `500`; if that update fails, lease expiry still permits takeover. Test claim-write failure, active duplicate, concurrent delivery, processing failure, release failure, stale-lease takeover, completion-write failure, and replay after completion. Never convert an arbitrary database exception into `Already processed`.
- **D45:** Define canonical sibling-name normalization and migrate without modifying user data silently. Store the display name as trimmed Unicode NFKC; derive `normalizedName` by applying the same NFKC+trim and deterministic `toLocaleLowerCase("en-US")`; reject empty results, control characters, `/`, and `\\`; preserve internal whitespace. Use an expand/validate/contract migration: add nullable key columns and backfill in batches; generate a deterministic collision report across the union of File and Folder for exact, case, whitespace-edge, Unicode-compatibility, root, and nested collisions; abort before constraints if any collision exists; require an explicit reviewed rename map in a follow-up data-fix migration; then set non-null constraints/indexes. Rehearse forward migration and restore on a production-shaped sanitized fixture and prove Prisma migration drift checks retain the raw indexes.

## Interaction State Coverage

| Feature | Loading | Empty | Error | Success | Partial / degraded |
|---|---|---|---|---|---|
| Workspace project list | Preserve shell dimensions; show quiet card-shaped skeletons in the content region | Warm `No projects yet` message, one-sentence context, primary `New project` action | Keep shell/navigation available; show an inline retry panel in the content region | Project cards with names, updated times, and a new-project card | Render only Postgres metadata; never wait on Liveblocks status or presence |
| Project file tree | Render the fixed rail/tree structure with neutral row skeletons | Keep project name and tree actions visible; state that files created here stay within this project | Preserve editor and tabs; show retry beside the failed tree region | Hierarchical folders/files with active and open-file states | Keep loaded nodes interactive and mark the affected subtree unavailable |
| Editor tabs | Keep the bar stable; show loading label only on the opening tab | Show the guided `Start this project` editor state | Failed tab remains open with retry and close actions | Active/inactive tabs, close controls, file-type icons, and unsaved/sync state | One failed tab or pane must not replace the other working pane |
| Canvas pane | Excalidraw-sized loading surface with a restrained status message; no layout jump | New canvas opens with native Excalidraw empty scene | Pane-level failure with retry/back action | Native Excalidraw canvas with Liveblocks synchronization | On Liveblocks outage, show last mirrored snapshot read-only with a persistent outage banner |
| Document pane | Editor-shaped loading skeleton | New document opens as a blank editable document with visible title context | Pane-level failure with retry/back action | Tiptap document editor and its own sync status | Connection loss affects only the pane status; preserve readable content where possible |
| Create project/file/folder | Disable submit, preserve entered values, and replace action label with a progress label | Not applicable | Inline message tied to the form; focus the summary or invalid field | Close/reset the form and reveal/open the created item | Duplicate-name or validation errors preserve every valid field value |

### Error containment rules

- A tree-loading failure must not unmount an already-open editor.
- A canvas or document failure must stay within its pane and expose `Retry` and `Close tab` actions.
- In split view, the healthy pane remains editable when the other pane fails.
- A mutation error preserves the user's entered name/type and returns focus to the relevant message or field.
- Full-page error handling is reserved for failures that prevent workspace authorization or metadata resolution entirely.

## User Journey and Emotional Arc

| Step | User does | Intended feeling | Plan support |
|---|---|---|---|
| 1 | Opens a workspace | Oriented within five seconds | Stable rail/sidebar landmarks, workspace breadcrumb, plain `Projects` heading, and one blue primary action |
| 2 | Scans existing projects | Confident about where work lives | Project names dominate cards; updated timestamps remain secondary; no realtime dependency blocks the list |
| 3 | Creates or opens a project | In control, not trapped in setup | Existing projects open directly; an empty project offers explicit canvas/document choices without a forced tour |
| 4 | Opens files | Fast and predictable | File selection creates or activates a tab; a one-time contextual hint appears only after multiple-tab behavior becomes relevant |
| 5 | Uses split view | Capable without learning a new mode | The split control appears in the tab bar; a one-time hint explains independent panes when split first becomes available |
| 6 | Collaborates or loses connection | Reassured that state is visible | Per-pane sync, presence, and clear degraded/read-only messaging show what is safe |
| 7 | Returns repeatedly | Familiar and efficient | Stable landmarks, remembered open-file state where technically safe, keyboard navigation, and no repeated onboarding interruptions |

### Time-horizon requirements

- **First 5 seconds:** product, workspace, page, project collection, and primary action are identifiable without reading helper copy.
- **First 5 minutes:** users can create a project, create/open both file types, switch tabs, enter split view, and recover from a mistake.
- **Long-term use:** navigation locations remain stable; repeated guidance stays dismissed; dense project/file collections remain scannable; collaboration and failure status remains trustworthy.

### Contextual guidance

- The empty project state explains that canvases and documents are independent file types.
- After the second file is opened, show a single dismissible hint that files remain available as tabs.
- When two compatible tabs exist, the split action may show a one-time anchored hint explaining independent panes.
- Persist dismissal in local client preferences only; guidance state is not server data and must not affect collaborators.

## Visual Direction and Anti-Slop Constraints

This is a calm, task-focused application workspace. It must not inherit the current dark industrial telemetry treatment, and it must not drift into a generic dashboard-card mosaic.

### Required visual language

- Geist is the primary interface typeface; Geist Mono is reserved for technical metadata where it improves scanning.
- Use the finalized light palette: `#F8FAFC` application background, white navigation/cards, `#1E293B` primary ink, `#64748B` secondary ink, `#94A3B8` tertiary ink, `#E2E8F0` dividers, `#2563EB` primary accent, `#EFF6FF` selected/soft accent, and semantic green/amber/red only for real status.
- Project cards may use restrained borders and shadows because each card is the project-selection interaction. Other areas use layout, dividers, and typography rather than nested decorative cards.
- Preserve the native Excalidraw toolbar and canvas rendering. LiveFlows chrome frames it but does not restyle its tools.
- Use one controlled inline SVG family: 1.5–1.75px stroke, `currentColor`, 16px default, 18px primary navigation, decorative paths hidden from assistive technology when adjacent text already names the action.
- Keep motion functional: 120–180ms color/shadow transitions, subtle project-card lift, and no animated decoration. Respect `prefers-reduced-motion`.

### Explicit rejections

- No dark `#0E1117` application shell, orange `#FF9E00` primary accent, terminal headings, telemetry strips, or uppercase utility copy carried over from the current UI.
- No purple/indigo gradients, decorative blobs, colored icon circles, emoji navigation, generic three-column feature grids, ornamental dashboards, or identical large-radius containers around every section.
- No cards inside cards in the project workspace. File tree, tabs, panes, and top bars are structural regions separated by borders.
- No marketing copy in authenticated app screens. Labels orient, report status, or name actions.

### App UI litmus

| Check | Required result |
|---|---|
| Product and location unmistakable in first screen | Yes |
| One primary visual anchor | Current project collection or active file content |
| Screen understandable by scanning labels/headings | Yes |
| Each region has one job | Yes |
| Cards necessary | Only for selectable project objects |
| Motion improves hierarchy | Yes, and never required to understand state |
| Design works without decorative shadows | Yes |

## Design System Extraction

The first implementation task creates `DESIGN.md` and converts the repeated values in the finalized HTML into a reusable contract.

`DESIGN.md` must define:

- Color tokens and their semantic roles, including foreground/background pairs and state colors.
- Geist/Geist Mono roles, type sizes, weights, and line heights.
- A 4px-derived spacing scale used by rail, sidebars, top bars, cards, forms, tabs, and panes.
- Border, shadow, and radius rules, including where cards are and are not appropriate.
- Inline SVG icon construction, sizes, accessible naming, and active/inactive color behavior.
- Component vocabulary: app rail, workspace sidebar, file tree, top bar, breadcrumb, project card, tab bar, editor pane, status pill, presence stack, empty state, inline error, modal/dialog, and form controls.
- State language for loading, empty, error, success, warning, disconnected, read-only, and destructive actions.
- Responsive behavior and accessibility requirements from this plan.
- Rejected patterns from the anti-slop section.

Application styling should consume semantic CSS variables exposed through Tailwind v4 rather than repeating raw hex values throughout JSX. Raw values remain acceptable only when required by an embedded third-party surface and documented locally.

## Responsive and Accessibility Specification

### Viewport behavior

| Viewport | Workspace project list | Project workspace | Focused canvas |
|---|---|---|---|
| `>= 1280px` | 72px rail, 240px sidebar, three-or-more project columns as space permits | 72px rail, 240px file tree, full tab bar, single/split editors | Minimal 56px top bar and full remaining canvas |
| `768–1279px` | 56px compact rail, collapsible 220px sidebar, two project columns | 56px compact rail, collapsible 220px file tree, tab overflow controls | Compact breadcrumb and collaboration controls; canvas keeps priority |
| `< 768px` | 56px top bar, contextual drawer, one project column | 56px top bar, file tree in the same contextual drawer, horizontally scrollable tabs, one visible editor pane | 56px top bar with truncated breadcrumb, compact status, overflow menu, and full-width canvas |

### Mobile navigation drawer

- The top-bar menu opens one modal drawer. On workspace routes it contains global/workspace navigation; inside projects it opens the project file tree with a secondary route back to workspace navigation.
- Opening the drawer traps focus, labels the dialog and close action, and prevents background scrolling.
- Closing returns focus to the menu trigger. `Escape` closes it.
- Selecting a destination closes the drawer and moves focus to the new page heading or active editor context.

### Accessibility baseline

- Body text is at least 16px where prose is read; compact utility metadata may be smaller only when contrast and zoom behavior remain usable.
- Text contrast meets WCAG AA: 4.5:1 for normal text and 3:1 for large text and essential UI graphics.
- Pointer targets are at least 44×44px on touch layouts. Closely packed desktop tabs may use smaller visible icons only when the clickable tab/close target remains keyboard accessible and sufficiently separated.
- Visible focus rings use the blue accent with enough offset to remain clear against white and pale-blue surfaces.
- Use landmarks for header, navigation, main content, and complementary file navigation.
- Every icon-only action has an accessible name and tooltip; icons adjacent to an equivalent text label are hidden from assistive technology.
- Form inputs keep visible labels after values are entered. Placeholder text is supporting copy, never the only label.
- Status is never encoded by color alone: sync, warning, disconnected, and error states include text and/or shape.
- Links preserve a distinguishable visited state where repeated navigation history matters, especially project/file links rendered as links.

### Keyboard interaction

- Rail/sidebar/file-tree links follow normal tab order; arrow-key tree navigation follows the ARIA tree pattern when nested folders are interactive.
- Tabs follow the ARIA tabs pattern: arrow keys move focus, `Home`/`End` jump, `Enter`/`Space` activate when activation is manual, and the close action remains separately reachable.
- Split-pane separators are keyboard adjustable, expose current size, and provide an accessible label.
- Drag/drop always has an equivalent menu or button flow; no file, tab, or split operation depends on pointer dragging.
- Modals/dialogs trap focus, support `Escape` where safe, and return focus to their trigger.

### Split behavior across viewports

- At `>= 768px`, split view may display two independently editable panes with an adjustable separator.
- Below 768px, only one participating file is visible; the tab bar switches the visible file.
- Changing viewport width must not close tabs, discard unsaved local editor state, or destroy the stored split relationship.
- Returning to `>= 768px` restores the prior two-pane arrangement and last divider position within valid minimum widths.

## Client Workspace State

- Use a project-scoped Zustand vanilla store/provider with a versioned persisted workspace-layout slice; do not put files, project metadata, editor content, or Liveblocks canvas elements in Zustand. The existing global UI store remains independent.
- Scope keys by authenticated user ID and project ID so shared browsers and organization switches cannot leak another user's layout.
- Persist only open file IDs in order, active file ID, optional left/right split file IDs, mobile-visible participant, and divider ratio.
- On hydration, intersect stored file IDs with the authorized project contents returned by the server. Remove deleted, moved-out, or unauthorized IDs before rendering tabs.
- If the active file is invalid, select the nearest remaining stored tab; if none remain, show the guided empty editor state.
- Clamp divider ratios to accessible pane minimums and migrate or discard unknown state versions without blocking project load.

## Creation Interaction

- The file-tree `New file / folder` action opens an accessible menu containing `New canvas`, `New document`, and `New folder`.
- Choosing an item opens one focused dialog with a persistent visible name label and destination selector. The current tree folder is preselected when invoked from its context menu.
- Submit disables only while the action is pending. Validation and duplicate-name errors preserve values and keep the dialog open.
- On success, insert the authorized server result into the refreshed tree, open newly created files as the active tab, expand parent folders as needed, and return focus to the created node or active editor.
- Folder creation selects and reveals the folder but does not open an editor tab.
- Provide equivalent context-menu actions on writable folders without making right-click the only entry point.

## Functional-Control Rule

- Every visible navigation item and action must have a working destination or immediate behavior.
- Omit prototype-only controls without collapsing the structural regions they established. For example, the bottom rail area may contain only the working user/account control until alerts/settings exist.
- Do not render disabled navigation as decoration and do not add `Coming soon` tooltips.
- When a future feature is implemented, add it through the component slot and interaction rules documented in `DESIGN.md`.

## Workspace Interaction Model

### File tree

- Build the tree from the server-authorized `files` and `folders` returned by `listProjectContents`; do not fetch project data in a client effect.
- Folders disclose/collapse, expose their nesting level, and use deterministic ordering: folders before files, then locale-aware name ordering unless an existing product order is introduced later.
- Selecting a file opens or activates its tab. Folder selection toggles disclosure without creating a tab.
- Long names truncate visually but expose the full name on focus/hover and to assistive technology. The tree must remain usable with 47-character names and deep nesting.
- Rename, move, and delete actions remain available through an accessible context/action menu when the existing server actions support them.

### Tabs

- Tabs represent open files, never view modes. Each file ID appears at most once in the open-tab sequence.
- The active tab uses a white surface, strong ink, and blue bottom indicator; inactive tabs use the pale slate tab-bar surface.
- Reordering tabs changes client state only. Closing a tab never deletes the file.
- The tab bar scrolls horizontally before compressing labels below their usable minimum. It exposes an overflow affordance when tabs are off-screen.
- Dirty/sync state belongs to the file editor integration and must be conveyed through text or an accessible state, not color alone.

### Split view and drag/drop

- One dnd-kit provider coordinates the file tree, tab bar, and editor panes. Drag payloads identify source kind (`tree-file`, `tree-folder`, or `tab`) plus stable file/folder ID; drop targets identify intent (`folder`, `tab-index`, `tab-bar`, `pane-center`, `pane-left-edge`, or `pane-right-edge`).
- The coordinator converts a validated drop into exactly one pure workspace-layout action or one DAL mutation; presentation components do not mutate layout or server data directly.
- The explicit split action is always the keyboard/touch fallback and opens the active file beside a chosen open file.
- Drag a tree file or tab to a pane edge to create/replace the corresponding split side; drag to pane center to replace that pane; drag to empty tab-bar space to open as a normal tab.
- Show unambiguous drop targets only while dragging. Canceling a drag leaves layout unchanged.
- Maximum simultaneous visible panes is two. Additional open files remain tabs.
- Each pane has its own file header, sync/status area, error boundary, and editor instance. A shared tab bar controls the open set; active-pane focus determines which tab/editor commands apply.

## Editor Pane Integration

- Add a file-type router inside the project workspace: `canvas` mounts `CanvasRoom`; `document` mounts the Tiptap/Liveblocks document editor required by the locked stack.
- Before writing Tiptap, Liveblocks, or Excalidraw integration code, query Context7 and the repository's installed Next.js 16 documentation because these APIs are version-sensitive.
- Do not mount all open editors at once. Mount the one or two visible panes and preserve only safe editor-local state for inactive tabs.
- Visible-pane teardown is an explicit editor lifecycle boundary: canvas clears and flushes its 100ms pending timer before its `RoomProvider` leaves; document teardown follows the supported Liveblocks Tiptap provider lifecycle. Switching tabs never waits on a blocking synchronization screen.
- Canvas and document files remain independent. Split view never implies generated or synchronized content between them.
- Keep Excalidraw's native toolbar and canvas chrome untouched. Move LiveFlows sync, presence, storage warning, and outage UI into the pane/header treatment shown by the finalized design.
- The document editor uses the planned `@liveblocks/react-tiptap` path and a custom LiveFlows toolbar; do not introduce BlockNote or a second realtime backend.
- Document collaboration writes only to the Liveblocks Yjs document. The `ydocUpdated` webhook performs the eventual Postgres mirror upsert; client components never write `DocumentSnapshot` directly.

## Engineering Architecture and Data Flow

### Project workspace read and client lifecycle

```text
GET /w/:workspaceSlug/p/:projectId
  |
  v
Server Component
  |
  +--> getProjectWorkspace(slug, projectId)
  |      |
  |      +--> Clerk auth() -> authoritative userId/orgId
  |      +--> requireWorkspace() -> membership/non-disclosure
  |      +--> one metadata-only Prisma read
  |              project + folders + files (no snapshots, no Liveblocks)
  |
  +--> runtime FileType guard
  |      +--> canvas | document
  |      `--> unknown -> pane-local unsupported-file state
  |
  `--> ProjectWorkspaceProvider(userId, projectId, authorized file IDs)
         |
         +--> migrate/reconcile versioned local layout
         +--> O(n) tree indexes + visible expanded rows
         +--> tabs + active pane(s), maximum 2
         `--> lazy editor router
                +--> canvas chunk -> RoomProvider(file_<id>)
                `--> document chunk -> RoomProvider(file_<id>)
```

### Mutation and directory namespace pipeline

```text
dialog | menu | pointer DnD | keyboard DnD
  |
  v
typed Server Action input
  |
  +--> schema/name/type validation ----------> typed field error
  +--> unstable_rethrow(control-flow errors)
  `--> DAL resolves Clerk session + membership
         |
         +--> authorize project/source/destination
         +--> begin short DB transaction
         +--> for topology mutation: lock project graph
         +--> lock sorted directoryKey(s)
         +--> check File + Folder normalized namespace
         +--> validate folder cycle when applicable
         +--> mutate row(s)
         `--> provision/decommission external room when required
                |
                +--> success -> revalidate -> typed success -> reconcile UI
                `--> failure -> compensate/best-effort policy -> safe typed error
```

### Realtime editors and read mirrors

```text
Canvas pane                                   Document pane
Excalidraw onChange                          Tiptap/ProseMirror edit
  -> latest-scene ref                          -> Liveblocks Yjs document
  -> trailing flush <= 10 Hz                         |
  -> diff by version -> LiveMap                      |
         |                                           |
         +------------- Liveblocks -----------------+
                              |
                  storageUpdated | ydocUpdated
                              v
                    verified webhook lease claim
                              |
            +-----------------+------------------+
            |                                    |
      fetch room storage                 withProsemirrorDocument
            |                                    |
      CanvasSnapshot upsert              DocumentSnapshot upsert
            |                                    |
            +---------- Postgres mirror ---------+
                              |
                    read-only outage/search/agent path

On processing failure: expire/release lease -> return 500 -> provider retry/takeover.
Liveblocks remains the authoritative write path; Postgres never becomes editor authority.
```

Visible editor bootstrap stays separate from the metadata read:

```text
visible pane or /canvas/:roomId
  -> getAuthorizedEditorBootstrapByRoomId(roomId) [no-store]
     -> strict room ID -> file ID
     -> active Clerk org + file/project/workspace authorization
     -> FileType guard
     -> canvas snapshot | document snapshot
        + provider connects -> authoritative Liveblocks content
        ` provider unavailable -> stale-labeled read-only snapshot
```

### Workspace layout state machine

```text
authorized files + persisted vN state
              |
       migrate + reconcile
              v
  EMPTY <--- close last tab
    |
 open/activate
    v
 SINGLE(active file) <---- mobile projection ---- SPLIT(left, right, ratio)
    |   ^                                             ^   |
    |   +---- close/replace/collapse -----------------+   |
    +-------- split/drop/explicit action -----------------+

Invariants: unique open IDs; valid active IDs; <=2 visible panes; bounded ratio;
inactive tabs have no editor/provider; mobile changes participation, not saved desktop split.
```

Implementation should retain short versions of the mutation/lock diagram beside the shared namespace transaction helper, the trailing-flush diagram beside the canvas scheduler, and the layout-state diagram beside `workspace-state.ts`. Updating those diagrams is part of any later behavior change.

## Test Coverage Map

```text
CODE PATHS                                             USER FLOWS
[+] T0 fidelity manifest                              [+] Reference approval
  +-- [★★★ PLANNED] valid hashes/schema/env             +-- [★★★ PLANNED] baseline -> capture -> diff -> approve
  `-- [★★★ PLANNED] changed/missing dependency fails    `-- [★★★ PLANNED] deviation blocks merge [->E2E]

[+] Workspace/project Server Components              [+] Navigate and create
  +-- [★★ EXISTING] member + populated project list     +-- [★★★ PLANNED] empty -> create project -> open
  +-- [★★★ PLANNED] empty/loading/inline error           +-- [★★★ PLANNED] create canvas/document/folder [->E2E]
  +-- [★★★ PLANNED] non-member -> NotFound               `-- [★★★ PLANNED] slow/fail/retry with shell retained
  `-- [★★★ PLANNED] one metadata read + large tree

[+] File/folder mutations                            [+] Organize project
  +-- [★★★ PLANNED] invalid/duplicate/cross-project      +-- [★★★ PLANNED] pointer + keyboard/menu equivalents
  +-- [★★★ PLANNED] concurrent namespace/migration race  +-- [★★★ PLANNED] cancel/stale/conflict/rollback [->E2E]
  +-- [★★★ PLANNED] project topology + directory locks   `-- [★★★ PLANNED] delete subtree/project/workspace with partial room failure
  `-- [★★★ PLANNED] typed safe error / control rethrow

[+] Pure workspace state                             [+] Tabs and responsive splits
  +-- [★★★ PLANNED] generated transition invariants      +-- [★★★ PLANNED] open/dedupe/close/reorder/split/replace
  +-- [★★★ PLANNED] corrupt/versioned/quota storage       +-- [★★★ PLANNED] reload + user/project isolation [->E2E]
  `-- [★★★ PLANNED] stale IDs + hydration                `-- [★★★ PLANNED] 767/768 collapse and restore [->E2E]

[+] Editor router and canvas                         [+] Collaborative canvas
  +-- [★★★ PLANNED] authorized bootstrap + type guard     +-- [★★★ PLANNED] two-client draw/move/delete [->E2E]
  +-- [★★ EXISTING] element merge/version rules          +-- [★★★ PLANNED] undo/pointer gate/reconnect
  +-- [★★★ PLANNED] latest trailing + lifecycle flush    `-- [★★★ PLANNED] outage mirror + pane isolation
  `-- [★★★ PLANNED] bundle/connection count

[+] Document + webhooks                              [+] Collaborative document
  +-- [★★ EXISTING] signature/replay routing mocks       +-- [★★★ PLANNED] two-client edit/reconnect [->E2E]
  +-- [★★★ PLANNED] Yjs -> ProseMirror JSON              `-- [★★★ PLANNED] eventual mirror recovery
  `-- [★★★ PLANNED] lease race/fail/expire/takeover/complete

[+] Accessibility + responsive UI                    [+] Complete workspace without a pointer
  +-- [★★★ PLANNED] roles/names/axe/focus                +-- [★★★ PLANNED] tree/tab/split/dialog/drawer [->E2E]
  +-- [★★★ PLANNED] zoom/reduced motion/touch size       `-- [★★★ PLANNED] 320px + 200% zoom recovery
  `-- [★★★ PLANNED] all manifest state screenshots [->E2E]

Legend: ★★★ behavior + edge + error | ★★ happy path | [->E2E] integrated browser proof
Current coverage is partial for 4 of 7 path families; this plan closes every mapped branch family.
Prompt/LLM changes: none; no eval suite is required.
```

Named test ownership:

- Pure/state: `src/features/project-workspace/*.test.ts`, including `workspace-state.property.test.ts` and drag-intent tests.
- Component: co-located shell/tree/tab/pane/dialog/document/canvas tests in Vitest jsdom.
- DAL/integration: `src/server/dal/__tests__/project-workspace.integration.test.ts` against disposable Postgres.
- Webhook/integration: `src/app/api/webhooks/liveblocks/__tests__/route.integration.test.ts` with captured Yjs fixtures.
- Browser: `e2e/workspace-journeys.spec.ts`, `e2e/workspace-accessibility.spec.ts`, `e2e/canvas-collaboration.spec.ts`, `e2e/document-collaboration.spec.ts`, and `e2e/final-light-saas.visual.spec.ts` using D26 fixtures.
- Fidelity tooling: focused schema/hash/capture tests for `docs/specs/final-light-saas-fidelity-manifest.json`.

## Performance and Capacity

| Concern | Plan constraint | Proof |
|---|---|---|
| Project metadata | One authorized metadata-only DAL read; query count does not grow with entry count | Prisma query-count integration test at 0/100/2,000 entries |
| Tree construction | O(n) lookup maps; sort each sibling group once; render expanded rows only | render benchmark and DOM-row invariant |
| Workspace rerenders | Project-scoped selectors; pure transitions; editor-local status | React render counter/profile fixture for tab, drag, resize |
| Editor JavaScript | Canvas and document are separate lazy chunks; neither loads for empty workspace | build/bundle graph assertion |
| Realtime connections | Only one/two visible panes mount providers | connection-count browser instrumentation |
| Canvas writes | Latest trailing scene, maximum 10 Hz, version diff, final lifecycle flush | fake-timer unit test plus 100–5,000 element benchmark |
| Webhook work | Durable source-scoped lease, one room export/fetch, one upsert; retry/takeover on failure | concurrency/lease integration tests and timing diagnostics |
| Room deletion | Deduplicated IDs, fixed concurrency 5, aggregated failures | scheduler unit tests and subtree integration fixture |
| Regression policy | Frozen pinned-environment baseline; >20% stable regression fails | repeated baseline/implementation CI samples |

Do not add caching for per-user project workspace metadata in this phase: authorization and mutation freshness matter more, and the indexed single read is the simpler baseline. Do not add tree virtualization until the 2,000-entry fixture proves expanded-row rendering misses its budget; virtualization is a measured response, not a speculative dependency.

## Production Failure Modes

| Codepath | Realistic failure | Test | Handling | User-visible result |
|---|---|---|---|---|
| Fidelity manifest/capture | Reference/font/browser hash changes | T0 validator + CI | Stop before capture | Explicit invalid-baseline report |
| Workspace read | DB timeout or membership mismatch | DAL/component/E2E | Regional error or NotFound | Retry panel or non-disclosing 404 |
| Persisted layout | Corrupt/stale/foreign-user local state | D31 unit/E2E | Discard/reconcile to safe state | Valid empty/single workspace, no crash |
| Name migration/mutation | Existing or concurrent normalized-name collision | D34/migration integration | Abort migration or directory lock + typed conflict | Collision report or recoverable conflict; no silent rename |
| Folder topology | Concurrent cross-parent moves form a cycle | D43 integration | Project graph lock + in-transaction ancestry check | Safe retryable mutation error |
| Folder move | Destination is descendant/stale/foreign | D34/D32 | Reject before update | Recoverable pane/tree message |
| Room provision | Liveblocks succeeds/fails around DB create | DAL lifecycle tests | Locked create/compensation policy | Safe mutation error; no half-visible file |
| Room teardown | Some external deletes time out | D41 unit/integration | Bounded best-effort, aggregate logs | Deletion completes per locked policy; no raw error |
| Canvas throttle | Last drag scene is pending at unmount | D27/D35 | Shared synchronous trailing flush | No lost final edit |
| Editor bootstrap | URL room is foreign/deleted or provider is initially down | D42 DAL/E2E | Authorized no-store lookup and typed snapshot fallback | NotFound or stale-labeled read-only pane, then live recovery |
| Canvas collaboration | Disconnect or remote update during drag | D35 | Pointer buffer/reconnect/mirror fallback | Pane status; healthy shell/pane remains usable |
| Document collaboration | Yjs provider disconnects | D33 E2E | Provider reconnect; readable snapshot/local state | Pane-local status and retry/recovery |
| Mirror webhook | Worker dies or completion/release write fails | D33/D44 integration | Expiring lease, 500, stale takeover | Editor unaffected; mirror eventually catches up |
| Unknown file type | Historical/corrupt stored value | D21 component | Exhaustive guard | Pane-local unsupported-file error |
| DnD mutation | Target becomes stale or server rejects | D32 all layers | Validate, typed error, rollback | Clear message; layout/tree restored |
| Split pane | One editor throws or chunk fails | component/E2E | Pane error boundary | Retry/close in failed pane; other pane works |
| Accessibility/responsive | Focus lost after drawer/tab removal | D30 E2E | Deterministic focus fallback | Keyboard user remains oriented |
| Visual CI | Dynamic content causes unstable pixels | repeated stability test | Freeze/mask only approved raster noise | Actionable diff/trace artifact |

No mapped failure is silent without both handling and a test. Unexpected server details are logged with operation context and never returned to the browser.

## Parallel Implementation Strategy

T0 is a hard shared preflight. After it passes, use coordinated worktrees with small integration checkpoints:

| Step | Modules touched | Depends on |
|---|---|---|
| T0 fidelity preflight | `docs/specs/`, capture/test tooling | — |
| T1 design system | root design docs, `src/app/`, `src/components/ui/` | T0 |
| T2 shell | `src/app/(app)/`, navigation components | T1 |
| T3 workspace list | workspace route, project components | T1, T2 contracts |
| T4 state | `src/features/project-workspace/`, project store | T0 |
| T5 file navigation/data | project route/components, DAL, Prisma | T0, D37 migration contract |
| T6 tabs/split/DnD | `src/features/project-workspace/` | T4, T5 view model |
| T7 document/editor routing | document feature, webhook, editor router | T4, T5 room/view model |
| T8 canvas integration | canvas feature, editor pane chrome | T6 router contract |
| T9 accessibility/states | shell/project components, E2E | T2–T8 stable contracts |
| T10 fidelity/CI | E2E, Playwright, CI | T1–T9 |

Parallel lanes:

```text
Gate:   T0
         |
Wave 1: Lane A T1 -> T2 -> T3       Lane B T4       Lane C T5 schema/DAL
                         \              |              /
Wave 2:                  merge contracts -> T6 + T7 in separate worktrees
                                              \       /
Wave 3:                                      T8 -> T9
                                                  |
Final:                                           T10
```

- Launch T1, T4, and the schema/DAL portion of T5 after T0; they touch distinct primary modules.
- T6 and T7 may run in parallel only after the shared `FileType`, workspace-state, mutation-result, and editor-router interfaces are merged.
- T2/T3 share shell and workspace components and stay sequential. T6/T8 share pane contracts; merge T6 before T8. T9/T10 are integration gates and stay sequential.
- Conflict flags: T4/T6 both touch `src/features/project-workspace/`; T5/T7 both touch file view models and room lifecycle; T7/T8 both touch the editor router. Do not run each flagged pair concurrently before its shared contract lands.

## What Already Exists

- Geist and Geist Mono are already loaded through `next/font/google` in `src/app/layout.tsx`.
- `src/app/globals.css` already exposes Tailwind v4 theme variables, but its dark industrial values must be replaced with semantic Light SaaS tokens.
- `src/components/app-nav.tsx` already integrates Clerk organization switching and signed-in account controls; preserve that behavior while replacing its structure and styling.
- `src/components/project-list.tsx`, `create-project-modal.tsx`, and `delete-project-dialog.tsx` already own working project actions and tests.
- `src/server/dal/files.ts`, the project DAL, and project page already provide server-authorized file/folder data and actions. Keep Prisma access inside the DAL.
- `src/server/liveblocks.ts` already centralizes `roomIdForFile`; reuse it for every file type instead of constructing room strings in client components. Update project deletion to select file IDs and derive every room ID, including documents.
- `src/features/canvas/canvas-room.tsx` already owns Liveblocks/Excalidraw synchronization, fallback snapshots, presence count, storage warnings, and disconnected read-only behavior.
- `src/stores/ui.ts` already owns small application-shell state. Reuse it for shell concerns only; D20 deliberately moves project tabs/splits into a project-scoped vanilla store/provider instead of extending this global store.
- `docs/specs/0001-multi-file-projects.md` already locks the one-type-per-file model and identifies tabs/splits as client UI layered over the file tree.
- The three finalized HTML screens are approved visual references; this plan supplies the missing production states, accessibility, and responsive rules.

## NOT in Scope

- Marketing/landing-page redesign. This plan covers authenticated workspace, project, and file/canvas UI only.
- Home, Starred, Members, Alerts, Settings, Share, or other prototype-only destinations without current behavior. Their shell slots are reserved, not implemented.
- Liveblocks presence or sync queries from the Postgres-backed workspace project list.
- More than two simultaneously visible editor panes.
- Cross-device or server-synchronized personal tab/split layout.
- A file that combines document and canvas content, or AI-generated synchronization between two files.
- Restyling Excalidraw's internal toolbar, drawing controls, or canvas rendering.
- Images on canvas, project thumbnails, named version history, comments, and notifications.
- New component or icon libraries. Use Tailwind v4, focused local components, Clerk's existing components, and inline SVG.

## Implementation Sequence

0. **Freeze the executable contract.** Complete T0's state-level manifest, pinned fonts/browser/runtime, deterministic fixture contract, approved-reference baseline captures, D40 measurement/budget contract with explicit owner-task gates, and CEO/design-owner preflight approval. No UI implementation starts before this gate. Production-path D40 baselines are recorded by T4–T8/T10 when their owning paths first exist; each owner task remains blocked until its required baseline and derived absolute budget evidence is present.
1. **Codify the system.** Create `DESIGN.md`; replace dark root tokens with semantic Light SaaS variables; add focused primitives for icons, buttons, statuses, empty/error panels, dialogs, and layout regions.
2. **Build the responsive shell.** Reshape the authenticated layout into rail/sidebar/content regions, preserve Clerk controls, and add the compact mobile top bar/contextual drawer.
3. **Match the workspace list.** Rebuild project hierarchy and cards from Postgres metadata only; implement loading, empty, error, and new-project states.
4. **Lock the data and state foundations.** Ship the indexed directory namespace migration, authorized project-workspace read, pure workspace transitions, versioned scoped persistence, and stale-ID reconciliation with their integration/property tests.
5. **Build the project file workspace.** Replace the manifest/cards with file tree, creation menu/dialog, tab bar, guided empty state, local error boundaries, and bounded lifecycle handling.
6. **Add split and drag/drop interactions.** Implement two-pane layout, visible drop targets, keyboard/touch equivalents, responsive single-pane fallback, and an accessible separator.
7. **Route editor panes by file type.** Embed the canvas through the corrected trailing scheduler and add the Liveblocks Tiptap document editor/custom toolbar after version-specific documentation checks; enforce lazy bundle and connection isolation.
8. **Polish states and responsive behavior.** Add contextual hints, long-name/large-list handling, offline/degraded states, focus management, reduced motion, and viewport-specific controls.
9. **Prove the result.** Complete unit/integration tests and authenticated Playwright flows, enforce performance budgets, and compare every manifest capture against the approved references before recorded approval.

## Verification and Acceptance Criteria

### Visual acceptance

- At 1440×900, the workspace, project workspace, and focused canvas match the composition, palette, type hierarchy, density, and chrome of the finalized references.
- Screenshot comparison excludes stabilized dynamic collaborator data and, where package/configuration cannot be identical, the native Excalidraw drawing surface. Application-owned regions follow D25 and the approved fidelity contract; every exception requires recorded CEO/design-owner approval.
- At 1024px, navigation compacts without covering content; at 390px, one editor receives the full content width and navigation remains available through the contextual drawer.
- No authenticated surface retains the dark industrial shell, orange primary accent, terminal copy, emoji navigation, or telemetry card treatment.

### Behavioral acceptance

- A new project shows the guided empty editor state and creates no file until the user chooses Canvas, Document, or Folder.
- Opening a tree file adds/activates exactly one tab; close, reorder, overflow, and restoration behavior follow this plan.
- Split view shows at most two independent editors, survives responsive transitions, and offers non-drag equivalents for every operation.
- One failed pane does not interrupt the other pane, tabs, tree, or navigation.
- Project cards load from Postgres only and never wait on Liveblocks.
- Canvas outages retain the mirrored read-only fallback and visible status. Excalidraw's internal tools remain unmodified.
- Document files mount the Liveblocks Tiptap editor rather than the canvas component.

### Accessibility acceptance

- Automated checks report no serious/critical WCAG violations on workspace, project-empty, project-canvas, project-document, split, drawer, and dialog states.
- All navigation, tree, tab, creation, split, resize, close, retry, and drawer actions complete using keyboard only.
- Focus returns to predictable elements after closing drawers/dialogs/tabs and after successful creation.
- At 200% browser zoom and 320 CSS px width, content remains operable without two-dimensional page scrolling outside the native canvas/editor surfaces.
- Touch layouts expose 44×44px targets and never require hover or drag discovery.

### Commands

```bash
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Run authenticated visual checks at 1440×900, 1024×768, 768×1024, and 390×844. Capture workspace populated/empty/error, project empty/single/split, drawer open, canvas disconnected, and create-dialog validation states.

## Approved Visual References

| Screen | Source | Rendered reference | Direction |
|---|---|---|---|
| Workspace project list | `docs/UI-design/final-light-saas/workspace-shell.html` | `~/.gstack/projects/dockified-com-liveflows/designs/final-light-saas-reference-20260811/workspace-shell.png` | Light three-region shell and restrained project cards |
| Project workspace | `docs/UI-design/final-light-saas/project-file-tabs.html` | `~/.gstack/projects/dockified-com-liveflows/designs/final-light-saas-reference-20260811/project-file-tabs.png` | File tree, tabs, independent split panes |
| Focused canvas | `docs/UI-design/final-light-saas/canvas-page.html` | `~/.gstack/projects/dockified-com-liveflows/designs/final-light-saas-reference-20260811/canvas-page.png` | Minimal breadcrumb/collaboration chrome around native Excalidraw |

The gstack designer could not generate supplemental variants because no OpenAI API key is configured. This does not block the plan because the user supplied and confirmed the final visual direction.

## TODOS.md Updates

No TODO items are proposed. Every design gap found in this review is included in the implementation scope. Prototype-only destinations are product features explicitly outside this plan, not deferred design debt.

## Retrospective Note

The branch history contains a prior multi-file data/DAL/UI sequence (`2f0efa9`, `ed9d31f`, `3e26b0e`, followed by test repair `ac4ade1`) and `docs/scope/scope.md` marks feature N as done, while the current project route still renders the manifest/cards and always-visible create forms. The issue is not that the earlier work had no value: its schema, DAL, room lifecycle, snapshots, and route foundations are reused here. The failure was an acceptance boundary that allowed structural/backend completion to stand in for the approved user experience. T0, state-level ownership, rendered evidence, and merge-blocking D25/D28 gates are therefore load-bearing process controls, not optional QA polish.

## Engineering Review Summary

- Step 0 scope challenge: complete plan retained through phased fidelity gates; no feature was cut.
- Architecture review: 6 issues found and resolved in D14–D19.
- Code quality review: 5 issues found and resolved in D20–D24.
- Test review: execution/user-flow diagram produced; 11 gaps resolved in D25–D35, including one mandatory regression.
- Performance review: 6 issues found and resolved in D36–D41.
- Independent outside review: 4 P1 findings verified and resolved in D42–D45.
- Failure modes: 0 silent critical gaps remain; every mapped production failure has planned handling and a named test layer.
- TODO proposals: 0; all relevant findings belong in this implementation rather than a deferred list.
- Parallelization: 3 lanes after T0, with shared-contract merge gates and sequential integration/fidelity waves.
- Completeness: 32/32 recommendations use the complete recommended path.

Verified high-confidence findings included the current canvas timer capturing the first scene rather than the latest one, nullable/per-table name constraints failing to express the required shared namespace, sequential metadata reads and room teardown, focused canvas URLs bypassing an authorized snapshot bootstrap, directory locks failing to serialize folder topology, binary webhook claims being unable to recover safely from cleanup failure, and normalization backfill lacking a collision policy. The decisions above replace each with an executable boundary and regression proof.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding above. Run with Claude Code or Codex; checkbox as you ship.

- [x] **T0 (P0 blocking, human: ~1d / CC: ~1h)** — Fidelity preflight — Expand and freeze the executable state manifest before UI implementation
  - Surfaced by: the Reference-Locked Final UI Fidelity Contract and test review D29 — the current summary table cannot prove state-level coverage or stop blind implementation.
  - Files: `docs/specs/final-light-saas-fidelity-manifest.json`, `docs/specs/final-light-saas-fidelity-manifest.md`, focused manifest schema/validation script and tests, pinned font assets outside the frozen reference directory, capture-environment and D40 performance-baseline configuration.
  - Verify: every required state × primary viewport has one stable manifest ID; 767/768/1279/1280 boundary checks are represented; frozen reference, font, runtime, and browser hashes validate; every row names its T1–T10 owner and executable fixture; approved-reference baseline captures are stable; the representative D40 fixture/metric/sample/invariant contract names an owner task and blocks that owner until its real baseline plus derived absolute budget evidence is recorded; CEO/design-owner preflight approval is recorded. T1–T10 remain blocked until this gate passes, and each later owner task remains blocked on its own D40 evidence gate.
- [x] **T1 (P1, human: ~4h / CC: ~35min)** — Design system — Codify the finalized Light SaaS system and semantic tokens
  - Surfaced by: Pass 5 — no durable `DESIGN.md`; repeated dark hex values currently control authenticated UI.
  - Files: `DESIGN.md`, `src/app/globals.css`, `src/app/layout.tsx`, new focused primitives under `src/components/ui/`.
  - Verify: token/contrast audit plus `pnpm lint` and component tests.
- [ ] **T2 (P1, human: ~2d / CC: ~2h)** — Application shell — Build responsive rail, sidebar, top bar, and contextual drawer
  - Surfaced by: Pass 1 and Pass 6 — current top-only dark navigation does not match the finalized hierarchy or mobile needs.
  - Files: `src/app/(app)/layout.tsx`, `src/components/app-nav.tsx`, new shell/navigation components.
  - Verify: keyboard/focus tests and screenshots at 1440px, 1024px, and 390px.
- [ ] **T3 (P1, human: ~1d / CC: ~1h)** — Workspace list — Rebuild project hierarchy, cards, and states from Postgres metadata only
  - Surfaced by: Pass 1, Pass 2, and D13 — current telemetry cards mismatch the reference and live card status would violate the read path.
  - Files: `src/app/(app)/w/[workspaceSlug]/page.tsx`, `src/app/(app)/w/[workspaceSlug]/loading.tsx`, `src/components/project-list.tsx`, project modal/dialog styles and tests.
  - Verify: populated/empty/loading/error tests; assert no Liveblocks request; visual comparison with `workspace-shell.html`.
- [ ] **T4 (P1, human: ~2d / CC: ~2h)** — Workspace state — Implement and test pure tab/split actions plus safe persistence
  - Surfaced by: Pass 7 D10 — workspace layout must restore locally without becoming server data or retaining stale IDs.
  - Files: focused `src/features/project-workspace/workspace-state.ts`, project-scoped Zustand vanilla store/provider, persistence adapter, example and `fast-check` invariant tests, D31 Playwright restoration journeys; keep `src/stores/ui.ts` shell-only per D20.
  - Verify: generated action sequences preserve every D31 invariant; storage failure/migration/hydration/stale-ID/user-project-isolation cases pass; reload, cross-project, and 767/768 responsive restoration journeys pass.
- [ ] **T5 (P1, human: ~2d / CC: ~2h)** — File navigation — Build accessible tree, guided empty state, and creation menu/dialog
  - Surfaced by: Pass 1, D3, and D11 — current project manifest and always-visible forms do not match the approved workspace.
  - Files: `prisma/schema.prisma` and expand/validate/data-fix/contract migrations/generated client, `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`, `create-forms.tsx` replacement, D37 directory-lock/namespace helper, D38 project-workspace DAL read, D41 room teardown helper, D43 topology-lock helper, Clerk organization-deletion handling, new project-workspace tree/dialog components, D34/D43/D45 disposable-Postgres integration tests.
  - Verify: D45 production-shaped migration/collision/restore/drift rehearsal; fixed query count and O(n)/expanded-row large-tree proof; nested/empty/long-name/duplicate/error/success flows; keyboard ARIA-tree behavior and focus restoration; D32 folder moves, conflicts, stale targets, rollback, and menu equivalents; D34 authorization/namespace/concurrency/non-disclosure/cascade matrix; D43 cycle-race and lock-timeout matrix; D41 bounded file/folder/project/workspace teardown behavior.
- [ ] **T6 (P1, human: ~3d / CC: ~3h)** — Tabs and split view — Implement tabs, two-pane layout, drag/drop targets, and non-drag equivalents
  - Surfaced by: Pass 1 and Pass 6 — the finalized core workspace interaction is absent from the implementation.
  - Files: new components under `src/features/project-workspace/`, related state/reducer tests and Playwright flows.
  - Verify: D32's complete typed intent matrix at unit/component/browser layers; open/close/reorder/split/replace/drop-cancel/resize behavior; one-pane mobile fallback; full keyboard and menu/button completion.
- [ ] **T7 (P1, human: ~4d / CC: ~4h)** — Editor routing — Mount independent canvas and document editors by file type
  - Surfaced by: Pass 1 — project workspace requires independent canvas/document panes, while the current file route always renders `CanvasRoom` and Tiptap packages are not yet installed.
  - Files: `package.json`, `pnpm-lock.yaml`, `ProcessedWebhook` lease migration/helper, new `src/features/document/` and editor-pane router, D42 authorized no-store bootstrap DAL/API, file/project/focused-canvas routes, Clerk/Liveblocks webhook code, captured version-pinned Yjs/Tiptap fixtures, D33/D44 unit/integration/Playwright tests.
  - Verify: Context7/installed-doc check recorded; D42 cross-workspace/unknown/stale-snapshot/initial-outage/live-recovery cases pass for focused and embedded editors; canvas opens canvas, document opens Tiptap, two editors remain independent; D33 conversion, D44 lease concurrency/failure/takeover, realtime, reconnect, and mirror-recovery tests pass; D39 bundle graph and room-connection counts pass; build passes.
- [ ] **T8 (P1, human: ~1d / CC: ~1h)** — Canvas chrome — Move collaboration, storage, and outage UI into the approved pane/header treatment
  - Surfaced by: Pass 4 — current inline debug overlay and fixed red banner do not match the finalized minimal canvas chrome.
  - Files: `src/features/canvas/canvas-room.tsx`, focused trailing scheduler/helper and tests, `src/app/(app)/w/[workspaceSlug]/f/[fileId]/page.tsx`, canvas tests.
  - Verify: D36 latest-value trailing and final-flush tests plus 100–5,000 element benchmark; connected/warning/critical/disconnected/read-only states; D35 two-client draw/move/delete, undo isolation, pointer gating, reconnect, split independence, regional failure, and mirrored fallback journeys; Excalidraw toolbar remains untouched.
- [ ] **T9 (P1, human: ~2d / CC: ~2h)** — States and accessibility — Complete regional failures, responsive behavior, hints, and input semantics
  - Surfaced by: Pass 2, Pass 3, and Pass 6 — references cover desktop success states only.
  - Files: `package.json`, `pnpm-lock.yaml`, shell, workspace, tree, tabs, panes, dialogs, loading/error boundaries, component accessibility tests, and D30 Playwright journeys/scans.
  - Verify: component semantics and keyboard tests pass; every manifest surface has a passing axe scan; keyboard-only journeys complete; 200% zoom, 320 CSS px operability, reduced motion, 44×44 CSS px touch targets, focus return, and regional failure containment pass in D28 CI.
- [ ] **T10 (P1, human: ~2d / CC: ~2h)** — Visual and journey QA — Lock the finalized design with authenticated end-to-end and screenshot coverage
  - Surfaced by: all passes — implementation currently diverges across every authenticated screen.
  - Files: `playwright.config.ts`, `.github/workflows/ci.yml`, `e2e/` deterministic application-state fixtures, visual/journey specs, and approved screenshot fixtures/configuration.
  - Verify: prove D26 isolation with parallel fixture tests; prove D27 flush behavior at unit and journey levels; enforce D39/D40 bundle, connection, fixed-query, visible-row, render, and stable-regression budgets; run `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`; require the D28 CI job and inspect its desktop/tablet/mobile artifacts under D25.

## Review Scores

| Pass | Initial | Final | Result |
|---|---:|---:|---|
| Information architecture | 5/10 | 10/10 | Full project workspace selected and specified |
| Interaction states | 3/10 | 10/10 | Loading, empty, error, success, and degraded states defined |
| User journey | 6/10 | 10/10 | Contextual guidance and emotional/time-horizon journey defined |
| AI slop risk | 8/10 | 10/10 | Production icon language and explicit visual constraints added |
| Design system alignment | 6/10 | 10/10 | `DESIGN.md` extraction made the first task |
| Responsive and accessibility | 3/10 | 10/10 | Viewports, drawer, one-pane mobile, keyboard, focus, and WCAG requirements defined |
| Unresolved decisions | 4 open | 0 open | D10–D13 resolved; no decisions deferred |

Overall design completeness: **2/10 → 10/10**.

## Unresolved Decisions

None. All decisions raised by this review were explicitly answered.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | Not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | CLEAR (OUTSIDE VOICE) | 4 findings, 4/4 resolved |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 28 section issues, 0 critical gaps; all resolved |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (FULL) | Score: 2/10 → 10/10, 12 decisions made |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Not run |

**CODEX:** Four P1 gaps closed: authorized snapshot bootstrap, folder-topology serialization, durable webhook leases, and collision-safe normalized-name migration.

**CROSS-MODEL:** Both reviews agree the binding design manifest, authenticated data boundaries, deterministic state tests, and rendered CI evidence are necessary to prevent another visually incorrect implementation.

**VERDICT:** DESIGN + ENG CLEARED — begin with blocking T0 fidelity preflight, then implement T1–T10.

NO UNRESOLVED DECISIONS

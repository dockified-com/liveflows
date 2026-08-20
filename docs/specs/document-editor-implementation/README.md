# Document Editor Implementation — Task Index

Task files for external coding agents. Each produces a working, tested,
committed deliverable.

**Every agent must read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) before starting any task.**
It carries the repo conventions, the two silent-failure invariants, and the
must-read source files that apply to all tasks.

Track status in [`progress.md`](./progress.md). Agents update it as they finish.

## Scope

The editor surface from [`docs/specs/0006-document-editor.md`](../0006-document-editor.md):
13 block types, formatting marks, slash menu, bubble toolbar, block handle with
drag reorder, tables with controls, syntax-highlighted code, math, links, emoji,
in-document table of contents, find, and stable block IDs.

Covers **AC-1 through AC-20**.

Not in this batch, each needing its own spec: collaboration persistence and
presence, MCP document tools, images with object storage, mentions, AI inline
editing, suggestions, comments, and internal LiveFlows references.

## Execution waves

Tasks within a wave touch **no shared files** and may run concurrently. Waves
are strictly ordered — do not start a wave until every task in the previous one
is committed and green.

```
Wave 1  ──┬── task-01-provider-seam         (extension assembly, history guard, UniqueID)
          └── task-02-pure-logic            (outline, slash registry, paste rules — no editor)
                    │
Wave 2  ──┬── task-03-formatting-marks      (needs 01)
          └── task-04-block-types           (needs 01)
                    │
Wave 3  ──┬── task-05-slash-menu            (needs 02, 04)
          ├── task-06-bubble-toolbar        (needs 03)
          └── task-07-posatcoords-bridge    (needs 01)
                    │
Wave 4  ──┬── task-08-block-handle          (needs 07)
          ├── task-09-tables                (needs 04)
          └── task-10-code-math-links-emoji (needs 04)
                    │
Wave 5  ──┬── task-11-toc-find              (needs 02, 04)
          └── task-12-status-responsive-audit (needs all)
```

### Parallel dispatch table

Each task owns private files, and most waves also share two coordination files.
**Read the shared-file protocol below before dispatching a wave with more than
one agent** — the sharing is real, not eliminated.

| Wave | Run in parallel | Agents | Each task's own files | Shares |
|---|---|---|---|---|
| 1 | `task-01`, `task-02` | 2 | `collaboration-provider.ts` + `extensions/index.ts` · `lib/{outline,slash-commands,paste-rules}.ts` | none |
| 2 | `task-03`, `task-04` | 2 | `extensions/formatting.ts` + `ui/toolbar*.ts(x)` · `extensions/{blocks,callout}.ts` + `ui/callout-view.tsx` | `index.ts` |
| 3 | `task-05`, `task-06`, `task-07` | **3** | `ui/slash-menu.tsx` + `lib/slash-actions.ts` · `ui/{bubble-toolbar,color-popover}.tsx` · `ui/block-handle/pos-at-coords.ts` | `index.ts` (05), `document-editor.tsx` (05, 06) |
| 4 | `task-08`, `task-09`, `task-10` | **3** | `ui/block-handle/*` · `extensions/tables.ts` + `ui/table-controls.tsx` · `extensions/technical-content.ts` + `ui/{code-block-view,link-editor}.tsx` | `index.ts` (09, 10), `document-editor.tsx` (08) |
| 5 | `task-11`, `task-12` | 2 | `extensions/{toc,find,paste-handler}.ts` + `ui/{toc-view,find-bar}.tsx` · `ui/{save-status,use-toolbar-overflow}` + `e2e/` | `index.ts` (11), `document-editor.tsx` (11, 12) |

Maximum useful concurrency is **3 agents** (waves 3 and 4).

### Shared-file protocol

Two files are edited by many tasks. Both are structured so every edit is a
**one-line append**, which merges cleanly — but the sharing is real and must be
handled.

**`extensions/index.ts`** — tasks 03, 04, 05, 09, 10, 11 each register extensions.
Task 01 creates it with placeholder comments (`// task-03:`, `// task-04:`, …)
marking where each append goes. Rules:

- Add exactly one import at the top and one spread entry at your placeholder.
- Never reorder, edit, or delete another task's line.
- If your placeholder is missing, append at the end of the array — do not
  restructure.

**`document-editor.tsx`** — tasks 05, 06, 08, 11, 12 each fill a named slot that
task 01 created (`toolbarSlot`, `bubbleSlot`, `blockHandleSlot`, `findSlot`).
Rules:

- Fill your slot at the render site. Add nothing else.
- Never restructure the shell, rename a slot, or change the props interface.

**Within a wave, agents editing the same shared file must commit sequentially**
(see Git concurrency below). A one-line append is a trivial merge, but two
simultaneous writes to the same file in the same worktree will still clobber.
Either use separate worktrees and merge in task order, or stagger the commits.

### Git concurrency

Two agents committing in the same working tree race on `.git/index.lock`, and two
agents writing the same shared file in one worktree will clobber each other. Pick
one of these:

**Separate worktrees (recommended for true parallelism)**

```bash
git worktree add ../lf-doc-task-05 -b feat/doc-task-05
git worktree add ../lf-doc-task-06 -b feat/doc-task-06
git worktree add ../lf-doc-task-07 -b feat/doc-task-07
```

Merge in task-number order once the wave completes. Shared-file edits are
one-line appends, so conflicts resolve by keeping both lines. Each worktree needs
its own `pnpm install`.

**Shared tree, staggered commits**

Agents work concurrently but commit one at a time, and an agent touching a shared
file re-reads it immediately before its edit. Simpler, slightly slower, and safe
because every shared edit is an append.

**Serial within a wave**

If in doubt, run the wave's tasks one after another. Correctness over speed —
the waves still buy most of the ordering benefit.

## Task list

| File | Deliverable | Depends on | ACs |
|---|---|---|---|
| [task-01-provider-seam.md](./task-01-provider-seam.md) | `collaboration-provider.ts`, extension assembly, `history` guard, UniqueID, editor shell | — | 1, 2, 3 |
| [task-02-pure-logic.md](./task-02-pure-logic.md) | `lib/outline.ts`, `lib/slash-commands.ts`, `lib/paste-rules.ts` | — | 6, 15 |
| [task-03-formatting-marks.md](./task-03-formatting-marks.md) | 7 marks + config-driven toolbar | 01 | 4, 19 |
| [task-04-block-types.md](./task-04-block-types.md) | 13 block types incl. custom Callout | 01 | 5 |
| [task-05-slash-menu.md](./task-05-slash-menu.md) | `/` command palette | 02, 04 | 6 |
| [task-06-bubble-toolbar.md](./task-06-bubble-toolbar.md) | Selection formatting toolbar | 03 | 7 |
| [task-07-posatcoords-bridge.md](./task-07-posatcoords-bridge.md) | `blockAtCoords` DOM↔ProseMirror bridge | 01 | 8 |
| [task-08-block-handle.md](./task-08-block-handle.md) | `⠿` handle, block menu, drag reorder, copy block link | 07 | 8, 9 |
| [task-09-tables.md](./task-09-tables.md) | Table extension + row/column controls | 04 | 10 |
| [task-10-code-math-links-emoji.md](./task-10-code-math-links-emoji.md) | Lowlight, KaTeX, link, emoji | 04 | 11, 12 |
| [task-11-toc-find.md](./task-11-toc-find.md) | TOC block, find bar, markdown + paste verification | 02, 04 | 13, 14, 15, 16 |
| [task-12-status-responsive-audit.md](./task-12-status-responsive-audit.md) | Autosave status, responsive toolbar, theme + dependency audit | all | 17, 18, 20 |

## Optional reference read

Not a task, gates nothing, skip freely. Before task 07 or 08, reading Tiptap's
MIT source for their drag-handle and copy-anchor-link components is cheaper than
rediscovering the same edge cases. **Read only — do not run
`npx @tiptap/cli add`, and do not copy code.** The spec's decision to build our
own UI is deliberate; see `AGENT-BRIEFING.md` §3.

## Reference documents

| Document | Purpose |
|---|---|
| [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) | **Required.** Conventions, invariants, must-read files, testing rules. |
| [`docs/specs/0006-document-editor.md`](../0006-document-editor.md) | Full spec: 20 ACs, options considered, rationale. |
| [`docs/features/notion-docs-editor/design.md`](../../features/notion-docs-editor/design.md) | Technical design: module layout, sourcing, phases. |
| [`docs/features/notion-docs-editor/requirements.md`](../../features/notion-docs-editor/requirements.md) | Plain-language behavior. Useful for judging intent. |
| `DESIGN.md` (repo root) | **Required for any UI task.** Token table; raw hex in JSX is forbidden. |
| `AGENTS.md` (repo root) | Repo-wide stack rules. Stale on the data model — trust `prisma/schema.prisma`. |

## Final verification

After task 12:

```bash
pnpm lint
pnpm test -- --run
pnpm build
pnpm test:e2e
```

Then confirm AC-18 explicitly:

```bash
grep -c "@tiptap-pro" package.json    # must print 0
```

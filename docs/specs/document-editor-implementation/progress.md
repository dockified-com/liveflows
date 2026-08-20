# Document Editor Implementation — Progress

Single source of truth for this feature's implementation status. Agents update
their own row and append to the log when they finish a task.

**Feature:** Notion-style document editor surface ([`docs/specs/0006-document-editor.md`](../0006-document-editor.md))
**Started:** not yet
**Status:** `not started`

## Status board

| Task | Deliverable | Wave | Status | Commit | Date |
|---|---|---|---|---|---|
| [01](./task-01-provider-seam.md) | Provider seam, extension assembly, `history` guard, UniqueID, editor shell | 1 | `not started` | — | — |
| [02](./task-02-pure-logic.md) | `lib/outline.ts`, `lib/slash-commands.ts`, `lib/paste-rules.ts` | 1 | `not started` | — | — |
| [03](./task-03-formatting-marks.md) | 7 formatting marks + config-driven toolbar | 2 | `not started` | — | — |
| [04](./task-04-block-types.md) | 13 block types incl. custom Callout | 2 | `not started` | — | — |
| [05](./task-05-slash-menu.md) | `/` command palette | 3 | `not started` | — | — |
| [06](./task-06-bubble-toolbar.md) | Selection formatting toolbar | 3 | `not started` | — | — |
| [07](./task-07-posatcoords-bridge.md) | `blockAtCoords` DOM↔ProseMirror bridge | 3 | `not started` | — | — |
| [08](./task-08-block-handle.md) | `⠿` handle, block menu, drag reorder, copy block link | 4 | `not started` | — | — |
| [09](./task-09-tables.md) | Table extension + row/column controls | 4 | `not started` | — | — |
| [10](./task-10-code-math-links-emoji.md) | Lowlight, KaTeX, link, emoji | 4 | `not started` | — | — |
| [11](./task-11-toc-find.md) | TOC block, find bar, markdown + paste verification | 5 | `not started` | — | — |
| [12](./task-12-status-responsive-audit.md) | Autosave status, responsive toolbar, theme + dependency audit | 5 | `not started` | — | — |

Status values: `not started` · `in progress` · `blocked` · `done`

## Wave gate

Do not start a wave until every task in the previous wave is `done` and its
tests pass.

| Wave | Tasks | Parallel? | Gate |
|---|---|---|---|
| 1 | 01, 02 | yes, 2 agents | — |
| 2 | 03, 04 | yes, 2 agents | wave 1 done |
| 3 | 05, 06, 07 | yes, 3 agents | wave 2 done |
| 4 | 08, 09, 10 | yes, 3 agents | wave 3 done |
| 5 | 11, 12 | yes, 2 agents | wave 4 done |

## Acceptance criteria

Ticked only when a test proves it, not when the code looks right.

| AC | Requirement | Proven by | Status |
|---|---|---|---|
| AC-1 | Provider imported by exactly one module | task 01 + grep audit in task 12 | ☐ |
| AC-2 | `history` disabled when a collaboration extension is active | `extensions/index.test.ts` | ☐ |
| AC-3 | Block IDs survive split, merge, undo, redo, remote sync | `unique-id.test.tsx` | ☐ |
| AC-4 | All 7 additional formatting marks round-trip | `formatting.test.tsx` | ☐ |
| AC-5 | 13 block types insert and round-trip | `blocks.test.tsx` | ☐ |
| AC-6 | `/` menu filters by label and alias, inserts correct node | `slash-commands.test.ts` + `slash-menu.test.tsx` | ☐ |
| AC-7 | Selection toolbar offers 8 controls | `bubble-toolbar.test.tsx` | ☐ |
| AC-8 | Block handle opens menu and drags to reorder | `block-handle.test.tsx` + E2E | ☐ |
| AC-9 | Copy block link survives edits elsewhere | `block-handle.test.tsx` | ☐ |
| AC-10 | Table create / row / column / header / resize / merge / split / delete / reorder | `tables.test.tsx` + E2E | ☐ |
| AC-11 | 10 languages highlight; selector and copy present | `code-block.test.tsx` | ☐ |
| AC-12 | Math renders; invalid LaTeX never throws | `math.test.tsx` | ☐ |
| AC-13 | Markdown input rules produce expected nodes | `markdown-rules.test.tsx` | ☐ |
| AC-14 | Google Docs paste produces no spurious bold | `paste-rules.test.ts` | ☐ |
| AC-15 | TOC block lists H1–H3 with working navigation | `outline.test.ts` + `toc-view.test.tsx` | ☐ |
| AC-16 | Find locates, highlights, navigates next/previous | `find-bar.test.tsx` | ☐ |
| AC-17 | Autosave status renders 4 states from the seam contract | `status.test.tsx` | ☐ |
| AC-18 | No `@tiptap-pro/*` in `package.json` | task 12 audit | ☐ |
| AC-19 | No raw hex in editor JSX | task 12 audit | ☐ |
| AC-20 | Usable on desktop, tablet, mobile | task 12 + E2E viewport | ☐ |

## Final verification

Run after task 12. All must pass before the feature is considered done.

```bash
pnpm lint
pnpm test -- --run
pnpm build
pnpm test:e2e
```

Then AC-18 explicitly:

```bash
grep -c "@tiptap-pro" package.json    # must print 0
```

| Check | Status | Notes |
|---|---|---|
| `pnpm lint` clean | ☐ | |
| `pnpm test -- --run` green | ☐ | |
| `pnpm build` succeeds | ☐ | |
| `pnpm test:e2e` green | ☐ | |
| No `@tiptap-pro` dependency | ☐ | |
| No raw hex in editor JSX | ☐ | |

## Known risks

| Risk | Detail | Owner |
|---|---|---|
| `extensions/index.ts` contention | Tasks 03, 04, 09, 10 all register extensions there. Task 01 defines the shape; later tasks append only. Never reorder another task's line. | all |
| `document-editor.tsx` contention | Task 01 restructures it once into a slotted shell. Later tasks fill a slot, never restructure. | all |
| Package names may differ | Tiptap v3 moved and split packages. The spec's dependency list is explicitly "confirm at install." Report mismatches rather than guessing. | 03, 04, 09, 10 |
| `codeBlock` collision | `CodeBlockLowlight` requires StarterKit `codeBlock: false`, else a duplicate-node-name throw at construction. | 01, 10 |
| a11y from scratch | `modal-dialog.tsx` has **no focus trap**. Every menu surface needs focus management written fresh. | 05, 08, 09, 10 |
| Existing test may break | `src/features/project-workspace/editor-pane-router.test.tsx` touches the editor. Update it rather than reverting. | 01 |

## Decisions log

Settled during design. Do not relitigate mid-implementation; if one looks wrong,
stop and report.

| Decision | Rationale |
|---|---|
| Build all UI ourselves, adopt no Tiptap UI Component | Their components ship SCSS into a repo with no Sass, carry a parallel `--tt-*` token system, and bring competing primitives and icons — while `@dnd-kit` and `src/components/ui/` already solve what adoption would save. |
| No paid Tiptap | Team + Tracked Changes is ~$398/mo, the same recurring cost that removed the previous realtime vendor. |
| Keep Liveblocks wired behind the seam | Editor stays collaborative and testable during the work; migration rewrites one module. |
| UniqueID now, all block types | No backfill ever needed, and the `filterTransaction` trap gets tested in isolation rather than found under live collaboration. |
| Provider is the write path, `DocumentSnapshot` an eventually-consistent JSON mirror | Matches the canvas architecture. This batch writes no mirror; that is the migration's `onStoreDocument` hook. |
| `@dnd-kit` over Tiptap's drag handle | Reuses the existing idiom and avoids pulling four Yjs peers in early. Cost is the `posAtCoords` bridge. |
| No images | Object storage is an infrastructure decision, not an editor feature. |
| TOC is an in-document block, not a sidebar | Travels with content; agents reading document JSON see the structure. |

## Log

Append an entry per task. Keep it short — what shipped, and anything the next
agent needs to know.

```
(no entries yet)
```

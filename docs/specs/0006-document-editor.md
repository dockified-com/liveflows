# Notion-Style Document Editor (Editor Surface)

**Status**: Approved
**Date**: 2026-08-19
**Scope**: Editor foundation, rich text, block types, Notion UX layer, technical content
**Feature docs**: [`docs/features/notion-docs-editor/`](../features/notion-docs-editor/README.md)

## Summary

The document editor today is 188 lines: `StarterKit` plus six hand-written toolbar buttons (bold, italic, strike, H1, H2, bullet list). This spec turns it into a Notion-style editing surface — 13 block types, a full formatting set, slash command menu, floating toolbar, block drag handles, tables with row/column controls, syntax-highlighted code, math, links, emoji, an in-document table of contents, and find.

Everything here is **collaboration-provider agnostic**. The provider is isolated behind one module so the Hocuspocus/Yjs migration swaps an import rather than rewriting the editor.

Built entirely on free, open-source foundations. No paid Tiptap dependency enters the core architecture.

## Context

### What exists today

`src/features/document/document-editor.tsx` (188 lines) mounts `StarterKit` and the Liveblocks Tiptap extension inside a `RoomProvider`. Roughly 120 of those lines are six toolbar buttons with duplicated Tailwind. Four Tiptap packages are installed: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-color`, `@tiptap/extension-text-style`. The last two are installed but unwired.

`DocumentSnapshot` exists in `prisma/schema.prisma` with `content Json @default("{}")` and **zero writes anywhere in `src/`** — verified. Document content lives only in the collaboration provider. There is no object storage dependency in `package.json` and no upload route.

### Constraints

**No paid Tiptap dependencies.** LiveFlows is commercial and must remain self-hostable without paid editor infrastructure. This was verified rather than assumed:

| Needed | Package | Status |
|---|---|---|
| Stable block IDs | `@tiptap/extension-unique-id` | Free namespace, no auth token |
| Math | `@tiptap/extension-mathematics` + `katex` | Free namespace |
| Drag handles | `@tiptap/extension-drag-handle-react` | Free namespace — **not used**, see below |
| Comments, Content AI, DOCX conversion | `@tiptap-pro/*` | **Paid — excluded** |

In Tiptap v3 several extensions moved from `@tiptap-pro/` to the free `@tiptap/` namespace. The paid set maps exactly onto the features this spec defers anyway (AI editing, suggestions, comments).

**The linked Notion-like template is paid.** `template.tiptap.dev/preview/templates/notion-like` states: *"You're using the Notion-like template, available for paid users"* and *"the AI Assistant, advanced color palettes, or context menus – are exclusive to paid users."* It is used here as a **UX reference only**, not adopted.

**Tiptap UI Components are MIT where the underlying extension is open source, and are not adopted here.** They are not an npm package — `npx @tiptap/cli@latest add <component>` copies source files into the repo. Three costs made adoption the wrong trade for this codebase:

| Cost | Certainty |
|---|---|
| Components ship `.scss` files; this repo has **zero `.scss` files and no Sass toolchain** (`sass` is not in `package.json`) | Certain |
| Components carry a parallel `--tt-*` token vocabulary; `DESIGN.md` mandates `--ink` / `--accent` / `--line` and forbids raw hex in JSX | Certain |
| Each component pulls in its own primitives, hooks, and icon set, competing with existing `src/components/ui/` and `icon.tsx` | Certain |
| Their docs target React 18 / Next 15; this repo is React 19.2.8 / Next 16.3.0 with React Compiler on | Unmeasured |

The React 19 question was the original concern, but it is the *least* certain of the four. The styling and file-volume costs apply to every component regardless of whether it compiles.

Decisively, the problems adoption would solve are **already solved in this repo**: `@dnd-kit` drives drag across five surfaces (`file-tree`, `tab-bar`, `dnd-coordinator`, `file-tree-dnd-context`, `project-workspace-view`), and `src/components/ui/` provides `button`, `input`, `modal-dialog`, `icon`, and `status-pill` with an accompanying a11y test suite. Adoption would import foreign solutions to problems that do not exist here.

Their MIT source remains a useful **reading reference** for non-obvious components.

**Liveblocks is cancelled but still live during development.** The editor keeps its current provider while this work lands, so it stays collaborative and testable throughout. The Hocuspocus/Yjs migration is its own project — see [`docs/features/realtime-collaboration/`](../features/realtime-collaboration/README.md).

### Scope decomposition

The originating brief spanned 35 sections across independent subsystems. This spec covers the editor surface only:

**In scope** — provider-agnostic, no infrastructure blockers:

| Group | Contents |
|---|---|
| Foundation | Extension set, formatting marks, 13 block types, markdown input rules, paste handling, theme, responsive |
| Notion UX | Slash menu, bubble toolbar, block handle + menu, drag reorder, table of contents block, find |
| Technical content | Tables with controls, code + lowlight, math + KaTeX, links, emoji |
| Groundwork | Stable block IDs, autosave status UI, provider seam |

**Out of scope**, each needing its own spec:

| Deferred | Reason |
|---|---|
| Collaboration, presence, document persistence | Belongs to the Hocuspocus/Yjs migration |
| MCP document tools | Requires the Postgres mirror the migration creates |
| Images | Requires object storage infrastructure and a provider decision |
| Mentions | Requires a user directory |
| AI inline editing, suggestions | Requires the MCP layer |
| Comments | Requires its own data model outside document content |
| Internal LiveFlows references | Requires diagram and file addressing |

## Options considered

### Collaboration provider handling during development

1. **Keep the current provider behind an isolated seam** — editor stays collaborative and testable; all new work sits beside it; migration rewrites one module.
   - *Pros*: nothing built blind, nothing rewritten, no throwaway scaffolding.
   - *Cons*: requires the account stays live until the migration lands.
2. **Strip the provider and build single-player with a debounced Postgres save.**
   - *Cons*: the save path is scaffolding the migration deletes, and it becomes a second writer racing the provider. No live collaboration meanwhile.
3. **Land the migration first, inside this spec.**
   - *Cons*: front-loads infrastructure risk and delays every visible editor improvement.

**Decision: option 1.**

### Stable block ID timing

1. **Include `UniqueID` now, all block-level node types.**
   - *Pros*: every document has IDs from the first one onward, so no backfill is ever needed. Provider-agnostic. The `filterTransaction` trap gets tested in isolation rather than discovered under live collaboration.
   - *Cons*: small scope addition before the consumers exist.
2. **Defer until the MCP tools need it.**
   - *Cons*: documents created meanwhile have ID-less blocks, requiring a backfill pass over `DocumentSnapshot` JSON.
3. **Headings and paragraphs only.**
   - *Cons*: extending to tables, code blocks, and callouts later still means a partial backfill.

**Decision: option 1.** IDs are load-bearing for MCP tools, block links, comment anchors, and diagram references. Copy-block-link in this spec already consumes them.

### UX layer sourcing

1. **Build every UI surface ourselves on existing primitives; use their MIT source as a reading reference only.**
   - *Pros*: no Sass toolchain, no parallel `--tt-*` token vocabulary, no competing icon set, no foreign file volume. Reuses `@dnd-kit`, already driving drag on five surfaces, for block reordering — the fiddliest item on the list. Native `DESIGN.md` compliance by construction, so no restyling pass and no raw-hex violations. Zero React 19 and React Compiler unknowns.
   - *Cons*: popover and dropdown accessibility (focus trap, roving tabindex, ARIA) is ours to get right. Floating positioning must be solved, though Tiptap's free `BubbleMenu` and `Suggestion` utilities cover most of it. More upfront implementation than the optimistic adoption case.
2. **Cherry-pick MIT components, verify React 19 per component, restyle to `DESIGN.md`.**
   - *Pros*: faster where components work; copied source means no dependency pinning.
   - *Cons*: pays three certain costs (SCSS, tokens, icons/file volume) for an uncertain benefit, and its main win — drag handles — duplicates infrastructure this repo already runs. Risks two idioms for the same job.
3. **Pay for Tiptap Team plus add-ons.**
   - *Pros*: fastest to a polished result; Tracked Changes solves suggestion mode properly, with per-user attribution and bulk accept/reject.
   - *Cons*: Team is $149/mo, Tracked Changes adds $249/mo, so realistically ~$398/mo (~$4,776/yr) — the same category of recurring cost that caused Liveblocks to be cancelled for this product. Not self-hostable below Enterprise. Vendor lock-in on the core product surface, deeper than Liveblocks, because it shapes both the document model and the AI layer. Does not resolve React 19 today either.

**Decision: option 1.** Option 2 was the initial choice and was reversed after inspecting the repository: the problems adoption solves are already solved here, so it would trade certain costs for a benefit that does not apply. Option 3 contradicts the constraint that removed the previous realtime vendor. Revisiting the Tracked Changes add-on alone remains reasonable later if suggestion mode becomes urgent and revenue supports it — nothing in this design forecloses it.

### Document authority (resolving the source contradiction)

The originating brief asserted both "ProseMirror JSON is canonical, Postgres stores it" and "Yjs is the realtime foundation." Both cannot own the document.

**Decision:** the collaboration provider is the write path and source of truth while editing; `DocumentSnapshot.content` is an eventually-consistent mirror in ProseMirror JSON. This matches the canvas architecture, which `AGENTS.md` warns explicitly against inverting. ProseMirror JSON is the canonical *persisted format* — never HTML. A Yjs update log is a CRDT transport, not a queryable document format.

This spec writes no mirror. Filling `DocumentSnapshot` belongs to the migration, where `onStoreDocument` is the natural hook. Adding a debounced client save now would be scaffolding that gets deleted and a second writer racing the provider.

## Decision

Build the editor surface as a set of focused modules behind a single collaboration seam. Use free Tiptap extensions for every capability that has one — document model, nodes, marks, input rules, `BubbleMenu` and `Suggestion` utilities. Build every UI surface as a LiveFlows component on the existing `src/components/ui/` primitives and `@dnd-kit`. Adopt no Tiptap UI Components and no paid package. Persist nothing new; the provider remains the write path.

**Implementation skills**: React 19, Tiptap/ProseMirror extension authoring, Tailwind v4 with design tokens, Vitest + Playwright.

## Requirements

- **AC-1**: The collaboration provider is imported by exactly one module. No other file references the vendor, and swapping providers requires changing only that module's body.
- **AC-2**: `StarterKit`'s `history` is disabled whenever a collaboration extension is active, and this is enforced by the extension assembly rather than by convention.
- **AC-3**: Every block-level node carries a stable ID that survives split, merge, undo, redo, and remote sync.
- **AC-4**: All seven additional formatting marks work and round-trip through document JSON: underline, highlight, color, superscript, subscript, text align, plus the StarterKit set.
- **AC-5**: Thirteen block types insert and round-trip: paragraph, H1, H2, H3, bullet list, numbered list, task list, blockquote, code block, divider, callout, table, math.
- **AC-6**: Typing `/` opens a command menu that filters by label and alias, grouped by category, and inserting a command produces the corresponding node.
- **AC-7**: Selecting text reveals a floating toolbar with bold, italic, underline, strike, code, link, highlight, and color.
- **AC-8**: Hovering a block reveals a handle that opens a menu (duplicate, delete, turn into, copy block link) and supports drag-to-reorder.
- **AC-9**: Copy block link produces a stable fragment that still resolves after the document is edited elsewhere.
- **AC-10**: Tables support create, add/remove row, add/remove column, header row, column resize, merge cells, split cells, delete table, and drag-to-reorder rows.
- **AC-11**: Code blocks highlight ten languages: TypeScript, JavaScript, Python, SQL, JSON, Bash, YAML, Go, Rust, Java. A language selector and copy-code control are present.
- **AC-12**: Inline and block math render via KaTeX. Invalid LaTeX renders the raw source with an error style and never throws.
- **AC-13**: Markdown input rules produce the expected nodes: `#`, `##`, `###`, `-`, `1.`, `>`, and a code fence.
- **AC-14**: Pasting from Google Docs produces no spurious bold formatting.
- **AC-15**: A table of contents block inserts into the document and lists H1–H3 with working navigation.
- **AC-16**: Find locates text, highlights matches, and navigates next and previous.
- **AC-17**: Autosave status renders `Saving…`, `Saved`, `Connection lost`, and `Read-only`, driven by the provider seam's status contract rather than a vendor hook.
- **AC-18**: No `@tiptap-pro/*` package appears in `package.json`.
- **AC-19**: No raw hex color appears in editor JSX; all styling uses `DESIGN.md` tokens.
- **AC-20**: The editor is usable on desktop, tablet, and mobile, with an adaptive toolbar.

## Feature design

### Module structure

```
src/features/document/
├── document-editor.tsx          composition only: provider, extensions, UI shells
├── collaboration-provider.ts    THE SEAM — only file that knows the vendor
├── extensions/
│   ├── index.ts                 assembles the extension array
│   ├── formatting.ts            underline, highlight, color, super/subscript, align
│   ├── blocks.ts                task list, table, code+lowlight, math
│   ├── callout.ts               custom node — no OSS equivalent
│   └── toc.ts                   custom node — table of contents block
├── ui/
│   ├── toolbar.tsx              config-driven, shared button descriptors
│   ├── bubble-toolbar.tsx       selection formatting
│   ├── slash-menu.tsx           "/" command palette
│   ├── block-handle.tsx         drag handle + block menu (also right-click)
│   ├── table-controls.tsx       row/column handles, extend buttons
│   ├── toc-view.tsx             node view for the TOC block
│   └── find-bar.tsx             in-document find
└── lib/
    ├── slash-commands.ts        command registry — pure data
    ├── outline.ts               doc JSON → heading tree — pure
    └── paste-rules.ts           Google Docs normalization — pure
```

`document-editor.tsx` shrinks because roughly 120 of its 188 lines are duplicated toolbar JSX. Adding ~20 more controls inline would push it past 600 lines. The toolbar becomes config-driven and the file's job narrows to composition. This is the file the work has to edit anyway, so the split is targeted rather than incidental refactoring.

### The provider seam

```ts
// collaboration-provider.ts — the only vendor-aware module
export type ProviderStatus = "connecting" | "connected" | "disconnected" | "failed";

export function useCollaborationExtension(roomId: string): Extension;
export function useProviderStatus(): ProviderStatus;
export const PROVIDER_MANAGES_HISTORY = true;
```

Today these wrap `useLiveblocksExtension()` and Liveblocks' `useStatus`. The migration rewrites the bodies; no other file changes.

`PROVIDER_MANAGES_HISTORY` is read by `extensions/index.ts` to decide whether to disable StarterKit's `history`. Expressing it as a value the provider exports — rather than a hardcoded `false` in the extension list — is what makes AC-2 mechanical instead of a comment someone deletes.

`ProviderStatus` is a normalized union, not Liveblocks' status strings, so the autosave banner does not need rewriting when the provider changes.

### Extensions

**Formatting** — the seven StarterKit does not cover:

```
@tiptap/extension-underline · -highlight · -text-style · -color
@tiptap/extension-superscript · -subscript · -text-align
```

`text-style` is a required peer of `color`; installing color alone silently does nothing. Both are already in `package.json` but unwired.

**Blocks** — 13 types:

| Block | Source |
|---|---|
| Paragraph, H1–H3, bullet/numbered list, blockquote, divider | StarterKit |
| Task list | `@tiptap/extension-task-list` + `-task-item` |
| Table | `@tiptap/extension-table` |
| Code block | `CodeBlockLowlight` + `lowlight` |
| Math | `@tiptap/extension-mathematics` + `katex` |
| Callout | Custom node |
| Table of contents | Custom node |

**`CodeBlockLowlight` replaces StarterKit's `codeBlock`**, so StarterKit must be configured with `codeBlock: false`. Registering both throws a duplicate-node-name error at editor construction — loud, but confusing without knowing the cause.

**Lowlight languages are registered individually.** `lowlight/all` pulls roughly 190 grammars, which is a substantial bundle cost for a documentation editor. Ten languages per AC-11.

**Callout** is a container node holding block content, with `emoji` and `variant` (`info` / `warning` / `success` / `danger`) attributes, rendered through a React node view so it inherits design tokens.

**Table of contents** is a block, not a sidebar — matching the reference template. It travels with the content, and an agent reading document JSON sees the structure. Its node view calls the pure `lib/outline.ts` extractor.

**Stable IDs**:

```ts
UniqueID.configure({
  types: ["heading", "paragraph", "bulletList", "orderedList", "taskList",
          "blockquote", "codeBlock", "table", "callout", "blockMath"],
  filterTransaction: (tx) => !isChangeOrigin(tx),
})
```

The `filterTransaction` guard is mandatory. Without it, every remote sync regenerates every ID, silently breaking block links, and later every MCP tool and comment anchor.

### UX layer sourcing

Every UI surface is a LiveFlows component. No Tiptap UI Component is installed, and `npx @tiptap/cli add` is not run at any point.

What each surface is built on:

| Surface | Foundation |
|---|---|
| Bubble toolbar | Tiptap `BubbleMenu` for positioning; `ui/button.tsx` for controls |
| Slash menu | Tiptap `Suggestion` for trigger and keyboard capture; own dropdown |
| Block handle + menu | `@dnd-kit` for drag; `posAtCoords` bridge for node targeting (below) |
| Color / highlight pickers | Own popover on `ui/button.tsx` + `DESIGN.md` tokens |
| Emoji picker | `@tiptap/extension-emoji` data + own `Suggestion` UI |
| Table controls | Own overlay on `@tiptap/extension-table` commands |
| Copy block link | Own action reading the `UniqueID` attribute |
| Find bar | Own ProseMirror decoration plugin |

**Their MIT source is a reading reference, not a dependency.** Worth reading before writing the block handle and the copy-block-link action, which are the two non-obvious pieces.

**Accessibility is ours to own** as a direct consequence. Popovers and dropdowns need focus management, roving tabindex, and correct ARIA. `ui/modal-dialog.tsx` establishes the pattern for focus trapping and `ui-primitives.test.tsx` plus the existing a11y suite establish the test idiom — but a popover is not a dialog, and the difference matters. Each new menu surface gets an a11y test alongside its behavior test.

#### The `posAtCoords` bridge

Choosing `@dnd-kit` over `@tiptap/extension-drag-handle-react` creates one genuine gap, named here rather than discovered mid-implementation.

`@dnd-kit` knows about DOM elements and pointer coordinates. It has no concept of a ProseMirror node or document position. The Tiptap drag-handle extension does — that is most of its value.

So block-level drag needs a small bridge, roughly:

```ts
// ui/block-handle/pos-at-coords.ts — pure apart from the editor view
function blockAtCoords(view: EditorView, coords: { x: number; y: number }):
  { pos: number; node: Node; domEl: HTMLElement } | null;
```

It calls `view.posAtCoords`, walks up to the nearest block-level ancestor, and returns the position plus the DOM element `@dnd-kit` needs as a drag source. Reordering then issues a ProseMirror transaction (delete at source, insert at target) rather than mutating the DOM.

Estimated at half a day. Two edge cases to handle explicitly: coordinates falling in the gap between blocks, and nested structures where the nearest block is inside a table cell or list item — in which case the outer block is the drag unit, not the inner one.

**UX details taken from the reference template**: the `⠿` hover handle glyph serving both click-menu and drag; table of contents as an in-document block; table row/column handles with `+` extend buttons and drag-to-reorder rows; checklist as a first-class documentation pattern; and an `/ask ai` slot reserved and disabled in the block menu so the later AI spec does not restructure it.

**Cut deliberately**: cut/copy/paste from the context menu. The browser's native versions work correctly in a contenteditable and reimplementing them across platforms is real cost for no gain.

### Pure logic

Three modules with no React and no editor instance, so they are testable without jsdom or a live editor:

| Module | Contract |
|---|---|
| `lib/outline.ts` | `extractOutline(doc: JSONContent): OutlineEntry[]` — heading tree with id, level, text |
| `lib/slash-commands.ts` | `SLASH_COMMANDS: SlashCommand[]` plus `filterCommands(query, commands)` |
| `lib/paste-rules.ts` | Google Docs `<b style="font-weight:normal">` normalization |

```ts
type SlashCommand = {
  id: string;
  label: string;
  aliases: string[];          // "h1" finds "Heading 1"
  group: "basic" | "technical" | "layout";
  run: (editor: Editor) => void;
};
```

This mirrors how `element-sync.ts` is isolated on the canvas side.

### Markdown and paste

**Markdown input rules need no work.** StarterKit's nodes already ship them for `#`, `##`, `-`, `1.`, `>`, and code fences. The only addition is input rules on the custom Callout node.

**Paste is mostly free.** ProseMirror parses pasted HTML against the schema and drops anything unmatched, which is inherently sanitizing — scripts and unmatched tags cannot survive because no node holds them. The gap worth closing is Google Docs, which wraps content in `<b style="font-weight:normal">` and produces spurious bold. That is one paste rule, not a general sanitizer.

### Error handling

| Failure | Behavior |
|---|---|
| Provider disconnect | Banner via `ProviderStatus`; editor stays editable; provider queues changes |
| Malformed `DocumentSnapshot` on fallback read | Render read-only empty document with a warning; never crash the route |
| Invalid LaTeX | Render raw source with an error style; never throw. A formula typo must not blank the document |
| Unknown code language | Fall back to plain text, no highlighting |

### Configuration

No new environment variables and no new third-party services. New npm dependencies are Tiptap extensions plus `lowlight` and `katex`, all free.

### Critical test scenarios

Tiers follow the repo split: `*.test.ts` → Vitest, `*.spec.ts` → Playwright. This naming is load-bearing (`vitest.unit.config.ts:11-22`).

**Pure unit, no editor, no jsdom** — highest value because fast and deterministic:
- Outline extraction, including skipped heading levels and empty documents (AC-15)
- Slash command filtering, alias matching, grouping (AC-6)

**Editor integration** (jsdom + `@testing-library/react`), asserting on document JSON rather than DOM:
- Every formatting mark toggles on and off (AC-4)
- Each of 13 block types inserts and round-trips (AC-5)
- Markdown input rules (AC-13)
- **IDs persist across split, merge, undo, redo** (AC-3) — protects every downstream consumer
- Google Docs paste produces no spurious bold (AC-14)
- Invalid LaTeX renders without throwing (AC-12)
- `history` is absent from the extension list when the provider manages it (AC-2)

**E2E** (Playwright, existing `e2e/` harness): slash menu inserts a block, bubble toolbar formats a selection, drag reorders two blocks, table add/remove row.

**Not tested here**: collaborative convergence and presence. Those belong to the migration and cannot be meaningfully tested against a provider being replaced.

## Build phases

| Phase | Contents | ACs |
|---|---|---|
| 0 | Reference read (~2h): read their MIT source for the block handle and copy-anchor-link patterns. No installs, no scratch branch, no code written from it. | — |
| 1 | Provider seam, extension assembly, `history` guard, UniqueID | 1, 2, 3 |
| 2 | Formatting marks, config-driven toolbar, 13 block types incl. callout | 4, 5, 19 |
| 3 | Pure logic modules; slash menu; bubble toolbar | 6, 7 |
| 4 | `posAtCoords` bridge, block handle, menu, drag reorder, copy block link | 8, 9 |
| 5 | Tables with controls; code + lowlight; math + KaTeX; links; emoji | 10, 11, 12 |
| 6 | Markdown rules verification, paste rules, TOC block, find bar | 13, 14, 15, 16 |
| 7 | Autosave status, responsive/adaptive toolbar, theme audit, dependency audit | 17, 18, 20 |

Phase 0 is a read, not a spike. It gates nothing and can be skipped without blocking any later phase — it exists only because the block handle and copy-block-link are the two non-obvious surfaces, and reading a working implementation before writing one is cheaper than discovering the same edge cases independently.

## Consequences

- The editor keeps its cancelled provider until the migration lands. Acceptable because the seam confines it, but the account must stay live until then.
- Every UI surface is ours to maintain, including popover and dropdown accessibility. No upstream fixes arrive, but equally no foreign code arrives — and the primitives and drag idiom already exist in this repo.
- `document-editor.tsx` is substantially restructured. Its existing test at `src/features/project-workspace/editor-pane-router.test.tsx` may need updating.
- Block drag needs a `posAtCoords` bridge between `@dnd-kit` and ProseMirror positions, since `@dnd-kit` has no concept of a document node. Roughly half a day, with two named edge cases (coordinates between blocks, nested blocks inside table cells or list items).
- **No Yjs packages enter this spec.** Declining `@tiptap/extension-drag-handle-react` also declines its `@tiptap/extension-collaboration`, `@tiptap/y-tiptap`, `yjs`, and `y-protocols` peers, so those arrive with the migration that actually needs them rather than sitting unused.
- `DocumentSnapshot` stays empty. Documents remain recoverable only from the provider until the migration writes the mirror — the same export deadline recorded in the realtime feature docs.
- No image support. A documentation editor without images is a real gap, and it is deferred because object storage is a genuine infrastructure decision rather than an editor feature.
- Roughly 14 new direct dependencies, all free, no transitive Yjs. Direct: `extension-underline`, `-highlight`, `-superscript`, `-subscript`, `-text-align`, `-task-list`, `-task-item`, `-table`, `-code-block-lowlight`, `-mathematics`, `-link`, `-emoji`, `-unique-id`, plus `lowlight` and `katex`. Note `extension-color` and `extension-text-style` are **already installed** but unwired, `@dnd-kit` is already present, and Tiptap v3 may split the table extension into separate row/cell/header packages — confirm the exact set at install rather than trusting this list.

## Follow-up

- **Hocuspocus/Yjs migration** — rewrites `collaboration-provider.ts`, writes `DocumentSnapshot` via `onStoreDocument`, adds presence. See [`docs/features/realtime-collaboration/`](../features/realtime-collaboration/README.md).
- **Images + object storage** — needs a provider decision (S3-compatible, R2, or Supabase Storage) before the editor work.
- **MCP document tools** — `read_document`, `read_block`, `search_document`, `create_block`, `update_block`, `delete_block`, `move_block`, `apply_document_patch`. Requires the Postgres mirror and consumes the stable IDs this spec establishes.
- **Mentions** — needs a user directory; extends to `@agent`, `@document`, `@diagram`.
- **AI inline editing and suggestions** — direct and suggest write modes, built on the MCP layer rather than paid Content AI.
- **Comments** — anchored to `documentId` + `blockId`, stored outside document content.
- **Internal LiveFlows references** — document → diagram, block → diagram node.
- `docs/scope/scope.md` has no row for this work and should gain one.

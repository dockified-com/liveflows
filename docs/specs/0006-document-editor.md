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
| Drag handles | `@tiptap/extension-drag-handle-react` | Free namespace |
| Comments, Content AI, DOCX conversion | `@tiptap-pro/*` | **Paid — excluded** |

In Tiptap v3 several extensions moved from `@tiptap-pro/` to the free `@tiptap/` namespace. The paid set maps exactly onto the features this spec defers anyway (AI editing, suggestions, comments).

**The linked Notion-like template is paid.** `template.tiptap.dev/preview/templates/notion-like` states: *"You're using the Notion-like template, available for paid users"* and *"the AI Assistant, advanced color palettes, or context menus – are exclusive to paid users."* It is used here as a **UX reference only**, not adopted.

**Tiptap UI Components are MIT where the underlying extension is open source.** They are not an npm package — `npx @tiptap/cli@latest add <component>` copies source files into the repo, which we then own and edit. But their docs state: *"the UI Components work best with React 18 (and corresponding framework versions like Next.js 15)."* LiveFlows is locked to React 19.2.8, Next 16.3.0, React Compiler on. Compatibility is therefore unknown per component and must be measured, not assumed.

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

1. **Cherry-pick MIT components, verify React 19 per component, restyle to `DESIGN.md`.**
   - *Pros*: faster where components work, no dependency risk since code lives in the repo, and a broken component is ours to fix.
   - *Cons*: per-component compatibility work with unknown breakage.
2. **Build everything ourselves, template as visual reference only.**
   - *Cons*: reimplements solved problems like color popovers and emoji menus.
3. **Adopt the full MIT set, fix breakage afterwards.**
   - *Cons*: if compatibility does not hold, that is a large volume of unfamiliar copied code to debug at once.

**Decision: option 1**, with a React 19 compatibility spike as the first implementation task so breakage is discovered before the rest of the UI work is planned around it.

### Document authority (resolving the source contradiction)

The originating brief asserted both "ProseMirror JSON is canonical, Postgres stores it" and "Yjs is the realtime foundation." Both cannot own the document.

**Decision:** the collaboration provider is the write path and source of truth while editing; `DocumentSnapshot.content` is an eventually-consistent mirror in ProseMirror JSON. This matches the canvas architecture, which `AGENTS.md` warns explicitly against inverting. ProseMirror JSON is the canonical *persisted format* — never HTML. A Yjs update log is a CRDT transport, not a queryable document format.

This spec writes no mirror. Filling `DocumentSnapshot` belongs to the migration, where `onStoreDocument` is the natural hook. Adding a debounced client save now would be scaffolding that gets deleted and a second writer racing the provider.

## Decision

Build the editor surface as a set of focused modules behind a single collaboration seam. Use free Tiptap extensions for every capability that has one, MIT UI components where they survive React 19, and custom LiveFlows components where they do not or where the component is paid. Persist nothing new; the provider remains the write path.

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

Per component: install via CLI into a scratch branch, keep if it survives React 19 + React Compiler, restyle to `DESIGN.md` tokens either way.

**Adopt-first** (MIT, matching an OSS extension): blockquote button, code-block button, color-highlight-popover, color-text-popover, duplicate-button, delete-node-button, copy-anchor-link-button, emoji-dropdown-menu, emoji-trigger-button, and the Button / DropdownMenu / Popover primitives.

**Build ours** (paid or no MIT equivalent): drag context menu, slash command menu, table of contents view, find bar, table controls.

`copy-anchor-link-button` is the direct consumer of `UniqueID` — it produces the stable fragment AC-9 requires.

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
| 0 | React 19 compatibility spike: install 3–4 representative MIT components, record what breaks | — |
| 1 | Provider seam, extension assembly, `history` guard, UniqueID | 1, 2, 3 |
| 2 | Formatting marks, config-driven toolbar, 13 block types incl. callout | 4, 5, 19 |
| 3 | Pure logic modules; slash menu; bubble toolbar | 6, 7 |
| 4 | Block handle, menu, drag reorder, copy block link | 8, 9 |
| 5 | Tables with controls; code + lowlight; math + KaTeX; links; emoji | 10, 11, 12 |
| 6 | Markdown rules verification, paste rules, TOC block, find bar | 13, 14, 15, 16 |
| 7 | Autosave status, responsive/adaptive toolbar, theme audit, dependency audit | 17, 18, 20 |

Phase 0 gates the sourcing decisions in phases 3–5.

## Consequences

- The editor keeps its cancelled provider until the migration lands. Acceptable because the seam confines it, but the account must stay live until then.
- Adopted MIT components are copied source under our maintenance. We do not receive upstream fixes; a broken component is ours to fix. That is the tradeoff that makes React 19 risk survivable.
- `document-editor.tsx` is substantially restructured. Its existing test at `src/features/project-workspace/editor-pane-router.test.tsx` may need updating.
- `@tiptap/extension-drag-handle-react` lists `@tiptap/extension-collaboration`, `@tiptap/y-tiptap`, `yjs`, and `y-protocols` as peer dependencies. The Yjs packages therefore install during this spec and sit unused beside the current provider. Deliberate and documented rather than a surprise during the migration.
- `DocumentSnapshot` stays empty. Documents remain recoverable only from the provider until the migration writes the mirror — the same export deadline recorded in the realtime feature docs.
- No image support. A documentation editor without images is a real gap, and it is deferred because object storage is a genuine infrastructure decision rather than an editor feature.
- Roughly 18 new direct dependencies plus 4 transitive Yjs peers, all free. Direct: `extension-underline`, `-highlight`, `-superscript`, `-subscript`, `-text-align`, `-task-list`, `-task-item`, `-table`, `-code-block-lowlight`, `-mathematics`, `-link`, `-emoji`, `-unique-id`, `-drag-handle`, `-drag-handle-react`, `-node-range`, plus `lowlight` and `katex`. Peers pulled in by the drag handle: `extension-collaboration`, `y-tiptap`, `yjs`, `y-protocols`. Note `extension-color` and `extension-text-style` are **already installed** but unwired, and Tiptap v3 may split the table extension into separate row/cell/header packages — confirm the exact set at install rather than trusting this list.

## Follow-up

- **Hocuspocus/Yjs migration** — rewrites `collaboration-provider.ts`, writes `DocumentSnapshot` via `onStoreDocument`, adds presence. See [`docs/features/realtime-collaboration/`](../features/realtime-collaboration/README.md).
- **Images + object storage** — needs a provider decision (S3-compatible, R2, or Supabase Storage) before the editor work.
- **MCP document tools** — `read_document`, `read_block`, `search_document`, `create_block`, `update_block`, `delete_block`, `move_block`, `apply_document_patch`. Requires the Postgres mirror and consumes the stable IDs this spec establishes.
- **Mentions** — needs a user directory; extends to `@agent`, `@document`, `@diagram`.
- **AI inline editing and suggestions** — direct and suggest write modes, built on the MCP layer rather than paid Content AI.
- **Comments** — anchored to `documentId` + `blockId`, stored outside document content.
- **Internal LiveFlows references** — document → diagram, block → diagram node.
- `docs/scope/scope.md` has no row for this work and should gain one.

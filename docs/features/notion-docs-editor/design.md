# Notion-Style Document Editor — Design

**Status**: Approved, not yet built
**Requirements**: [requirements.md](./requirements.md)
**Full spec**: [`docs/specs/0006-document-editor.md`](../../specs/0006-document-editor.md)
**Blocked by (partially)**: [realtime-collaboration](../realtime-collaboration/design.md) owns persistence and presence

## Where we start from

`src/features/document/document-editor.tsx` is 188 lines. It mounts `StarterKit` plus the Liveblocks Tiptap extension (`:5`, `:26`) inside a `RoomProvider`, and roughly 120 of those lines are six toolbar buttons with duplicated Tailwind — bold, italic, strike, H1, H2, bullet list.

Four Tiptap packages are installed. Two of them — `@tiptap/extension-color` and `@tiptap/extension-text-style` — are installed but never wired into the editor.

`DocumentSnapshot` exists in `prisma/schema.prisma` with `content Json @default("{}")` and **zero writes anywhere in `src/`** (verified). Document content lives only in the collaboration provider.

## Architecture

Everything turns on one idea: **the collaboration provider is a single module, and nothing else imports it.**

```
src/features/document/
├── document-editor.tsx          composition only
├── collaboration-provider.ts    ← THE SEAM. Only vendor-aware file.
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

### The seam

```ts
// collaboration-provider.ts
export type ProviderStatus = "connecting" | "connected" | "disconnected" | "failed";

export function useCollaborationExtension(roomId: string): Extension;
export function useProviderStatus(): ProviderStatus;
export const PROVIDER_MANAGES_HISTORY = true;
```

Today these wrap `useLiveblocksExtension()` and Liveblocks' `useStatus`. The Hocuspocus migration rewrites the bodies and **no other file changes**. That is the entire editor-side migration surface.

Two details make this mechanical rather than aspirational:

- **`PROVIDER_MANAGES_HISTORY`** is read by `extensions/index.ts` to decide whether to disable StarterKit's `history`. Expressing it as a value the provider *exports* — rather than a hardcoded `false` buried in the extension list — is what keeps it correct when the provider changes. y-prosemirror and Liveblocks each bring their own undo manager; running StarterKit's alongside corrupts undo.
- **`ProviderStatus`** is a normalized union, not Liveblocks' status strings. The autosave banner consumes this, so it survives the swap untouched.

### Why `document-editor.tsx` shrinks

Adding roughly 20 more formatting controls as inline JSX would push the file past 600 lines of near-identical markup. The toolbar becomes config-driven from shared button descriptors, and the file's job narrows to composition: provider, extensions, UI shells.

This is the file the work has to edit anyway. It is a targeted improvement, not unrelated refactoring.

## Extensions

### Formatting

The seven marks StarterKit does not cover:

```
@tiptap/extension-underline · -highlight · -text-style · -color
@tiptap/extension-superscript · -subscript · -text-align
```

`text-style` is a **required peer** of `color` — installing color alone silently does nothing. Both are already in `package.json`, unwired.

### Blocks — 13 types

| Block | Source |
|---|---|
| Paragraph, H1–H3, bullet/numbered list, blockquote, divider | StarterKit |
| Task list | `@tiptap/extension-task-list` + `-task-item` |
| Table | `@tiptap/extension-table` |
| Code block | `CodeBlockLowlight` + `lowlight` |
| Math (inline + block) | `@tiptap/extension-mathematics` + `katex` |
| Callout | Custom node |
| Table of contents | Custom node |

**`CodeBlockLowlight` replaces StarterKit's `codeBlock`.** StarterKit must be configured `codeBlock: false`. Registering both throws a duplicate-node-name error at editor construction — loud, but baffling if you do not know the cause.

**Register lowlight languages individually.** `lowlight/all` pulls ~190 grammars, a substantial bundle cost for a docs editor. Ten: TypeScript, JavaScript, Python, SQL, JSON, Bash, YAML, Go, Rust, Java.

**Callout** is a container node holding block content, with `emoji` and `variant` (`info` / `warning` / `success` / `danger`), rendered through a React node view so it inherits `DESIGN.md` tokens instead of shipping Tiptap-flavored CSS.

**Table of contents is a block, not a sidebar** — matching the reference template. It travels with the content, and an agent reading document JSON sees the structure. Its node view calls the pure `lib/outline.ts` extractor.

### Stable block IDs

```ts
UniqueID.configure({
  types: ["heading", "paragraph", "bulletList", "orderedList", "taskList",
          "blockquote", "codeBlock", "table", "callout", "blockMath"],
  filterTransaction: (tx) => !isChangeOrigin(tx),
})
```

**The `filterTransaction` guard is mandatory.** Without it every remote sync regenerates every ID, which silently breaks block links now and every MCP tool and comment anchor later. There is a dedicated test for ID survival across split, merge, undo, and redo.

`@tiptap/extension-unique-id` is in the **free** namespace — verified against current docs, installs with no auth token.

## Licensing

Verified rather than assumed, because §35 of the brief makes it a hard constraint.

| Capability | Package | Status |
|---|---|---|
| Stable block IDs | `@tiptap/extension-unique-id` | Free |
| Math | `@tiptap/extension-mathematics` + `katex` | Free |
| Drag handles | `@tiptap/extension-drag-handle-react` | Free — **not used**, see below |
| Comments, Content AI, DOCX conversion | `@tiptap-pro/*` | **Paid — excluded** |

In Tiptap v3 several extensions moved from `@tiptap-pro/` to the free `@tiptap/` namespace. The still-paid set maps exactly onto what this spec defers anyway.

**The linked Notion-like template is paid.** Its own page states: *"You're using the Notion-like template, available for paid users"*, and names the AI Assistant, advanced color palettes, and context menus as paid-only. Used as **UX reference only**.

## UX layer sourcing

**Every UI surface is a LiveFlows component. No Tiptap UI Component is installed and `npx @tiptap/cli add` is never run.**

Tiptap UI Components are MIT where the underlying extension is open source, and are copied source rather than an npm package. Adoption was the initial plan and was reversed after inspecting this repository. Three costs are certain and one is merely unmeasured:

| Cost | Certainty |
|---|---|
| Components ship `.scss`; this repo has **zero `.scss` files and no Sass toolchain** | Certain |
| Components carry a parallel `--tt-*` token vocabulary; `DESIGN.md` mandates `--ink` / `--accent` / `--line` and forbids raw hex in JSX | Certain |
| Each component pulls in its own primitives, hooks, and icons, competing with `src/components/ui/` and `icon.tsx` | Certain |
| Their docs target React 18 / Next 15; this repo is React 19.2.8 / Next 16.3.0 with React Compiler on | Unmeasured |

React 19 was the original concern and is the *weakest* of the four. The styling and file-volume costs apply regardless of whether anything compiles.

The decisive point: **what adoption would save is already built here.** `@dnd-kit` drives drag on five surfaces (`file-tree`, `tab-bar`, `dnd-coordinator`, `file-tree-dnd-context`, `project-workspace-view`), and `src/components/ui/` provides `button`, `input`, `modal-dialog`, `icon`, `status-pill` with an a11y test suite alongside. Adopting would import foreign solutions to problems this repo does not have.

What each surface is built on instead:

| Surface | Foundation |
|---|---|
| Bubble toolbar | Tiptap `BubbleMenu` positioning + `ui/button.tsx` |
| Slash menu | Tiptap `Suggestion` trigger + own dropdown |
| Block handle + menu | `@dnd-kit` + `posAtCoords` bridge (below) |
| Color / highlight pickers | Own popover on `ui/button.tsx` + design tokens |
| Emoji picker | `@tiptap/extension-emoji` data + own `Suggestion` UI |
| Table controls | Own overlay on `@tiptap/extension-table` commands |
| Copy block link | Own action reading the `UniqueID` attribute |
| Find bar | Own ProseMirror decoration plugin |

**Their MIT source stays a reading reference.** Worth reading before writing the block handle and the copy-block-link action — the two non-obvious surfaces.

**Accessibility is ours as a direct consequence.** Popovers and dropdowns need focus management, roving tabindex, and correct ARIA. `ui/modal-dialog.tsx` sets the focus-trap pattern and `ui-primitives.test.tsx` sets the test idiom, but a popover is not a dialog. Every menu surface gets an a11y test beside its behavior test.

### The `posAtCoords` bridge

Choosing `@dnd-kit` over `@tiptap/extension-drag-handle-react` opens one real gap, named here rather than found mid-implementation.

`@dnd-kit` understands DOM elements and pointer coordinates. It has no concept of a ProseMirror node or document position — which is most of what the Tiptap drag-handle extension provides.

Block drag therefore needs a small bridge:

```ts
// ui/block-handle/pos-at-coords.ts
function blockAtCoords(view: EditorView, coords: { x: number; y: number }):
  { pos: number; node: Node; domEl: HTMLElement } | null;
```

It calls `view.posAtCoords`, walks up to the nearest block-level ancestor, and returns the position plus the DOM element `@dnd-kit` needs as a drag source. Reordering then issues a ProseMirror transaction — delete at source, insert at target — rather than mutating the DOM.

Half a day, with two edge cases to handle explicitly: coordinates landing in the gap between blocks, and nested structures where the nearest block sits inside a table cell or list item (the outer block is the drag unit, not the inner one).

### Taken from the reference template

Five details worth stealing, independent of implementation:

1. **`⠿` hover handle** serving both click-menu and drag — which is why block menu and right-click menu collapse into one component instead of two divergent ones.
2. **Table of contents as an in-document block.**
3. **Rich table controls** — row/column handles, `+` extend buttons, drag-to-reorder rows, cell selection for merge. Meaningfully beyond `@tiptap/extension-table` defaults, so tables carry real custom UI work.
4. **Checklist as a first-class documentation pattern**, not merely a task-list node.
5. **`/ask ai` lives in the context menu** — a slot is reserved and disabled so the later AI spec does not restructure the menu.

**Cut deliberately:** cut/copy/paste from the context menu. Native browser behavior in a contenteditable is already correct, and reimplementing it across platforms is real cost for zero gain.

## Pure logic

Three modules with no React and no editor instance, testable without jsdom or a live editor. This mirrors how `element-sync.ts` is isolated on the canvas side.

| Module | Contract |
|---|---|
| `lib/outline.ts` | `extractOutline(doc: JSONContent): OutlineEntry[]` — id, level, text |
| `lib/slash-commands.ts` | `SLASH_COMMANDS` + `filterCommands(query, commands)` |
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

Keeping the registry as plain data means the whole command set is unit-testable — filtering, aliases, grouping — and adding a command later is one array entry, not a component change.

## Markdown and paste

**Markdown input rules need no work.** StarterKit's nodes already ship them for `#`, `##`, `-`, `1.`, `>`, and code fences. The only addition is input rules on the custom Callout node.

**Paste is mostly free.** ProseMirror parses pasted HTML against the schema and drops anything unmatched, which is inherently sanitizing — scripts and unmatched tags cannot survive because no node holds them. The gap worth closing is Google Docs, which wraps content in `<b style="font-weight:normal">` and produces spurious bold. One paste rule, not a general sanitizer.

## Persistence — and the contradiction it resolves

The originating brief claimed both "ProseMirror JSON is canonical, Postgres stores it" and "Yjs is the realtime foundation." Both cannot own the document.

**Resolution**, matching the canvas architecture that `AGENTS.md` warns against inverting:

| Concern | Owner |
|---|---|
| Live document while editing | Collaboration provider — source of truth |
| Document mirror for lists, search, outage fallback, agent reads | `DocumentSnapshot.content` — ProseMirror JSON |

So the brief is right that **ProseMirror JSON is the canonical persisted format** — never HTML. It is wrong only if read as "Postgres is authoritative during editing." A Yjs update log is a CRDT transport, not a queryable document format.

**This spec writes no mirror, deliberately.** Filling `DocumentSnapshot` belongs to the Hocuspocus migration, where `onStoreDocument` is the natural hook. A debounced client save now would be scaffolding the migration deletes, and worse, a second writer racing the provider.

Consequence: documents remain recoverable only from the provider until the migration lands — the same export deadline recorded in [realtime-collaboration](../realtime-collaboration/requirements.md).

**Autosave UI ships now** because it is provider-agnostic: `Saving… / Saved / Connection lost / Read-only`, driven by `useProviderStatus()`. The existing offline banner at `document-editor.tsx:49-60` generalizes into it.

## Error handling

| Failure | Behavior |
|---|---|
| Provider disconnect | Banner via `ProviderStatus`; editor stays editable; provider queues |
| Malformed `DocumentSnapshot` on fallback read | Read-only empty doc with a warning; never crash the route |
| Invalid LaTeX | Render raw source with an error style; never throw — a formula typo must not blank the document |
| Unknown code language | Fall back to plain text |

## Testing

Repo split is load-bearing: `*.test.ts` → Vitest, `*.spec.ts` → Playwright (`vitest.unit.config.ts:11-22` documents why).

**Pure unit — no editor, no jsdom.** Highest value: fast and deterministic.
- Outline extraction incl. skipped heading levels and empty documents
- Slash command filtering, alias matching, grouping

**Editor integration** (jsdom + `@testing-library/react`), asserting on **document JSON, not DOM**:
- Every formatting mark toggles on and off
- All 13 block types insert and round-trip
- Markdown input rules
- **IDs persist across split, merge, undo, redo** — protects every downstream consumer
- Google Docs paste produces no spurious bold
- Invalid LaTeX renders without throwing
- `history` is absent from the extension list when the provider manages it

**E2E** (existing `e2e/` harness): slash menu inserts a block, bubble toolbar formats a selection, drag reorders two blocks, table add/remove row.

**Not tested here:** collaborative convergence and presence. They belong to the migration and cannot be meaningfully tested against a provider being replaced.

## Build phases

| Phase | Contents |
|---|---|
| 0 | Reference read (~2h) — read their MIT source for the block handle and copy-anchor-link patterns. No installs, no scratch branch, nothing written from it. |
| 1 | Provider seam, extension assembly, `history` guard, UniqueID |
| 2 | Formatting marks, config-driven toolbar, 13 block types incl. callout |
| 3 | Pure logic modules; slash menu; bubble toolbar |
| 4 | `posAtCoords` bridge, block handle, menu, drag reorder, copy block link |
| 5 | Tables with controls; code + lowlight; math + KaTeX; links; emoji |
| 6 | Markdown verification, paste rules, TOC block, find bar |
| 7 | Autosave status, responsive toolbar, theme audit, dependency audit |

Phase 0 is a read, not a spike. It gates nothing and can be skipped without blocking any phase — it exists only because the block handle and copy-block-link are the two non-obvious surfaces, and reading a working implementation is cheaper than rediscovering its edge cases.

## Consequences

- The editor keeps its cancelled provider until the migration lands. Acceptable because the seam confines it — but the account must stay live until then.
- Every UI surface is ours to maintain, including popover and dropdown accessibility. No upstream fixes arrive — but equally no foreign code, no Sass, no second token vocabulary.
- `document-editor.tsx` is substantially restructured; `src/features/project-workspace/editor-pane-router.test.tsx` may need updating.
- Block drag needs the `posAtCoords` bridge between `@dnd-kit` and ProseMirror positions. Half a day, two named edge cases.
- **No Yjs packages enter this spec.** Declining `@tiptap/extension-drag-handle-react` also declines its `@tiptap/extension-collaboration`, `@tiptap/y-tiptap`, `yjs`, and `y-protocols` peers, so those arrive with the migration that needs them.
- `DocumentSnapshot` stays empty.
- No image support. A real gap, deferred because object storage is an infrastructure decision rather than an editor feature.
- Roughly 14 new direct dependencies, all free, no transitive Yjs. Note
  `extension-color` and `extension-text-style` are **already installed** but
  unwired, `@dnd-kit` is already present, and Tiptap v3 may split the table
  extension into separate row/cell/header packages — confirm the exact set at
  install rather than trusting a written list.

## Deferred

Collaboration and presence, document persistence, MCP document tools, images + object storage, mentions, AI inline editing, suggestions, comments, internal LiveFlows references, workspace and semantic search.

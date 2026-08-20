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
| Drag handles | `@tiptap/extension-drag-handle-react` | Free |
| Comments, Content AI, DOCX conversion | `@tiptap-pro/*` | **Paid — excluded** |

In Tiptap v3 several extensions moved from `@tiptap-pro/` to the free `@tiptap/` namespace. The still-paid set maps exactly onto what this spec defers anyway.

**The linked Notion-like template is paid.** Its own page states: *"You're using the Notion-like template, available for paid users"*, and names the AI Assistant, advanced color palettes, and context menus as paid-only. Used as **UX reference only**.

## UX layer sourcing

Tiptap UI Components are MIT where the underlying extension is open source. They are **not an npm package** — `npx @tiptap/cli@latest add <component>` copies source into the repo, which we then own and edit.

**The risk:** their docs say the components *"work best with React 18 (and corresponding framework versions like Next.js 15)."* LiveFlows is locked to React 19.2.8 / Next 16.3.0 with React Compiler on. Compatibility is unknown per component.

**The approach:** install per component into a scratch branch, keep what survives React 19, restyle to `DESIGN.md` tokens either way, build our own where it breaks or is paid. Because the code lives in our repo, a broken component is ours to fix rather than a dependency to fight. **Phase 0 is a compatibility spike** so breakage is measured before phases 3–5 are planned around it.

| Adopt-first (MIT) | Build ours |
|---|---|
| blockquote button, code-block button | drag context menu (paid) |
| color-highlight-popover, color-text-popover | slash command menu |
| duplicate-button, delete-node-button | table of contents view |
| **copy-anchor-link-button** | find bar |
| emoji-dropdown-menu, emoji-trigger-button | table controls |
| Button / DropdownMenu / Popover primitives | |

`copy-anchor-link-button` is the direct consumer of `UniqueID` — it produces the stable fragment that must survive edits elsewhere in the document.

Note their components ship neutral styling while `DESIGN.md` mandates a Light SaaS token set and **forbids raw hex in JSX**. Every adopted component needs restyling regardless of whether it compiles.

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
| 0 | React 19 compatibility spike — install 3–4 representative MIT components, record breakage |
| 1 | Provider seam, extension assembly, `history` guard, UniqueID |
| 2 | Formatting marks, config-driven toolbar, 13 block types incl. callout |
| 3 | Pure logic modules; slash menu; bubble toolbar |
| 4 | Block handle, menu, drag reorder, copy block link |
| 5 | Tables with controls; code + lowlight; math + KaTeX; links; emoji |
| 6 | Markdown verification, paste rules, TOC block, find bar |
| 7 | Autosave status, responsive toolbar, theme audit, dependency audit |

Phase 0 gates the sourcing decisions in phases 3–5.

## Consequences

- The editor keeps its cancelled provider until the migration lands. Acceptable because the seam confines it — but the account must stay live until then.
- Adopted MIT components are copied source under our maintenance. No upstream fixes. That is the tradeoff that makes the React 19 risk survivable.
- `document-editor.tsx` is substantially restructured; `src/features/project-workspace/editor-pane-router.test.tsx` may need updating.
- **`@tiptap/extension-drag-handle-react` lists `@tiptap/extension-collaboration`, `@tiptap/y-tiptap`, `yjs`, and `y-protocols` as peers.** The Yjs packages install during this spec and sit unused beside the current provider. Deliberate, not a surprise during migration.
- `DocumentSnapshot` stays empty.
- No image support. A real gap, deferred because object storage is an infrastructure decision rather than an editor feature.
- Roughly 18 new direct dependencies plus 4 transitive Yjs peers, all free. Note
  `extension-color` and `extension-text-style` are **already installed** but
  unwired, and Tiptap v3 may split the table extension into separate
  row/cell/header packages — confirm the exact set at install rather than
  trusting a written list.

## Deferred

Collaboration and presence, document persistence, MCP document tools, images + object storage, mentions, AI inline editing, suggestions, comments, internal LiveFlows references, workspace and semantic search.

# Task 11 — Table of contents block, find bar, markdown and paste verification

**Wave:** 5 (parallel with task-12)
**Depends on:** task-02 (`extractOutline`, `stripGoogleDocsBold`), task-04
**ACs:** 13, 14, 15, 16
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) §7 and `DESIGN.md`

## Goal

Two features plus two verifications:

- A table-of-contents **block** that lists H1–H3 and navigates to them
- A find bar with next/previous
- Confirm markdown input rules work (they should need no code)
- Wire task 02's Google Docs paste rule into the editor

## Files

- **Create:** `src/features/document/extensions/toc.ts`
- **Create:** `src/features/document/extensions/toc.test.tsx`
- **Create:** `src/features/document/ui/toc-view.tsx` + `.test.tsx`
- **Create:** `src/features/document/extensions/find.ts`
- **Create:** `src/features/document/ui/find-bar.tsx` + `.test.tsx`
- **Create:** `src/features/document/extensions/markdown-rules.test.tsx`
- **Create:** `src/features/document/extensions/paste-handler.ts` + `.test.tsx`
- **Modify:** `src/features/document/extensions/index.ts` — append entries
- **Modify:** `src/features/document/document-editor.tsx` — fill `findSlot` only

## Interfaces

**Consumes:**

```ts
import { extractOutline, type OutlineEntry } from "../lib/outline";      // task 02
import { stripGoogleDocsBold } from "../lib/paste-rules";                 // task 02
```

**Produces:**

```ts
export const Toc: Node;                    // node name: "toc"
export const findExtension: Extension;     // ProseMirror decoration plugin
export function FindBar(props: { editor: Editor }): JSX.Element;
```

## Context

**The TOC is a block, not a sidebar.** This follows the reference template and is
a deliberate spec decision: it travels with the content, and an agent reading
`DocumentSnapshot.content` sees the document structure. A sidebar would be
invisible to both.

**The TOC node holds no content.** It is an atom whose node view derives its
display from the *current* document via `extractOutline(editor.getJSON())`. Do not
store the heading list in the node's attributes — it would go stale the moment a
heading changes, and it would bloat every saved document.

```ts
{ name: "toc", group: "block", atom: true, selectable: true, draggable: true }
```

**`toc` is already in task 02's `SlashAction` union**, so task 05's slash menu
starts offering it automatically once this node registers — that is why task 05
guarded unavailable actions.

**Navigation uses stable block IDs** from task 01's UniqueID. Clicking an entry
scrolls to `[data-id="<id>"]`. If `extractOutline` returns `id: null` for a
heading, that heading predates UniqueID or `heading` fell out of `ID_TYPES` —
render it as non-clickable rather than guessing a position.

**Find is text-only.** Locate, highlight, next, previous. Deliberately **no
replace**, no regex, no whole-word toggle — the spec cut those because that is
where this feature grows teeth. Workspace and semantic search are separate,
deferred features.

Implement it as a ProseMirror plugin producing `Decoration.inline` for matches,
with one decoration class for matches and another for the current match. Keep the
query in plugin state, updated via a transaction meta key.

**Markdown rules need no implementation.** StarterKit already ships input rules
for `#`, `##`, `###`, `-`, `1.`, `>`, and fenced code. This task only *verifies*
them, so AC-13 is proven rather than assumed. If a rule does not fire, report it —
do not write a replacement rule.

**Paste handling is one rule, not a sanitizer.** ProseMirror already drops
unmatched tags and scripts because no schema node holds them. The single real gap
is Google Docs' `<b style="font-weight:normal">` wrapper. Wire task 02's pure
function into a `transformPastedHTML` handler.

---

## Step 1: Verify markdown rules

Create `extensions/markdown-rules.test.tsx`. This is verification, so write it
first and expect it to pass immediately against the existing extension set.

Use `buildExtensions` from task 01 with a stub collaboration extension, then
simulate typing. Cover:

- `# ` produces a level-1 heading
- `## ` produces level 2
- `### ` produces level 3
- `- ` produces a bullet list
- `1. ` produces an ordered list
- `> ` produces a blockquote
- ` ``` ` produces a code block
- ` ```ts ` produces a code block with `language: "typescript"`
- `#### ` (level 4) does **not** produce a heading, since only 1–3 are configured

Typing is simulated with `editor.commands.insertContent("# ")` after placing the
cursor in an empty paragraph. If input rules do not fire that way, use
`editor.view.someProp("handleTextInput")` or dispatch the text through
`view.dispatchEvent` — whichever the version supports.

## Step 2: Wire and test paste handling

Create `extensions/paste-handler.ts`:

```ts
import { Extension } from "@tiptap/core";
import { stripGoogleDocsBold } from "../lib/paste-rules";

/**
 * ProseMirror already sanitizes by construction — pasted HTML is matched against
 * the schema and anything unmatched is dropped. The one real gap is Google Docs,
 * which wraps copied content in <b style="font-weight:normal">, so everything
 * pasted from Docs arrives bold.
 */
export const pasteHandler = Extension.create({
  name: "liveflowsPasteHandler",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => stripGoogleDocsBold(html),
        },
      }),
    ];
  },
});
```

Test in `paste-handler.test.tsx`: pasting Google Docs HTML produces no `bold` mark
in the resulting document JSON, while pasting genuine `<b>` content does.

## Step 3: Build the TOC node and view

`extensions/toc.ts`: an atom node with `parseHTML` on
`div[data-type="toc"]`, matching `renderHTML`, a `ReactNodeViewRenderer(TocView)`,
and an `insertToc()` command declared on the `Commands` interface.

`ui/toc-view.tsx`: calls `extractOutline(editor.getJSON())` on each render,
subscribing to editor updates so it stays current. Renders:

- A heading "On this page"
- Nested list indented by `level`
- Each entry a `<button>` scrolling `[data-id]` into view
- Entries with `id: null` rendered as plain non-interactive text
- Empty state: "No headings yet" when the outline is empty
- `<nav aria-label="Table of contents">` wrapper
- `contentEditable={false}` on the whole view — it is derived, not editable
- Tokens only: `--ink`, `--ink-soft`, `--accent` for hover, `--line` for the border

Tests for the view: renders one entry per heading, indents by level, clicking
calls `scrollIntoView` on the right element, `id: null` entries are not buttons,
empty state renders, passes axe.

## Step 4: Build find

`extensions/find.ts`: a plugin with state `{ query, matches, currentIndex }`,
recomputing matches on doc change, exposing meta actions `setQuery`, `next`,
`prev`. Decorations: `.find-match` for all, `.find-match-current` for the active
one. Style both in `globals.css` using `--warn-soft` and `--accent-soft`.

`ui/find-bar.tsx`: an input plus previous/next buttons and an "n of m" counter.

- Input labelled "Find in document"
- Enter goes to next, Shift+Enter to previous, Escape closes and clears
  decorations
- Counter uses `aria-live="polite"` so results are announced
- Buttons disabled when there are no matches
- Opens on `Cmd/Ctrl+F` — **and must call `preventDefault()`** so the browser's own
  find does not also open

Tests: finds a match, reports the count, next advances and wraps, previous wraps
backward, no-match shows "0 of 0" and disables buttons, Escape clears, passes axe.

## Step 5: Register everything

In `extensions/index.ts`, append the TOC, find, and paste-handler entries. Tasks
09 and 10 finished in wave 4, so their lines exist — **append below them, do not
reorder**.

Wire `<FindBar editor={editor} />` into `findSlot` in `document-editor.tsx`.

## Step 6: Verify

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
```

By hand: insert a TOC via `/toc`, add headings and watch it update, click an entry
and confirm it scrolls; press Cmd+F, search, cycle matches; paste from a Google Doc
and confirm no stray bold.

## Step 7: Commit

```bash
git add src/features/document src/app/globals.css
git commit -m "feat(editor): add TOC block, find bar, and paste normalization

TOC is a block whose view derives from the live document rather than storing a
stale heading list. Find is text-only by design — no replace, no regex. Markdown
input rules verified as already working via StarterKit."
```

Update [`progress.md`](./progress.md): task 11 `done`, tick AC-13, AC-14, AC-15,
AC-16.

## Done when

- [ ] All six test files pass, including axe checks
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Verified by hand
- [ ] Committed, `progress.md` updated

## Do not

- Store the heading list in the TOC node's attributes
- Build a sidebar; the TOC is an in-document block
- Add replace, regex, or whole-word to find
- Write replacement markdown input rules; StarterKit's already work
- Add a general HTML sanitizer
- Forget `preventDefault()` on Cmd+F
- Reorder another task's line in `extensions/index.ts`
- Use raw hex colors

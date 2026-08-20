# Task 07 — `posAtCoords` bridge

**Wave:** 3 (parallel with task-05, task-06)
**Depends on:** task-01
**ACs:** 8 (foundation)
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Build the one piece of genuinely novel logic in this batch: a function mapping
pointer coordinates to a ProseMirror block position and its DOM element.

This exists because the spec chose `@dnd-kit` — already driving drag on five
surfaces — over `@tiptap/extension-drag-handle-react`. `@dnd-kit` understands DOM
elements and coordinates; it has no concept of a document node. Task 08 cannot
start without this.

## Files

- **Create:** `src/features/document/ui/block-handle/pos-at-coords.ts`
- **Create:** `src/features/document/ui/block-handle/pos-at-coords.test.tsx`

Nothing else. No UI, no extension registration, no editor changes.

## Interfaces

**Produces** — task 08 consumes these:

```ts
export type BlockTarget = {
  pos: number;          // ProseMirror position of the block's start
  node: ProseMirrorNode;
  domEl: HTMLElement;   // the drag source @dnd-kit needs
  depth: number;        // resolved depth, for choosing the outer block
};

export function blockAtCoords(
  view: EditorView,
  coords: { x: number; y: number },
): BlockTarget | null;

export function moveBlock(
  view: EditorView,
  fromPos: number,
  toPos: number,
): boolean;
```

## Context

**How this works.** `view.posAtCoords({ left, top })` returns
`{ pos, inside } | null`. From `pos`, resolve to a `$pos` and walk *up* the node
tree to the outermost block-level ancestor at depth 1 — a direct child of the
document. That is the drag unit.

**The two edge cases the spec named**, both of which have tests here:

1. **Coordinates in the gap between blocks.** `posAtCoords` can return `null`, or
   a position inside a parent that is not a block. Return `null` rather than
   guessing — task 08 shows no handle in that case.
2. **Nested blocks.** A paragraph inside a table cell, or inside a list item,
   resolves to depth 3+. Dragging the inner paragraph out of its table would
   corrupt the structure. **Always return the depth-1 ancestor**, so the drag unit
   is the table or the list, never a cell's contents.

**Why `moveBlock` lives here too.** Reordering must be a ProseMirror transaction —
delete at source, insert at target — never a DOM mutation. Putting it beside the
coordinate logic keeps all position arithmetic in one tested module, and keeps
task 08 purely presentational.

**Position arithmetic is the subtle part.** After deleting the source node,
positions after it shift left by the node's size. `moveBlock` must account for
this when the target is after the source. Get this wrong and blocks land one slot
off, or the transaction throws `Position out of range`.

**jsdom limitation.** `posAtCoords` relies on real layout, and jsdom has none —
`getBoundingClientRect` returns zeros. So the coordinate tests must **stub the
view** rather than measure a real one. `moveBlock` needs no layout and is tested
against a real editor.

---

## Step 1: Write the tests

Create `ui/block-handle/pos-at-coords.test.tsx`:

```tsx
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { blockAtCoords, moveBlock } from "./pos-at-coords";

function makeEditor(content: string) {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false })],
    content,
  });
}

function paragraphTexts(editor: Editor): string[] {
  const out: string[] = [];
  editor.state.doc.forEach((node) => out.push(node.textContent));
  return out;
}

/**
 * jsdom has no layout, so posAtCoords cannot work against a real view.
 * These stubs return a chosen position, letting us test the walk-up logic.
 */
function stubView(editor: Editor, posAtCoordsResult: { pos: number } | null) {
  return {
    state: editor.state,
    posAtCoords: () => posAtCoordsResult,
    nodeDOM: () => document.createElement("div"),
    domAtPos: () => ({ node: document.createElement("div"), offset: 0 }),
  } as never;
}

describe("blockAtCoords", () => {
  it("returns null when posAtCoords finds nothing (gap between blocks)", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    const result = blockAtCoords(stubView(editor, null), { x: 0, y: 0 });

    expect(result).toBeNull();
    editor.destroy();
  });

  it("resolves a position inside the first paragraph to that paragraph", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    // Position 2 is inside the first paragraph's text.
    const result = blockAtCoords(stubView(editor, { pos: 2 }), { x: 0, y: 0 });

    expect(result).not.toBeNull();
    expect(result?.node.textContent).toBe("one");
    expect(result?.depth).toBe(1);
    editor.destroy();
  });

  it("resolves a position in the second paragraph to that paragraph", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    const result = blockAtCoords(stubView(editor, { pos: 8 }), { x: 0, y: 0 });

    expect(result?.node.textContent).toBe("two");
    editor.destroy();
  });

  // The nesting edge case. Dragging a list item's paragraph out of the list
  // would corrupt the document, so the outer block must win.
  it("returns the outer list, not the inner paragraph, for nested content", () => {
    const editor = makeEditor("<ul><li><p>deep</p></li></ul>");
    const result = blockAtCoords(stubView(editor, { pos: 4 }), { x: 0, y: 0 });

    expect(result?.node.type.name).toBe("bulletList");
    expect(result?.depth).toBe(1);
    editor.destroy();
  });

  it("returns the outer blockquote for content nested inside it", () => {
    const editor = makeEditor("<blockquote><p>quoted</p></blockquote>");
    const result = blockAtCoords(stubView(editor, { pos: 3 }), { x: 0, y: 0 });

    expect(result?.node.type.name).toBe("blockquote");
    editor.destroy();
  });

  it("reports the block's start position, not the inner text position", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    const result = blockAtCoords(stubView(editor, { pos: 8 }), { x: 0, y: 0 });

    // Second paragraph starts at 6 in a doc of <p>one</p><p>two</p>.
    expect(result?.pos).toBe(6);
    editor.destroy();
  });

  it("returns null for a position outside the document", () => {
    const editor = makeEditor("<p>one</p>");
    const result = blockAtCoords(stubView(editor, { pos: 9999 }), { x: 0, y: 0 });

    expect(result).toBeNull();
    editor.destroy();
  });
});

describe("moveBlock", () => {
  it("moves a block forward", () => {
    const editor = makeEditor("<p>a</p><p>b</p><p>c</p>");
    const view = editor.view;

    // Move "a" (pos 0) to after "c".
    moveBlock(view, 0, editor.state.doc.content.size);

    expect(paragraphTexts(editor)).toEqual(["b", "c", "a"]);
    editor.destroy();
  });

  it("moves a block backward", () => {
    const editor = makeEditor("<p>a</p><p>b</p><p>c</p>");
    // "c" starts at 12 in this doc; move it to the front.
    const cPos = 12;
    moveBlock(editor.view, cPos, 0);

    expect(paragraphTexts(editor)).toEqual(["c", "a", "b"]);
    editor.destroy();
  });

  it("is a no-op when source and target are the same", () => {
    const editor = makeEditor("<p>a</p><p>b</p>");
    const before = paragraphTexts(editor);
    moveBlock(editor.view, 0, 0);

    expect(paragraphTexts(editor)).toEqual(before);
    editor.destroy();
  });

  it("returns false for an invalid source position", () => {
    const editor = makeEditor("<p>a</p>");
    expect(moveBlock(editor.view, 9999, 0)).toBe(false);
    editor.destroy();
  });

  it("preserves block content and type when moving", () => {
    const editor = makeEditor("<h1>title</h1><p>body</p>");
    moveBlock(editor.view, 0, editor.state.doc.content.size);

    const types: string[] = [];
    editor.state.doc.forEach((n) => types.push(n.type.name));
    expect(types).toEqual(["paragraph", "heading"]);
    editor.destroy();
  });

  it("keeps the document valid after several moves", () => {
    const editor = makeEditor("<p>a</p><p>b</p><p>c</p>");
    moveBlock(editor.view, 0, editor.state.doc.content.size);
    moveBlock(editor.view, 0, editor.state.doc.content.size);

    expect(paragraphTexts(editor)).toHaveLength(3);
    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });
});
```

The exact positions above depend on ProseMirror's position model. If an assertion
fails, log `editor.state.doc.toString()` and adjust the *test's* position
constants — do not weaken the assertion.

## Step 2: Run and confirm failure

```bash
pnpm vitest run src/features/document/ui/block-handle
```

## Step 3: Implement

Create `ui/block-handle/pos-at-coords.ts`:

```ts
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Bridges @dnd-kit (DOM elements and pointer coordinates) to ProseMirror
 * (document positions and nodes).
 *
 * This exists because the spec chose @dnd-kit — already driving drag on five
 * surfaces in this repo — over Tiptap's drag-handle extension, which knows about
 * positions but would pull four Yjs peers in early. See
 * docs/features/notion-docs-editor/design.md.
 */

export type BlockTarget = {
  pos: number;
  node: ProseMirrorNode;
  domEl: HTMLElement;
  depth: number;
};

/**
 * Maps viewport coordinates to the outermost block containing them.
 *
 * Always returns the depth-1 ancestor — a direct child of the document — so a
 * paragraph inside a table cell yields the table, not the paragraph. Dragging
 * inner content out of its parent would corrupt the structure.
 *
 * Returns null when the coordinates fall between blocks or outside the document.
 */
export function blockAtCoords(
  view: EditorView,
  coords: { x: number; y: number },
): BlockTarget | null {
  const hit = view.posAtCoords({ left: coords.x, top: coords.y });
  if (!hit) return null;

  const { doc } = view.state;
  if (hit.pos < 0 || hit.pos > doc.content.size) return null;

  let $pos: ReturnType<typeof doc.resolve>;
  try {
    $pos = doc.resolve(hit.pos);
  } catch {
    return null;
  }

  // Walk up to depth 1: a direct child of the doc.
  if ($pos.depth === 0) return null;
  const depth = 1;
  const node = $pos.node(depth);
  const pos = $pos.before(depth);

  const dom = view.nodeDOM(pos);
  const domEl =
    dom instanceof HTMLElement
      ? dom
      : (view.domAtPos(pos).node as HTMLElement | null);

  if (!domEl) return null;

  return { pos, node, domEl, depth };
}

/**
 * Reorders a top-level block via a single transaction.
 *
 * Never mutates the DOM — ProseMirror owns the document, and a DOM mutation
 * would desync the collaborative provider.
 *
 * Position arithmetic: after deleting the source, every position after it shifts
 * left by the node's size. Targets beyond the source are adjusted accordingly.
 */
export function moveBlock(
  view: EditorView,
  fromPos: number,
  toPos: number,
): boolean {
  const { state } = view;
  const { doc, tr } = state;

  if (fromPos < 0 || fromPos >= doc.content.size) return false;

  const node = doc.nodeAt(fromPos);
  if (!node) return false;

  const size = node.nodeSize;
  if (toPos === fromPos) return true;

  const clamped = Math.max(0, Math.min(toPos, doc.content.size));
  const insertAt = clamped > fromPos ? clamped - size : clamped;

  try {
    tr.delete(fromPos, fromPos + size);
    tr.insert(insertAt, node);
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}
```

`@tiptap/pm` re-exports the ProseMirror packages, so no extra install is needed.
If those import paths fail, report rather than adding `prosemirror-*` directly.

## Step 4: Verify

```bash
pnpm vitest run src/features/document/ui/block-handle
pnpm build
pnpm lint
```

Expected: 13 tests.

## Step 5: Commit

```bash
git add src/features/document/ui/block-handle
git commit -m "feat(editor): add posAtCoords bridge between dnd-kit and ProseMirror

@dnd-kit knows DOM coordinates; ProseMirror knows document positions. This maps
between them, always resolving to the depth-1 ancestor so nested content is never
dragged out of its parent. Reordering is a transaction, never a DOM mutation."
```

Update [`progress.md`](./progress.md): task 07 `done`. Note that AC-8 is only
partially covered — task 08 completes it.

## Done when

- [ ] `pos-at-coords.test.tsx` passes, 13 tests
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Committed, `progress.md` updated

## Do not

- Return an inner node when a depth-1 ancestor exists
- Mutate the DOM to reorder; use a transaction
- Guess a position when `posAtCoords` returns null — return null
- Add `prosemirror-*` packages directly; use `@tiptap/pm/*`
- Build any UI here — that is task 08
- Try to test `posAtCoords` against a real view in jsdom; there is no layout

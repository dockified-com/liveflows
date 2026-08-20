# Task 08 — Block handle, menu, drag reorder, copy block link

**Wave:** 4 (parallel with task-09, task-10)
**Depends on:** task-07 (`blockAtCoords`, `moveBlock`)
**ACs:** 8, 9
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) §7 and `DESIGN.md`

## Goal

Hover a block, get a `⠿` handle beside it. Click it for a menu — duplicate,
delete, turn into, copy block link. Drag it to reorder.

## Files

- **Create:** `src/features/document/ui/block-handle/block-handle.tsx`
- **Create:** `src/features/document/ui/block-handle/block-handle.test.tsx`
- **Create:** `src/features/document/ui/block-handle/block-menu.tsx`
- **Create:** `src/features/document/ui/block-handle/block-menu.test.tsx`
- **Create:** `src/features/document/ui/block-handle/block-actions.ts` + `.test.tsx`
- **Modify:** `src/features/document/document-editor.tsx` — fill `blockHandleSlot` only

## Interfaces

**Consumes:**

```ts
import { blockAtCoords, moveBlock, type BlockTarget } from "./pos-at-coords";  // task 07
```

**Produces:**

```ts
// block-actions.ts — pure-ish editor operations, no React
export function duplicateBlock(view: EditorView, pos: number): boolean;
export function deleteBlock(view: EditorView, pos: number): boolean;
export function blockLinkFor(node: ProseMirrorNode): string | null;
export type TurnIntoTarget = "paragraph" | "heading1" | "heading2" | "heading3" | "bulletList" | "orderedList" | "blockquote" | "callout";
export function turnInto(view: EditorView, pos: number, target: TurnIntoTarget): boolean;
```

## Context

**Read `src/components/file-tree-dnd-context.tsx` first** for the established
`@dnd-kit` idiom: `useSensor(PointerSensor)`, `useSensor(KeyboardSensor)`,
`DragOverlay` rendered through `createPortal`, `closestCenter` collision
detection. Follow it rather than inventing a second drag pattern.

**Copy block link is the reason UniqueID landed in task 01.** The link is
`#block-<id>` read from the node's `id` attribute. AC-9 requires it to still
resolve after the document is edited elsewhere — which is exactly the property
task 01's UniqueID test protects. If `blockLinkFor` returns `null`, the node type
is not in task 01's `ID_TYPES` and that is a bug to report, not to work around.

**Reserve an `/ask ai` slot.** The reference template puts AI in this menu. Render
it **disabled** with a "Coming soon" hint so the later AI spec adds behavior
without restructuring the menu. This is a deliberate spec decision, not padding.

**Cut deliberately: no cut/copy/paste in the menu.** The browser's native
versions already work correctly in a contenteditable, and reimplementing them
across platforms is real cost for zero gain.

**The handle is positioned absolutely** relative to the editor container, driven
by the hovered block's `getBoundingClientRect()`. `document-editor.tsx` already
gives the content area `relative` (task 01), so the handle mounts inside it.

**Accessibility, per briefing §7.** The handle is a real `<button>`, reachable by
keyboard, with `aria-label="Block options"` plus `aria-expanded` /
`aria-controls`. The menu is `role="menu"` with `role="menuitem"` children, arrow
navigation, Escape returning focus to the handle. `modal-dialog.tsx` has **no**
focus trap — use the roving-tabindex pattern from `file-tree.tsx:135`.

Keyboard drag matters too: `@dnd-kit`'s `KeyboardSensor` makes reordering possible
without a mouse, which is why the file-tree wires it. Do the same.

---

## Step 1: Write the block-actions test

Create `block-actions.test.tsx`. Use a real editor (no layout needed for these).

Cover:

- `duplicateBlock` inserts an identical node directly after the source
- `duplicateBlock` preserves node type (heading stays a heading)
- `duplicateBlock` gives the copy a **different** block id (two blocks must not
  share an id — this is the subtle one; if UniqueID does not regenerate on insert,
  document it in `progress.md`)
- `deleteBlock` removes exactly one block and leaves siblings intact
- `deleteBlock` returns `false` for an invalid position
- `blockLinkFor` returns `#block-<id>` when the node has an id
- `blockLinkFor` returns `null` when the node has no id attribute
- `turnInto` converts a paragraph to each heading level
- `turnInto` converts a paragraph to a bullet list
- `turnInto` preserves the block's text content
- `turnInto` returns `false` for an invalid position
- The document remains valid (`doc.check()` does not throw) after each operation

## Step 2: Implement `block-actions.ts`

Plain functions taking `EditorView` and a position. No React. Each returns a
boolean success flag and dispatches a single transaction.

`turnInto` maps its target to the same commands task 05's `runSlashAction` uses —
`setNode("heading", { level })`, `toggleBulletList()`, `setCallout({})`. Guard
`callout` with an availability check so the function does not throw if task 04's
node is somehow absent.

## Step 3: Write the menu test

Create `block-menu.test.tsx`. Cover:

- Renders items: Duplicate, Delete, Turn into, Copy block link, Ask AI
- Ask AI is present but `disabled`
- `role="menu"` with an accessible name; items are `role="menuitem"`
- `ArrowDown` / `ArrowUp` move the active item
- `Escape` closes and calls `onClose`
- Clicking Duplicate calls the supplied handler
- Copy block link is **disabled** when the node has no id
- Click outside closes
- Passes `axe` with no violations

Render with props directly; the editor wiring is covered by E2E in task 12.

## Step 4: Write the handle test

Create `block-handle.test.tsx`. jsdom has no layout, so **stub the geometry** —
same approach as task 07.

Cover:

- Renders nothing when no block is hovered
- Renders a button with `aria-label="Block options"` when a target is set
- Uses the `⠿` glyph
- `aria-expanded` is false initially, true after click
- `aria-controls` matches the menu's id
- Clicking opens the menu
- `Escape` from the menu returns focus to the handle button
- The handle is keyboard focusable (`tabIndex` 0, not -1)

## Step 5: Implement the components

`block-menu.tsx` first, then `block-handle.tsx`.

The handle tracks the hovered block via a `pointermove` listener on the editor
container, debounced with `requestAnimationFrame`, calling `blockAtCoords`. Clear
the target on `pointerleave`. When `blockAtCoords` returns `null` — coordinates in
the gap between blocks — render nothing.

Wrap the editor content in `DndContext` with `PointerSensor` and `KeyboardSensor`,
and on `onDragEnd` call `moveBlock(view, activePos, overPos)`. Use `DragOverlay`
via `createPortal` for the drag preview, matching `file-tree-dnd-context.tsx`.

Styling: handle is `--ink-faint`, `--ink-soft` on hover, `--bg-2` background when
the menu is open. Menu uses `--card`, `--line`, and the `DESIGN.md` modal shadow.
Destructive items use `--destructive`. **No raw hex** (AC-19).

## Step 6: Wire into the shell

Pass the handle into `blockHandleSlot` in `document-editor.tsx`. The slot sits
inside the `relative` content container from task 01, so absolute positioning
works. Do not restructure the shell.

## Step 7: Verify

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
```

By hand in `pnpm dev`: hover a paragraph and confirm the handle appears; open the
menu; duplicate, delete, turn-into, and copy-link each work; drag a block to
reorder; confirm the copied link still resolves after editing a different block.

That last check is AC-9 and is worth doing manually — it is the one behavior a
unit test can only approximate.

## Step 8: Commit

```bash
git add src/features/document
git commit -m "feat(editor): add block handle, menu, drag reorder, and copy block link

Uses the repo's existing @dnd-kit idiom with the task-07 bridge for position
mapping. Copy block link reads the UniqueID attribute, so links survive edits
elsewhere in the document. An /ask ai slot is reserved and disabled so the later
AI spec does not restructure the menu."
```

Update [`progress.md`](./progress.md): task 08 `done`, tick AC-8 and AC-9. Record
whether duplicated blocks receive a fresh id.

## Done when

- [ ] All four test files pass, including axe checks
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Verified by hand, including the AC-9 link-survives-edit check
- [ ] Committed, `progress.md` updated

## Do not

- Invent a second drag pattern; follow `file-tree-dnd-context.tsx`
- Mutate the DOM to reorder; use task 07's `moveBlock`
- Add cut/copy/paste to the menu
- Make Ask AI functional; it is a reserved disabled slot
- Skip `KeyboardSensor` — keyboard reordering is required
- Treat `modal-dialog.tsx` as a focus-trap reference
- Use raw hex colors
- Restructure `document-editor.tsx`

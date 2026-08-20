# Task 09 — Tables with row and column controls

**Wave:** 4 (parallel with task-08, task-10)
**Depends on:** task-04
**ACs:** 10
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) §7 and `DESIGN.md`

## Goal

Tables that are actually usable for documentation: create, add and remove rows and
columns, header row, column resize, merge and split cells, delete table, and
drag-to-reorder rows.

The extension gives you the commands. The controls are ours.

## Files

- **Create:** `src/features/document/extensions/tables.ts`
- **Create:** `src/features/document/extensions/tables.test.tsx`
- **Create:** `src/features/document/ui/table-controls.tsx`
- **Create:** `src/features/document/ui/table-controls.test.tsx`
- **Modify:** `src/features/document/extensions/index.ts` — **append one import and one spread entry only**

## Interfaces

**Produces:**

```ts
// extensions/tables.ts
export const tableExtensions: Extension[];

// ui/table-controls.tsx
export function TableControls(props: { editor: Editor }): JSX.Element | null;
```

## Context

**Install** (free namespace):

```bash
pnpm add @tiptap/extension-table
```

Tiptap v3 may split this into `@tiptap/extension-table`,
`-table-row`, `-table-cell`, `-table-header`, or ship them from one package. The
spec's dependency list is explicitly marked "confirm at install" — check what the
package actually exports and **report a mismatch in `progress.md`** rather than
guessing (briefing §10).

**Configuration that matters:**

```ts
Table.configure({
  resizable: true,          // AC-10 requires column resize
  lastColumnResizable: false,
  allowTableNodeSelection: true,   // lets the block handle select a whole table
})
```

`allowTableNodeSelection` is what lets task 08's block handle treat a table as a
single drag unit — task 07's bridge already resolves to the depth-1 ancestor, and
this makes the selection stick.

**`table` is already in task 01's `ID_TYPES`**, so tables get stable block IDs for
free. Do not add it again.

**Row reordering is not a table-extension feature.** The extension has no
"move row" command. Implement it as a transaction: read the row node, delete it,
insert at the target index. This is the same shape as task 07's `moveBlock` but
scoped inside a table, so put it in `ui/table-controls.tsx` as a helper and test it
against document JSON.

**Controls appear only when the selection is inside a table.** Return `null`
otherwise — `editor.isActive("table")` is the gate. Rendering them always would
clutter every document.

**Accessibility.** Each control is a real `<button>` with an `aria-label`
describing the action and its target ("Insert row below", "Delete column"). The
`+` extend affordances are buttons, not bare divs. Row and column handles need
`aria-label` too. Every menu that opens from a handle follows briefing §7 — arrow
navigation, Escape returning focus, no reliance on `modal-dialog.tsx` (it has no
focus trap).

---

## Step 1: Write the extension test

Create `extensions/tables.test.tsx`. Assert on **document JSON**, not markup.

Cover, one test each:

- The extension set registers `table`, `tableRow`, `tableCell`, `tableHeader`
- `insertTable({ rows: 3, cols: 3, withHeaderRow: true })` produces a table
- The created table has a header row (`tableHeader` present)
- `addRowAfter` increases the row count by one
- `deleteRow` decreases it by one
- `addColumnAfter` increases the cell count in each row
- `deleteColumn` decreases it
- `toggleHeaderRow` flips header cells to normal cells
- `mergeCells` on a two-cell selection produces one cell with `colspan: 2`
- `splitCell` reverses a merge
- `deleteTable` removes the table entirely
- The document stays valid (`doc.check()` does not throw) after each operation

Helper worth writing once:

```ts
function tableShape(editor: Editor): { rows: number; cellsPerRow: number[] } {
  // walk the JSON, count tableRow nodes and their children
}
```

## Step 2: Implement the extensions

Create `extensions/tables.ts` exporting `tableExtensions` with the four nodes
configured as above. Match the actual export shape of the installed package.

Then in `extensions/index.ts`, replace the `// task-09:` placeholder:

```ts
import { tableExtensions } from "./tables";
// ...
    ...tableExtensions,
```

**Do not touch tasks 03, 04, or 10's lines.** Task 10 is editing this same file in
the same wave — append only, never reorder.

## Step 3: Write the controls test

Create `ui/table-controls.test.tsx`. Cover:

- Returns `null` when the selection is not in a table
- Renders controls when the selection is inside a table
- Every control has an accessible name
- Clicking "Insert row below" adds a row (assert via document JSON)
- Clicking "Delete row" removes one
- Clicking "Insert column right" adds a column
- Clicking "Delete column" removes one
- Clicking "Toggle header row" flips the header
- Merge is **disabled** when only one cell is selected
- Delete-table asks for no confirmation but does remove the table
- The row-reorder helper moves a row and preserves cell contents
- Passes `axe` with no violations

## Step 4: Implement the controls

Create `ui/table-controls.tsx`. Structure:

- A floating group anchored to the active table, shown only when
  `editor.isActive("table")`
- Row handles down the left edge, column handles across the top, each opening a
  small menu (insert before/after, delete, and for rows: move up/down)
- `+` extend buttons at the right edge and bottom edge for quick append
- A table-level menu with toggle-header and delete-table
- Merge and split buttons, enabled only when the cell selection makes them valid

Styling: `--card` surface, `--line` borders, `--bg-2` for handle hover,
`--accent-soft` for the active handle, `--destructive` for delete actions.
`Button` with `variant="ghost"` `size="sm"`. **No raw hex** (AC-19).

Column resize is handled by the extension's `resizable: true` — you do not build
drag-to-resize, but you should confirm it works and that the resize handles are
visible against the design tokens.

## Step 5: Wire in

Render `<TableControls editor={editor} />` inside the content container in
`document-editor.tsx`, beside the block handle slot. Do not restructure the shell,
and do not add a new prop — reuse `blockHandleSlot` by composing both components
there, or add the render call directly in the content div.

## Step 6: Verify

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
```

By hand in `pnpm dev`: insert a table via `/table` (task 05's menu now offers it,
since the command exists), add and remove rows and columns, merge two cells, split
them, drag a column edge to resize, reorder a row, delete the table.

## Step 7: Commit

```bash
git add package.json pnpm-lock.yaml src/features/document
git commit -m "feat(editor): add tables with row and column controls

Extension provides the commands; the row/column handles, extend buttons, and
row reordering are ours. allowTableNodeSelection lets the block handle treat a
table as one drag unit."
```

Update [`progress.md`](./progress.md): task 09 `done`, tick AC-10, and **record
the actual table package names** you installed.

## Done when

- [ ] `tables.test.tsx` passes, 12 tests
- [ ] `table-controls.test.tsx` passes including axe
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Verified by hand, including resize and row reorder
- [ ] Committed, `progress.md` updated with package names

## Do not

- Edit tasks 03, 04, or 10's lines in `extensions/index.ts` — task 10 runs concurrently
- Add `table` to task 01's `ID_TYPES`; it is already there
- Build drag-to-resize yourself; use `resizable: true`
- Render controls when the selection is outside a table
- Use raw hex colors
- Install a table library other than Tiptap's
- Treat `modal-dialog.tsx` as a focus-trap reference

# Task 06 — Bubble toolbar

**Wave:** 3 (parallel with task-05, task-07)
**Depends on:** task-03 (marks + button descriptors)
**ACs:** 7
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) §7 and `DESIGN.md`

## Goal

Selecting text reveals a floating toolbar with eight controls: bold, italic,
underline, strike, code, link, highlight, color.

## Files

- **Create:** `src/features/document/ui/bubble-toolbar.tsx`
- **Create:** `src/features/document/ui/bubble-toolbar.test.tsx`
- **Create:** `src/features/document/ui/color-popover.tsx`
- **Create:** `src/features/document/ui/color-popover.test.tsx`
- **Modify:** `src/features/document/ui/toolbar-buttons.ts` — extend `BUBBLE_BUTTON_IDS` only
- **Modify:** `src/features/document/document-editor.tsx` — fill `bubbleSlot` only

## Interfaces

**Consumes:**

```ts
import { BUBBLE_BUTTON_IDS, TOOLBAR_BUTTONS } from "./toolbar-buttons";  // task 03
```

**Produces:**

```ts
export function BubbleToolbar(props: { editor: Editor }): JSX.Element;
export function ColorPopover(props: {
  editor: Editor;
  kind: "text" | "highlight";
}): JSX.Element;
```

## Context

**Reuse task 03's descriptors.** The five mark buttons come from
`TOOLBAR_BUTTONS` filtered by `BUBBLE_BUTTON_IDS`. Do not re-declare them — two
consumers of one array is what keeps the main toolbar and the bubble from
drifting.

**Three controls are new here**: link, highlight picker, text color picker. The
first needs an input; the other two need a popover. Task 03 deliberately left
pickers out because they need focus management, and selection context is where
they actually make sense.

**`BubbleMenu` positioning is free.** `@tiptap/react` exports `BubbleMenu`, which
handles anchoring to the selection and hiding when the selection is empty. Do not
hand-roll positioning.

**Hide the bubble in three cases**, or it fights the user:

1. Selection is empty (BubbleMenu does this by default)
2. Editor is not editable — `readOnly` viewers must not see formatting controls
3. Selection is inside a code block, where marks are meaningless

The third needs `shouldShow`:

```ts
shouldShow: ({ editor, from, to }) =>
  from !== to && editor.isEditable && !editor.isActive("codeBlock")
```

**Color palette.** Use a small fixed set drawn from `DESIGN.md` tokens plus a
"remove" option. Do not build a full color picker — the spec notes advanced
palettes are a paid Tiptap feature and explicitly out of scope. Six swatches plus
remove is enough:

| Purpose | Token |
|---|---|
| Default / remove | (unset the mark) |
| Accent | `--accent` |
| Success | `--success` |
| Warning | `--warn` |
| Danger | `--destructive` |
| Muted | `--ink-soft` |

Highlight swatches use the `-soft` variants of the same four.

**Accessibility, per briefing §7.** The popover is the accessibility-critical
piece: initial focus on open, arrow-key navigation across swatches, Escape
closing and returning focus to its trigger, click-outside dismiss,
`aria-expanded` and `aria-controls` on the trigger. `modal-dialog.tsx` is **not**
a usable reference — it has no focus trap. Use the roving-tabindex pattern from
`file-tree.tsx:135` and `tab-bar.tsx:165`.

**Link handling.** Requires `@tiptap/extension-link`, which task 10 installs. To
avoid a wave-4 dependency, implement the link button to be **disabled with a
tooltip when `editor.commands.setLink` is unavailable**, exactly as task 05 guards
table and math. Task 10 makes it live automatically. Note this in `progress.md`.

---

## Step 1: Write the bubble toolbar test

Create `ui/bubble-toolbar.test.tsx`. Mount with a real `Editor` so `isActive`
behaves, and assert on document JSON after clicks.

Cover:

- Renders a button for each id in `BUBBLE_BUTTON_IDS`
- Every button has an accessible name
- Clicking Bold applies the mark (assert via `editor.isActive("bold")`)
- `aria-pressed` reflects the active mark
- `shouldShow` returns false for an empty selection
- `shouldShow` returns false when `editor.isEditable` is false
- `shouldShow` returns false inside a code block
- The link button is disabled when `setLink` is unavailable
- Passes `axe` with no violations

Testing `shouldShow` directly as an exported pure function is easier than
simulating selection — export it:

```ts
export function shouldShowBubble(args: {
  editor: Editor; from: number; to: number;
}): boolean;
```

## Step 2: Write the color popover test

Create `ui/color-popover.test.tsx`. Cover:

- Trigger has `aria-expanded="false"` when closed, `"true"` when open
- Trigger has `aria-controls` matching the panel id
- Opening moves focus into the panel
- `ArrowRight` / `ArrowLeft` move between swatches
- `Escape` closes and returns focus to the trigger
- Clicking a swatch applies the mark and closes
- Clicking "remove" unsets the mark
- Click outside closes without applying
- Panel has `role="listbox"` (or `role="menu"`) with an accessible name
- Passes `axe` with no violations

This is the most accessibility-sensitive component in the batch. The tests are
the specification.

## Step 3: Implement

`ColorPopover` first, since the bubble depends on it. Then `BubbleToolbar`
composing five descriptor buttons, the link button, and two popovers.

Styling: `--card` surface, `--line` border, `DESIGN.md` modal shadow, `--radius`.
Buttons are `Button` with `variant="ghost"` `size="sm"`. **No raw hex** (AC-19) —
swatches use `var(--token)` inline via a `style` prop, which is permitted for
dynamic token values but must reference tokens, never literals.

## Step 4: Wire into the shell

Pass `<BubbleToolbar editor={editor} />` into `bubbleSlot` in
`document-editor.tsx`. Do not restructure the shell.

## Step 5: Verify

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
```

By hand in `pnpm dev`: select text, confirm the bubble appears and each control
works; confirm it does not appear inside a code block or in read-only mode.

## Step 6: Commit

```bash
git add src/features/document
git commit -m "feat(editor): add bubble toolbar with color and highlight popovers

Reuses task 03's button descriptors so the two toolbars cannot drift. The link
button is disabled until task 10 installs extension-link. Popovers implement
focus management from scratch since modal-dialog.tsx has no focus trap."
```

Update [`progress.md`](./progress.md): task 06 `done`, tick AC-7, note the link
button remains disabled until task 10.

## Done when

- [ ] `bubble-toolbar.test.tsx` passes including axe
- [ ] `color-popover.test.tsx` passes including axe and all focus assertions
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Verified by hand
- [ ] Committed, `progress.md` updated

## Do not

- Re-declare mark buttons; filter `TOOLBAR_BUTTONS` by `BUBBLE_BUTTON_IDS`
- Hand-roll positioning; use `BubbleMenu`
- Build a full color picker with arbitrary hex input
- Show the bubble in read-only mode or inside a code block
- Treat `modal-dialog.tsx` as a focus-trap reference — it has none
- Install a popover library
- Use raw hex color literals

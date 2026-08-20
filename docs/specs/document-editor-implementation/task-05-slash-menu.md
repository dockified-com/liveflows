# Task 05 — Slash command menu

**Wave:** 3 (parallel with task-06, task-07)
**Depends on:** task-02 (registry), task-04 (block nodes)
**ACs:** 6
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) §7 (accessibility) and `DESIGN.md`

## Goal

Typing `/` opens a filtering command palette that inserts blocks. This is the
signature Notion interaction and the most visible thing in the batch.

## Files

- **Create:** `src/features/document/extensions/slash-suggestion.ts`
- **Create:** `src/features/document/ui/slash-menu.tsx`
- **Create:** `src/features/document/ui/slash-menu.test.tsx`
- **Create:** `src/features/document/lib/slash-actions.ts` + `slash-actions.test.tsx`
- **Modify:** `src/features/document/extensions/index.ts` — append one entry
- **Modify:** `src/features/document/document-editor.tsx` — fill the slash portion of `toolbarSlot` region only

## Interfaces

**Consumes:**

```ts
import { filterCommands, SLASH_COMMANDS, type SlashAction, type SlashCommand }
  from "../lib/slash-commands";   // task 02
```

**Produces:**

```ts
// lib/slash-actions.ts — the action -> editor command mapping task 02 deliberately omitted
export function runSlashAction(editor: Editor, action: SlashAction, range: Range): void;
```

## Context

**Why the action mapping lives here.** Task 02 kept `SlashCommand` as plain data
with an `action` string, because Tiptap augments its `Commands` interface per
registered extension — holding `editor.chain().toggleCallout()` in task 02 would
not typecheck until task 04 landed. This task owns the switch, now that the nodes
exist.

**Install nothing.** Tiptap's `Suggestion` utility ships inside
`@tiptap/suggestion`, a transitive dependency of `@tiptap/starter-kit` via mention
plumbing. If importing `@tiptap/suggestion` fails, add it explicitly — it is free
namespace — and note it in `progress.md`.

**The suggestion plugin handles the hard parts**: detecting the trigger, tracking
the query as the user types, capturing arrow keys and Enter, and giving you a
`range` to replace. You supply the rendering and the item list.

**Two nodes may not exist yet when this runs.** `table` (task 09) and `blockMath`
(task 10) are in task 02's `SlashAction` union but are registered in wave 4. Guard
those two actions with a capability check rather than calling a command that does
not exist:

```ts
if (!editor.can().insertTable?.({ rows: 3, cols: 3 })) return;
```

Their menu entries should be filtered out when the command is unavailable, so the
menu never offers something inert. Wave 4 makes them appear automatically.

**Accessibility is mandatory here** (briefing §7). This is a menu:
`role="listbox"` with `role="option"` items, `aria-selected` on the active item,
`aria-activedescendant` on the container, arrow-key navigation, Escape to close.
The editor keeps DOM focus throughout — the menu is navigated via the suggestion
plugin's keydown handler, not by moving focus into the list.

---

## Step 1: Write the action-mapping test

Create `lib/slash-actions.test.tsx`:

```tsx
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { blockExtensions } from "../extensions/blocks";
import { runSlashAction } from "./slash-actions";

function makeEditor() {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), ...blockExtensions],
    content: "<p>x</p>",
  });
}

/** The suggestion plugin supplies a range covering the typed "/query". */
function wholeDoc(editor: Editor) {
  return { from: 1, to: editor.state.doc.content.size - 1 };
}

function types(editor: Editor): string[] {
  const found: string[] = [];
  const walk = (n: { type?: unknown; content?: unknown }) => {
    if (typeof n.type === "string") found.push(n.type);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(editor.getJSON() as never);
  return found;
}

describe("runSlashAction", () => {
  it.each([
    ["heading1", "heading"],
    ["bulletList", "bulletList"],
    ["orderedList", "orderedList"],
    ["taskList", "taskList"],
    ["blockquote", "blockquote"],
    ["divider", "horizontalRule"],
    ["callout", "callout"],
  ] as const)("inserts %s", (action, expected) => {
    const editor = makeEditor();
    runSlashAction(editor, action, wholeDoc(editor));

    expect(types(editor)).toContain(expected);
    editor.destroy();
  });

  it("sets the requested heading level", () => {
    const editor = makeEditor();
    runSlashAction(editor, "heading3", wholeDoc(editor));

    expect(editor.isActive("heading", { level: 3 })).toBe(true);
    editor.destroy();
  });

  it("does not throw for an action whose node is not registered yet", () => {
    const editor = makeEditor();   // no table, no math
    expect(() => runSlashAction(editor, "table", wholeDoc(editor))).not.toThrow();
    expect(() => runSlashAction(editor, "blockMath", wholeDoc(editor))).not.toThrow();
    editor.destroy();
  });

  it("removes the typed query range", () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ codeBlock: false }), ...blockExtensions],
      content: "<p>/head</p>",
    });
    runSlashAction(editor, "heading1", { from: 1, to: 6 });

    expect(editor.getText()).not.toContain("/head");
    editor.destroy();
  });
});
```

## Step 2: Implement the mapping

Create `lib/slash-actions.ts`. Structure:

```ts
export function runSlashAction(
  editor: Editor,
  action: SlashAction,
  range: { from: number; to: number },
): void {
  const chain = () => editor.chain().focus().deleteRange(range);

  switch (action) {
    case "paragraph":  chain().setParagraph().run(); return;
    case "heading1":   chain().setNode("heading", { level: 1 }).run(); return;
    // ... heading2, heading3
    case "bulletList": chain().toggleBulletList().run(); return;
    // ... orderedList, taskList, blockquote
    case "divider":    chain().setHorizontalRule().run(); return;
    case "callout":    chain().setCallout({}).run(); return;

    // Registered in wave 4. Guard rather than assume.
    case "table":
    case "blockMath":
    case "codeBlock":
    case "toc":
      runOptional(editor, action, range);
      return;
  }
}
```

`runOptional` checks `action in editor.commands` (or a `can()` probe) and returns
silently when the node has not been registered yet. Every action must be handled
— use an exhaustive switch so adding a `SlashAction` later fails typecheck rather
than silently doing nothing.

Also export a helper the menu uses to hide unavailable entries:

```ts
export function isActionAvailable(editor: Editor, action: SlashAction): boolean;
```

## Step 3: Build the suggestion extension

Create `extensions/slash-suggestion.ts`. Configure `Suggestion` with:

- `char: "/"`
- `startOfLine: false` — Notion allows `/` mid-line
- `items: ({ query, editor }) => filterCommands(query).filter((c) => isActionAvailable(editor, c.action))`
- `command: ({ editor, range, props }) => runSlashAction(editor, props.action, range)`
- `render: () => ({ onStart, onUpdate, onKeyDown, onExit })` driving a React root

For `onKeyDown`, handle `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`, returning
`true` when consumed so the editor does not also act on the key.

Export it as `slashSuggestionExtension` and register it in `extensions/index.ts`
by replacing the `// task-05:` placeholder if present, or appending a new line.

## Step 4: Build the menu UI

Create `ui/slash-menu.tsx`.

- Container: `role="listbox"`, `aria-label="Insert block"`,
  `aria-activedescendant` pointing at the selected option id
- Items: `role="option"`, `aria-selected`, stable `id` per command
- Group headers by `command.group` — labels "Basic", "Layout", "Technical" — with
  `role="presentation"` so they are not announced as options
- Selected item styled with `--accent-soft` background and `--accent` text
- Empty state: "No blocks found" when the filtered list is empty
- Scroll the selected item into view on arrow navigation
- **Tokens only, no raw hex.** Card surface uses `--card`, border `--line`,
  shadow per `DESIGN.md`

## Step 5: Test the menu

Create `ui/slash-menu.test.tsx` covering:

- Renders one option per filtered command
- `role="listbox"` present with an accessible name
- Group headers render and are not `role="option"`
- The selected index has `aria-selected="true"` and matches `aria-activedescendant`
- Filtering to nothing shows the empty state
- Clicking an option calls the supplied `onSelect` with that command
- Passes `axe` with no violations

Render the component directly with props rather than driving it through the
editor — the plugin wiring is covered by E2E in task 12.

## Step 6: Verify

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
```

Manually confirm in `pnpm dev`: typing `/` opens the menu, `/h1` narrows to
Heading 1, Enter inserts it, Escape closes without inserting.

## Step 7: Commit

```bash
git add src/features/document
git commit -m "feat(editor): add slash command menu

Tiptap's Suggestion utility handles the trigger and keyboard capture; the menu UI
and the action mapping are ours. Actions whose nodes are not yet registered
(table, math) are filtered out rather than offered inert."
```

Update [`progress.md`](./progress.md): task 05 `done`, tick AC-6.

## Done when

- [ ] `slash-actions.test.tsx` passes, 10 tests
- [ ] `slash-menu.test.tsx` passes including axe
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Verified by hand in `pnpm dev`
- [ ] Committed, `progress.md` updated

## Do not

- Move DOM focus into the menu; the editor keeps focus and the plugin handles keys
- Add editor callbacks to `lib/slash-commands.ts` — it stays pure (task 02's contract)
- Offer `table` or `blockMath` before their nodes are registered
- Use raw hex colors
- Install a dropdown or popover library
- Restructure `document-editor.tsx`

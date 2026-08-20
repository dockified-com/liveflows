# Task 04 — Block types

**Wave:** 2 (parallel with task-03)
**Depends on:** task-01
**ACs:** 5
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) and `DESIGN.md`

## Goal

Register the block types StarterKit does not ship, and build the one node with no
open-source equivalent: Callout.

Tasks 05, 09, 10, and 11 all depend on the nodes registered here.

## Files

- **Create:** `src/features/document/extensions/blocks.ts`
- **Create:** `src/features/document/extensions/blocks.test.tsx`
- **Create:** `src/features/document/extensions/callout.ts`
- **Create:** `src/features/document/extensions/callout.test.tsx`
- **Create:** `src/features/document/ui/callout-view.tsx`
- **Modify:** `src/features/document/extensions/index.ts` — **append one import and one spread entry only**

## Interfaces

**Produces** — tasks 05, 09, 10, 11 consume these:

```ts
// extensions/blocks.ts
export const blockExtensions: Extension[];

// extensions/callout.ts
export type CalloutVariant = "info" | "warning" | "success" | "danger";
export const Callout: Node;   // node name: "callout"
// commands: setCallout({ variant? }), toggleCallout({ variant? }), unsetCallout()
```

## Context

**Install** (free namespace):

```bash
pnpm add @tiptap/extension-task-list @tiptap/extension-task-item
```

Task list is the only StarterKit gap in this task. Table, code block, and math
belong to tasks 09 and 10 — **do not install them here**, or you will collide
with those tasks in `extensions/index.ts`.

**Block inventory** (13 total, AC-5). Nine already come from StarterKit and need
no work: paragraph, H1, H2, H3, bullet list, numbered list, blockquote, divider,
plus the code-block placeholder task 10 replaces. This task adds task list and
callout. Table and math arrive in 09 and 10.

**Callout is the only custom node in the batch.** Requirements:

- Container holding block content — a callout wraps paragraphs, lists, headings
- `variant` attribute: `info` / `warning` / `success` / `danger`
- `emoji` attribute: a short string, defaulting per variant
- Rendered through a React node view so it inherits `DESIGN.md` tokens
- `content: "block+"` so it can hold multiple children
- `group: "block"` so it slots wherever a block is valid
- Included in task 01's `ID_TYPES`, so it must be named exactly `callout`

**Variant colors map to existing tokens** — do not invent new ones:

| Variant | Background | Border / icon |
|---|---|---|
| `info` | `--accent-soft` | `--accent` |
| `warning` | `--warn-soft` | `--warn` |
| `success` | `--success-soft` | `--success` |
| `danger` | `--destructive-soft` | `--destructive` |

---

## Step 1: Write the blocks test

Create `extensions/blocks.test.tsx`:

```tsx
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { blockExtensions } from "./blocks";

function makeEditor(content = "<p>hello</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), ...blockExtensions],
    content,
  });
}

/** Collects every node type present in the document, at any depth. */
function nodeTypes(editor: Editor): string[] {
  const found: string[] = [];
  const walk = (node: { type?: unknown; content?: unknown }) => {
    if (typeof node.type === "string") found.push(node.type);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(editor.getJSON() as never);
  return found;
}

describe("StarterKit blocks still work", () => {
  it.each([
    ["heading level 1", (e: Editor) => e.commands.toggleHeading({ level: 1 }), "heading"],
    ["bullet list", (e: Editor) => e.commands.toggleBulletList(), "bulletList"],
    ["ordered list", (e: Editor) => e.commands.toggleOrderedList(), "orderedList"],
    ["blockquote", (e: Editor) => e.commands.toggleBlockquote(), "blockquote"],
    ["divider", (e: Editor) => e.commands.setHorizontalRule(), "horizontalRule"],
  ])("inserts a %s", (_label, run, expected) => {
    const editor = makeEditor();
    editor.commands.selectAll();
    run(editor);

    expect(nodeTypes(editor)).toContain(expected);
    editor.destroy();
  });

  it("supports all three heading levels", () => {
    const editor = makeEditor();
    for (const level of [1, 2, 3] as const) {
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level });
      expect(editor.isActive("heading", { level })).toBe(true);
    }
    editor.destroy();
  });
});

describe("task list", () => {
  it("registers both task extensions", () => {
    const names = blockExtensions.map((e) => e.name);
    expect(names).toContain("taskList");
    expect(names).toContain("taskItem");
  });

  it("inserts a task list containing a task item", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.toggleTaskList();

    const types = nodeTypes(editor);
    expect(types).toContain("taskList");
    expect(types).toContain("taskItem");
    editor.destroy();
  });

  it("round-trips a checked item through JSON", () => {
    const editor = makeEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">done</li></ul>',
    );

    expect(JSON.stringify(editor.getJSON())).toContain('"checked":true');
    editor.destroy();
  });
});
```

Run it, confirm it fails.

## Step 2: Write the callout test

Create `extensions/callout.test.tsx`:

```tsx
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { Callout } from "./callout";

function makeEditor(content = "<p>hello</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), Callout],
    content,
  });
}

function json(editor: Editor) {
  return editor.getJSON();
}

describe("Callout node", () => {
  it("is named callout, matching task-01's ID_TYPES", () => {
    expect(Callout.name).toBe("callout");
  });

  it("wraps the selection in a callout", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({});

    expect(JSON.stringify(json(editor))).toContain('"type":"callout"');
    editor.destroy();
  });

  it("defaults to the info variant", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({});

    expect(editor.isActive("callout", { variant: "info" })).toBe(true);
    editor.destroy();
  });

  it("accepts an explicit variant", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({ variant: "warning" });

    expect(editor.isActive("callout", { variant: "warning" })).toBe(true);
    editor.destroy();
  });

  it("keeps its paragraph content", () => {
    const editor = makeEditor("<p>keep me</p>");
    editor.commands.selectAll();
    editor.commands.setCallout({});

    expect(editor.getText()).toContain("keep me");
    editor.destroy();
  });

  it("holds multiple block children", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    editor.commands.selectAll();
    editor.commands.setCallout({});

    const text = editor.getText();
    expect(text).toContain("one");
    expect(text).toContain("two");
    editor.destroy();
  });

  it("unsets back to plain blocks", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({});
    editor.commands.unsetCallout();

    expect(JSON.stringify(json(editor))).not.toContain('"type":"callout"');
    editor.destroy();
  });

  it("round-trips through HTML parse and serialize", () => {
    const editor = makeEditor(
      '<div data-type="callout" data-variant="danger">' +
        "<p>careful</p></div>",
    );

    expect(editor.isActive).toBeDefined();
    const out = JSON.stringify(json(editor));
    expect(out).toContain('"type":"callout"');
    expect(out).toContain("danger");
    editor.destroy();
  });

  it("carries an emoji attribute", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({ variant: "warning" });

    expect(JSON.stringify(json(editor))).toContain("emoji");
    editor.destroy();
  });
});
```

## Step 3: Implement the Callout node

Create `extensions/callout.ts`. Use `Node.create` from `@tiptap/core`, with:

- `name: "callout"`, `group: "block"`, `content: "block+"`, `defining: true`
- `addAttributes`: `variant` (default `"info"`) and `emoji` (default per variant),
  each with `parseHTML` reading `data-variant` / `data-emoji` and `renderHTML`
  writing them back
- `parseHTML`: `[{ tag: 'div[data-type="callout"]' }]`
- `renderHTML`: a `div` with `data-type="callout"` plus the attributes
- `addNodeView`: `ReactNodeViewRenderer(CalloutView)`
- `addCommands`: `setCallout`, `toggleCallout`, `unsetCallout` using
  `wrapIn` / `toggleWrap` / `lift`
- `addInputRules`: a wrapping rule so typing a trigger creates a callout

Declare the commands on Tiptap's `Commands` interface so
`editor.commands.setCallout(...)` typechecks:

```ts
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs: { variant?: CalloutVariant; emoji?: string }) => ReturnType;
      toggleCallout: (attrs: { variant?: CalloutVariant; emoji?: string }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}
```

## Step 4: Implement the node view

Create `ui/callout-view.tsx` using `NodeViewWrapper` and `NodeViewContent` from
`@tiptap/react`.

- Map `variant` to the token pairs in the table above
- Render the emoji in a non-editable span, the content in `<NodeViewContent>`
- **Tokens only, no raw hex** (AC-19)
- `contentEditable={false}` on the emoji so it is not editable inline
- Give the wrapper `role="note"` and an `aria-label` naming the variant

## Step 5: Assemble and register

Create `extensions/blocks.ts`:

```ts
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import type { Extension } from "@tiptap/react";
import { Callout } from "./callout";

/**
 * Block types StarterKit does not ship.
 *
 * Table and math are deliberately absent — tasks 09 and 10 own those and
 * register them separately to avoid a shared edit here.
 */
export const blockExtensions: Extension[] = [
  TaskList,
  // nested: true lets a task item contain a nested task list.
  TaskItem.configure({ nested: true }),
  Callout,
] as unknown as Extension[];
```

Then in `extensions/index.ts`, replace the `// task-04:` placeholder:

```ts
import { blockExtensions } from "./blocks";
// ...
    ...blockExtensions,
```

## Step 6: Verify

```bash
pnpm vitest run src/features/document/extensions
pnpm build
```

Expected: blocks 9 tests, callout 9 tests, plus task 01's suites still green.

The UniqueID test from task 01 must still pass — `callout` is in its `ID_TYPES`,
so a mismatch in the node name shows up there.

## Step 7: Lint and commit

```bash
pnpm lint
git add package.json pnpm-lock.yaml src/features/document
git commit -m "feat(editor): add task list and custom Callout block

Callout is the one block with no open-source equivalent: a block+ container with
variant and emoji attributes, rendered through a React node view so it inherits
DESIGN.md tokens rather than shipping foreign CSS."
```

Update [`progress.md`](./progress.md): task 04 `done`, tick AC-5 **partially** —
note that table (09) and math (10) complete it.

## Done when

- [ ] `blocks.test.tsx` passes, 9 tests
- [ ] `callout.test.tsx` passes, 9 tests
- [ ] Task 01's `unique-id.test.tsx` still passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` clean
- [ ] Committed, `progress.md` updated

## Do not

- Install or register table, code-block-lowlight, or mathematics — tasks 09 and 10 own those
- Name the node anything but `callout`; task 01's `ID_TYPES` depends on it
- Use raw hex in the node view
- Invent new color tokens for variants; use the four soft/solid pairs
- Reorder or edit another task's line in `extensions/index.ts`
- Give Callout `content: "paragraph"` — it must accept `block+`

# Task 03 — Formatting marks and config-driven toolbar

**Wave:** 2 (parallel with task-04)
**Depends on:** task-01
**ACs:** 4, 19
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) and `DESIGN.md`

## Goal

Add the seven formatting marks StarterKit does not cover, and replace the six
deleted toolbar buttons with a config-driven toolbar that scales to ~20 controls
without becoming 600 lines of duplicated JSX.

## Files

- **Create:** `src/features/document/extensions/formatting.ts`
- **Create:** `src/features/document/extensions/formatting.test.tsx`
- **Create:** `src/features/document/ui/toolbar.tsx`
- **Create:** `src/features/document/ui/toolbar-buttons.ts`
- **Create:** `src/features/document/ui/toolbar.test.tsx`
- **Modify:** `src/features/document/extensions/index.ts` — **append one import and one spread entry only**

## Interfaces

**Produces** — task 06 reuses the button descriptors:

```ts
// extensions/formatting.ts
export const formattingExtensions: Extension[];

// ui/toolbar-buttons.ts
export type ToolbarButton = {
  id: string;
  label: string;                          // accessible name
  mark: string;                           // for editor.isActive()
  markOptions?: Record<string, unknown>;  // e.g. { level: 1 }
  action: (editor: Editor) => void;
  glyph: "bold" | "italic" | "underline" | "strike" | "code" | "h1" | "h2" | "h3" | "bulletList" | "orderedList" | "taskList" | "quote" | "alignLeft" | "alignCenter" | "alignRight";
  group: "marks" | "headings" | "lists" | "align";
};
export const TOOLBAR_BUTTONS: readonly ToolbarButton[];
export const BUBBLE_BUTTON_IDS: readonly string[];   // task 06 consumes this

// ui/toolbar.tsx
export function Toolbar(props: { editor: Editor }): JSX.Element;
```

## Context

**Packages to install** (all free namespace):

```bash
pnpm add @tiptap/extension-underline @tiptap/extension-highlight \
         @tiptap/extension-superscript @tiptap/extension-subscript \
         @tiptap/extension-text-align
```

`@tiptap/extension-color` and `@tiptap/extension-text-style` are **already in
`package.json`** but never wired in. Wire both — `text-style` is a required peer
of `color`, and installing color alone silently does nothing.

If a package name 404s or its export shape differs, stop and report (briefing
§10). Tiptap v3 moved several packages.

**`TextAlign` must be configured with the node types it applies to**, otherwise
it registers but does nothing:

```ts
TextAlign.configure({ types: ["heading", "paragraph"] })
```

**`Highlight` needs `multicolor: true`** to accept a color argument.

**Why the descriptor array.** The deleted buttons were ~20 lines of JSX each with
duplicated Tailwind. Twenty controls that way is unmaintainable and guarantees
drift between the main toolbar and task 06's bubble toolbar. One array, two
consumers, no drift.

**Color and highlight pickers are not in this task.** They need a popover with
focus management (briefing §7). The toolbar exposes toggle buttons only; pickers
belong with task 06's bubble toolbar where selection context makes them useful.

---

## Step 1: Install and write the marks test

Create `extensions/formatting.test.tsx`. Assert on **document JSON**, never
rendered markup (briefing §8):

```tsx
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { formattingExtensions } from "./formatting";

function makeEditor(content = "<p>hello world</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), ...formattingExtensions],
    content,
  });
}

/** Selects the whole first paragraph. */
function selectAll(editor: Editor) {
  editor.commands.selectAll();
}

describe("formatting marks", () => {
  it("registers all seven additional extensions", () => {
    const names = formattingExtensions.map((e) => e.name);
    for (const n of ["underline", "highlight", "textStyle", "color", "superscript", "subscript", "textAlign"]) {
      expect(names, n).toContain(n);
    }
  });

  it("toggles underline on and off", () => {
    const editor = makeEditor();
    selectAll(editor);

    editor.commands.toggleUnderline();
    expect(editor.isActive("underline")).toBe(true);

    editor.commands.toggleUnderline();
    expect(editor.isActive("underline")).toBe(false);
    editor.destroy();
  });

  it("applies a highlight with a specific color", () => {
    const editor = makeEditor();
    selectAll(editor);
    editor.commands.toggleHighlight({ color: "#fef08a" });

    expect(editor.isActive("highlight", { color: "#fef08a" })).toBe(true);
    editor.destroy();
  });

  it("applies a text color and round-trips it through JSON", () => {
    const editor = makeEditor();
    selectAll(editor);
    editor.commands.setColor("#2563eb");

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("#2563eb");
    editor.destroy();
  });

  it("toggles superscript and subscript independently", () => {
    const editor = makeEditor();
    selectAll(editor);

    editor.commands.toggleSuperscript();
    expect(editor.isActive("superscript")).toBe(true);

    editor.commands.toggleSubscript();
    expect(editor.isActive("subscript")).toBe(true);
    expect(editor.isActive("superscript")).toBe(false);
    editor.destroy();
  });

  it("sets text alignment on a paragraph", () => {
    const editor = makeEditor();
    selectAll(editor);
    editor.commands.setTextAlign("center");

    expect(editor.isActive({ textAlign: "center" })).toBe(true);
    editor.destroy();
  });

  it("sets text alignment on a heading", () => {
    const editor = makeEditor("<h1>title</h1>");
    selectAll(editor);
    editor.commands.setTextAlign("right");

    expect(editor.isActive({ textAlign: "right" })).toBe(true);
    editor.destroy();
  });

  it("keeps StarterKit marks working alongside the new ones", () => {
    const editor = makeEditor();
    selectAll(editor);

    editor.commands.toggleBold();
    editor.commands.toggleUnderline();

    expect(editor.isActive("bold")).toBe(true);
    expect(editor.isActive("underline")).toBe(true);
    editor.destroy();
  });
});
```

Run it, confirm it fails on the missing module.

## Step 2: Implement the marks

Create `extensions/formatting.ts`:

```ts
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import type { Extension } from "@tiptap/react";

/**
 * The formatting marks StarterKit does not ship.
 *
 * bold / italic / strike / inline code come from StarterKit already.
 */
export const formattingExtensions: Extension[] = [
  Underline,
  // multicolor is required for toggleHighlight({ color }) to accept an argument.
  Highlight.configure({ multicolor: true }),
  // TextStyle is a required peer of Color — Color alone silently does nothing.
  TextStyle,
  Color,
  Superscript,
  Subscript,
  // Without an explicit types list, TextAlign registers but has no effect.
  TextAlign.configure({ types: ["heading", "paragraph"] }),
] as Extension[];
```

Import style (named vs default) may differ per package in v3. Match whatever the
installed package exports; report a mismatch rather than guessing.

## Step 3: Register in the assembly

In `extensions/index.ts`, add the import and **append** to the array:

```ts
import { formattingExtensions } from "./formatting";
// ...
    // task-03:
    ...formattingExtensions,
```

Replace the `// task-03:` placeholder comment left by task 01. Do not touch other
tasks' lines (briefing §10).

## Step 4: Write the button descriptors

Create `ui/toolbar-buttons.ts`:

```ts
import type { Editor } from "@tiptap/react";

/**
 * One descriptor per control, consumed by both the main toolbar (task 03) and
 * the bubble toolbar (task 06). Two consumers of one array means the two
 * surfaces cannot drift apart.
 */
export type ToolbarButton = {
  id: string;
  label: string;
  mark: string;
  markOptions?: Record<string, unknown>;
  action: (editor: Editor) => void;
  glyph:
    | "bold" | "italic" | "underline" | "strike" | "code"
    | "h1" | "h2" | "h3"
    | "bulletList" | "orderedList" | "taskList" | "quote"
    | "alignLeft" | "alignCenter" | "alignRight";
  group: "marks" | "headings" | "lists" | "align";
};

export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { id: "bold", label: "Bold", mark: "bold", glyph: "bold", group: "marks", action: (e) => e.chain().focus().toggleBold().run() },
  { id: "italic", label: "Italic", mark: "italic", glyph: "italic", group: "marks", action: (e) => e.chain().focus().toggleItalic().run() },
  { id: "underline", label: "Underline", mark: "underline", glyph: "underline", group: "marks", action: (e) => e.chain().focus().toggleUnderline().run() },
  { id: "strike", label: "Strikethrough", mark: "strike", glyph: "strike", group: "marks", action: (e) => e.chain().focus().toggleStrike().run() },
  { id: "code", label: "Inline code", mark: "code", glyph: "code", group: "marks", action: (e) => e.chain().focus().toggleCode().run() },

  { id: "h1", label: "Heading 1", mark: "heading", markOptions: { level: 1 }, glyph: "h1", group: "headings", action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "h2", label: "Heading 2", mark: "heading", markOptions: { level: 2 }, glyph: "h2", group: "headings", action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "h3", label: "Heading 3", mark: "heading", markOptions: { level: 3 }, glyph: "h3", group: "headings", action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },

  { id: "bulletList", label: "Bulleted list", mark: "bulletList", glyph: "bulletList", group: "lists", action: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "orderedList", label: "Numbered list", mark: "orderedList", glyph: "orderedList", group: "lists", action: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "quote", label: "Quote", mark: "blockquote", glyph: "quote", group: "lists", action: (e) => e.chain().focus().toggleBlockquote().run() },

  { id: "alignLeft", label: "Align left", mark: "", markOptions: { textAlign: "left" }, glyph: "alignLeft", group: "align", action: (e) => e.chain().focus().setTextAlign("left").run() },
  { id: "alignCenter", label: "Align center", mark: "", markOptions: { textAlign: "center" }, glyph: "alignCenter", group: "align", action: (e) => e.chain().focus().setTextAlign("center").run() },
  { id: "alignRight", label: "Align right", mark: "", markOptions: { textAlign: "right" }, glyph: "alignRight", group: "align", action: (e) => e.chain().focus().setTextAlign("right").run() },
];

/** Subset shown in the selection bubble. Task 06 consumes this. */
export const BUBBLE_BUTTON_IDS: readonly string[] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
];
```

> `taskList` is deliberately absent — task 04 owns that node. Add its descriptor
> in task 04 if the toolbar should expose it, or leave it to the slash menu.

## Step 5: Build the toolbar

Create `ui/toolbar.tsx`. Requirements:

- `role="toolbar"` with `aria-label="Formatting options"`
- Each button: `aria-label` from the descriptor, `aria-pressed` from
  `editor.isActive(mark, markOptions)`
- Group separators between `group` changes
- `Button` from `@/components/ui/button` with `variant="ghost"` `size="sm"`
- Glyphs via `Icon` from `@/components/ui/icon`
- **Tokens only** — `--ink`, `--ink-soft`, `--accent`, `--accent-soft`, `--line`,
  `--bg-2`. **No raw hex** (`DESIGN.md`, AC-19)
- Horizontally scrollable on narrow viewports (`overflow-x-auto`); task 12
  refines responsive behavior

Keep a local `glyphPaths` map from `glyph` name to SVG children so the descriptor
array stays free of JSX.

## Step 6: Test the toolbar

Create `ui/toolbar.test.tsx` covering:

- Renders a button for every descriptor
- Every button has an accessible name (`getByRole("button", { name })`)
- Clicking Bold toggles `bold` in the resulting document JSON
- `aria-pressed` reflects active state
- Has `role="toolbar"` with a label
- Passes `axe` with no violations (`vitest-axe`, already a dependency)

Mount with a real `Editor` instance rather than a mock, so `isActive` behaves.

## Step 7: Wire into the shell

In `document-editor.tsx`, pass `<Toolbar editor={editor} />` into `toolbarSlot`
at the render site — task 01 left the slot for exactly this. Do **not**
restructure the shell.

## Step 8: Verify and commit

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
git add package.json pnpm-lock.yaml src/features/document
git commit -m "feat(editor): add seven formatting marks and a config-driven toolbar

Wires the already-installed color and text-style packages, which were present
but unused. Buttons are descriptors shared with the bubble toolbar so the two
surfaces cannot drift."
```

Update [`progress.md`](./progress.md): task 03 `done`, tick AC-4.

## Done when

- [ ] `formatting.test.tsx` passes, 8 tests
- [ ] `ui/toolbar.test.tsx` passes including the axe check
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` clean
- [ ] Committed, `progress.md` updated

## Do not

- Write per-button JSX; use the descriptor array
- Use raw hex colors anywhere
- Reorder or edit another task's line in `extensions/index.ts`
- Restructure `document-editor.tsx`
- Add color/highlight **pickers** here — popovers belong with task 06
- Configure `TextAlign` without a `types` array
- Wire `Color` without `TextStyle`

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
    | "bold"
    | "italic"
    | "underline"
    | "strike"
    | "code"
    | "h1"
    | "h2"
    | "h3"
    | "bulletList"
    | "orderedList"
    | "taskList"
    | "quote"
    | "alignLeft"
    | "alignCenter"
    | "alignRight";
  group: "marks" | "headings" | "lists" | "align";
};

export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  {
    id: "bold",
    label: "Bold",
    mark: "bold",
    glyph: "bold",
    group: "marks",
    action: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    label: "Italic",
    mark: "italic",
    glyph: "italic",
    group: "marks",
    action: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: "underline",
    label: "Underline",
    mark: "underline",
    glyph: "underline",
    group: "marks",
    action: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    id: "strike",
    label: "Strikethrough",
    mark: "strike",
    glyph: "strike",
    group: "marks",
    action: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    id: "code",
    label: "Inline code",
    mark: "code",
    glyph: "code",
    group: "marks",
    action: (e) => e.chain().focus().toggleCode().run(),
  },

  {
    id: "h1",
    label: "Heading 1",
    mark: "heading",
    markOptions: { level: 1 },
    glyph: "h1",
    group: "headings",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    mark: "heading",
    markOptions: { level: 2 },
    glyph: "h2",
    group: "headings",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    mark: "heading",
    markOptions: { level: 3 },
    glyph: "h3",
    group: "headings",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  {
    id: "bulletList",
    label: "Bulleted list",
    mark: "bulletList",
    glyph: "bulletList",
    group: "lists",
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Numbered list",
    mark: "orderedList",
    glyph: "orderedList",
    group: "lists",
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "quote",
    label: "Quote",
    mark: "blockquote",
    glyph: "quote",
    group: "lists",
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },

  {
    id: "alignLeft",
    label: "Align left",
    mark: "",
    markOptions: { textAlign: "left" },
    glyph: "alignLeft",
    group: "align",
    action: (e) => e.chain().focus().setTextAlign("left").run(),
  },
  {
    id: "alignCenter",
    label: "Align center",
    mark: "",
    markOptions: { textAlign: "center" },
    glyph: "alignCenter",
    group: "align",
    action: (e) => e.chain().focus().setTextAlign("center").run(),
  },
  {
    id: "alignRight",
    label: "Align right",
    mark: "",
    markOptions: { textAlign: "right" },
    glyph: "alignRight",
    group: "align",
    action: (e) => e.chain().focus().setTextAlign("right").run(),
  },
];

/** Subset shown in the selection bubble. Task 06 consumes this. */
export const BUBBLE_BUTTON_IDS: readonly string[] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
];

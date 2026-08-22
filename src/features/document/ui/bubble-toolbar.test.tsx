import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { blockExtensions } from "../extensions/blocks";
import { formattingExtensions } from "../extensions/formatting";
import { BubbleToolbar, shouldShowBubble } from "./bubble-toolbar";
import { BUBBLE_BUTTON_IDS, TOOLBAR_BUTTONS } from "./toolbar-buttons";

function createTestEditor(content = "<p>hello world</p>", editable = true) {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      ...formattingExtensions,
      ...blockExtensions,
    ],
    content,
    editable,
  });
}

describe("shouldShowBubble", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("returns false for an empty selection (from === to)", () => {
    editor = createTestEditor();
    expect(shouldShowBubble({ editor, from: 1, to: 1 })).toBe(false);
  });

  it("returns false when editor.isEditable is false", () => {
    editor = createTestEditor("<p>hello world</p>", false);
    expect(shouldShowBubble({ editor, from: 1, to: 6 })).toBe(false);
  });

  it("returns false when selection is inside a code block", () => {
    const mockEditor = {
      isEditable: true,
      isActive: (name: string) => name === "codeBlock",
    } as unknown as Editor;
    expect(shouldShowBubble({ editor: mockEditor, from: 1, to: 5 })).toBe(
      false,
    );
  });

  it("returns true for non-empty text selection in an editable editor", () => {
    editor = createTestEditor("<p>hello world</p>");
    expect(shouldShowBubble({ editor, from: 1, to: 6 })).toBe(true);
  });
});

describe("BubbleToolbar", () => {
  let editor: Editor;

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    editor?.destroy();
  });

  it("renders a toolbar with role and accessible label", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    render(<BubbleToolbar editor={editor} />);

    const toolbar = screen.getByRole("toolbar", {
      name: "Floating formatting options",
    });
    expect(toolbar).toBeInTheDocument();
  });

  it("renders a button for each id in BUBBLE_BUTTON_IDS", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    render(<BubbleToolbar editor={editor} />);

    const bubbleButtons = TOOLBAR_BUTTONS.filter((b) =>
      BUBBLE_BUTTON_IDS.includes(b.id),
    );
    expect(bubbleButtons.length).toBe(BUBBLE_BUTTON_IDS.length);

    for (const btn of bubbleButtons) {
      const button = screen.getByRole("button", { name: btn.label });
      expect(button).toBeInTheDocument();
    }
  });

  it("renders link, text color, and highlight color controls", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    render(<BubbleToolbar editor={editor} />);

    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Text color" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Highlight color" }),
    ).toBeInTheDocument();
  });

  it("toggles bold mark on click and updates aria-pressed", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    const { rerender } = render(<BubbleToolbar editor={editor} />);
    const boldButton = screen.getByRole("button", { name: "Bold" });
    expect(boldButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(boldButton);

    expect(editor.isActive("bold")).toBe(true);
    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("bold");

    rerender(<BubbleToolbar editor={editor} />);
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("disables link button when setLink is unavailable", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    render(<BubbleToolbar editor={editor} />);

    const linkButton = screen.getByRole("button", { name: "Link" });
    expect(linkButton).toBeDisabled();
    expect(linkButton).toHaveAttribute(
      "title",
      "Link (requires link extension)",
    );
  });

  it("passes axe accessibility checks with no violations", async () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    const { container } = render(<BubbleToolbar editor={editor} />);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

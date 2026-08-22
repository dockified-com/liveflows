import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { formattingExtensions } from "../extensions/formatting";
import { Toolbar } from "./toolbar";
import { TOOLBAR_BUTTONS } from "./toolbar-buttons";

function createTestEditor(content = "<p>hello world</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...formattingExtensions,
    ],
    content,
  });
}

describe("Toolbar", () => {
  let editor: Editor;

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    editor?.destroy();
  });

  it("renders a toolbar container with role and accessible label", () => {
    editor = createTestEditor();
    render(<Toolbar editor={editor} />);

    const toolbar = screen.getByRole("toolbar", { name: "Formatting options" });
    expect(toolbar).toBeInTheDocument();
  });

  it("renders a button for every descriptor with accessible name", () => {
    editor = createTestEditor();
    render(<Toolbar editor={editor} />);

    for (const btn of TOOLBAR_BUTTONS) {
      const button = screen.getByRole("button", { name: btn.label });
      expect(button).toBeInTheDocument();
    }
  });

  it("toggles bold in the editor and updates aria-pressed", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    const { rerender } = render(<Toolbar editor={editor} />);
    const boldButton = screen.getByRole("button", { name: "Bold" });
    expect(boldButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(boldButton);

    expect(editor.isActive("bold")).toBe(true);
    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("bold");

    rerender(<Toolbar editor={editor} />);
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("passes axe accessibility checks with no violations", async () => {
    editor = createTestEditor();
    const { container } = render(<Toolbar editor={editor} />);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

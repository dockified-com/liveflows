import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { BlockHandle } from "./block-handle";
import type { BlockTarget } from "./pos-at-coords";

function makeEditor(content = "<p>first block</p><p>second block</p>") {
  const editor = new Editor({
    extensions: [StarterKit.configure({ codeBlock: false })],
    content,
  });

  if (!editor.isInitialized) {
    editor.emit("create", { editor });
    editor.isInitialized = true;
  }

  return editor;
}

function makeTarget(editor: Editor, pos = 0): BlockTarget {
  const domEl = document.createElement("div");
  domEl.getBoundingClientRect = () =>
    ({
      top: 100,
      left: 50,
      width: 400,
      height: 30,
      bottom: 130,
      right: 450,
      x: 50,
      y: 100,
      toJSON: () => {},
    }) as DOMRect;

  return {
    pos,
    node: editor.state.doc.child(0),
    domEl,
    depth: 1,
  };
}

describe("BlockHandle", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when no block is hovered", () => {
    const editor = makeEditor();
    const { container } = render(<BlockHandle editor={editor} />);

    expect(container.firstChild).toBeNull();
    editor.destroy();
  });

  it("renders a button with aria-label='Block options' when a target is set", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    const button = screen.getByRole("button", { name: "Block options" });
    expect(button).toBeInTheDocument();
    editor.destroy();
  });

  it("uses the ⠿ glyph", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    const button = screen.getByRole("button", { name: "Block options" });
    expect(button.textContent?.trim()).toBe("⠿");
    editor.destroy();
  });

  it("aria-expanded is false initially, true after click", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    const button = screen.getByRole("button", { name: "Block options" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    editor.destroy();
  });

  it("aria-controls matches the menu's id", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    const button = screen.getByRole("button", { name: "Block options" });
    const menuId = button.getAttribute("aria-controls");
    expect(menuId).toBeTruthy();

    fireEvent.click(button);
    const menu = screen.getByRole("menu", { name: "Block options" });
    expect(menu).toHaveAttribute("id", menuId);

    editor.destroy();
  });

  it("clicking opens the menu", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    expect(
      screen.queryByRole("menu", { name: "Block options" }),
    ).not.toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Block options" });
    fireEvent.click(button);

    expect(
      screen.getByRole("menu", { name: "Block options" }),
    ).toBeInTheDocument();
    editor.destroy();
  });

  it("Escape from the menu returns focus to the handle button", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    const button = screen.getByRole("button", { name: "Block options" });
    fireEvent.click(button);

    const menu = screen.getByRole("menu", { name: "Block options" });
    fireEvent.keyDown(menu, { key: "Escape" });

    expect(
      screen.queryByRole("menu", { name: "Block options" }),
    ).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    editor.destroy();
  });

  it("the handle is keyboard focusable (tabIndex 0, not -1)", () => {
    const editor = makeEditor();
    const target = makeTarget(editor);
    render(<BlockHandle editor={editor} initialTarget={target} />);

    const button = screen.getByRole("button", { name: "Block options" });
    expect(button).toHaveAttribute("tabindex", "0");

    button.focus();
    expect(button).toHaveFocus();

    editor.destroy();
  });
});

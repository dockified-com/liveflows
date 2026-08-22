import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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

  it("renders a button for every descriptor with accessible name when all items fit", () => {
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

  describe("Toolbar Overflow Behavior", () => {
    let resizeCallbacks: Array<
      (entries: Array<{ contentRect: { width: number } }>) => void
    > = [];
    const originalResizeObserver = globalThis.ResizeObserver;

    beforeEach(() => {
      resizeCallbacks = [];
      globalThis.ResizeObserver = class {
        constructor(
          cb: (entries: Array<{ contentRect: { width: number } }>) => void,
        ) {
          resizeCallbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as never;
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalResizeObserver;
    });

    it("renders More button and dropdown when container is narrow", () => {
      editor = createTestEditor();
      render(<Toolbar editor={editor} />);

      // Trigger narrow resize (e.g. 200px)
      act(() => {
        resizeCallbacks[0]?.([{ contentRect: { width: 200 } }]);
      });

      const moreButton = screen.getByRole("button", { name: "More" });
      expect(moreButton).toBeInTheDocument();
      expect(moreButton).toHaveAttribute("aria-expanded", "false");
      expect(moreButton).toHaveAttribute("aria-haspopup", "menu");
      expect(moreButton).toHaveAttribute(
        "aria-controls",
        "toolbar-overflow-menu",
      );
    });

    it("opens overflow menu on More click and allows keyboard navigation", () => {
      editor = createTestEditor();
      render(<Toolbar editor={editor} />);

      act(() => {
        resizeCallbacks[0]?.([{ contentRect: { width: 200 } }]);
      });

      const moreButton = screen.getByRole("button", { name: "More" });
      fireEvent.click(moreButton);

      expect(moreButton).toHaveAttribute("aria-expanded", "true");
      const menu = screen.getByRole("menu", {
        name: "More formatting options",
      });
      expect(menu).toBeInTheDocument();

      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems.length).toBeGreaterThan(0);

      // Arrow navigation
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      fireEvent.keyDown(menu, { key: "ArrowUp" });

      // Escape closes menu and returns focus
      fireEvent.keyDown(menu, { key: "Escape" });
      expect(
        screen.queryByRole("menu", { name: "More formatting options" }),
      ).not.toBeInTheDocument();
      expect(moreButton).toHaveAttribute("aria-expanded", "false");
    });

    it("executes editor action on menuitem click and closes menu", () => {
      editor = createTestEditor();
      render(<Toolbar editor={editor} />);

      act(() => {
        resizeCallbacks[0]?.([{ contentRect: { width: 100 } }]);
      });

      const moreButton = screen.getByRole("button", { name: "More" });
      fireEvent.click(moreButton);

      const quoteItem = screen.getByRole("menuitem", { name: "Quote" });
      fireEvent.click(quoteItem);

      expect(editor.isActive("blockquote")).toBe(true);
      expect(
        screen.queryByRole("menu", { name: "More formatting options" }),
      ).not.toBeInTheDocument();
    });

    it("passes axe accessibility checks with More menu open", async () => {
      editor = createTestEditor();
      const { container } = render(<Toolbar editor={editor} />);

      act(() => {
        resizeCallbacks[0]?.([{ contentRect: { width: 200 } }]);
      });

      const moreButton = screen.getByRole("button", { name: "More" });
      fireEvent.click(moreButton);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });
});

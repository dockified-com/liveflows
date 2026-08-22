import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { formattingExtensions } from "../extensions/formatting";
import { ColorPopover } from "./color-popover";

function createTestEditor(content = "<p>hello world</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...formattingExtensions,
    ],
    content,
  });
}

describe("ColorPopover", () => {
  let editor: Editor;

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    editor?.destroy();
  });

  it("renders a trigger button with accessible attributes and closed state", () => {
    editor = createTestEditor();
    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const controlsId = trigger.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();

    // Popover panel should not be visible when closed
    expect(
      screen.queryByRole("listbox", { name: "Text colors" }),
    ).not.toBeInTheDocument();
  });

  it("opens panel on click and updates aria-expanded and aria-controls", () => {
    editor = createTestEditor();
    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panelId = trigger.getAttribute("aria-controls");
    const panel = screen.getByRole("listbox", { name: "Text colors" });
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute("id", panelId);
  });

  it("moves focus into the panel on open", () => {
    editor = createTestEditor();
    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    const items = screen.getAllByRole("option");
    expect(items.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(items[0]);
  });

  it("navigates swatches with ArrowRight and ArrowLeft keyboard keys", () => {
    editor = createTestEditor();
    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    const items = screen.getAllByRole("option");
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(items[1]);

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(items[2]);

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(items[1]);
  });

  it("closes and restores focus to trigger on Escape key", () => {
    editor = createTestEditor();
    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    expect(
      screen.getByRole("listbox", { name: "Text colors" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(
      screen.queryByRole("listbox", { name: "Text colors" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("applies text color mark and closes on swatch click", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    const accentSwatch = screen.getByRole("option", { name: "Accent" });
    fireEvent.click(accentSwatch);

    expect(editor.isActive("textStyle", { color: "var(--accent)" })).toBe(true);
    expect(
      screen.queryByRole("listbox", { name: "Text colors" }),
    ).not.toBeInTheDocument();
  });

  it("unsets text color mark and closes on remove click", () => {
    editor = createTestEditor();
    editor.commands.selectAll();
    editor.commands.setColor("var(--accent)");
    expect(editor.isActive("textStyle", { color: "var(--accent)" })).toBe(true);

    render(<ColorPopover editor={editor} kind="text" />);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    const removeSwatch = screen.getByRole("option", {
      name: "Remove text color",
    });
    fireEvent.click(removeSwatch);

    expect(editor.isActive("textStyle")).toBe(false);
    expect(
      screen.queryByRole("listbox", { name: "Text colors" }),
    ).not.toBeInTheDocument();
  });

  it("applies highlight color and unsets highlight for kind='highlight'", () => {
    editor = createTestEditor();
    editor.commands.selectAll();

    render(<ColorPopover editor={editor} kind="highlight" />);

    const trigger = screen.getByRole("button", { name: "Highlight color" });
    fireEvent.click(trigger);

    const accentSwatch = screen.getByRole("option", { name: "Accent" });
    fireEvent.click(accentSwatch);

    expect(editor.isActive("highlight", { color: "var(--accent-soft)" })).toBe(
      true,
    );

    // Reopen and remove highlight
    fireEvent.click(trigger);
    const removeSwatch = screen.getByRole("option", {
      name: "Remove highlight",
    });
    fireEvent.click(removeSwatch);

    expect(editor.isActive("highlight")).toBe(false);
  });

  it("closes popover when clicking outside", () => {
    editor = createTestEditor();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ColorPopover editor={editor} kind="text" />
      </div>,
    );

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    expect(
      screen.getByRole("listbox", { name: "Text colors" }),
    ).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(
      screen.queryByRole("listbox", { name: "Text colors" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("passes axe accessibility checks when closed and open", async () => {
    editor = createTestEditor();
    const { container } = render(<ColorPopover editor={editor} kind="text" />);

    let results = await axe(container);
    expect(results.violations).toEqual([]);

    const trigger = screen.getByRole("button", { name: "Text color" });
    fireEvent.click(trigger);

    results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

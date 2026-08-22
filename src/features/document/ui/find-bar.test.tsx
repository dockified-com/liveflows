import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { findExtension, getFindState } from "../extensions/find";
import { FindBar } from "./find-bar";

function createEditor(
  content = "<p>LiveFlows is awesome. Realtime LiveFlows canvas.</p>",
) {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), findExtension],
    content,
  });
}

describe("FindBar", () => {
  let editor: Editor;

  beforeEach(() => {
    cleanup();
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
    vi.restoreAllMocks();
  });

  it("opens on Cmd+F / Ctrl+F and prevents default event", async () => {
    render(<FindBar editor={editor} />);

    expect(
      screen.queryByRole("region", { name: "Find bar" }),
    ).not.toBeInTheDocument();

    const event = new KeyboardEvent("keydown", {
      key: "f",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(
      screen.getByRole("region", { name: "Find bar" }),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Find in document");
    expect(input).toBeInTheDocument();
  });

  it("finds matches and reports count", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "LiveFlows" } });

    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    const state = getFindState(editor);
    expect(state?.matches).toHaveLength(2);
    expect(state?.currentIndex).toBe(0);
  });

  it("advances and wraps around with next button", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "LiveFlows" } });

    const nextBtn = screen.getByRole("button", { name: "Next match" });
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    fireEvent.click(nextBtn);
    expect(screen.getByText("2 of 2")).toBeInTheDocument();

    fireEvent.click(nextBtn);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("moves backward and wraps around with previous button", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "LiveFlows" } });

    const prevBtn = screen.getByRole("button", { name: "Previous match" });
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    fireEvent.click(prevBtn);
    expect(screen.getByText("2 of 2")).toBeInTheDocument();

    fireEvent.click(prevBtn);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("handles Enter and Shift+Enter in the input", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "LiveFlows" } });

    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    expect(screen.getByText("2 of 2")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("shows 0 of 0 and disables navigation buttons when no matches found", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "nonexistent text" } });

    expect(screen.getByText("0 of 0")).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: "Previous match" });
    const nextBtn = screen.getByRole("button", { name: "Next match" });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it("closes and clears decorations on Escape", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "LiveFlows" } });

    expect(getFindState(editor)?.matches.length).toBeGreaterThan(0);

    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByRole("region", { name: "Find bar" }),
    ).not.toBeInTheDocument();

    const stateAfter = getFindState(editor);
    expect(stateAfter?.query).toBe("");
    expect(stateAfter?.matches).toHaveLength(0);
  });

  it("closes and clears decorations when clicking close button", () => {
    render(<FindBar editor={editor} defaultOpen={true} />);

    const input = screen.getByLabelText("Find in document");
    fireEvent.change(input, { target: { value: "LiveFlows" } });

    const closeBtn = screen.getByRole("button", { name: "Close find" });
    fireEvent.click(closeBtn);

    expect(
      screen.queryByRole("region", { name: "Find bar" }),
    ).not.toBeInTheDocument();

    const stateAfter = getFindState(editor);
    expect(stateAfter?.matches).toHaveLength(0);
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(
      <FindBar editor={editor} defaultOpen={true} />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

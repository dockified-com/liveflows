import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { TocView } from "./toc-view";

function createMockEditor(jsonContent: unknown = { type: "doc", content: [] }) {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    getJSON: vi.fn(() => jsonContent),
    on: vi.fn((event: string, fn: () => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    }),
    off: vi.fn((event: string, fn: () => void) => {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
    }),
    emit: (event: string) => {
      for (const fn of listeners[event] || []) {
        fn();
      }
    },
  };
}

function createMockNodeViewProps(
  editorMock = createMockEditor(),
): NodeViewProps {
  return {
    editor: editorMock as never,
    node: {
      attrs: {},
    } as never,
    decorations: [] as never,
    innerDecorations: [] as never,
    view: {} as never,
    getPos: () => 0,
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
    selected: false,
    extension: {} as never,
    HTMLAttributes: {},
  };
}

describe("TocView", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when there are no headings", () => {
    const props = createMockNodeViewProps();
    render(<TocView {...props} />);

    expect(screen.getByText("On this page")).toBeInTheDocument();
    expect(screen.getByText("No headings yet")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Table of contents" }),
    ).toBeInTheDocument();
  });

  it("renders heading items and indents according to heading level", () => {
    const docJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: "h1-id", level: 1 },
          content: [{ type: "text", text: "Main Section" }],
        },
        {
          type: "heading",
          attrs: { id: "h2-id", level: 2 },
          content: [{ type: "text", text: "Sub Section" }],
        },
        {
          type: "heading",
          attrs: { id: "h3-id", level: 3 },
          content: [{ type: "text", text: "Deep Subsection" }],
        },
      ],
    };

    const props = createMockNodeViewProps(createMockEditor(docJson));
    render(<TocView {...props} />);

    const h1Btn = screen.getByRole("button", { name: "Main Section" });
    const h2Btn = screen.getByRole("button", { name: "Sub Section" });
    const h3Btn = screen.getByRole("button", { name: "Deep Subsection" });

    expect(h1Btn).toBeInTheDocument();
    expect(h2Btn).toBeInTheDocument();
    expect(h3Btn).toBeInTheDocument();

    const h1Item = h1Btn.closest("li");
    const h2Item = h2Btn.closest("li");
    const h3Item = h3Btn.closest("li");

    expect(h1Item).toHaveClass("pl-0");
    expect(h2Item).toHaveClass("pl-3");
    expect(h3Item).toHaveClass("pl-6");
  });

  it("scrolls element with matching data-id into view when clicked", () => {
    const docJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: "target-heading", level: 2 },
          content: [{ type: "text", text: "Target Title" }],
        },
      ],
    };

    const targetEl = document.createElement("h2");
    targetEl.setAttribute("data-id", "target-heading");
    targetEl.scrollIntoView = vi.fn();
    document.body.appendChild(targetEl);

    const props = createMockNodeViewProps(createMockEditor(docJson));
    render(<TocView {...props} />);

    const btn = screen.getByRole("button", { name: "Target Title" });
    fireEvent.click(btn);

    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    document.body.removeChild(targetEl);
  });

  it("renders entries with id: null as plain non-interactive text", () => {
    const docJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: null, level: 1 },
          content: [{ type: "text", text: "Legacy Heading Without ID" }],
        },
      ],
    };

    const props = createMockNodeViewProps(createMockEditor(docJson));
    render(<TocView {...props} />);

    expect(screen.getByText("Legacy Heading Without ID")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Legacy Heading Without ID" }),
    ).not.toBeInTheDocument();
  });

  it("updates outline when editor emits update event", () => {
    const editorMock = createMockEditor({ type: "doc", content: [] });
    const props = createMockNodeViewProps(editorMock);
    render(<TocView {...props} />);

    expect(screen.getByText("No headings yet")).toBeInTheDocument();

    editorMock.getJSON.mockReturnValue({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: "new-h1", level: 1 },
          content: [{ type: "text", text: "New Heading" }],
        },
      ],
    });

    act(() => {
      editorMock.emit("update");
    });

    expect(screen.queryByText("No headings yet")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New Heading" }),
    ).toBeInTheDocument();
  });

  it("passes axe accessibility checks", async () => {
    const docJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: "h1", level: 1 },
          content: [{ type: "text", text: "Section 1" }],
        },
        {
          type: "heading",
          attrs: { id: "h2", level: 2 },
          content: [{ type: "text", text: "Section 1.1" }],
        },
      ],
    };

    const props = createMockNodeViewProps(createMockEditor(docJson));
    const { container } = render(<TocView {...props} />);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

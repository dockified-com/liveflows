import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { CODE_LANGUAGES } from "../extensions/technical-content";
import { CodeBlockView } from "./code-block-view";

function createMockNodeViewProps(
  attrs = { language: "" },
  textContent = "const a = 1;",
): NodeViewProps {
  return {
    editor: {} as never,
    node: {
      attrs,
      textContent,
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

describe("CodeBlockView", () => {
  beforeEach(() => {
    cleanup();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a language selector populated from CODE_LANGUAGES plus Plain text", () => {
    const props = createMockNodeViewProps({ language: "typescript" });
    render(<CodeBlockView {...props} />);

    const select = screen.getByRole("combobox", { name: "Code language" });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("typescript");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(CODE_LANGUAGES.length + 1);
    expect(options[0]).toHaveTextContent("Plain text");
    expect(options[0]).toHaveValue("");

    for (let i = 0; i < CODE_LANGUAGES.length; i++) {
      expect(options[i + 1]).toHaveValue(CODE_LANGUAGES[i].id);
      expect(options[i + 1]).toHaveTextContent(CODE_LANGUAGES[i].label);
    }
  });

  it("calls updateAttributes when a language is selected", () => {
    const props = createMockNodeViewProps({ language: "" });
    render(<CodeBlockView {...props} />);

    const select = screen.getByRole("combobox", { name: "Code language" });
    fireEvent.change(select, { target: { value: "python" } });

    expect(props.updateAttributes).toHaveBeenCalledWith({ language: "python" });
  });

  it("calls updateAttributes with null when Plain text is selected", () => {
    const props = createMockNodeViewProps({ language: "go" });
    render(<CodeBlockView {...props} />);

    const select = screen.getByRole("combobox", { name: "Code language" });
    fireEvent.change(select, { target: { value: "" } });

    expect(props.updateAttributes).toHaveBeenCalledWith({ language: null });
  });

  it("copies code to clipboard and shows transient confirmation with aria-live", async () => {
    const props = createMockNodeViewProps({ language: "rust" }, "fn main() {}");
    render(<CodeBlockView {...props} />);

    const copyBtn = screen.getByRole("button", { name: "Copy code" });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("fn main() {}");
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
      expect(screen.getByText("Code copied to clipboard")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it("passes axe accessibility checks", async () => {
    const props = createMockNodeViewProps({ language: "typescript" });
    const { container } = render(<CodeBlockView {...props} />);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

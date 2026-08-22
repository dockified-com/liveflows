import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { blockExtensions } from "../extensions/blocks";
import { formattingExtensions } from "../extensions/formatting";
import { tableExtensions } from "../extensions/tables";
import { moveRow, TableControls } from "./table-controls";

function createTestEditor(content = "<p>hello world</p>", editable = true) {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, trailingNode: false }),
      ...formattingExtensions,
      ...blockExtensions,
      ...tableExtensions,
    ],
    content,
    editable,
  });
}

function tableShape(editor: Editor): { rows: number; cellsPerRow: number[] } {
  const docJson = editor.getJSON();
  let rows = 0;
  const cellsPerRow: number[] = [];

  const walk = (node: { type?: string; content?: unknown[] }) => {
    if (node.type === "tableRow") {
      rows++;
      const cellCount = Array.isArray(node.content)
        ? node.content.filter(
            (c): c is { type?: string } =>
              typeof c === "object" &&
              c !== null &&
              "type" in c &&
              ((c as { type?: string }).type === "tableCell" ||
                (c as { type?: string }).type === "tableHeader"),
          ).length
        : 0;
      cellsPerRow.push(cellCount);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (typeof child === "object" && child !== null) {
          walk(child as { type?: string; content?: unknown[] });
        }
      }
    }
  };

  walk(docJson as { type?: string; content?: unknown[] });
  return { rows, cellsPerRow };
}

function nodeTypes(editor: Editor): string[] {
  const found: string[] = [];
  const walk = (node: { type?: unknown; content?: unknown }) => {
    if (typeof node.type === "string") found.push(node.type);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(editor.getJSON() as never);
  return found;
}

function findCellPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      positions.push(pos);
    }
  });
  return positions;
}

describe("TableControls", () => {
  let editor: Editor;

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    editor?.destroy();
  });

  it("returns null when the selection is not in a table", () => {
    editor = createTestEditor("<p>Not in a table</p>");
    const { container } = render(<TableControls editor={editor} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders controls when the selection is inside a table", () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    render(<TableControls editor={editor} />);
    const toolbar = screen.getByRole("toolbar", { name: "Table controls" });
    expect(toolbar).toBeInTheDocument();
  });

  it("every control has an accessible name", () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    render(<TableControls editor={editor} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    for (const button of buttons) {
      expect(button).toHaveAccessibleName();
    }
  });

  it('clicking "Insert row below" adds a row (assert via document JSON)', () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).rows).toBe(3);

    render(<TableControls editor={editor} />);
    const insertRowBtn = screen.getByRole("button", {
      name: "Insert row below",
    });
    fireEvent.click(insertRowBtn);

    expect(tableShape(editor).rows).toBe(4);
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3, 3]);
  });

  it('clicking "Delete row" removes one', () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).rows).toBe(3);

    render(<TableControls editor={editor} />);
    const deleteRowBtn = screen.getByRole("button", { name: "Delete row" });
    fireEvent.click(deleteRowBtn);

    expect(tableShape(editor).rows).toBe(2);
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3]);
  });

  it('clicking "Insert column right" adds a column', () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3]);

    render(<TableControls editor={editor} />);
    const insertColBtn = screen.getByRole("button", {
      name: "Insert column right",
    });
    fireEvent.click(insertColBtn);

    expect(tableShape(editor).cellsPerRow).toEqual([4, 4, 4]);
  });

  it('clicking "Delete column" removes one', () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3]);

    render(<TableControls editor={editor} />);
    const deleteColBtn = screen.getByRole("button", {
      name: "Delete column",
    });
    fireEvent.click(deleteColBtn);

    expect(tableShape(editor).cellsPerRow).toEqual([2, 2, 2]);
  });

  it('clicking "Toggle header row" flips the header', () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(nodeTypes(editor)).toContain("tableHeader");

    render(<TableControls editor={editor} />);
    const toggleHeaderBtn = screen.getByRole("button", {
      name: "Toggle header row",
    });
    fireEvent.click(toggleHeaderBtn);

    expect(nodeTypes(editor)).not.toContain("tableHeader");
    expect(nodeTypes(editor)).toContain("tableCell");
  });

  it("merge is disabled when only one cell is selected", () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    render(<TableControls editor={editor} />);
    const mergeBtn = screen.getByRole("button", { name: "Merge cells" });
    expect(mergeBtn).toBeDisabled();
  });

  it("delete-table asks for no confirmation but does remove the table", () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(nodeTypes(editor)).toContain("table");

    render(<TableControls editor={editor} />);
    const deleteTableBtn = screen.getByRole("button", {
      name: "Delete table",
    });
    fireEvent.click(deleteTableBtn);

    expect(nodeTypes(editor)).not.toContain("table");
  });

  it("the row-reorder helper moves a row and preserves cell contents", () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 2, withHeaderRow: false });

    // Populate cell texts
    const cells = findCellPositions(editor);
    editor.commands.insertContentAt(cells[0] + 1, "Alpha");
    const cellsAfterAlpha = findCellPositions(editor);
    editor.commands.insertContentAt(cellsAfterAlpha[2] + 1, "Beta");
    const cellsAfterBeta = findCellPositions(editor);
    editor.commands.insertContentAt(cellsAfterBeta[4] + 1, "Gamma");

    const getRowTexts = () => {
      const json = editor.getJSON();
      const table = (
        json.content as Array<{ type: string; content?: unknown[] }>
      ).find((n) => n.type === "table");
      return table?.content?.map((row) => JSON.stringify(row)) ?? [];
    };

    const initialRows = getRowTexts();
    expect(initialRows[0]).toContain("Alpha");
    expect(initialRows[1]).toContain("Beta");
    expect(initialRows[2]).toContain("Gamma");

    // Move row 1 (Beta) to index 0 (top)
    const moved = moveRow(editor, 1, 0);
    expect(moved).toBe(true);

    const reorderedRows = getRowTexts();
    expect(reorderedRows[0]).toContain("Beta");
    expect(reorderedRows[1]).toContain("Alpha");
    expect(reorderedRows[2]).toContain("Gamma");

    expect(() => editor.state.doc.check()).not.toThrow();
  });

  it("passes axe with no violations", async () => {
    editor = createTestEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    const { container } = render(<TableControls editor={editor} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

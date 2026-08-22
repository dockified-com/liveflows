import { CellSelection } from "@tiptap/pm/tables";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { tableExtensions } from "./tables";

function makeEditor(content = "<p>Initial</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, trailingNode: false }),
      ...tableExtensions,
    ],
    content,
  });
}

/** Helper that inspects document JSON to extract row count and cells per row. */
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

/** Collects all node types in document JSON. */
function nodeTypes(editor: Editor): string[] {
  const found: string[] = [];
  const walk = (node: { type?: unknown; content?: unknown }) => {
    if (typeof node.type === "string") found.push(node.type);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(editor.getJSON() as never);
  return found;
}

/** Helper to find cell positions in the document. */
function findCellPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      positions.push(pos);
    }
  });
  return positions;
}

describe("tableExtensions", () => {
  it("registers table, tableRow, tableCell, and tableHeader", () => {
    const names = tableExtensions.map((e) => e.name);
    expect(names).toContain("table");
    expect(names).toContain("tableRow");
    expect(names).toContain("tableCell");
    expect(names).toContain("tableHeader");
  });

  it("insertTable({ rows: 3, cols: 3, withHeaderRow: true }) produces a table", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    expect(nodeTypes(editor)).toContain("table");
    const shape = tableShape(editor);
    expect(shape.rows).toBe(3);
    expect(shape.cellsPerRow).toEqual([3, 3, 3]);
    editor.destroy();
  });

  it("the created table has a header row (tableHeader present)", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    expect(nodeTypes(editor)).toContain("tableHeader");
    const content = editor.getJSON().content as
      | Array<{
          type: string;
          content?: Array<{
            type: string;
            content?: Array<{ type: string }>;
          }>;
        }>
      | undefined;
    const firstRow = content?.find((n) => n.type === "table")?.content?.[0];
    expect(firstRow?.type).toBe("tableRow");
    expect(
      firstRow?.content?.every((cell) => cell.type === "tableHeader"),
    ).toBe(true);
    editor.destroy();
  });

  it("addRowAfter increases the row count by one", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).rows).toBe(3);

    editor.commands.addRowAfter();
    expect(tableShape(editor).rows).toBe(4);
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3, 3]);
    editor.destroy();
  });

  it("deleteRow decreases the row count by one", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).rows).toBe(3);

    editor.commands.deleteRow();
    expect(tableShape(editor).rows).toBe(2);
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3]);
    editor.destroy();
  });

  it("addColumnAfter increases the cell count in each row", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3]);

    editor.commands.addColumnAfter();
    expect(tableShape(editor).cellsPerRow).toEqual([4, 4, 4]);
    editor.destroy();
  });

  it("deleteColumn decreases the cell count in each row", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3]);

    editor.commands.deleteColumn();
    expect(tableShape(editor).cellsPerRow).toEqual([2, 2, 2]);
    editor.destroy();
  });

  it("toggleHeaderRow flips header cells to normal cells", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(nodeTypes(editor)).toContain("tableHeader");

    editor.commands.toggleHeaderRow();
    expect(nodeTypes(editor)).not.toContain("tableHeader");
    expect(nodeTypes(editor)).toContain("tableCell");
    editor.destroy();
  });

  it("mergeCells on a two-cell selection produces one cell with colspan: 2", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    const cells = findCellPositions(editor);
    expect(cells.length).toBe(9);

    // Select row 1 cell 0 and cell 1
    const sel = CellSelection.create(editor.state.doc, cells[3], cells[4]);
    editor.view.dispatch(editor.state.tr.setSelection(sel));

    expect(editor.commands.mergeCells()).toBe(true);

    const jsonString = JSON.stringify(editor.getJSON());
    expect(jsonString).toContain('"colspan":2');
    editor.destroy();
  });

  it("splitCell reverses a merge", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    const cells = findCellPositions(editor);
    const sel = CellSelection.create(editor.state.doc, cells[3], cells[4]);
    editor.view.dispatch(editor.state.tr.setSelection(sel));
    editor.commands.mergeCells();

    expect(JSON.stringify(editor.getJSON())).toContain('"colspan":2');

    // Focus into merged cell and split
    const updatedCells = findCellPositions(editor);
    editor.commands.setTextSelection(updatedCells[3] + 1);
    expect(editor.commands.splitCell()).toBe(true);

    const jsonString = JSON.stringify(editor.getJSON());
    expect(jsonString).not.toContain('"colspan":2');
    expect(tableShape(editor).cellsPerRow).toEqual([3, 3, 3]);
    editor.destroy();
  });

  it("deleteTable removes the table entirely", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(nodeTypes(editor)).toContain("table");

    editor.commands.deleteTable();
    expect(nodeTypes(editor)).not.toContain("table");
    editor.destroy();
  });

  it("the document stays valid (doc.check() does not throw) after each operation", () => {
    const editor = makeEditor();

    // 1. insertTable
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    expect(() => editor.state.doc.check()).not.toThrow();

    // 2. addRowAfter
    editor.commands.addRowAfter();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 3. addColumnAfter
    editor.commands.addColumnAfter();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 4. toggleHeaderRow
    editor.commands.toggleHeaderRow();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 5. mergeCells
    const cells = findCellPositions(editor);
    const sel = CellSelection.create(editor.state.doc, cells[0], cells[1]);
    editor.view.dispatch(editor.state.tr.setSelection(sel));
    editor.commands.mergeCells();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 6. splitCell
    const updatedCells = findCellPositions(editor);
    editor.commands.setTextSelection(updatedCells[0] + 1);
    editor.commands.splitCell();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 7. deleteRow
    editor.commands.deleteRow();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 8. deleteColumn
    editor.commands.deleteColumn();
    expect(() => editor.state.doc.check()).not.toThrow();

    // 9. deleteTable
    editor.commands.deleteTable();
    expect(() => editor.state.doc.check()).not.toThrow();

    editor.destroy();
  });
});

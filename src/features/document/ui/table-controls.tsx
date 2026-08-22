"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export interface TableControlsProps {
  editor: Editor;
}

/**
 * Reorders a row within a table via a single ProseMirror transaction.
 *
 * Scoped strictly inside the table node to avoid corrupting document structure.
 * Preserves cell nodes and all nested content.
 */
export function moveRow(
  editor: Editor,
  fromIndex: number,
  toIndex: number,
  tablePos?: number,
): boolean {
  if (!editor) return false;
  const { state, view } = editor;
  const { doc, tr } = state;

  let targetTablePos = tablePos;
  let tableNode: ProseMirrorNode | null = null;

  if (typeof targetTablePos === "number") {
    const node = doc.nodeAt(targetTablePos);
    if (node && node.type.name === "table") {
      tableNode = node;
    }
  }

  if (!tableNode) {
    const $pos = state.selection.$anchor;
    for (let d = $pos.depth; d > 0; d--) {
      if ($pos.node(d).type.name === "table") {
        tableNode = $pos.node(d);
        targetTablePos = $pos.before(d);
        break;
      }
    }
  }

  if (!tableNode || typeof targetTablePos !== "number") {
    return false;
  }

  const rowCount = tableNode.childCount;
  if (
    fromIndex < 0 ||
    fromIndex >= rowCount ||
    toIndex < 0 ||
    toIndex >= rowCount
  ) {
    return false;
  }

  if (fromIndex === toIndex) {
    return true;
  }

  // Collect row positions inside the document
  let currentPos = targetTablePos + 1;
  const rows: { pos: number; node: ProseMirrorNode; size: number }[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row = tableNode.child(i);
    rows.push({ pos: currentPos, node: row, size: row.nodeSize });
    currentPos += row.nodeSize;
  }

  const sourceRow = rows[fromIndex];
  const targetRow = rows[toIndex];

  try {
    // Delete source row
    tr.delete(sourceRow.pos, sourceRow.pos + sourceRow.size);

    // Determine insertion position in the modified doc
    let insertPos: number;
    if (toIndex < fromIndex) {
      insertPos = targetRow.pos;
    } else {
      insertPos = targetRow.pos + targetRow.size - sourceRow.size;
    }

    tr.insert(insertPos, sourceRow.node);
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns active table information derived from current editor selection.
 */
export function getActiveTableInfo(editor: Editor): {
  tableNode: ProseMirrorNode;
  tablePos: number;
  rowIndex: number;
  rowCount: number;
  colIndex: number;
  colCount: number;
} | null {
  if (!editor || !editor.isActive("table")) return null;
  const { doc: _doc, selection } = editor.state;
  const $pos = selection.$anchor;

  let tableNode: ProseMirrorNode | null = null;
  let tablePos: number | null = null;
  let rowIndex = -1;
  let colIndex = -1;

  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === "table") {
      tableNode = node;
      tablePos = $pos.before(d);
    } else if (node.type.name === "tableRow" && rowIndex === -1) {
      rowIndex = $pos.index(d - 1);
    } else if (
      (node.type.name === "tableCell" || node.type.name === "tableHeader") &&
      colIndex === -1
    ) {
      colIndex = $pos.index(d - 1);
    }
  }

  if (!tableNode || tablePos === null) return null;

  const rowCount = tableNode.childCount;
  const firstRow = tableNode.child(0);
  const colCount = firstRow ? firstRow.childCount : 0;

  return {
    tableNode,
    tablePos,
    rowIndex: Math.max(0, rowIndex),
    rowCount,
    colIndex: Math.max(0, colIndex),
    colCount,
  };
}

export function TableControls({ editor }: TableControlsProps) {
  if (!editor || !editor.isActive("table")) {
    return null;
  }

  const info = getActiveTableInfo(editor);
  const canMerge = editor.can().mergeCells();
  const canSplit = editor.can().splitCell();

  const currentRowIndex = info ? info.rowIndex : 0;
  const rowCount = info ? info.rowCount : 0;
  const canMoveUp = currentRowIndex > 0;
  const canMoveDown = currentRowIndex < rowCount - 1;

  return (
    <div
      role="toolbar"
      aria-label="Table controls"
      className="my-2 flex flex-wrap items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
    >
      {/* Row Controls */}
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="Row actions"
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Insert row above"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        >
          <Icon size="sm" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </Icon>
          <span>Row above</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Insert row below"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        >
          <Icon size="sm" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </Icon>
          <span>Row below</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Delete row"
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="h-7 px-2 text-xs text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
        >
          <Icon size="sm" className="mr-1">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </Icon>
          <span>Del row</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Move row up"
          disabled={!canMoveUp}
          onClick={() => {
            if (info && canMoveUp) {
              moveRow(editor, info.rowIndex, info.rowIndex - 1, info.tablePos);
            }
          }}
          className="h-7 w-7 p-0 text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Icon size="sm">
            <polyline points="18 15 12 9 6 15" />
          </Icon>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Move row down"
          disabled={!canMoveDown}
          onClick={() => {
            if (info && canMoveDown) {
              moveRow(editor, info.rowIndex, info.rowIndex + 1, info.tablePos);
            }
          }}
          className="h-7 w-7 p-0 text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Icon size="sm">
            <polyline points="6 9 12 15 18 9" />
          </Icon>
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="mx-1 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      {/* Column Controls */}
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="Column actions"
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Insert column left"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        >
          <Icon size="sm" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </Icon>
          <span>Col left</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Insert column right"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        >
          <Icon size="sm" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </Icon>
          <span>Col right</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Delete column"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="h-7 px-2 text-xs text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
        >
          <Icon size="sm" className="mr-1">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </Icon>
          <span>Del col</span>
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="mx-1 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      {/* Cell Merge / Split */}
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="Cell actions"
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Merge cells"
          disabled={!canMerge}
          onClick={() => editor.chain().focus().mergeCells().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Icon size="sm" className="mr-1">
            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
            <path d="M18 9l-4 4 4 4" />
          </Icon>
          <span>Merge</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Split cell"
          disabled={!canSplit}
          onClick={() => editor.chain().focus().splitCell().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Icon size="sm" className="mr-1">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </Icon>
          <span>Split</span>
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="mx-1 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      {/* Table Level Actions */}
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="Table actions"
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Toggle header row"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          className="h-7 px-2 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        >
          <Icon size="sm" className="mr-1">
            <path d="M3 3h18v18H3z" />
            <path d="M3 9h18" />
          </Icon>
          <span>Header row</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Delete table"
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="h-7 px-2 text-xs text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
        >
          <Icon size="sm" className="mr-1">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </Icon>
          <span>Del table</span>
        </Button>
      </div>
    </div>
  );
}

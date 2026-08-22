import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import type { Extension } from "@tiptap/react";

/**
 * Table extensions with column resizing and whole-table node selection.
 *
 * allowTableNodeSelection enables treating a table as a single block-drag unit.
 * resizable enables native column resizing.
 */
export const tableExtensions: Extension[] = [
  Table.configure({
    resizable: true,
    lastColumnResizable: false,
    allowTableNodeSelection: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
] as unknown as Extension[];

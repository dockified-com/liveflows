import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import type { Extension } from "@tiptap/react";
import { Callout } from "./callout";

/**
 * Block types StarterKit does not ship.
 *
 * Table and math are deliberately absent — tasks 09 and 10 own those and
 * register them separately to avoid a shared edit here.
 */
export const blockExtensions: Extension[] = [
  TaskList,
  // nested: true lets a task item contain a nested task list.
  TaskItem.configure({ nested: true }),
  Callout,
] as unknown as Extension[];

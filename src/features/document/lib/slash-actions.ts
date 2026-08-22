import type { Editor } from "@tiptap/react";
import type { SlashAction } from "./slash-commands";

/**
 * Checks if the node/command for the requested slash action is registered in the editor.
 * Guards uninstalled/unregistered nodes (e.g. table, blockMath, toc, codeBlock).
 */
export function isActionAvailable(
  editor: Editor,
  action: SlashAction,
): boolean {
  if (!editor?.schema?.nodes) return false;
  const nodes = editor.schema.nodes;
  const commands = editor.commands as Record<string, unknown>;

  switch (action) {
    case "paragraph":
      return Boolean(nodes.paragraph);
    case "heading1":
    case "heading2":
    case "heading3":
      return Boolean(nodes.heading);
    case "bulletList":
      return Boolean(nodes.bulletList);
    case "orderedList":
      return Boolean(nodes.orderedList);
    case "taskList":
      return Boolean(nodes.taskList);
    case "blockquote":
      return Boolean(nodes.blockquote);
    case "divider":
      return Boolean(nodes.horizontalRule);
    case "callout":
      return Boolean(nodes.callout);
    case "codeBlock":
      return (
        Boolean(nodes.codeBlock) ||
        typeof commands.setCodeBlock === "function" ||
        typeof commands.toggleCodeBlock === "function"
      );
    case "table":
      return Boolean(nodes.table) || typeof commands.insertTable === "function";
    case "blockMath":
      return (
        Boolean(nodes.blockMath) ||
        typeof commands.setBlockMath === "function" ||
        typeof commands.insertBlockMath === "function"
      );
    case "toc":
      return (
        Boolean(nodes.toc || nodes.tableOfContents) ||
        typeof commands.insertTableOfContents === "function" ||
        typeof commands.setTableOfContents === "function"
      );
    default: {
      const _exhaustiveCheck: never = action;
      return false;
    }
  }
}

function runOptional(
  editor: Editor,
  action: "codeBlock" | "table" | "blockMath" | "toc",
  range: { from: number; to: number },
): void {
  if (!isActionAvailable(editor, action)) return;

  const chain = () => editor.chain().focus().deleteRange(range);
  const commands = editor.commands as Record<string, unknown>;

  switch (action) {
    case "codeBlock": {
      if (typeof commands.setCodeBlock === "function") {
        (chain() as unknown as Record<string, () => { run: () => boolean }>)
          .setCodeBlock()
          .run();
      } else if (typeof commands.toggleCodeBlock === "function") {
        (chain() as unknown as Record<string, () => { run: () => boolean }>)
          .toggleCodeBlock()
          .run();
      }
      return;
    }
    case "table": {
      if (typeof commands.insertTable === "function") {
        (
          chain() as unknown as Record<
            string,
            (opts: unknown) => { run: () => boolean }
          >
        )
          .insertTable({
            rows: 3,
            cols: 3,
            withHeaderRow: true,
          })
          .run();
      }
      return;
    }
    case "blockMath": {
      if (typeof commands.setBlockMath === "function") {
        (chain() as unknown as Record<string, () => { run: () => boolean }>)
          .setBlockMath()
          .run();
      } else if (typeof commands.insertBlockMath === "function") {
        (chain() as unknown as Record<string, () => { run: () => boolean }>)
          .insertBlockMath()
          .run();
      }
      return;
    }
    case "toc": {
      if (typeof commands.insertTableOfContents === "function") {
        (chain() as unknown as Record<string, () => { run: () => boolean }>)
          .insertTableOfContents()
          .run();
      } else if (typeof commands.setTableOfContents === "function") {
        (chain() as unknown as Record<string, () => { run: () => boolean }>)
          .setTableOfContents()
          .run();
      }
      return;
    }
  }
}

/**
 * Maps a SlashAction to the corresponding Tiptap editor command chain.
 */
export function runSlashAction(
  editor: Editor,
  action: SlashAction,
  range: { from: number; to: number },
): void {
  const chain = () => editor.chain().focus().deleteRange(range);

  switch (action) {
    case "paragraph":
      chain().setParagraph().run();
      return;
    case "heading1":
      chain().setNode("heading", { level: 1 }).run();
      return;
    case "heading2":
      chain().setNode("heading", { level: 2 }).run();
      return;
    case "heading3":
      chain().setNode("heading", { level: 3 }).run();
      return;
    case "bulletList":
      chain().toggleBulletList().run();
      return;
    case "orderedList":
      chain().toggleOrderedList().run();
      return;
    case "taskList":
      chain().toggleTaskList().run();
      return;
    case "blockquote":
      chain().toggleBlockquote().run();
      return;
    case "divider":
      chain().setHorizontalRule().run();
      return;
    case "callout":
      chain().setCallout({}).run();
      return;
    case "codeBlock":
    case "table":
    case "blockMath":
    case "toc":
      runOptional(editor, action, range);
      return;
    default: {
      const _exhaustiveCheck: never = action;
      return;
    }
  }
}

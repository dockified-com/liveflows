import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { blockExtensions } from "./blocks";

function makeEditor(content = "<p>hello</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, trailingNode: false }),
      ...blockExtensions,
    ],
    content,
  });
}

/** Collects every node type present in the document, at any depth. */
function nodeTypes(editor: Editor): string[] {
  const found: string[] = [];
  const walk = (node: { type?: unknown; content?: unknown }) => {
    if (typeof node.type === "string") found.push(node.type);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(editor.getJSON() as never);
  return found;
}

describe("StarterKit blocks still work", () => {
  it.each([
    [
      "heading level 1",
      (e: Editor) => e.commands.toggleHeading({ level: 1 }),
      "heading",
    ],
    ["bullet list", (e: Editor) => e.commands.toggleBulletList(), "bulletList"],
    [
      "ordered list",
      (e: Editor) => e.commands.toggleOrderedList(),
      "orderedList",
    ],
    ["blockquote", (e: Editor) => e.commands.toggleBlockquote(), "blockquote"],
    [
      "divider",
      (e: Editor) => e.commands.setHorizontalRule(),
      "horizontalRule",
    ],
  ])("inserts a %s", (_label, run, expected) => {
    const editor = makeEditor();
    editor.commands.selectAll();
    run(editor);

    expect(nodeTypes(editor)).toContain(expected);
    editor.destroy();
  });

  it("supports all three heading levels", () => {
    const editor = makeEditor();
    for (const level of [1, 2, 3] as const) {
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level });
      expect(editor.isActive("heading", { level })).toBe(true);
    }
    editor.destroy();
  });
});

describe("task list", () => {
  it("registers both task extensions", () => {
    const names = blockExtensions.map((e) => e.name);
    expect(names).toContain("taskList");
    expect(names).toContain("taskItem");
  });

  it("inserts a task list containing a task item", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.toggleTaskList();

    const types = nodeTypes(editor);
    expect(types).toContain("taskList");
    expect(types).toContain("taskItem");
    editor.destroy();
  });

  it("round-trips a checked item through JSON", () => {
    const editor = makeEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">done</li></ul>',
    );

    expect(JSON.stringify(editor.getJSON())).toContain('"checked":true');
    editor.destroy();
  });
});

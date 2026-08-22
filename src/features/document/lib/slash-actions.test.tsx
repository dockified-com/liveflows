import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { blockExtensions } from "../extensions/blocks";
import { runSlashAction } from "./slash-actions";

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...blockExtensions,
    ],
    content: "<p>x</p>",
  });
}

/** The suggestion plugin supplies a range covering the typed "/query". */
function wholeDoc(editor: Editor) {
  return { from: 1, to: editor.state.doc.content.size - 1 };
}

function types(editor: Editor): string[] {
  const found: string[] = [];
  const walk = (n: { type?: unknown; content?: unknown }) => {
    if (typeof n.type === "string") found.push(n.type);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(editor.getJSON() as never);
  return found;
}

describe("runSlashAction", () => {
  it.each([
    ["heading1", "heading"],
    ["bulletList", "bulletList"],
    ["orderedList", "orderedList"],
    ["taskList", "taskList"],
    ["blockquote", "blockquote"],
    ["divider", "horizontalRule"],
    ["callout", "callout"],
  ] as const)("inserts %s", (action, expected) => {
    const editor = makeEditor();
    runSlashAction(editor, action, wholeDoc(editor));

    expect(types(editor)).toContain(expected);
    editor.destroy();
  });

  it("sets the requested heading level", () => {
    const editor = makeEditor();
    runSlashAction(editor, "heading3", wholeDoc(editor));

    expect(editor.isActive("heading", { level: 3 })).toBe(true);
    editor.destroy();
  });

  it("does not throw for an action whose node is not registered yet", () => {
    const editor = makeEditor(); // no table, no math
    expect(() =>
      runSlashAction(editor, "table", wholeDoc(editor)),
    ).not.toThrow();
    expect(() =>
      runSlashAction(editor, "blockMath", wholeDoc(editor)),
    ).not.toThrow();
    editor.destroy();
  });

  it("removes the typed query range", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        ...blockExtensions,
      ],
      content: "<p>/head</p>",
    });
    runSlashAction(editor, "heading1", { from: 1, to: 6 });

    expect(editor.getText()).not.toContain("/head");
    editor.destroy();
  });
});

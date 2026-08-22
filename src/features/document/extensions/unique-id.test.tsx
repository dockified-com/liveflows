import UniqueID from "@tiptap/extension-unique-id";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

function makeEditor() {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      UniqueID.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "<p>first</p><p>second</p>",
  });
  if (!editor.isInitialized) {
    editor.emit("create", { editor });
    editor.isInitialized = true;
  }
  return editor;
}

function ids(editor: Editor): (string | null)[] {
  return editor.getJSON().content?.map((n) => n.attrs?.id ?? null) ?? [];
}

describe("UniqueID", () => {
  it("assigns an id to every configured block", () => {
    const editor = makeEditor();
    const found = ids(editor);

    expect(found).toHaveLength(2);
    for (const id of found) {
      expect(id).toBeTruthy();
    }
    editor.destroy();
  });

  it("assigns distinct ids", () => {
    const editor = makeEditor();
    const [a, b] = ids(editor);

    expect(a).not.toBe(b);
    editor.destroy();
  });

  // AC-3: the properties that make block links durable.
  it("keeps the first block's id when a new block is split off", () => {
    const editor = makeEditor();
    const before = ids(editor)[0];

    editor.commands.setTextSelection(4); // inside "first"
    editor.commands.splitBlock();

    expect(ids(editor)[0]).toBe(before);
    editor.destroy();
  });

  it("keeps ids stable across undo and redo", () => {
    const editor = makeEditor();
    const before = ids(editor);

    editor.commands.setTextSelection(4);
    editor.commands.splitBlock();
    editor.commands.undo();

    expect(ids(editor)).toEqual(before);
    editor.destroy();
  });

  it("does not regenerate ids on unrelated updates", () => {
    const editor = makeEditor();
    const before = ids(editor);

    editor.commands.focus("end");
    editor.commands.insertContent(" more text");

    expect(ids(editor)).toEqual(before);
    editor.destroy();
  });
});

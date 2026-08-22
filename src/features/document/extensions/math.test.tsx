import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { technicalContentExtensions } from "./technical-content";

function makeEditor(content = "<p>hello</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...technicalContentExtensions,
    ],
    content,
  });
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

describe("mathematics extension", () => {
  it("inserts an inline math node with insertInlineMath()", () => {
    const editor = makeEditor();
    editor.commands.insertInlineMath({ latex: "x^2" });

    const types = nodeTypes(editor);
    expect(types).toContain("inlineMath");
    expect(JSON.stringify(editor.getJSON())).toContain('"latex":"x^2"');
    editor.destroy();
  });

  it("inserts a block math node with insertBlockMath()", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath({ latex: "E = mc^2" });

    const types = nodeTypes(editor);
    expect(types).toContain("blockMath");
    expect(JSON.stringify(editor.getJSON())).toContain('"latex":"E = mc^2"');
    editor.destroy();
  });

  it("round-trips LaTeX through document JSON", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath({ latex: "\\int_0^1 f(x) dx" });

    const json = editor.getJSON();
    const serialized = JSON.stringify(json);
    expect(serialized).toContain("\\\\int_0^1 f(x) dx");

    const newEditor = makeEditor();
    newEditor.commands.setContent(json);
    expect(JSON.stringify(newEditor.getJSON())).toContain(
      "\\\\int_0^1 f(x) dx",
    );

    editor.destroy();
    newEditor.destroy();
  });

  it("names the block math node blockMath matching ID_TYPES convention", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath({ latex: "a + b = c" });

    let foundName: string | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "blockMath") {
        foundName = node.type.name;
      }
    });

    expect(foundName).toBe("blockMath");
    editor.destroy();
  });

  it("does not throw when given invalid LaTeX and preserves valid document state", () => {
    expect(() => {
      const editor = makeEditor();
      editor.commands.insertInlineMath({ latex: "\\frac{" });
      editor.commands.insertBlockMath({ latex: "\\invalidMacro{" });

      const json = editor.getJSON();
      expect(json).toBeDefined();
      expect(json.type).toBe("doc");

      editor.destroy();
    }).not.toThrow();
  });

  it("updates LaTeX attribute via updateBlockMath()", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath({ latex: "1 + 1 = 2", pos: 0 });

    editor.commands.updateBlockMath({ latex: "2 + 2 = 4", pos: 0 });
    expect(JSON.stringify(editor.getJSON())).toContain('"latex":"2 + 2 = 4"');

    editor.destroy();
  });

  it("deletes block math node via deleteBlockMath()", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath({ latex: "x = y", pos: 0 });
    expect(nodeTypes(editor)).toContain("blockMath");

    editor.commands.deleteBlockMath({ pos: 0 });
    expect(nodeTypes(editor)).not.toContain("blockMath");

    editor.destroy();
  });
});

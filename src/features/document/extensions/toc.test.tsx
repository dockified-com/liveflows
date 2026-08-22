import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { Toc } from "./toc";

function makeEditor(content = "<p>hello</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), Toc],
    content,
  });
}

describe("Toc extension", () => {
  it("is named toc", () => {
    expect(Toc.name).toBe("toc");
  });

  it("is configured as an atom block", () => {
    expect(Toc.config.group).toBe("block");
    expect(Toc.config.atom).toBe(true);
    expect(Toc.config.selectable).toBe(true);
    expect(Toc.config.draggable).toBe(true);
  });

  it("inserts a TOC block via insertToc command", () => {
    const editor = makeEditor();
    editor.commands.insertToc();

    const json = editor.getJSON();
    const tocNode = json.content?.find((node) => node.type === "toc");
    expect(tocNode).toBeDefined();
    expect(tocNode?.type).toBe("toc");
    editor.destroy();
  });

  it("inserts a TOC block via insertTableOfContents alias", () => {
    const editor = makeEditor();
    editor.commands.insertTableOfContents();

    const json = editor.getJSON();
    const tocNode = json.content?.find((node) => node.type === "toc");
    expect(tocNode).toBeDefined();
    editor.destroy();
  });

  it("round-trips through HTML parse and serialize", () => {
    const editor = makeEditor('<div data-type="toc"></div><p>content</p>');

    const json = editor.getJSON();
    const tocNode = json.content?.find((node) => node.type === "toc");
    expect(tocNode).toBeDefined();
    expect(editor.getHTML()).toContain('data-type="toc"');
    editor.destroy();
  });

  it("does not store heading list in node attributes", () => {
    const editor = makeEditor();
    editor.commands.insertToc();

    const json = editor.getJSON();
    const tocNode = json.content?.find((node) => node.type === "toc");
    expect(tocNode?.attrs?.headings).toBeUndefined();
    expect(tocNode?.attrs?.outline).toBeUndefined();
    editor.destroy();
  });
});

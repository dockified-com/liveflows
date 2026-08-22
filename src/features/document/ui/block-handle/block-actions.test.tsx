import UniqueID from "@tiptap/extension-unique-id";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { Callout } from "../../extensions/callout";
import {
  blockLinkFor,
  deleteBlock,
  duplicateBlock,
  turnInto,
} from "./block-actions";

function makeEditor(content: string) {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      UniqueID.configure({
        types: [
          "heading",
          "paragraph",
          "bulletList",
          "orderedList",
          "blockquote",
          "callout",
        ],
      }),
      Callout,
    ],
    content,
  });

  if (!editor.isInitialized) {
    editor.emit("create", { editor });
    editor.isInitialized = true;
  }

  return editor;
}

describe("duplicateBlock", () => {
  it("inserts an identical node directly after the source", () => {
    const editor = makeEditor("<p>first</p><p>second</p>");
    const success = duplicateBlock(editor.view, 0);

    expect(success).toBe(true);
    const nodes = editor.getJSON().content;
    expect(nodes).toHaveLength(3);
    expect(editor.state.doc.child(0).textContent).toBe("first");
    expect(editor.state.doc.child(1).textContent).toBe("first");
    expect(editor.state.doc.child(2).textContent).toBe("second");

    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("preserves node type (heading stays a heading)", () => {
    const editor = makeEditor("<h1>Header Title</h1><p>Paragraph</p>");
    const success = duplicateBlock(editor.view, 0);

    expect(success).toBe(true);
    const nodes = editor.getJSON().content;
    expect(nodes).toHaveLength(3);
    expect(nodes?.[0].type).toBe("heading");
    expect(nodes?.[0].attrs?.level).toBe(1);
    expect(nodes?.[1].type).toBe("heading");
    expect(nodes?.[1].attrs?.level).toBe(1);
    expect(nodes?.[2].type).toBe("paragraph");

    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("gives the copy a different block id", () => {
    const editor = makeEditor("<p>item</p>");
    duplicateBlock(editor.view, 0);

    const nodes = editor.getJSON().content;
    expect(nodes).toHaveLength(2);
    const id1 = nodes?.[0].attrs?.id;
    const id2 = nodes?.[1].attrs?.id;

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);

    editor.destroy();
  });

  it("returns false for an invalid position", () => {
    const editor = makeEditor("<p>item</p>");
    expect(duplicateBlock(editor.view, 9999)).toBe(false);
    expect(duplicateBlock(editor.view, -1)).toBe(false);
    editor.destroy();
  });
});

describe("deleteBlock", () => {
  it("removes exactly one block and leaves siblings intact", () => {
    const editor = makeEditor("<p>first</p><p>second</p><p>third</p>");
    // Position of second paragraph in doc:
    // doc size: 0 (first p starts at 0, size 7) -> second starts at 7
    const secondPos = 7;
    const success = deleteBlock(editor.view, secondPos);

    expect(success).toBe(true);
    const nodes = editor.getJSON().content;
    expect(nodes).toHaveLength(2);
    expect(editor.state.doc.child(0).textContent).toBe("first");
    expect(editor.state.doc.child(1).textContent).toBe("third");

    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("returns false for an invalid position", () => {
    const editor = makeEditor("<p>item</p>");
    expect(deleteBlock(editor.view, 9999)).toBe(false);
    expect(deleteBlock(editor.view, -5)).toBe(false);
    editor.destroy();
  });
});

describe("blockLinkFor", () => {
  it("returns #block-<id> when the node has an id", () => {
    const editor = makeEditor("<p>test</p>");
    const node = editor.state.doc.child(0);
    const id = node.attrs.id;

    expect(id).toBeTruthy();
    expect(blockLinkFor(node)).toBe(`#block-${id}`);
    editor.destroy();
  });

  it("returns null when the node has no id attribute", () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content: "<p>plain</p>",
    });
    const node = editor.state.doc.child(0);

    expect(blockLinkFor(node)).toBeNull();
    editor.destroy();
  });
});

describe("turnInto", () => {
  it("converts a paragraph to each heading level", () => {
    const editor = makeEditor("<p>Heading Text</p>");

    expect(turnInto(editor.view, 0, "heading1")).toBe(true);
    let node = editor.getJSON().content?.[0];
    expect(node?.type).toBe("heading");
    expect(node?.attrs?.level).toBe(1);
    expect(editor.state.doc.child(0).textContent).toBe("Heading Text");

    expect(turnInto(editor.view, 0, "heading2")).toBe(true);
    node = editor.getJSON().content?.[0];
    expect(node?.type).toBe("heading");
    expect(node?.attrs?.level).toBe(2);

    expect(turnInto(editor.view, 0, "heading3")).toBe(true);
    node = editor.getJSON().content?.[0];
    expect(node?.type).toBe("heading");
    expect(node?.attrs?.level).toBe(3);

    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("converts a paragraph to a bullet list", () => {
    const editor = makeEditor("<p>Bullet item</p>");

    expect(turnInto(editor.view, 0, "bulletList")).toBe(true);
    const node = editor.getJSON().content?.[0];
    expect(node?.type).toBe("bulletList");
    expect(editor.state.doc.child(0).type.name).toBe("bulletList");
    expect(editor.state.doc.child(0).textContent).toBe("Bullet item");

    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("converts a paragraph to an ordered list, blockquote, and callout", () => {
    const editor = makeEditor("<p>Test content</p>");

    expect(turnInto(editor.view, 0, "orderedList")).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("orderedList");

    expect(turnInto(editor.view, 0, "blockquote")).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("blockquote");

    expect(turnInto(editor.view, 0, "callout")).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("callout");

    expect(turnInto(editor.view, 0, "paragraph")).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("paragraph");

    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("preserves the block's text content across conversions", () => {
    const editor = makeEditor("<p>Preserved text message</p>");

    turnInto(editor.view, 0, "heading2");
    expect(editor.state.doc.textContent).toBe("Preserved text message");

    turnInto(editor.view, 0, "paragraph");
    expect(editor.state.doc.textContent).toBe("Preserved text message");

    editor.destroy();
  });

  it("returns false for an invalid position", () => {
    const editor = makeEditor("<p>Valid</p>");
    expect(turnInto(editor.view, 9999, "paragraph")).toBe(false);
    expect(turnInto(editor.view, -1, "heading1")).toBe(false);
    editor.destroy();
  });

  it("returns false if callout extension is not available", () => {
    const plainEditor = new Editor({
      extensions: [StarterKit.configure({ codeBlock: false })],
      content: "<p>No callout extension</p>",
    });

    expect(turnInto(plainEditor.view, 0, "callout")).toBe(false);
    plainEditor.destroy();
  });
});

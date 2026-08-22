import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { blockAtCoords, moveBlock } from "./pos-at-coords";

function makeEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, trailingNode: false }),
    ],
    content,
  });
}

function paragraphTexts(editor: Editor): string[] {
  const out: string[] = [];
  editor.state.doc.forEach((node) => {
    out.push(node.textContent);
  });
  return out;
}

/**
 * jsdom has no layout, so posAtCoords cannot work against a real view.
 * These stubs return a chosen position, letting us test the walk-up logic.
 */
function stubView(editor: Editor, posAtCoordsResult: { pos: number } | null) {
  return {
    state: editor.state,
    posAtCoords: () => posAtCoordsResult,
    nodeDOM: () => document.createElement("div"),
    domAtPos: () => ({ node: document.createElement("div"), offset: 0 }),
  } as never;
}

describe("blockAtCoords", () => {
  it("returns null when posAtCoords finds nothing (gap between blocks)", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    const result = blockAtCoords(stubView(editor, null), { x: 0, y: 0 });

    expect(result).toBeNull();
    editor.destroy();
  });

  it("resolves a position inside the first paragraph to that paragraph", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    // Position 2 is inside the first paragraph's text.
    const result = blockAtCoords(stubView(editor, { pos: 2 }), { x: 0, y: 0 });

    expect(result).not.toBeNull();
    expect(result?.node.textContent).toBe("one");
    expect(result?.depth).toBe(1);
    editor.destroy();
  });

  it("resolves a position in the second paragraph to that paragraph", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    const result = blockAtCoords(stubView(editor, { pos: 8 }), { x: 0, y: 0 });

    expect(result?.node.textContent).toBe("two");
    editor.destroy();
  });

  // The nesting edge case. Dragging a list item's paragraph out of the list
  // would corrupt the document, so the outer block must win.
  it("returns the outer list, not the inner paragraph, for nested content", () => {
    const editor = makeEditor("<ul><li><p>deep</p></li></ul>");
    const result = blockAtCoords(stubView(editor, { pos: 4 }), { x: 0, y: 0 });

    expect(result?.node.type.name).toBe("bulletList");
    expect(result?.depth).toBe(1);
    editor.destroy();
  });

  it("returns the outer blockquote for content nested inside it", () => {
    const editor = makeEditor("<blockquote><p>quoted</p></blockquote>");
    const result = blockAtCoords(stubView(editor, { pos: 3 }), { x: 0, y: 0 });

    expect(result?.node.type.name).toBe("blockquote");
    editor.destroy();
  });

  it("reports the block's start position, not the inner text position", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    const result = blockAtCoords(stubView(editor, { pos: 8 }), { x: 0, y: 0 });

    // Second paragraph starts at 5 in a doc of <p>one</p><p>two</p>.
    expect(result?.pos).toBe(5);
    editor.destroy();
  });

  it("returns null for a position outside the document", () => {
    const editor = makeEditor("<p>one</p>");
    const result = blockAtCoords(stubView(editor, { pos: 9999 }), {
      x: 0,
      y: 0,
    });

    expect(result).toBeNull();
    editor.destroy();
  });
});

describe("moveBlock", () => {
  it("moves a block forward", () => {
    const editor = makeEditor("<p>a</p><p>b</p><p>c</p>");
    const view = editor.view;

    // Move "a" (pos 0) to after "c".
    moveBlock(view, 0, editor.state.doc.content.size);

    expect(paragraphTexts(editor)).toEqual(["b", "c", "a"]);
    editor.destroy();
  });

  it("moves a block backward", () => {
    const editor = makeEditor("<p>a</p><p>b</p><p>c</p>");
    // "c" starts at 6 in this doc; move it to the front.
    const cPos = 6;
    moveBlock(editor.view, cPos, 0);

    expect(paragraphTexts(editor)).toEqual(["c", "a", "b"]);
    editor.destroy();
  });

  it("is a no-op when source and target are the same", () => {
    const editor = makeEditor("<p>a</p><p>b</p>");
    const before = paragraphTexts(editor);
    moveBlock(editor.view, 0, 0);

    expect(paragraphTexts(editor)).toEqual(before);
    editor.destroy();
  });

  it("returns false for an invalid source position", () => {
    const editor = makeEditor("<p>a</p>");
    expect(moveBlock(editor.view, 9999, 0)).toBe(false);
    editor.destroy();
  });

  it("preserves block content and type when moving", () => {
    const editor = makeEditor("<h1>title</h1><p>body</p>");
    moveBlock(editor.view, 0, editor.state.doc.content.size);

    const types: string[] = [];
    editor.state.doc.forEach((n) => {
      types.push(n.type.name);
    });
    expect(types).toEqual(["paragraph", "heading"]);
    editor.destroy();
  });

  it("keeps the document valid after several moves", () => {
    const editor = makeEditor("<p>a</p><p>b</p><p>c</p>");
    moveBlock(editor.view, 0, editor.state.doc.content.size);
    moveBlock(editor.view, 0, editor.state.doc.content.size);

    expect(paragraphTexts(editor)).toHaveLength(3);
    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });
});

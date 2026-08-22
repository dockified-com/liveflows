import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { formattingExtensions } from "./formatting";

function makeEditor(content = "<p>hello world</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...formattingExtensions,
    ],
    content,
  });
}

/** Selects the whole first paragraph. */
function selectAll(editor: Editor) {
  editor.commands.selectAll();
}

describe("formatting marks", () => {
  it("registers all seven additional extensions", () => {
    const names = formattingExtensions.map((e) => e.name);
    for (const n of [
      "underline",
      "highlight",
      "textStyle",
      "color",
      "superscript",
      "subscript",
      "textAlign",
    ]) {
      expect(names, n).toContain(n);
    }
  });

  it("toggles underline on and off", () => {
    const editor = makeEditor();
    selectAll(editor);

    editor.commands.toggleUnderline();
    expect(editor.isActive("underline")).toBe(true);

    editor.commands.toggleUnderline();
    expect(editor.isActive("underline")).toBe(false);
    editor.destroy();
  });

  it("applies a highlight with a specific color", () => {
    const editor = makeEditor();
    selectAll(editor);
    editor.commands.toggleHighlight({ color: "#fef08a" });

    expect(editor.isActive("highlight", { color: "#fef08a" })).toBe(true);
    editor.destroy();
  });

  it("applies a text color and round-trips it through JSON", () => {
    const editor = makeEditor();
    selectAll(editor);
    editor.commands.setColor("#2563eb");

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("#2563eb");
    editor.destroy();
  });

  it("toggles superscript and subscript independently", () => {
    const editor = makeEditor();
    selectAll(editor);

    editor.commands.toggleSuperscript();
    expect(editor.isActive("superscript")).toBe(true);

    editor.commands.toggleSubscript();
    expect(editor.isActive("subscript")).toBe(true);
    expect(editor.isActive("superscript")).toBe(false);
    editor.destroy();
  });

  it("sets text alignment on a paragraph", () => {
    const editor = makeEditor();
    selectAll(editor);
    editor.commands.setTextAlign("center");

    expect(editor.isActive({ textAlign: "center" })).toBe(true);
    editor.destroy();
  });

  it("sets text alignment on a heading", () => {
    const editor = makeEditor("<h1>title</h1>");
    selectAll(editor);
    editor.commands.setTextAlign("right");

    expect(editor.isActive({ textAlign: "right" })).toBe(true);
    editor.destroy();
  });

  it("keeps StarterKit marks working alongside the new ones", () => {
    const editor = makeEditor();
    selectAll(editor);

    editor.commands.toggleBold();
    editor.commands.toggleUnderline();

    expect(editor.isActive("bold")).toBe(true);
    expect(editor.isActive("underline")).toBe(true);
    editor.destroy();
  });
});

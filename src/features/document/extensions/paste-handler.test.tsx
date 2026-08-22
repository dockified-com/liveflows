import type { EditorView } from "@tiptap/pm/view";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { pasteHandler } from "./paste-handler";

function makeEditor() {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), pasteHandler],
    content: "<p></p>",
  });
}

function pasteHTML(editor: Editor, html: string) {
  const transformed =
    editor.view.someProp(
      "transformPastedHTML",
      (f: (html: string, view: EditorView) => string) => f(html, editor.view),
    ) ?? html;
  editor.commands.insertContent(transformed);
}

describe("pasteHandler", () => {
  it("is named liveflowsPasteHandler", () => {
    expect(pasteHandler.name).toBe("liveflowsPasteHandler");
  });

  it("strips Google Docs normal-weight bold tag on paste", () => {
    const editor = makeEditor();
    pasteHTML(
      editor,
      '<p><b style="font-weight:normal">Google Docs pasted text</b></p>',
    );

    const json = editor.getJSON();
    const marks = json.content?.[0]?.content?.[0]?.marks;
    expect(marks).toBeUndefined();
    expect(editor.getText()).toContain("Google Docs pasted text");
    editor.destroy();
  });

  it("preserves genuine bold marks on paste", () => {
    const editor = makeEditor();
    pasteHTML(editor, "<p><b>Genuine bold text</b></p>");

    const json = editor.getJSON();
    const firstText = json.content?.[0]?.content?.[0];
    expect(firstText).toMatchObject({
      type: "text",
      text: "Genuine bold text",
      marks: [{ type: "bold" }],
    });
    editor.destroy();
  });

  it("handles nested genuine bold inside Google Docs wrapper", () => {
    const editor = makeEditor();
    pasteHTML(
      editor,
      '<p><b style="font-weight:normal">Normal and <b>bold</b> text</b></p>',
    );

    const textNodes = editor.getJSON().content?.[0]?.content ?? [];
    const boldNode = textNodes.find((n) =>
      n.marks?.some((m) => m.type === "bold"),
    );
    expect(boldNode).toBeDefined();
    expect((boldNode as { text?: string })?.text).toBe("bold");

    const normalNode = textNodes.find((n) => !n.marks || n.marks.length === 0);
    expect(normalNode).toBeDefined();
    expect((normalNode as { text?: string })?.text).toContain("Normal and ");
    editor.destroy();
  });
});

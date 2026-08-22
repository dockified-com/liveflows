import { Editor, Extension } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { buildExtensions } from "./index";

const mockCollab = Extension.create({ name: "mockCollaboration" });

function createEditor() {
  return new Editor({
    extensions: buildExtensions({ collaboration: mockCollab }),
    content: "<p></p>",
  });
}

/**
 * Simulates sequential text input in the editor, dispatching through
 * ProseMirror's handleTextInput input rules hook.
 */
function typeText(editor: Editor, text: string) {
  for (const char of text) {
    const handled = editor.view.someProp(
      "handleTextInput",
      // biome-ignore lint/suspicious/noExplicitAny: ProseMirror EditorProps type compatibility in tests
      (f: any) => {
        const { from, to } = editor.state.selection;
        return Boolean(f(editor.view, from, to, char, () => editor.state.tr));
      },
    );

    if (!handled) {
      editor.commands.insertContent(char);
    }
  }
}

describe("Markdown input rules", () => {
  it("# produces a level 1 heading", () => {
    const editor = createEditor();
    typeText(editor, "# Heading 1");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Heading 1" }],
    });
    editor.destroy();
  });

  it("## produces a level 2 heading", () => {
    const editor = createEditor();
    typeText(editor, "## Heading 2");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Heading 2" }],
    });
    editor.destroy();
  });

  it("### produces a level 3 heading", () => {
    const editor = createEditor();
    typeText(editor, "### Heading 3");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Heading 3" }],
    });
    editor.destroy();
  });

  it("- produces a bullet list", () => {
    const editor = createEditor();
    typeText(editor, "- Item 1");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Item 1" }],
            },
          ],
        },
      ],
    });
    editor.destroy();
  });

  it("1. produces an ordered list", () => {
    const editor = createEditor();
    typeText(editor, "1. Item 1");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Item 1" }],
            },
          ],
        },
      ],
    });
    editor.destroy();
  });

  it("> produces a blockquote", () => {
    const editor = createEditor();
    typeText(editor, "> Quote text");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Quote text" }],
        },
      ],
    });
    editor.destroy();
  });

  it("``` produces a code block", () => {
    const editor = createEditor();
    typeText(editor, "``` ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "codeBlock",
    });
    editor.destroy();
  });

  it("```ts produces a code block with language: ts", () => {
    const editor = createEditor();
    typeText(editor, "```ts ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "codeBlock",
      attrs: { language: "ts" },
    });
    editor.destroy();
  });

  it("```typescript produces a code block with language: typescript", () => {
    const editor = createEditor();
    typeText(editor, "```typescript ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode).toMatchObject({
      type: "codeBlock",
      attrs: { language: "typescript" },
    });
    editor.destroy();
  });

  it("#### does not produce a level 4 heading", () => {
    const editor = createEditor();
    typeText(editor, "#### Not a heading");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode?.type).not.toBe("heading");
    expect(firstNode).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "#### Not a heading" }],
    });
    editor.destroy();
  });
});

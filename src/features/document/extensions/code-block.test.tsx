import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import {
  CODE_LANGUAGES,
  technicalContentExtensions,
} from "./technical-content";

function makeEditor(content = "<p>hello world</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...technicalContentExtensions,
    ],
    content,
  });
}

describe("code block extension", () => {
  it("registers as codeBlock matching the required name", () => {
    const codeBlockExt = technicalContentExtensions.find(
      (e) => e.name === "codeBlock",
    );
    expect(codeBlockExt).toBeDefined();
    expect(codeBlockExt?.name).toBe("codeBlock");
  });

  it("setCodeBlock() creates a code block", () => {
    const editor = makeEditor("<p>hello world</p>");
    editor.commands.setTextSelection(1);
    editor.commands.setCodeBlock();

    expect(editor.isActive("codeBlock")).toBe(true);
    editor.destroy();
  });

  it("setCodeBlock({ language: 'typescript' }) sets the language attribute", () => {
    const editor = makeEditor("<p>hello world</p>");
    editor.commands.setTextSelection(1);
    editor.commands.setCodeBlock({ language: "typescript" });

    expect(editor.isActive("codeBlock", { language: "typescript" })).toBe(true);
    editor.destroy();
  });

  it("language round-trips through document JSON", () => {
    const editor = makeEditor("<p>hello world</p>");
    editor.commands.setTextSelection(1);
    editor.commands.setCodeBlock({ language: "python" });

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"language":"python"');
    editor.destroy();
  });

  it("creates a code block from markdown fence or language-tagged content", () => {
    const editor = makeEditor(
      '<pre><code class="language-typescript">const x: number = 42;</code></pre>',
    );
    expect(editor.isActive("codeBlock", { language: "typescript" })).toBe(true);
    editor.destroy();
  });

  it("does not parse marks inside a code block", () => {
    const editor = makeEditor("<p>hello</p>");
    editor.commands.setTextSelection(1);
    editor.commands.setCodeBlock({ language: "javascript" });
    editor.commands.insertContent("**literal**");

    expect(editor.isActive("bold")).toBe(false);
    expect(JSON.stringify(editor.getJSON())).toContain("**literal**");
    editor.destroy();
  });

  it("does not throw on unknown language and falls back gracefully", () => {
    expect(() => {
      const editor = makeEditor("<p>hello</p>");
      editor.commands.setTextSelection(1);
      editor.commands.setCodeBlock({ language: "non-existent-language" });
      expect(editor.isActive("codeBlock")).toBe(true);
      editor.destroy();
    }).not.toThrow();
  });

  it("CODE_LANGUAGES contains exactly the ten required ids", () => {
    const ids = CODE_LANGUAGES.map((l) => l.id);
    expect(ids).toEqual([
      "typescript",
      "javascript",
      "python",
      "sql",
      "json",
      "bash",
      "yaml",
      "go",
      "rust",
      "java",
    ]);
    expect(ids).toHaveLength(10);
  });
});

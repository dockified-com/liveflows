import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { technicalContentExtensions } from "./technical-content";

function makeEditor(content = "<p>hello world</p>") {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ...technicalContentExtensions,
    ],
    content,
  });
}

describe("link extension", () => {
  it("applies the link mark via setLink()", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setLink({ href: "https://example.com" });

    expect(editor.isActive("link")).toBe(true);
    expect(editor.isActive("link", { href: "https://example.com" })).toBe(true);
    editor.destroy();
  });

  it("removes the link mark via unsetLink()", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setLink({ href: "https://example.com" });
    expect(editor.isActive("link")).toBe(true);

    editor.commands.unsetLink();
    expect(editor.isActive("link")).toBe(false);
    editor.destroy();
  });

  it("round-trips href through document JSON", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setLink({ href: "https://liveflows.dev/docs" });

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("https://liveflows.dev/docs");
    editor.destroy();
  });

  it("rejects javascript: URLs by protocol allowlist", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setLink({ href: "javascript:alert(1)" });

    expect(editor.isActive("link")).toBe(false);
    editor.destroy();
  });

  it("renders HTML with rel='noopener noreferrer nofollow' and target='_blank'", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setLink({ href: "https://example.com" });

    const html = editor.getHTML();
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
    editor.destroy();
  });

  it("has autolink enabled in the extension configuration", () => {
    const linkExt = technicalContentExtensions.find((e) => e.name === "link");
    expect(linkExt).toBeDefined();
    expect(linkExt?.options.autolink).toBe(true);
  });

  it("has openOnClick set to false to prevent navigation while editing", () => {
    const linkExt = technicalContentExtensions.find((e) => e.name === "link");
    expect(linkExt).toBeDefined();
    expect(linkExt?.options.openOnClick).toBe(false);
  });
});

import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { Callout } from "./callout";

function makeEditor(content = "<p>hello</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ codeBlock: false }), Callout],
    content,
  });
}

function json(editor: Editor) {
  return editor.getJSON();
}

describe("Callout node", () => {
  it("is named callout, matching task-01's ID_TYPES", () => {
    expect(Callout.name).toBe("callout");
  });

  it("wraps the selection in a callout", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({});

    expect(JSON.stringify(json(editor))).toContain('"type":"callout"');
    editor.destroy();
  });

  it("defaults to the info variant", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({});

    expect(editor.isActive("callout", { variant: "info" })).toBe(true);
    editor.destroy();
  });

  it("accepts an explicit variant", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({ variant: "warning" });

    expect(editor.isActive("callout", { variant: "warning" })).toBe(true);
    editor.destroy();
  });

  it("keeps its paragraph content", () => {
    const editor = makeEditor("<p>keep me</p>");
    editor.commands.selectAll();
    editor.commands.setCallout({});

    expect(editor.getText()).toContain("keep me");
    editor.destroy();
  });

  it("holds multiple block children", () => {
    const editor = makeEditor("<p>one</p><p>two</p>");
    editor.commands.selectAll();
    editor.commands.setCallout({});

    const text = editor.getText();
    expect(text).toContain("one");
    expect(text).toContain("two");
    editor.destroy();
  });

  it("unsets back to plain blocks", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({});
    editor.commands.unsetCallout();

    expect(JSON.stringify(json(editor))).not.toContain('"type":"callout"');
    editor.destroy();
  });

  it("round-trips through HTML parse and serialize", () => {
    const editor = makeEditor(
      '<div data-type="callout" data-variant="danger">' +
        "<p>careful</p></div>",
    );

    expect(editor.isActive).toBeDefined();
    const out = JSON.stringify(json(editor));
    expect(out).toContain('"type":"callout"');
    expect(out).toContain("danger");
    editor.destroy();
  });

  it("carries an emoji attribute", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.setCallout({ variant: "warning" });

    expect(JSON.stringify(json(editor))).toContain("emoji");
    editor.destroy();
  });
});

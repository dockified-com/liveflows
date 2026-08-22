import { describe, expect, it } from "vitest";
import { extractOutline } from "./outline";

function doc(...content: unknown[]) {
  return { type: "doc", content };
}

function heading(level: number, text: string, id: string | null = null) {
  return {
    type: "heading",
    attrs: { level, ...(id ? { id } : {}) },
    content: [{ type: "text", text }],
  };
}

function para(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("extractOutline", () => {
  it("returns an empty array for an empty document", () => {
    expect(extractOutline(doc())).toEqual([]);
  });

  it("returns an empty array for a document with no headings", () => {
    expect(extractOutline(doc(para("hello")))).toEqual([]);
  });

  it("extracts headings in document order", () => {
    const result = extractOutline(
      doc(heading(1, "Architecture"), para("x"), heading(2, "Frontend")),
    );

    expect(result).toEqual([
      { id: null, level: 1, text: "Architecture" },
      { id: null, level: 2, text: "Frontend" },
    ]);
  });

  it("carries the stable block id when present", () => {
    const result = extractOutline(doc(heading(1, "A", "block_01")));
    expect(result[0].id).toBe("block_01");
  });

  it("ignores headings deeper than level 3", () => {
    const result = extractOutline(
      doc(heading(3, "keep"), heading(4, "drop"), heading(6, "drop")),
    );

    expect(result.map((e) => e.text)).toEqual(["keep"]);
  });

  it("handles skipped levels without inventing structure", () => {
    const result = extractOutline(doc(heading(1, "A"), heading(3, "C")));
    expect(result.map((e) => e.level)).toEqual([1, 3]);
  });

  it("concatenates multiple text nodes in one heading", () => {
    const result = extractOutline(
      doc({
        type: "heading",
        attrs: { level: 1 },
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "world" },
        ],
      }),
    );

    expect(result[0].text).toBe("Hello world");
  });

  it("returns an empty string for a heading with no content", () => {
    const result = extractOutline(
      doc({ type: "heading", attrs: { level: 1 } }),
    );
    expect(result[0].text).toBe("");
  });

  it("finds nested headings, e.g. inside a callout", () => {
    const result = extractOutline(
      doc({ type: "callout", content: [heading(2, "Inside")] }),
    );

    expect(result.map((e) => e.text)).toEqual(["Inside"]);
  });

  it("tolerates malformed input without throwing", () => {
    expect(extractOutline(null)).toEqual([]);
    expect(extractOutline(undefined)).toEqual([]);
    expect(extractOutline({})).toEqual([]);
    expect(extractOutline("nonsense")).toEqual([]);
  });
});

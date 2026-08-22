import { describe, expect, it } from "vitest";
import { stripGoogleDocsBold } from "./paste-rules";

describe("stripGoogleDocsBold", () => {
  it("unwraps a normal-weight bold tag", () => {
    const input =
      '<b style="font-weight:normal" id="docs-internal-guid-x"><p>hi</p></b>';
    const result = stripGoogleDocsBold(input);

    expect(result).not.toContain("<b");
    expect(result).toContain("<p>hi</p>");
  });

  it("tolerates spacing variations in the style attribute", () => {
    const input = '<b style="font-weight: normal;"><p>hi</p></b>';
    expect(stripGoogleDocsBold(input)).not.toContain("<b");
  });

  it("tolerates single quotes", () => {
    const input = "<b style='font-weight:normal'><p>hi</p></b>";
    expect(stripGoogleDocsBold(input)).not.toContain("<b");
  });

  it("leaves genuine bold alone", () => {
    const input = "<p>a <b>real bold</b> word</p>";
    expect(stripGoogleDocsBold(input)).toBe(input);
  });

  it("leaves bold with an explicit weight alone", () => {
    const input = '<p><b style="font-weight:700">heavy</b></p>';
    expect(stripGoogleDocsBold(input)).toBe(input);
  });

  it("handles multiple wrappers", () => {
    const input =
      '<b style="font-weight:normal"><p>one</p></b><b style="font-weight:normal"><p>two</p></b>';
    const result = stripGoogleDocsBold(input);

    expect(result).not.toContain("<b");
    expect(result).toContain("one");
    expect(result).toContain("two");
  });

  it("returns non-matching input unchanged", () => {
    expect(stripGoogleDocsBold("<p>plain</p>")).toBe("<p>plain</p>");
    expect(stripGoogleDocsBold("")).toBe("");
  });
});

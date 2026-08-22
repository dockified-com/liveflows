import { describe, expect, it, vi } from "vitest";

vi.mock("../collaboration-provider", () => ({
  PROVIDER_MANAGES_HISTORY: true,
}));

const { buildExtensions } = await import("./index");

// A minimal stand-in; buildExtensions only passes it through.
const fakeCollab = { name: "fakeCollaboration" } as never;

describe("buildExtensions", () => {
  it("includes the collaboration extension it was given", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    expect(names).toContain("fakeCollaboration");
  });

  // AC-2. The whole reason this function exists.
  it("does not register history when the provider manages it", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    expect(names).not.toContain("history");
  });

  it("registers uniqueID", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    expect(names).toContain("uniqueID");
  });

  it("registers the core document nodes from StarterKit", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    for (const n of ["doc", "paragraph", "text", "heading", "bold", "italic"]) {
      expect(names, n).toContain(n);
    }
  });
});

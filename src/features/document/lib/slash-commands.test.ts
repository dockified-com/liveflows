import { describe, expect, it } from "vitest";
import { filterCommands, SLASH_COMMANDS } from "./slash-commands";

describe("SLASH_COMMANDS", () => {
  it("covers every insertable block type", () => {
    expect(SLASH_COMMANDS.length).toBeGreaterThanOrEqual(14);
  });

  it("has unique ids", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique actions", () => {
    const actions = SLASH_COMMANDS.map((c) => c.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it("assigns every command to a known group", () => {
    for (const c of SLASH_COMMANDS) {
      expect(["basic", "technical", "layout"]).toContain(c.group);
    }
  });
});

describe("filterCommands", () => {
  it("returns everything for an empty query", () => {
    expect(filterCommands("")).toHaveLength(SLASH_COMMANDS.length);
  });

  it("matches on label, case-insensitively", () => {
    const labels = filterCommands("head").map((c) => c.label);
    expect(labels).toContain("Heading 1");

    expect(filterCommands("HEAD").map((c) => c.label)).toEqual(labels);
  });

  it("matches on alias", () => {
    expect(filterCommands("h1").map((c) => c.action)).toContain("heading1");
  });

  it("matches a shorthand alias for a multiword label", () => {
    expect(filterCommands("todo").map((c) => c.action)).toContain("taskList");
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCommands("zzzzz")).toEqual([]);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterCommands("  h1  ").map((c) => c.action)).toContain("heading1");
  });

  it("ranks a label prefix match above a mid-string match", () => {
    const result = filterCommands("code");
    expect(result[0].action).toBe("codeBlock");
  });

  it("accepts an explicit command list", () => {
    const only = [SLASH_COMMANDS[0]];
    expect(filterCommands("", only)).toEqual(only);
  });
});

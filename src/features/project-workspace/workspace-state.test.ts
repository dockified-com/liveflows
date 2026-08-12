import { describe, expect, it } from "vitest";
import {
  closeFile,
  closeSplit,
  INITIAL_WORKSPACE_STATE,
  openFile,
  reconcileAuthorized,
  reorderTabs,
  replaceSplitSide,
  setMobileVisible,
  splitWith,
} from "./workspace-state";

describe("workspace-state pure transitions", () => {
  it("openFile on empty state opens a single file layout", () => {
    const s1 = openFile(INITIAL_WORKSPACE_STATE, "f1");
    expect(s1.layout).toEqual({
      kind: "single",
      activeFileId: "f1",
      openIds: ["f1"],
    });
  });

  it("openFile on existing file activates it without duplicating", () => {
    const s1 = openFile(INITIAL_WORKSPACE_STATE, "f1");
    const s2 = openFile(s1, "f2");
    const s3 = openFile(s2, "f1");
    expect(s3.layout).toEqual({
      kind: "single",
      activeFileId: "f1",
      openIds: ["f1", "f2"],
    });
  });

  it("closeFile closes the active file and activates nearest remaining", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = openFile(s, "f3");
    // current: openIds: [f1, f2, f3], active: f3
    s = closeFile(s, "f3");
    expect(s.layout).toEqual({
      kind: "single",
      activeFileId: "f2",
      openIds: ["f1", "f2"],
    });
  });

  it("closeFile closing last open file returns empty state", () => {
    const s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    const sClosed = closeFile(s, "f1");
    expect(sClosed.layout).toEqual({ kind: "empty" });
    expect(sClosed.mobileVisibleParticipant).toBeNull();
  });

  it("splitWith creates a split layout with two distinct files", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = splitWith(s, "f1", "f2");
    expect(s.layout).toEqual({
      kind: "split",
      leftFileId: "f1",
      rightFileId: "f2",
      openIds: ["f1", "f2"],
      dividerRatio: 0.5,
    });
  });

  it("splitWith ignores identical left and right IDs", () => {
    const s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    const s2 = splitWith(s, "f1", "f1");
    expect(s2).toEqual(s);
  });

  it("replaceSplitSide replaces either left or right pane", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = openFile(s, "f3");
    s = splitWith(s, "f1", "f2");
    s = replaceSplitSide(s, "right", "f3");
    expect(s.layout).toEqual({
      kind: "split",
      leftFileId: "f1",
      rightFileId: "f3",
      openIds: ["f1", "f2", "f3"],
      dividerRatio: 0.5,
    });
  });

  it("closeSplit returns single layout preserving openIds", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = splitWith(s, "f1", "f2");
    s = closeSplit(s);
    expect(s.layout).toEqual({
      kind: "single",
      activeFileId: "f1",
      openIds: ["f1", "f2"],
    });
  });

  it("reorderTabs moves tabs cleanly", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = openFile(s, "f3");
    s = reorderTabs(s, 0, 2);
    if (s.layout.kind !== "empty") {
      expect(s.layout.openIds).toEqual(["f2", "f3", "f1"]);
    }
  });

  it("reconcileAuthorized removes unauthorized files and fallback to valid active", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = openFile(s, "f3");
    s = reconcileAuthorized(s, ["f2", "f4"]);
    expect(s.layout).toEqual({
      kind: "single",
      activeFileId: "f2",
      openIds: ["f2"],
    });
  });

  it("setMobileVisible updates mobile participant", () => {
    let s = openFile(INITIAL_WORKSPACE_STATE, "f1");
    s = openFile(s, "f2");
    s = splitWith(s, "f1", "f2");
    s = setMobileVisible(s, "right");
    expect(s.mobileVisibleParticipant).toBe("right");
  });
});

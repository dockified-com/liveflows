import { describe, expect, it } from "vitest";
import { handleDragEnd } from "../dnd-handlers";
import type { WorkspaceState } from "../workspace-state";

describe("handleDragEnd", () => {
  const initialSingleState: WorkspaceState = {
    layout: {
      kind: "single",
      activeFileId: "file-1",
      openIds: ["file-1", "file-2", "file-3"],
    },
    mobileVisibleParticipant: null,
  };

  const initialSplitState: WorkspaceState = {
    layout: {
      kind: "split",
      leftFileId: "file-1",
      rightFileId: "file-3",
      openIds: ["file-1", "file-2", "file-3", "file-4"],
      dividerRatio: 0.5,
    },
    mobileVisibleParticipant: null,
  };

  it("reorders tab when dragging right", () => {
    const result = handleDragEnd(initialSingleState, {
      activeId: "file-1",
      overId: "file-3",
    });
    expect(result.layout.kind).toBe("single");
    if (result.layout.kind === "single") {
      expect(result.layout.openIds).toEqual(["file-2", "file-3", "file-1"]);
    }
  });

  it("reorders tab when dragging left", () => {
    const result = handleDragEnd(initialSingleState, {
      activeId: "file-3",
      overId: "file-1",
    });
    expect(result.layout.kind).toBe("single");
    if (result.layout.kind === "single") {
      expect(result.layout.openIds).toEqual(["file-3", "file-1", "file-2"]);
    }
  });

  it("handles reordering in split layout", () => {
    const result = handleDragEnd(initialSplitState, {
      activeId: "file-1",
      overId: "file-4",
    });
    expect(result.layout.kind).toBe("split");
    if (result.layout.kind === "split") {
      expect(result.layout.openIds).toEqual([
        "file-2",
        "file-3",
        "file-4",
        "file-1",
      ]);
      expect(result.layout.leftFileId).toBe("file-1");
      expect(result.layout.rightFileId).toBe("file-3");
    }
  });

  it("returns unchanged state when drag is cancelled (overId is null)", () => {
    const result = handleDragEnd(initialSingleState, {
      activeId: "file-1",
      overId: null,
    });
    expect(result).toBe(initialSingleState);
  });

  it("returns unchanged state when activeId equals overId (no-op)", () => {
    const result = handleDragEnd(initialSingleState, {
      activeId: "file-2",
      overId: "file-2",
    });
    expect(result).toBe(initialSingleState);
  });
});

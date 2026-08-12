import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  activateFile,
  closeFile,
  closeSplit,
  INITIAL_WORKSPACE_STATE,
  openFile,
  reconcileAuthorized,
  reorderTabs,
  replaceSplitSide,
  setMobileVisible,
  splitWith,
  type WorkspaceState,
} from "./workspace-state";

function assertInvariants(state: WorkspaceState) {
  const { layout, mobileVisibleParticipant } = state;

  if (layout.kind === "empty") {
    expect(mobileVisibleParticipant).toBeNull();
    return;
  }

  // openIds must not contain duplicates
  const uniqueOpen = new Set(layout.openIds);
  expect(uniqueOpen.size).toBe(layout.openIds.length);
  expect(layout.openIds.length).toBeGreaterThanOrEqual(1);

  if (layout.kind === "single") {
    expect(layout.openIds).toContain(layout.activeFileId);
  } else if (layout.kind === "split") {
    expect(layout.openIds.length).toBeGreaterThanOrEqual(2);
    expect(layout.openIds).toContain(layout.leftFileId);
    expect(layout.openIds).toContain(layout.rightFileId);
    expect(layout.leftFileId).not.toBe(layout.rightFileId);
    expect(layout.dividerRatio).toBeGreaterThanOrEqual(0.2);
    expect(layout.dividerRatio).toBeLessThanOrEqual(0.8);
  }
}

const fileIdArb = fc.constantFrom("f1", "f2", "f3", "f4", "f5", "f6");
const sideArb = fc.constantFrom<"left" | "right">("left", "right");

type Action =
  | { type: "open"; fileId: string }
  | { type: "close"; fileId: string }
  | { type: "activate"; fileId: string }
  | { type: "reorder"; from: number; to: number }
  | { type: "split"; left: string; right: string }
  | { type: "replaceSplit"; side: "left" | "right"; fileId: string }
  | { type: "closeSplit" }
  | { type: "reconcile"; auth: string[] }
  | { type: "mobileVisible"; participant: "left" | "right" | null };

const actionArb: fc.Arbitrary<Action> = fc.oneof(
  fileIdArb.map((fileId) => ({ type: "open" as const, fileId })),
  fileIdArb.map((fileId) => ({ type: "close" as const, fileId })),
  fileIdArb.map((fileId) => ({ type: "activate" as const, fileId })),
  fc
    .tuple(fc.nat(5), fc.nat(5))
    .map(([from, to]) => ({ type: "reorder" as const, from, to })),
  fc
    .tuple(fileIdArb, fileIdArb)
    .map(([left, right]) => ({ type: "split" as const, left, right })),
  fc
    .tuple(sideArb, fileIdArb)
    .map(([side, fileId]) => ({ type: "replaceSplit" as const, side, fileId })),
  fc.constant({ type: "closeSplit" as const }),
  fc
    .subarray(["f1", "f2", "f3", "f4", "f5"])
    .map((auth) => ({ type: "reconcile" as const, auth })),
  fc
    .constantFrom<"left" | "right" | null>("left", "right", null)
    .map((participant) => ({
      type: "mobileVisible" as const,
      participant,
    })),
);

describe("workspace-state property tests (fast-check)", () => {
  it("maintains all structural invariants across arbitrary command sequences", () => {
    fc.assert(
      fc.property(
        fc.array(actionArb, { minLength: 1, maxLength: 50 }),
        (actions) => {
          let state = INITIAL_WORKSPACE_STATE;
          assertInvariants(state);

          for (const action of actions) {
            switch (action.type) {
              case "open":
                state = openFile(state, action.fileId);
                break;
              case "close":
                state = closeFile(state, action.fileId);
                break;
              case "activate":
                state = activateFile(state, action.fileId);
                break;
              case "reorder":
                state = reorderTabs(state, action.from, action.to);
                break;
              case "split":
                state = splitWith(state, action.left, action.right);
                break;
              case "replaceSplit":
                state = replaceSplitSide(state, action.side, action.fileId);
                break;
              case "closeSplit":
                state = closeSplit(state);
                break;
              case "reconcile":
                state = reconcileAuthorized(state, action.auth);
                break;
              case "mobileVisible":
                state = setMobileVisible(state, action.participant);
                break;
            }
            assertInvariants(state);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

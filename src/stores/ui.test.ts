import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui";

describe("useUiStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useUiStore.setState({
      sidebarOpen: true,
      modal: null,
    });
  });

  it("toggles sidebar", () => {
    const { toggleSidebar } = useUiStore.getState();
    toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it("opens and closes modals", () => {
    const { openModal, closeModal } = useUiStore.getState();
    openModal({ kind: "create-project" });
    expect(useUiStore.getState().modal).toEqual({ kind: "create-project" });
    closeModal();
    expect(useUiStore.getState().modal).toBeNull();
  });

  it("opens rename modal with project id", () => {
    const { openModal } = useUiStore.getState();
    openModal({ kind: "rename-project", id: "proj_123" });
    expect(useUiStore.getState().modal).toEqual({
      kind: "rename-project",
      id: "proj_123",
    });
  });

  it("opens delete modal with project id", () => {
    const { openModal } = useUiStore.getState();
    openModal({ kind: "delete-project", id: "proj_456" });
    expect(useUiStore.getState().modal).toEqual({
      kind: "delete-project",
      id: "proj_456",
    });
  });
});

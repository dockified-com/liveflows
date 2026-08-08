import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { DeleteProjectDialog } from "./delete-project-dialog";

describe("DeleteProjectDialog", () => {
  const mockAction = vi.fn();

  beforeEach(() => {
    cleanup();
    mockAction.mockClear();
    useUiStore.setState({ sidebarOpen: true, modal: null });
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it("shows dialog when modal is delete-project", () => {
    useUiStore.setState({ modal: { kind: "delete-project", id: "p1" } });
    render(<DeleteProjectDialog deleteAction={mockAction} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("includes the project id as a hidden input", () => {
    useUiStore.setState({ modal: { kind: "delete-project", id: "p1" } });
    render(<DeleteProjectDialog deleteAction={mockAction} />);
    const hidden = document.querySelector(
      'input[name="projectId"]',
    ) as HTMLInputElement;
    expect(hidden.value).toBe("p1");
  });

  it("closes on cancel", () => {
    useUiStore.setState({ modal: { kind: "delete-project", id: "p1" } });
    render(<DeleteProjectDialog deleteAction={mockAction} />);
    fireEvent.click(
      screen.getByRole("button", { name: /cancel/i, hidden: true }),
    );
    expect(useUiStore.getState().modal).toBeNull();
  });
});

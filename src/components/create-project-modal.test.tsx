import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { CreateProjectModal } from "./create-project-modal";

describe("CreateProjectModal", () => {
  const mockAction = vi.fn();

  beforeEach(() => {
    cleanup();
    mockAction.mockClear();
    useUiStore.setState({ sidebarOpen: true, modal: null });
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it("does not show dialog when modal state is null", () => {
    render(<CreateProjectModal createAction={mockAction} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it("shows dialog when modal state is create-project", () => {
    useUiStore.setState({ modal: { kind: "create-project" } });
    render(<CreateProjectModal createAction={mockAction} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("has an accessible labelled input", () => {
    useUiStore.setState({ modal: { kind: "create-project" } });
    render(<CreateProjectModal createAction={mockAction} />);
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
  });

  it("closes modal on cancel click", () => {
    useUiStore.setState({ modal: { kind: "create-project" } });
    render(<CreateProjectModal createAction={mockAction} />);
    fireEvent.click(
      screen.getByRole("button", { name: /cancel/i, hidden: true }),
    );
    expect(useUiStore.getState().modal).toBeNull();
  });
});

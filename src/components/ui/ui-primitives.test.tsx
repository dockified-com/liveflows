import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Icon } from "./icon";
import { InlineError } from "./inline-error";
import { Input } from "./input";
import { ModalDialog } from "./modal-dialog";
import { StatusPill } from "./status-pill";

describe("UI Primitives Component Suite", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("Button", () => {
    it("renders children correctly", () => {
      render(<Button>Click me</Button>);
      expect(
        screen.getByRole("button", { name: "Click me" }),
      ).toBeInTheDocument();
    });

    it("applies primary variant classes", () => {
      render(<Button variant="primary">Primary</Button>);
      const btn = screen.getByRole("button", { name: "Primary" });
      expect(btn.className).toContain("bg-[var(--accent)]");
    });

    it("handles loading state", () => {
      render(<Button isLoading>Loading</Button>);
      const btn = screen.getByRole("button", { name: "Loading" });
      expect(btn).toBeDisabled();
    });
  });

  describe("StatusPill", () => {
    it("renders default synced pill", () => {
      render(<StatusPill status="synced" />);
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });

    it("renders reconnecting state with custom label", () => {
      render(<StatusPill status="reconnecting" label="Reconnecting..." />);
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });
  });

  describe("Icon", () => {
    it("renders SVG with accessible label when provided", () => {
      render(
        <Icon label="Settings icon">
          <path d="M0 0h24v24H0z" />
        </Icon>,
      );
      const svg = screen.getByRole("img", { name: "Settings icon" });
      expect(svg).toBeInTheDocument();
    });

    it("hides from screen readers when no label is provided", () => {
      const { container } = render(
        <Icon>
          <path d="M0 0h24v24H0z" />
        </Icon>,
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("EmptyState", () => {
    it("renders title, description and action", () => {
      render(
        <EmptyState
          title="No Items"
          description="Add items to populate"
          action={<button type="button">Add</button>}
        />,
      );
      expect(screen.getByText("No Items")).toBeInTheDocument();
      expect(screen.getByText("Add items to populate")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });
  });

  describe("InlineError", () => {
    it("renders error message and retry button", () => {
      const onRetry = vi.fn();
      render(<InlineError message="Connection failed" onRetry={onRetry} />);
      expect(screen.getByText("Connection failed")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("ModalDialog", () => {
    it("renders content when open", () => {
      render(
        <ModalDialog isOpen={true} onClose={() => {}} title="Dialog Title">
          <div>Modal content</div>
        </ModalDialog>,
      );
      expect(screen.getByText("Dialog Title")).toBeInTheDocument();
      expect(screen.getByText("Modal content")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(
        <ModalDialog isOpen={false} onClose={() => {}} title="Dialog Title">
          <div>Modal content</div>
        </ModalDialog>,
      );
      expect(screen.queryByText("Dialog Title")).not.toBeInTheDocument();
    });

    it("calls onClose on escape key press", () => {
      const onClose = vi.fn();
      render(
        <ModalDialog isOpen={true} onClose={onClose} title="Dialog Title" />,
      );
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Input", () => {
    it("renders label and binds input value", () => {
      render(<Input label="Username" defaultValue="john_doe" />);
      const input = screen.getByLabelText("Username");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("john_doe");
    });

    it("renders error message when error prop is passed", () => {
      render(<Input label="Email" error="Invalid email address" />);
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });
});

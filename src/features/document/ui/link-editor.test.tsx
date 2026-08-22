import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { LinkEditor } from "./link-editor";

describe("LinkEditor", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with prefilled url and focuses input", () => {
    render(<LinkEditor initialUrl="https://example.com" onApply={vi.fn()} />);

    const input = screen.getByLabelText("Link URL");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("https://example.com");
    expect(document.activeElement).toBe(input);
  });

  it("applies a valid http / https URL on form submit", () => {
    const onApply = vi.fn();
    render(<LinkEditor initialUrl="https://liveflows.dev" onApply={onApply} />);

    const applyButton = screen.getByRole("button", { name: "Apply" });
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledWith("https://liveflows.dev");
  });

  it("applies a valid mailto URL", () => {
    const onApply = vi.fn();
    render(
      <LinkEditor initialUrl="mailto:test@liveflows.dev" onApply={onApply} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("mailto:test@liveflows.dev");
  });

  it("rejects javascript: URL and displays error", () => {
    const onApply = vi.fn();
    render(<LinkEditor initialUrl="javascript:alert(1)" onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).not.toHaveBeenCalled();
    const error = screen.getByRole("alert");
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/invalid url/i);
  });

  it("calls onRemove when Remove button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <LinkEditor
        initialUrl="https://example.com"
        onApply={vi.fn()}
        onRemove={onRemove}
      />,
    );

    const removeBtn = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeBtn);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("closes and restores focus to trigger on Escape key", () => {
    const onCancel = vi.fn();
    const triggerBtn = document.createElement("button");
    document.body.appendChild(triggerBtn);
    const triggerRef = { current: triggerBtn };

    render(
      <LinkEditor
        initialUrl="https://example.com"
        onApply={vi.fn()}
        onCancel={onCancel}
        triggerRef={triggerRef}
      />,
    );

    const input = screen.getByLabelText("Link URL");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(triggerBtn);

    document.body.removeChild(triggerBtn);
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(
      <LinkEditor
        initialUrl="https://example.com"
        onApply={vi.fn()}
        onRemove={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

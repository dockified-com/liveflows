import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { BlockMenu } from "./block-menu";

describe("BlockMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a menu container with role='menu' and accessible name", () => {
    render(<BlockMenu />);

    const menu = screen.getByRole("menu", { name: "Block options" });
    expect(menu).toBeInTheDocument();
  });

  it("renders items: Duplicate, Delete, Turn into, Copy block link, Ask AI", () => {
    render(<BlockMenu />);

    expect(
      screen.getByRole("menuitem", { name: /Duplicate/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Delete/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Turn into/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Copy block link/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Ask AI/i }),
    ).toBeInTheDocument();
  });

  it("Ask AI is present but disabled with coming soon hint", () => {
    render(<BlockMenu />);

    const aiItem = screen.getByRole("menuitem", { name: /Ask AI/i });
    expect(aiItem).toBeDisabled();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("Copy block link is disabled when hasBlockId is false", () => {
    render(<BlockMenu hasBlockId={false} />);

    const copyLinkItem = screen.getByRole("menuitem", {
      name: /Copy block link/i,
    });
    expect(copyLinkItem).toBeDisabled();
  });

  it("Copy block link is enabled when hasBlockId is true", () => {
    render(<BlockMenu hasBlockId={true} />);

    const copyLinkItem = screen.getByRole("menuitem", {
      name: /Copy block link/i,
    });
    expect(copyLinkItem).toBeEnabled();
  });

  it("clicking Duplicate calls onDuplicate and onClose", () => {
    const onDuplicate = vi.fn();
    const onClose = vi.fn();
    render(<BlockMenu onDuplicate={onDuplicate} onClose={onClose} />);

    const duplicateItem = screen.getByRole("menuitem", { name: /Duplicate/i });
    fireEvent.click(duplicateItem);

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking Delete calls onDelete and onClose", () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(<BlockMenu onDelete={onDelete} onClose={onClose} />);

    const deleteItem = screen.getByRole("menuitem", { name: /Delete/i });
    fireEvent.click(deleteItem);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates items with ArrowDown and ArrowUp", () => {
    render(<BlockMenu />);

    const menu = screen.getByRole("menu", { name: "Block options" });
    const colorItem = screen.getByRole("menuitem", { name: /Color/i });
    const turnIntoItem = screen.getByRole("menuitem", { name: /Turn into/i });

    // Initial focused is first non-disabled item (Color at index 0)
    expect(colorItem).toHaveFocus();

    // Arrow down moves to Turn into (index 1)
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(turnIntoItem).toHaveFocus();

    // Arrow up moves back to Color (index 0)
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(colorItem).toHaveFocus();
  });

  it("closes when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<BlockMenu onClose={onClose} />);

    const menu = screen.getByRole("menu", { name: "Block options" });
    fireEvent.keyDown(menu, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when clicking outside the menu", () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <BlockMenu onClose={onClose} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens turn-into submenu on click and allows selecting target", () => {
    const onTurnInto = vi.fn();
    const onClose = vi.fn();
    render(<BlockMenu onTurnInto={onTurnInto} onClose={onClose} />);

    const turnIntoItem = screen.getByRole("menuitem", { name: /Turn into/i });
    fireEvent.click(turnIntoItem);

    const heading1Option = screen.getByRole("menuitem", { name: "Heading 1" });
    expect(heading1Option).toBeInTheDocument();

    fireEvent.click(heading1Option);
    expect(onTurnInto).toHaveBeenCalledWith("heading1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(<BlockMenu />);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

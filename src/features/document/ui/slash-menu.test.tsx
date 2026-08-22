import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { SLASH_COMMANDS } from "../lib/slash-commands";
import { SlashMenu } from "./slash-menu";

describe("SlashMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a listbox container with role and accessible name", () => {
    render(<SlashMenu items={SLASH_COMMANDS} />);

    const listbox = screen.getByRole("listbox", { name: "Insert block" });
    expect(listbox).toBeInTheDocument();
  });

  it("renders one option per filtered command", () => {
    render(<SlashMenu items={SLASH_COMMANDS} />);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(SLASH_COMMANDS.length);
  });

  it("renders group headers that are not role='option'", () => {
    render(<SlashMenu items={SLASH_COMMANDS} />);

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Layout")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();

    expect(screen.queryByRole("option", { name: "Basic" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Layout" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Technical" })).toBeNull();
  });

  it("sets aria-selected='true' on selected index and matches aria-activedescendant", () => {
    render(<SlashMenu items={SLASH_COMMANDS} selectedIndex={1} />);

    const listbox = screen.getByRole("listbox", { name: "Insert block" });
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      "slash-option-heading1",
    );

    const selectedOption = screen.getByRole("option", { name: /Heading 1/ });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");

    const unselectedOption = screen.getByRole("option", { name: /Text/ });
    expect(unselectedOption).toHaveAttribute("aria-selected", "false");
  });

  it("shows empty state when items list is empty", () => {
    render(<SlashMenu items={[]} />);

    expect(screen.getByText("No blocks found")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("calls onSelect when an option is clicked", () => {
    const onSelect = vi.fn();
    render(<SlashMenu items={SLASH_COMMANDS} onSelect={onSelect} />);

    const headingOption = screen.getByRole("option", { name: /Heading 1/ });
    fireEvent.click(headingOption);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "heading1", action: "heading1" }),
    );
  });

  it("passes axe accessibility checks with items", async () => {
    const { container } = render(
      <SlashMenu items={SLASH_COMMANDS} selectedIndex={0} onSelect={vi.fn()} />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("passes axe accessibility checks when empty", async () => {
    const { container } = render(<SlashMenu items={[]} onSelect={vi.fn()} />);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

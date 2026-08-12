import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceError from "./error";
import WorkspaceLoading from "./loading";

describe("WorkspaceLoading", () => {
  afterEach(cleanup);

  it("marks the region busy and renders card-shaped neutral skeletons", () => {
    const { container } = render(<WorkspaceLoading />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    // One skeleton block per project card slot
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      6,
    );
    // Grid breakpoints match the project list: 1 / 2 / 3 columns
    const grid = container.querySelector(
      ".grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3",
    );
    expect(grid).not.toBeNull();
  });
});

describe("WorkspaceError", () => {
  afterEach(cleanup);

  it("shows an inline retry panel and keeps the Projects heading", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<WorkspaceError error={new Error("boom")} reset={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /projects/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/couldn’t load projects/i)).toBeInTheDocument();
  });

  it("calls reset when retry is clicked", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<WorkspaceError error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

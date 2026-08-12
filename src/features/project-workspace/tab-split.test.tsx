import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplitPaneContainer } from "./split-container";
import { type TabItem, WorkspaceTabBar } from "./tab-bar";

describe("WorkspaceTabBar", () => {
  beforeEach(() => {
    cleanup();
  });

  const tabs: TabItem[] = [
    { id: "f1", name: "System Diagram", type: "canvas" },
    { id: "f2", name: "API Docs", type: "document" },
  ];

  it("renders active tabs and handles click events", () => {
    const handleActivate = vi.fn();
    const handleClose = vi.fn();

    render(
      <WorkspaceTabBar
        tabs={tabs}
        activeFileId="f1"
        onActivate={handleActivate}
        onClose={handleClose}
      />,
    );

    expect(screen.getByText("System Diagram")).toBeInTheDocument();
    expect(screen.getByText("API Docs")).toBeInTheDocument();

    fireEvent.click(screen.getByText("API Docs"));
    expect(handleActivate).toHaveBeenCalledWith("f2");
  });

  it("renders split button and triggers split view", () => {
    const handleSplitWith = vi.fn();

    render(
      <WorkspaceTabBar
        tabs={tabs}
        activeFileId="f1"
        onActivate={() => {}}
        onClose={() => {}}
        onSplitWith={handleSplitWith}
      />,
    );

    const splitBtn = screen.getByTitle("Split View");
    fireEvent.click(splitBtn);

    expect(handleSplitWith).toHaveBeenCalledWith("f1", "f2");
  });
});

describe("SplitPaneContainer", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders single pane when split is false", () => {
    render(
      <SplitPaneContainer
        isSplit={false}
        leftPane={<div>Left Content</div>}
        rightPane={<div>Right Content</div>}
      />,
    );

    expect(screen.getByText("Left Content")).toBeInTheDocument();
    expect(screen.queryByText("Right Content")).not.toBeInTheDocument();
  });

  it("renders both left and right panes in split mode", () => {
    render(
      <SplitPaneContainer
        isSplit={true}
        leftPane={<div>Left Content</div>}
        rightPane={<div>Right Content</div>}
      />,
    );

    expect(screen.getAllByText("Left Content").length).toBeGreaterThan(0);
    expect(screen.getByText("Right Content")).toBeInTheDocument();
  });

  it("supports keyboard resizing on separator divider", () => {
    const handleRatioChange = vi.fn();
    render(
      <SplitPaneContainer
        isSplit={true}
        dividerRatio={0.5}
        onRatioChange={handleRatioChange}
        leftPane={<div>Left Content</div>}
        rightPane={<div>Right Content</div>}
      />,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize split panes",
    });
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("aria-valuenow", "50");

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(handleRatioChange).toHaveBeenCalledWith(0.45);

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(handleRatioChange).toHaveBeenCalledWith(0.55);

    fireEvent.keyDown(separator, { key: "Home" });
    expect(handleRatioChange).toHaveBeenCalledWith(0.2);

    fireEvent.keyDown(separator, { key: "End" });
    expect(handleRatioChange).toHaveBeenCalledWith(0.8);
  });
});

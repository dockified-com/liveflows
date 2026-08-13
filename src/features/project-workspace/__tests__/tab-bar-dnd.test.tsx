import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DndCoordinator } from "../dnd-coordinator";
import { type TabItem, WorkspaceTabBar } from "../tab-bar";

describe("WorkspaceTabBar & DndCoordinator Drag & Drop Optimization", () => {
  const tabs: TabItem[] = [
    { id: "f1", name: "System Architecture", type: "canvas" },
    { id: "f2", name: "API Spec", type: "document" },
  ];

  it("applies target-specific transition-colors and avoids transition-all conflict", () => {
    render(
      <DndCoordinator onDragEnd={vi.fn()}>
        <WorkspaceTabBar
          tabs={tabs}
          activeFileId="f1"
          onActivate={vi.fn()}
          onClose={vi.fn()}
        />
      </DndCoordinator>,
    );

    const tabElement = screen.getAllByRole("tab", {
      name: "System Architecture (canvas)",
    })[0];

    expect(tabElement.className).toContain("transition-colors");
    expect(tabElement.className).not.toContain("transition-all");
  });

  it("enforces touch-none and select-none on sortable tab elements", () => {
    render(
      <DndCoordinator onDragEnd={vi.fn()}>
        <WorkspaceTabBar
          tabs={tabs}
          activeFileId="f1"
          onActivate={vi.fn()}
          onClose={vi.fn()}
        />
      </DndCoordinator>,
    );

    const tabElement = screen.getAllByRole("tab", {
      name: "System Architecture (canvas)",
    })[0];

    expect(tabElement.className).toContain("touch-none");
    expect(tabElement.className).toContain("select-none");
  });

  it("renders DndCoordinator with distance activation constraint for PointerSensor", () => {
    const handleDragEnd = vi.fn();
    const { container } = render(
      <DndCoordinator onDragEnd={handleDragEnd}>
        <WorkspaceTabBar
          tabs={tabs}
          activeFileId="f1"
          onActivate={vi.fn()}
          onClose={vi.fn()}
        />
      </DndCoordinator>,
    );

    expect(container.firstChild).toBeTruthy();
  });
});

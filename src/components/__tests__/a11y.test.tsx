import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { PaneHeader } from "@/features/project-workspace/pane-header";
import { WorkspaceTabBar } from "@/features/project-workspace/tab-bar";
import { CreateItemDialog } from "../create-item-dialog";
import { DeleteItemDialog } from "../delete-item-dialog";
import { FileTree } from "../file-tree";
import { RenameItemDialog } from "../rename-item-dialog";

describe("Accessibility Audit (a11y)", () => {
  it("FileTree component has no accessibility violations", async () => {
    const nodes = [
      {
        id: "folder-1",
        name: "Src",
        type: "folder" as const,
        children: [
          {
            id: "file-1",
            name: "Canvas 1",
            type: "file" as const,
            fileType: "canvas" as const,
          },
        ],
      },
      {
        id: "file-2",
        name: "Doc 1",
        type: "file" as const,
        fileType: "document" as const,
      },
    ];

    const { container } = render(
      <FileTree
        nodes={nodes}
        activeFileId="file-1"
        openFileIds={["file-1", "file-2"]}
        onSelectFile={vi.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("WorkspaceTabBar component has no accessibility violations", async () => {
    const tabs = [
      { id: "file-1", name: "System Architecture", type: "canvas" as const },
      { id: "file-2", name: "RFC Document", type: "document" as const },
    ];

    const { container } = render(
      <WorkspaceTabBar
        tabs={tabs}
        activeFileId="file-1"
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("PaneHeader component has no accessibility violations", async () => {
    const { container } = render(
      <PaneHeader
        fileName="System Architecture"
        fileType="canvas"
        connectionStatus="connected"
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("RenameItemDialog component has no accessibility violations", async () => {
    const { container } = render(
      <RenameItemDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={async () => {}}
        currentName="My Canvas"
        itemType="file"
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("DeleteItemDialog component has no accessibility violations", async () => {
    const { container } = render(
      <DeleteItemDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={async () => {}}
        itemName="Old Flow"
        itemType="file"
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("CreateItemDialog component has no accessibility violations", async () => {
    const { container } = render(
      <CreateItemDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={async () => {}}
        initialFolderId={null}
        folders={[]}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

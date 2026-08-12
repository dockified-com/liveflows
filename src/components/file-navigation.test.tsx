import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateItemDialog } from "./create-item-dialog";
import { FileTree, type FileTreeNode } from "./file-tree";

describe("CreateItemDialog", () => {
  it("renders form elements and submits valid data", async () => {
    const handleSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    const handleClose = vi.fn();

    render(
      <CreateItemDialog
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        folders={[{ id: "fold-1", name: "Docs", parentId: null }]}
      />,
    );

    expect(screen.getByText("Create New Item")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/System Design V1/i);
    fireEvent.change(nameInput, {
      target: { value: "My Architecture Canvas" },
    });

    const form = nameInput.closest("form");
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    // Wait microtasks for async onSubmit handling
    await new Promise((r) => setTimeout(r, 0));

    expect(handleSubmit).toHaveBeenCalledWith({
      name: "My Architecture Canvas",
      type: "canvas",
      destinationFolderId: null,
    });
    expect(handleClose).toHaveBeenCalled();
  });
});

describe("FileTree", () => {
  const mockNodes: FileTreeNode[] = [
    {
      id: "folder-1",
      name: "Architecture",
      type: "folder",
      children: [
        {
          id: "file-1",
          name: "System Diagram",
          type: "file",
          fileType: "canvas",
          folderId: "folder-1",
        },
      ],
    },
    {
      id: "file-2",
      name: "README",
      type: "file",
      fileType: "document",
      folderId: null,
    },
  ];

  it("expands folders and selects files", async () => {
    const handleSelect = vi.fn();
    render(
      <FileTree
        nodes={mockNodes}
        activeFileId="file-2"
        openFileIds={["file-2"]}
        onSelectFile={handleSelect}
      />,
    );

    // README should be visible
    expect(screen.getByText("README")).toBeInTheDocument();

    // Click folder to expand
    const folder = screen.getByText("Architecture");
    fireEvent.click(folder);

    // System Diagram should now be revealed
    expect(screen.getByText("System Diagram")).toBeInTheDocument();

    // Click file inside folder
    fireEvent.click(screen.getByText("System Diagram"));
    expect(handleSelect).toHaveBeenCalledWith("file-1");
  });
});

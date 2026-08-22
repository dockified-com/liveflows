import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileTree, type FileTreeNode } from "./file-tree";
import {
  FileTreeDndContext,
  findNodeById,
  isAncestor,
} from "./file-tree-dnd-context";

const mockNodes: FileTreeNode[] = [
  {
    id: "folder-1",
    name: "Folder 1",
    type: "folder",
    children: [
      {
        id: "folder-1-1",
        name: "Folder 1-1",
        type: "folder",
        parentId: "folder-1",
        children: [
          {
            id: "file-1-1-1",
            name: "Nested File",
            type: "file",
            fileType: "document",
            folderId: "folder-1-1",
          },
        ],
      },
      {
        id: "file-1-1",
        name: "File 1-1",
        type: "file",
        fileType: "canvas",
        folderId: "folder-1",
      },
    ],
  },
  {
    id: "file-root",
    name: "Root File",
    type: "file",
    fileType: "canvas",
    folderId: null,
  },
];

describe("file-tree-dnd-context utilities", () => {
  it("findNodeById finds existing nodes recursively", () => {
    expect(findNodeById(mockNodes, "folder-1")?.name).toBe("Folder 1");
    expect(findNodeById(mockNodes, "folder-1-1")?.name).toBe("Folder 1-1");
    expect(findNodeById(mockNodes, "file-1-1-1")?.name).toBe("Nested File");
    expect(findNodeById(mockNodes, "non-existent")).toBeNull();
  });

  it("isAncestor correctly identifies descendant relationships", () => {
    expect(isAncestor(mockNodes, "folder-1", "folder-1-1")).toBe(true);
    expect(isAncestor(mockNodes, "folder-1", "file-1-1-1")).toBe(true);
    expect(isAncestor(mockNodes, "folder-1-1", "folder-1")).toBe(false);
    expect(isAncestor(mockNodes, "folder-1", "file-root")).toBe(false);
  });
});

describe("FileTreeDndContext integration", () => {
  it("renders children and FileTree within DndContext", () => {
    const handleMoveFolder = vi.fn();
    const handleMoveRoot = vi.fn();

    render(
      <FileTreeDndContext
        nodes={mockNodes}
        onMoveToFolder={handleMoveFolder}
        onMoveToRoot={handleMoveRoot}
      >
        <FileTree nodes={mockNodes} onSelectFile={() => {}} />
      </FileTreeDndContext>,
    );

    expect(screen.getByText("Folder 1")).toBeInTheDocument();
    expect(screen.getByText("Root File")).toBeInTheDocument();
  });
});

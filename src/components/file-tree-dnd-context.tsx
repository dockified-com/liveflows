"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FileTreeNode } from "@/components/file-tree";
import { Icon } from "@/components/ui/icon";

/**
 * Checks if potentialAncestorId is an ancestor of targetId in the tree.
 */
export function isAncestor(
  nodes: FileTreeNode[],
  potentialAncestorId: string,
  targetId: string,
): boolean {
  function findInSubtree(items: FileTreeNode[], searchId: string): boolean {
    for (const node of items) {
      if (node.id === searchId) return true;
      if (node.children && findInSubtree(node.children, searchId)) return true;
    }
    return false;
  }

  function findNode(items: FileTreeNode[], id: string): FileTreeNode | null {
    for (const node of items) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const ancestor = findNode(nodes, potentialAncestorId);
  if (!ancestor || !ancestor.children) return false;
  return findInSubtree(ancestor.children, targetId);
}

/**
 * Helper to recursively locate a tree node by ID.
 */
export function findNodeById(
  nodes: FileTreeNode[],
  id: string,
): FileTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

interface FileTreeDndContextValue {
  activeId: string | null;
  activeNode: FileTreeNode | null;
  nodes: FileTreeNode[];
}

const FileTreeDndReactContext = createContext<FileTreeDndContextValue>({
  activeId: null,
  activeNode: null,
  nodes: [],
});

export function useFileTreeDnd() {
  return useContext(FileTreeDndReactContext);
}

export interface FileTreeDndContextProps {
  nodes: FileTreeNode[];
  onMoveToFolder: (
    id: string,
    type: "file" | "folder",
    targetFolderId: string,
  ) => void | Promise<void>;
  onMoveToRoot: (id: string, type: "file" | "folder") => void | Promise<void>;
  onDropOnTabBar?: (id: string) => void;
  children: React.ReactNode;
}

export function FileTreeDndContext({
  nodes,
  onMoveToFolder,
  onMoveToRoot,
  onDropOnTabBar,
  children,
}: FileTreeDndContextProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!mounted) {
    return (
      <FileTreeDndReactContext.Provider
        value={{ activeId: null, activeNode: null, nodes }}
      >
        {children}
      </FileTreeDndReactContext.Provider>
    );
  }

  const activeNode = activeId ? findNodeById(nodes, activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedId = String(active.id);
    const draggedNode = findNodeById(nodes, draggedId);
    if (!draggedNode) return;

    const draggedType = draggedNode.type;
    const currentParentId =
      draggedType === "file"
        ? (draggedNode.folderId ?? null)
        : (draggedNode.parentId ?? null);

    const targetId = String(over.id);

    if (targetId === "tab-bar-drop-zone") {
      if (draggedType === "file" && onDropOnTabBar) {
        onDropOnTabBar(draggedId);
      }
      return;
    }

    if (targetId === "root-drop-zone") {
      if (currentParentId !== null) {
        onMoveToRoot(draggedId, draggedType);
      }
      return;
    }

    const targetNode = findNodeById(nodes, targetId);
    if (targetNode && targetNode.type === "folder") {
      if (targetId === draggedId) return;
      if (currentParentId === targetId) return;
      if (draggedType === "folder" && isAncestor(nodes, draggedId, targetId)) {
        return;
      }
      onMoveToFolder(draggedId, draggedType, targetId);
    }
  };

  const collisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCenter(args);
  };

  return (
    <FileTreeDndReactContext.Provider value={{ activeId, activeNode, nodes }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {children}
        {typeof window !== "undefined" &&
          createPortal(
            <DragOverlay dropAnimation={null}>
              {activeNode ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-md opacity-95 scale-[1.02] pointer-events-none select-none text-xs font-sans text-[var(--ink)] z-[9999]">
                  {activeNode.type === "folder" ? (
                    <span
                      className="shrink-0 text-amber-500"
                      aria-hidden="true"
                    >
                      <Icon size="sm">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </Icon>
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 ${
                        activeNode.fileType === "canvas"
                          ? "text-blue-600"
                          : "text-violet-600"
                      }`}
                      aria-hidden="true"
                    >
                      {activeNode.fileType === "canvas" ? (
                        <Icon size="sm">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="8.5" cy="14" r="1.5" />
                          <circle cx="15.5" cy="14" r="1.5" />
                          <circle cx="12" cy="9" r="1.5" />
                        </Icon>
                      ) : (
                        <Icon size="sm">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </Icon>
                      )}
                    </span>
                  )}
                  <span className="truncate font-medium">
                    {activeNode.name}
                  </span>
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </FileTreeDndReactContext.Provider>
  );
}

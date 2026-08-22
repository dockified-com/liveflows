"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  findNodeById,
  isAncestor,
  useFileTreeDnd,
} from "@/components/file-tree-dnd-context";
import { Icon } from "@/components/ui/icon";

export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  fileType?: "canvas" | "document";
  folderId?: string | null;
  parentId?: string | null;
  children?: FileTreeNode[];
}

export interface FileTreeProps {
  nodes: FileTreeNode[];
  activeFileId?: string | null;
  openFileIds?: string[];
  activeId?: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateInFolder?: (folderId: string | null) => void;
  onRename?: (id: string, type: "file" | "folder", currentName: string) => void;
  onDelete?: (id: string, type: "file" | "folder", name: string) => void;
  onMoveToFolder?: (
    id: string,
    type: "file" | "folder",
    targetFolderId: string,
  ) => void;
  onMoveToRoot?: (id: string, type: "file" | "folder") => void;
}

/** Build the ordered visible ID list for roving-tabindex arrow navigation. */
function buildVisibleIds(
  nodes: FileTreeNode[],
  expandedFolderIds: Set<string>,
): string[] {
  const ids: string[] = [];
  function walk(items: FileTreeNode[]) {
    for (const node of items) {
      ids.push(node.id);
      if (
        node.type === "folder" &&
        expandedFolderIds.has(node.id) &&
        node.children
      ) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return ids;
}

export function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "root-drop-zone",
    data: { type: "root" },
  });
  const { activeId, activeNode } = useFileTreeDnd();

  const isDragging = Boolean(activeId);
  const activeParentId = activeNode
    ? activeNode.type === "file"
      ? (activeNode.folderId ?? null)
      : (activeNode.parentId ?? null)
    : null;

  const isMoveToRootValid = isDragging && activeParentId !== null;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] flex-1 rounded-md transition-all duration-150 my-1 p-2 flex items-center justify-center select-none ${
        isOver && isMoveToRootValid
          ? "border-2 border-dashed border-blue-400 bg-blue-50/50 text-blue-600 font-medium text-xs shadow-2xs"
          : isDragging && isMoveToRootValid
            ? "border border-dashed border-slate-300 bg-slate-50/40 text-slate-400 text-xs"
            : "border border-transparent"
      }`}
    >
      {isMoveToRootValid && (
        <div className="flex items-center gap-1.5 pointer-events-none text-xs">
          <Icon size="sm">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </Icon>
          <span>Move to root</span>
        </div>
      )}
    </div>
  );
}

export function FileTree({
  nodes,
  activeFileId,
  openFileIds = [],
  activeId,
  onSelectFile,
  onCreateInFolder,
  onRename,
  onDelete,
}: FileTreeProps) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(),
  );
  // Roving tabindex: which node currently owns tabIndex=0
  const [focusedId, setFocusedId] = useState<string | null>(
    nodes.length > 0 ? nodes[0].id : null,
  );
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const focusNode = useCallback((id: string) => {
    setFocusedId(id);
    // Use requestAnimationFrame so state propagates before DOM focus
    requestAnimationFrame(() => {
      nodeRefs.current.get(id)?.focus();
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, node: FileTreeNode) => {
      const visibleIds = buildVisibleIds(nodes, expandedFolderIds);
      const currentIdx = visibleIds.indexOf(node.id);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = visibleIds[currentIdx + 1];
          if (next) focusNode(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = visibleIds[currentIdx - 1];
          if (prev) focusNode(prev);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (node.type === "folder") {
            if (!expandedFolderIds.has(node.id)) {
              // Expand
              setExpandedFolderIds((prev) => new Set([...prev, node.id]));
            } else if (node.children && node.children.length > 0) {
              // Move into first child
              focusNode(node.children[0].id);
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (node.type === "folder" && expandedFolderIds.has(node.id)) {
            // Collapse
            setExpandedFolderIds((prev) => {
              const next = new Set(prev);
              next.delete(node.id);
              return next;
            });
          } else {
            // Move to parent folder
            const parentId =
              node.type === "folder" ? node.parentId : node.folderId;
            if (parentId) focusNode(parentId);
          }
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (node.type === "folder") {
            toggleFolder(node.id);
          } else {
            onSelectFile(node.id);
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          const first = visibleIds[0];
          if (first) focusNode(first);
          break;
        }
        case "End": {
          e.preventDefault();
          const last = visibleIds[visibleIds.length - 1];
          if (last) focusNode(last);
          break;
        }
      }
    },
    [nodes, expandedFolderIds, focusNode, toggleFolder, onSelectFile],
  );

  return (
    <div
      className="py-1 font-sans text-xs select-none flex flex-col flex-1 min-h-0"
      role="tree"
    >
      {nodes.length === 0 ? (
        <div className="p-4 text-center text-xs text-[var(--ink-tertiary)]">
          No files or folders yet.
        </div>
      ) : (
        nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            level={0}
            expandedFolderIds={expandedFolderIds}
            focusedId={focusedId}
            activeFileId={activeFileId}
            openFileIds={openFileIds}
            activeId={activeId}
            allNodes={nodes}
            onToggleFolder={toggleFolder}
            onSelectFile={onSelectFile}
            onCreateInFolder={onCreateInFolder}
            onRename={onRename}
            onDelete={onDelete}
            onFocus={setFocusedId}
            onKeyDown={handleKeyDown}
            nodeRefs={nodeRefs}
          />
        ))
      )}
      <RootDropZone />
    </div>
  );
}

interface TreeNodeItemProps {
  node: FileTreeNode;
  level: number;
  expandedFolderIds: Set<string>;
  focusedId: string | null;
  activeFileId?: string | null;
  openFileIds: string[];
  activeId?: string | null;
  allNodes: FileTreeNode[];
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateInFolder?: (folderId: string | null) => void;
  onRename?: (id: string, type: "file" | "folder", currentName: string) => void;
  onDelete?: (id: string, type: "file" | "folder", name: string) => void;
  onFocus: (id: string) => void;
  onKeyDown: (e: React.KeyboardEvent, node: FileTreeNode) => void;
  nodeRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

function TreeNodeItem({
  node,
  level,
  expandedFolderIds,
  focusedId,
  activeFileId,
  openFileIds,
  activeId: activeIdProp,
  allNodes,
  onToggleFolder,
  onSelectFile,
  onCreateInFolder,
  onRename,
  onDelete,
  onFocus,
  onKeyDown,
  nodeRefs,
}: TreeNodeItemProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolderIds.has(node.id);
  const isActive = !isFolder && node.id === activeFileId;
  const isOpen = !isFolder && openFileIds.includes(node.id);
  const isFocused = node.id === focusedId;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const dndContext = useFileTreeDnd();
  const effectiveActiveId = activeIdProp ?? dndContext.activeId;

  const parentId = isFolder ? (node.parentId ?? null) : (node.folderId ?? null);

  // Draggable for all nodes
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({
    id: node.id,
    disabled: !mounted,
    data: {
      id: node.id,
      type: node.type,
      parentId,
    },
  });

  // Droppable for folders only
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
    disabled: !mounted || !isFolder,
    data: {
      id: node.id,
      type: "folder",
    },
  });

  const setRefs = useCallback(
    (element: HTMLElement | null) => {
      if (mounted) {
        setDragRef(element);
        if (isFolder) {
          setDropRef(element);
        }
      }
      if (element) {
        nodeRefs.current.set(node.id, element);
      } else {
        nodeRefs.current.delete(node.id);
      }
    },
    [mounted, setDragRef, setDropRef, isFolder, node.id, nodeRefs],
  );

  // Validate drop target when hovered
  let isValidTarget = false;
  if (
    isFolder &&
    isOver &&
    effectiveActiveId &&
    effectiveActiveId !== node.id
  ) {
    const activeTreeNodes =
      dndContext.nodes.length > 0 ? dndContext.nodes : allNodes;
    const draggedNode =
      dndContext.activeNode ?? findNodeById(activeTreeNodes, effectiveActiveId);

    if (draggedNode) {
      const draggedParentId =
        draggedNode.type === "file"
          ? (draggedNode.folderId ?? null)
          : (draggedNode.parentId ?? null);

      const isSelf = effectiveActiveId === node.id;
      const isSameParent = draggedParentId === node.id;
      const isCycle =
        draggedNode.type === "folder" &&
        isAncestor(activeTreeNodes, effectiveActiveId, node.id);

      if (!isSelf && !isSameParent && !isCycle) {
        isValidTarget = true;
      }
    }
  }

  // Auto-expand collapsed folders after 600ms hover during drag
  useEffect(() => {
    if (!isFolder || isExpanded || !isOver || !isValidTarget) {
      return;
    }

    const timer = setTimeout(() => {
      onToggleFolder(node.id);
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [isFolder, isExpanded, isOver, isValidTarget, node.id, onToggleFolder]);

  const indentStyle = { paddingLeft: `${level * 16 + 8}px` };
  const isCurrentDraggedItem = effectiveActiveId === node.id;

  const rowBgClass = isCurrentDraggedItem
    ? "opacity-40 bg-slate-100/50"
    : isOver && isValidTarget
      ? "bg-blue-50 border-l-2 border-blue-400 font-medium text-blue-900 transition-colors duration-150"
      : isActive
        ? "bg-white shadow-2xs text-blue-700 font-semibold border-l-2 border-blue-600 transition-all duration-150"
        : isOpen
          ? "text-[var(--ink)] bg-slate-200/50 hover:bg-slate-200/80 font-medium transition-all duration-150"
          : "text-[var(--ink-secondary)] hover:bg-slate-200/60 hover:text-[var(--ink)] transition-all duration-150";

  const dragAttributes = mounted ? attributes : {};
  const dragListeners = mounted ? listeners : {};

  return (
    <div>
      <div
        ref={setRefs}
        {...dragAttributes}
        {...dragListeners}
        className={`group flex items-center justify-between py-1.5 pr-2 cursor-pointer rounded-md my-0.5 ${rowBgClass}`}
        style={indentStyle}
        onClick={() => {
          onFocus(node.id);
          if (isFolder) {
            onToggleFolder(node.id);
          } else {
            onSelectFile(node.id);
          }
        }}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          onKeyDown(e, node);
        }}
        onFocus={() => onFocus(node.id)}
        role="treeitem"
        aria-expanded={isFolder ? isExpanded : undefined}
        aria-selected={isActive}
        // Roving tabindex: only the focused node is reachable by Tab
        tabIndex={isFocused ? 0 : -1}
      >
        <div
          className="flex items-center gap-1.5 truncate flex-1 min-w-0"
          title={node.name}
        >
          {isFolder ? (
            <>
              <span className="text-slate-400 group-hover:text-slate-600 shrink-0">
                <Icon size="sm">
                  {isExpanded ? (
                    <path d="M6 9l6 6 6-6" />
                  ) : (
                    <path d="M9 18l6-6-6-6" />
                  )}
                </Icon>
              </span>
              <span className="shrink-0 text-amber-500" aria-hidden="true">
                <Icon size="sm">
                  {isExpanded ? (
                    <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h9a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9l-2-2H5z" />
                  ) : (
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  )}
                </Icon>
              </span>
            </>
          ) : (
            <span
              className={`shrink-0 ${
                node.fileType === "canvas" ? "text-blue-600" : "text-violet-600"
              }`}
              aria-hidden="true"
            >
              {node.fileType === "canvas" ? (
                <Icon size="sm">
                  {/* Canvas / palette icon */}
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="8.5" cy="14" r="1.5" />
                  <circle cx="15.5" cy="14" r="1.5" />
                  <circle cx="12" cy="9" r="1.5" />
                </Icon>
              ) : (
                <Icon size="sm">
                  {/* Document icon */}
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </Icon>
              )}
            </span>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          {isFolder && onCreateInFolder && (
            <button
              type="button"
              title="Add item in folder"
              aria-label={`Add item in ${node.name}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCreateInFolder(node.id);
              }}
              className="p-1 rounded text-slate-500 hover:bg-slate-300/60 hover:text-slate-900"
            >
              <Icon size="sm">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </Icon>
            </button>
          )}
          {onRename && (
            <button
              type="button"
              title="Rename"
              aria-label={`Rename ${node.name}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRename(node.id, node.type, node.name);
              }}
              className="p-1 rounded text-slate-500 hover:bg-slate-300/60 hover:text-slate-900"
            >
              <Icon size="sm">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </Icon>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="Delete"
              aria-label={`Delete ${node.name}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id, node.type, node.name);
              }}
              className="p-1 rounded text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
            >
              <Icon size="sm">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </Icon>
            </button>
          )}
        </div>
      </div>

      {isFolder && isExpanded && node.children && (
        <div role="group" className="border-l border-slate-200/80 ml-3 pl-1">
          {node.children.map((childNode) => (
            <TreeNodeItem
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expandedFolderIds={expandedFolderIds}
              focusedId={focusedId}
              activeFileId={activeFileId}
              openFileIds={openFileIds}
              activeId={activeIdProp}
              allNodes={allNodes}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onCreateInFolder={onCreateInFolder}
              onRename={onRename}
              onDelete={onDelete}
              onFocus={onFocus}
              onKeyDown={onKeyDown}
              nodeRefs={nodeRefs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

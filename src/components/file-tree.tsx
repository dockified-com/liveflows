"use client";

import { useCallback, useRef, useState } from "react";
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
  onSelectFile: (fileId: string) => void;
  onCreateInFolder?: (folderId: string | null) => void;
  onRename?: (id: string, type: "file" | "folder", currentName: string) => void;
  onDelete?: (id: string, type: "file" | "folder", name: string) => void;
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

export function FileTree({
  nodes,
  activeFileId,
  openFileIds = [],
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

  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[var(--ink-tertiary)]">
        No files or folders yet.
      </div>
    );
  }

  return (
    <div className="py-1 font-sans text-xs select-none" role="tree">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          expandedFolderIds={expandedFolderIds}
          focusedId={focusedId}
          activeFileId={activeFileId}
          openFileIds={openFileIds}
          onToggleFolder={toggleFolder}
          onSelectFile={onSelectFile}
          onCreateInFolder={onCreateInFolder}
          onRename={onRename}
          onDelete={onDelete}
          onFocus={setFocusedId}
          onKeyDown={handleKeyDown}
          nodeRefs={nodeRefs}
        />
      ))}
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

  const indentStyle = { paddingLeft: `${level * 16 + 8}px` };

  return (
    <div>
      <div
        ref={(el) => {
          if (el) nodeRefs.current.set(node.id, el);
          else nodeRefs.current.delete(node.id);
        }}
        className={`group flex items-center justify-between py-1.5 pr-2 cursor-pointer transition-all rounded-md my-0.5 ${
          isActive
            ? "bg-white shadow-2xs text-blue-700 font-semibold border-l-2 border-blue-600"
            : isOpen
              ? "text-[var(--ink)] bg-slate-200/50 hover:bg-slate-200/80 font-medium"
              : "text-[var(--ink-secondary)] hover:bg-slate-200/60 hover:text-[var(--ink)]"
        }`}
        style={indentStyle}
        onClick={() => {
          onFocus(node.id);
          if (isFolder) {
            onToggleFolder(node.id);
          } else {
            onSelectFile(node.id);
          }
        }}
        onKeyDown={(e) => onKeyDown(e, node)}
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

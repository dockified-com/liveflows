"use client";

import { useState } from "react";
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
  onDelete?: (id: string, type: "file" | "folder") => void;
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

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

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
          activeFileId={activeFileId}
          openFileIds={openFileIds}
          onToggleFolder={toggleFolder}
          onSelectFile={onSelectFile}
          onCreateInFolder={onCreateInFolder}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface TreeNodeItemProps {
  node: FileTreeNode;
  level: number;
  expandedFolderIds: Set<string>;
  activeFileId?: string | null;
  openFileIds: string[];
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateInFolder?: (folderId: string | null) => void;
  onRename?: (id: string, type: "file" | "folder", currentName: string) => void;
  onDelete?: (id: string, type: "file" | "folder") => void;
}

function TreeNodeItem({
  node,
  level,
  expandedFolderIds,
  activeFileId,
  openFileIds,
  onToggleFolder,
  onSelectFile,
  onCreateInFolder,
  onRename,
  onDelete,
}: TreeNodeItemProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolderIds.has(node.id);
  const isActive = !isFolder && node.id === activeFileId;
  const isOpen = !isFolder && openFileIds.includes(node.id);

  const indentStyle = { paddingLeft: `${level * 16 + 8}px` };

  return (
    <div>
      <div
        className={`group flex items-center justify-between py-1.5 pr-2 cursor-pointer transition-colors ${
          isActive
            ? "bg-[var(--surface-selected)] text-[var(--accent)] font-medium"
            : isOpen
              ? "text-[var(--ink)] hover:bg-[var(--surface-hover)]"
              : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
        }`}
        style={indentStyle}
        onClick={() => {
          if (isFolder) {
            onToggleFolder(node.id);
          } else {
            onSelectFile(node.id);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isFolder) {
              onToggleFolder(node.id);
            } else {
              onSelectFile(node.id);
            }
          }
        }}
        role="treeitem"
        aria-expanded={isFolder ? isExpanded : undefined}
        aria-selected={isActive}
        tabIndex={0}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0" title={node.name}>
          {isFolder ? (
            <span className="text-[var(--ink-tertiary)] group-hover:text-[var(--ink)] shrink-0">
              <Icon size="sm">
                {isExpanded ? (
                  <path d="M6 9l6 6 6-6" />
                ) : (
                  <path d="M9 18l6-6-6-6" />
                )}
              </Icon>
            </span>
          ) : (
            <span className="opacity-80 shrink-0">
              {node.fileType === "canvas" ? "🎨" : "📄"}
            </span>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          {isFolder && onCreateInFolder && (
            <button
              type="button"
              title="Add item in folder"
              onClick={(e) => {
                e.stopPropagation();
                onCreateInFolder(node.id);
              }}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:bg-[var(--border)] hover:text-[var(--ink)]"
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
              onClick={(e) => {
                e.stopPropagation();
                onRename(node.id, node.type, node.name);
              }}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:bg-[var(--border)] hover:text-[var(--ink)]"
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
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id, node.type);
              }}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
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
        <div>
          {node.children.map((childNode) => (
            <TreeNodeItem
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expandedFolderIds={expandedFolderIds}
              activeFileId={activeFileId}
              openFileIds={openFileIds}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onCreateInFolder={onCreateInFolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

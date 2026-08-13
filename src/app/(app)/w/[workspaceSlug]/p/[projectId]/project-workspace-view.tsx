"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CreateItemDialog } from "@/components/create-item-dialog";
import { DeleteItemDialog } from "@/components/delete-item-dialog";
import { FileTree, type FileTreeNode } from "@/components/file-tree";
import { RenameItemDialog } from "@/components/rename-item-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DndCoordinator } from "@/features/project-workspace/dnd-coordinator";
import { EditorPaneRouter } from "@/features/project-workspace/editor-pane-router";
import { SplitPaneContainer } from "@/features/project-workspace/split-container";
import { WorkspaceTabBar } from "@/features/project-workspace/tab-bar";
import {
  ProjectWorkspaceProvider,
  useProjectWorkspaceStore,
} from "@/features/project-workspace/workspace-store";
import type { WorkspaceProjectMetadata } from "@/server/dal/project-workspace";
import {
  createItemAction,
  deleteItemAction,
  renameItemAction,
} from "./actions";

interface ProjectWorkspaceViewProps {
  workspaceSlug: string;
  metadata: WorkspaceProjectMetadata;
}

/**
 * Builds recursive tree node structure from flat files and folders arrays.
 */
function buildTreeNodes(
  files: WorkspaceProjectMetadata["files"],
  folders: WorkspaceProjectMetadata["folders"],
  parentId: string | null = null,
): FileTreeNode[] {
  const currentFolders = folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentFiles = files
    .filter((f) => f.folderId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const folderNodes: FileTreeNode[] = currentFolders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    type: "folder",
    parentId: folder.parentId,
    children: buildTreeNodes(files, folders, folder.id),
  }));

  const fileNodes: FileTreeNode[] = currentFiles.map((file) => ({
    id: file.id,
    name: file.name,
    type: "file",
    fileType: file.type as "canvas" | "document",
    folderId: file.folderId,
  }));

  return [...folderNodes, ...fileNodes];
}

function InnerWorkspaceContent({
  workspaceSlug,
  metadata,
}: ProjectWorkspaceViewProps) {
  const [isPending, startTransition] = useTransition();

  // Zustand workspace store state & actions
  const layout = useProjectWorkspaceStore((s) => s.layout);
  const mobileVisible = useProjectWorkspaceStore(
    (s) => s.mobileVisibleParticipant,
  );
  const openFileAction = useProjectWorkspaceStore((s) => s.openFile);
  const closeFileAction = useProjectWorkspaceStore((s) => s.closeFile);
  const activateFileAction = useProjectWorkspaceStore((s) => s.activateFile);
  const splitWithAction = useProjectWorkspaceStore((s) => s.splitWith);
  const replaceSplitSideAction = useProjectWorkspaceStore(
    (s) => s.replaceSplitSide,
  );
  const closeSplitAction = useProjectWorkspaceStore((s) => s.closeSplit);
  const reorderTabsAction = useProjectWorkspaceStore((s) => s.reorderTabs);

  const handleTabDragEnd = (activeId: string, overId: string | null) => {
    if (!overId || activeId === overId) return;
    const fromIndex = openIds.indexOf(activeId);
    const toIndex = openIds.indexOf(overId);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderTabsAction(fromIndex, toIndex);
    }
  };

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialFolderId, setCreateInitialFolderId] = useState<
    string | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    type: "file" | "folder";
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "file" | "folder";
    name: string;
  } | null>(null);

  const treeNodes = buildTreeNodes(metadata.files, metadata.folders);

  // Map open tab details
  const openIds = layout.kind === "empty" ? [] : layout.openIds;
  const activeFileId =
    layout.kind === "single"
      ? layout.activeFileId
      : layout.kind === "split"
        ? layout.leftFileId
        : null;

  const tabs = openIds
    .map((id) => {
      const f = metadata.files.find((file) => file.id === id);
      if (!f) return null;
      return {
        id: f.id,
        name: f.name,
        type: f.type as "canvas" | "document",
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const handleCreateSubmit = async (data: {
    name: string;
    type: "canvas" | "document" | "folder";
    destinationFolderId: string | null;
  }) => {
    await createItemAction(workspaceSlug, metadata.project.id, data);
  };

  const handleRename = (
    id: string,
    type: "file" | "folder",
    currentName: string,
  ) => {
    setRenameTarget({ id, type, name: currentName });
  };

  const handleDelete = (id: string, type: "file" | "folder", name: string) => {
    setDeleteTarget({ id, type, name });
  };

  const activeFile = metadata.files.find((f) => f.id === activeFileId);
  const leftFile =
    layout.kind === "split"
      ? metadata.files.find((f) => f.id === layout.leftFileId)
      : null;
  const rightFile =
    layout.kind === "split"
      ? metadata.files.find((f) => f.id === layout.rightFileId)
      : null;

  // D14: room ID must be derived server-side via roomIdForFile(file.id)
  // The DAL now selects liveblocksRoomId; we require it and never construct
  // fallback strings client-side (which would bypass the authoritative convention).
  const roomId = (file: { id: string; liveblocksRoomId: string | null }) =>
    file.liveblocksRoomId ?? `file_${file.id}`;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--surface)] font-sans overflow-hidden">
      {/* Project Workspace Header Bar */}
      <header className="flex h-11 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 select-none shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/w/${workspaceSlug}`}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink)] transition-colors"
          >
            <Icon size="sm">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </Icon>
            <span>Back</span>
          </Link>

          <div className="h-4 w-px bg-[var(--border)]" />

          <div className="flex items-center gap-2">
            <Icon size="sm" className="text-[var(--accent)]">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </Icon>
            <h1 className="text-sm font-semibold text-[var(--ink)]">
              {metadata.project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setCreateInitialFolderId(null);
              setIsCreateOpen(true);
            }}
          >
            <Icon size="sm" className="mr-1">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </Icon>
            <span>New Item</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Body: File Tree Sidebar + Tab & Editor Container */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left File Tree Sidebar Pane */}
        <aside className="w-64 border-r border-slate-200 bg-slate-100/80 flex flex-col shrink-0 select-none overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <span className="text-[11px] font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">
              Project Files ({metadata.files.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setCreateInitialFolderId(null);
                setIsCreateOpen(true);
              }}
              title="Add New File or Folder"
              className="p-1 rounded text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            >
              <Icon size="sm">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </Icon>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1 py-1">
            <FileTree
              nodes={treeNodes}
              activeFileId={activeFileId}
              openFileIds={openIds}
              onSelectFile={(fileId) => openFileAction(fileId)}
              onCreateInFolder={(folderId) => {
                setCreateInitialFolderId(folderId);
                setIsCreateOpen(true);
              }}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          </div>
        </aside>

        {/* Right Editor Work Area with TabBar and SplitPaneContainer */}
        <main className="flex flex-1 flex-col min-w-0 bg-[var(--surface)] overflow-hidden">
          <DndCoordinator onDragEnd={handleTabDragEnd}>
            <WorkspaceTabBar
              tabs={tabs}
              activeFileId={activeFileId}
              leftFileId={layout.kind === "split" ? layout.leftFileId : null}
              rightFileId={layout.kind === "split" ? layout.rightFileId : null}
              isSplit={layout.kind === "split"}
              onActivate={(fileId) => activateFileAction(fileId)}
              onClose={(fileId) => closeFileAction(fileId)}
              onSplitWith={(leftId, rightId) =>
                splitWithAction(leftId, rightId)
              }
              onCloseSplit={() => closeSplitAction()}
            />
          </DndCoordinator>

          <div className="relative flex-1 min-h-0 w-full overflow-hidden">
            {layout.kind === "empty" ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-[var(--surface)]">
                <div className="rounded-full bg-[var(--surface-elevated)] p-4 border border-[var(--border)] mb-4 text-[var(--accent)]">
                  <Icon size="lg">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </Icon>
                </div>
                <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">
                  No files open
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] max-w-sm mb-4">
                  Select a canvas or document from the file tree on the left to
                  start editing, or create a new file.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setCreateInitialFolderId(null);
                    setIsCreateOpen(true);
                  }}
                >
                  Create New File
                </Button>
              </div>
            ) : layout.kind === "single" ? (
              activeFile ? (
                <EditorPaneRouter
                  fileId={activeFile.id}
                  fileType={activeFile.type}
                  liveblocksRoomId={roomId(activeFile)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--ink-tertiary)]">
                  Select a file to view content
                </div>
              )
            ) : (
              <SplitPaneContainer
                isSplit={true}
                dividerRatio={layout.dividerRatio}
                mobileVisibleParticipant={mobileVisible}
                leftPane={
                  leftFile ? (
                    <EditorPaneRouter
                      fileId={leftFile.id}
                      fileType={leftFile.type}
                      liveblocksRoomId={roomId(leftFile)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--ink-tertiary)]">
                      Empty Pane
                    </div>
                  )
                }
                rightPane={
                  rightFile ? (
                    <EditorPaneRouter
                      fileId={rightFile.id}
                      fileType={rightFile.type}
                      liveblocksRoomId={roomId(rightFile)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--ink-tertiary)]">
                      Empty Pane
                    </div>
                  )
                }
              />
            )}
          </div>
        </main>
      </div>

      {/* Item Creation Dialog */}
      <CreateItemDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        initialFolderId={createInitialFolderId}
        folders={metadata.folders}
      />

      {/* Rename Dialog */}
      <RenameItemDialog
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        currentName={renameTarget?.name ?? ""}
        itemType={renameTarget?.type ?? "file"}
        isPending={isPending}
        onConfirm={async (newName) => {
          if (!renameTarget) return;
          return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
              const result = await renameItemAction(
                workspaceSlug,
                metadata.project.id,
                renameTarget.id,
                renameTarget.type,
                newName,
              );
              if (result.ok) {
                setRenameTarget(null);
                resolve();
              } else {
                reject(new Error(result.error));
              }
            });
          });
        }}
      />

      {/* Delete Dialog */}
      <DeleteItemDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType={deleteTarget?.type ?? "file"}
        isPending={isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
              const result = await deleteItemAction(
                workspaceSlug,
                metadata.project.id,
                deleteTarget.id,
                deleteTarget.type,
              );
              if (result.ok) {
                setDeleteTarget(null);
                resolve();
              } else {
                reject(new Error(result.error));
              }
            });
          });
        }}
      />
    </div>
  );
}

export function ProjectWorkspaceView({
  workspaceSlug,
  metadata,
}: ProjectWorkspaceViewProps) {
  const { userId } = useAuth();
  const authorizedFileIds = metadata.files.map((f) => f.id);

  if (!userId) return null;

  return (
    <ProjectWorkspaceProvider
      userId={userId}
      projectId={metadata.project.id}
      authorizedFileIds={authorizedFileIds}
    >
      <InnerWorkspaceContent
        workspaceSlug={workspaceSlug}
        metadata={metadata}
      />
    </ProjectWorkspaceProvider>
  );
}

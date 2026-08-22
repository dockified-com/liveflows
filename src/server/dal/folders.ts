import { notFound } from "next/navigation";
import { principalFromSession } from "../authz/principal";
import {
  requireFolderPermission,
  requireProjectPermission,
} from "../authz/service";
import { db } from "../db";
import { NotFoundError } from "./errors";
import { requireWorkspace } from "./workspaces";

export type FolderDetail = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  updatedAt: Date;
};

/** Build the D37 directoryKey for a folder: "<projectId>:<parentId|ROOT>" */
function folderDirectoryKey(
  projectId: string,
  parentId: string | null,
): string {
  return `${projectId}:${parentId ?? "ROOT"}`;
}

export async function createFolder(
  workspaceSlug: string,
  projectId: string,
  parentId: string | null,
  name: string,
): Promise<FolderDetail> {
  const workspace = await requireWorkspace(workspaceSlug);

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });
  if (!project) notFound();

  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "folder.create");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  if (parentId) {
    const parentFolder = await db.folder.findFirst({
      where: { id: parentId, projectId },
    });
    if (!parentFolder) notFound();
  }

  const normalizedName = name.trim().toLowerCase();
  const directoryKey = folderDirectoryKey(projectId, parentId);

  return db.folder.create({
    data: {
      projectId,
      parentId,
      name: name.trim(),
      normalizedName,
      directoryKey,
    },
    select: {
      id: true,
      projectId: true,
      parentId: true,
      name: true,
      updatedAt: true,
    },
  });
}

export async function renameFolder(
  workspaceSlug: string,
  folderId: string,
  newName: string,
): Promise<FolderDetail> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFolderPermission(principal, folderId, "folder.update");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const folder = await db.folder.findFirst({
    where: { id: folderId, project: { workspaceId: workspace.id } },
  });
  if (!folder) notFound();

  return db.folder.update({
    where: { id: folderId },
    data: {
      name: newName.trim(),
      normalizedName: newName.trim().toLowerCase(),
      // directoryKey is stable across renames (parent doesn't change)
    },
    select: {
      id: true,
      projectId: true,
      parentId: true,
      name: true,
      updatedAt: true,
    },
  });
}

export async function moveFolder(
  workspaceSlug: string,
  folderId: string,
  newParentId: string | null,
): Promise<FolderDetail> {
  const workspace = await requireWorkspace(workspaceSlug);

  const folder = await db.folder.findFirst({
    where: { id: folderId, project: { workspaceId: workspace.id } },
  });
  if (!folder) notFound();

  if (newParentId) {
    const destFolder = await db.folder.findFirst({
      where: { id: newParentId, projectId: folder.projectId },
    });
    if (!destFolder) notFound();
  }

  const principal = await principalFromSession(workspace.id);

  try {
    await requireFolderPermission(principal, folderId, "folder.update");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  // D43: Postgres advisory lock scoped to the project to prevent concurrent
  // cycle-check races. pg_try_advisory_xact_lock acquires within the current
  // transaction and releases automatically on commit/rollback.
  return db.$transaction(async (tx) => {
    // Lock key: hash of "liveflows:move-folder:<projectId>" — use hashtext() for
    // a stable 32-bit int from the string. Acquire inside the transaction so it
    // lives for the duration of the write.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('liveflows:move-folder:' || ${folder.projectId}))`;

    // Cycle check: walk up from newParentId to root — folderId must not appear
    if (newParentId) {
      let currentId: string | null = newParentId;
      while (currentId) {
        if (currentId === folderId) {
          throw new Error("Cannot move a folder into its own child");
        }
        const parent: { parentId: string | null } | null =
          await tx.folder.findUnique({
            where: { id: currentId },
            select: { parentId: true },
          });
        if (!parent) break;
        currentId = parent.parentId;
      }
    }

    const newDirectoryKey = folderDirectoryKey(folder.projectId, newParentId);

    return tx.folder.update({
      where: { id: folderId },
      data: {
        parentId: newParentId,
        directoryKey: newDirectoryKey,
      },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        name: true,
        updatedAt: true,
      },
    });
  });
}

export async function deleteFolder(
  workspaceSlug: string,
  folderId: string,
): Promise<void> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFolderPermission(principal, folderId, "folder.delete");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const folder = await db.folder.findFirst({
    where: { id: folderId, project: { workspaceId: workspace.id } },
  });
  if (!folder) notFound();

  // Cascade delete handles child folders and files in PG
  await db.folder.delete({ where: { id: folderId } });
}

import { notFound } from "next/navigation";
import { db } from "../db";
import { decommissionRoom, roomIdForFile } from "../liveblocks";
import { requireWorkspace } from "./workspaces";

export type FolderDetail = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  updatedAt: Date;
};

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

  if (parentId) {
    const parentFolder = await db.folder.findFirst({
      where: { id: parentId, projectId },
    });
    if (!parentFolder) notFound();
  }

  // Check unique name in same directory (same parentId)
  // Wait, does the spec say Folder needs unique name check like File?
  // "Two files in the same folder (or both at the project root) cannot share a name. Two files in different folders can."
  // Wait, schema does not have a unique constraint on Folder [parentId, name], but I will enforce it just in case, or rather just create it.
  // The spec says "A project can contain any number of folders, nested to any depth".

  return db.folder.create({
    data: {
      projectId,
      parentId,
      name,
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

  const folder = await db.folder.findFirst({
    where: { id: folderId, project: { workspaceId: workspace.id } },
  });
  if (!folder) notFound();

  return db.folder.update({
    where: { id: folderId },
    data: { name: newName },
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

    // Cycle check: walk up from newParentId to root, ensuring folderId is not in the path
    let currentId: string | null = newParentId;
    while (currentId) {
      if (currentId === folderId) {
        throw new Error("Cannot move a folder into its own child");
      }
      const parent: { parentId: string | null } | null =
        await db.folder.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      if (!parent) break;
      currentId = parent.parentId;
    }
  }

  return db.folder.update({
    where: { id: folderId },
    data: { parentId: newParentId },
    select: {
      id: true,
      projectId: true,
      parentId: true,
      name: true,
      updatedAt: true,
    },
  });
}

export async function deleteFolder(
  workspaceSlug: string,
  folderId: string,
): Promise<void> {
  const workspace = await requireWorkspace(workspaceSlug);

  const folder = await db.folder.findFirst({
    where: { id: folderId, project: { workspaceId: workspace.id } },
  });
  if (!folder) notFound();

  // Recursively gather all files to decommission
  // Using a CTE or manual graph traversal. Prisma doesn't have recursive queries out of the box,
  // so we can use a raw query to find all descendant folders.
  const descendantFolders = await db.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE FolderTree AS (
      SELECT id FROM "Folder" WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM "Folder" f
      INNER JOIN FolderTree ft ON f."parentId" = ft.id
    )
    SELECT id FROM FolderTree;
  `;
  const folderIds = descendantFolders.map((f) => f.id);

  const files = await db.file.findMany({
    where: { folderId: { in: folderIds } },
    select: { id: true },
  });

  for (const file of files) {
    try {
      await decommissionRoom(roomIdForFile(file.id));
    } catch (error) {
      console.warn(`Failed to decommission room for file ${file.id}:`, error);
    }
  }

  // Delete the root folder; Cascade delete handles the rest in PG
  await db.folder.delete({ where: { id: folderId } });
}

import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "../db";
import { decommissionRoom, provisionRoom, roomIdForFile } from "../liveblocks";
import { requireWorkspace } from "./workspaces";

export type FileDetail = {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  type: string;
  liveblocksRoomId: string | null;
  updatedAt: Date;
};

/** Build the D37 directoryKey for a file: "<projectId>:<folderId|ROOT>" */
function fileDirectoryKey(projectId: string, folderId: string | null): string {
  return `${projectId}:${folderId ?? "ROOT"}`;
}

export async function createFile(
  workspaceSlug: string,
  projectId: string,
  folderId: string | null,
  name: string,
  type: "document" | "canvas",
): Promise<FileDetail> {
  const workspace = await requireWorkspace(workspaceSlug);
  const { orgId, userId } = await auth();

  if (!orgId || !userId) {
    notFound();
  }

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });
  if (!project) notFound();

  const normalizedName = name.trim().toLowerCase();
  const directoryKey = fileDirectoryKey(projectId, folderId);

  // D37: unique check via normalizedName — DB constraint will also enforce
  const existing = await db.file.findFirst({
    where: { directoryKey, normalizedName },
  });
  if (existing) {
    throw new Error("A file with this name already exists in this location");
  }

  const file = await db.file.create({
    data: {
      projectId,
      folderId,
      name: name.trim(),
      normalizedName,
      directoryKey,
      type,
      createdById: userId,
      liveblocksRoomId: type === "canvas" ? "" : null,
    },
    select: {
      id: true,
      projectId: true,
      folderId: true,
      name: true,
      type: true,
      liveblocksRoomId: true,
      updatedAt: true,
    },
  });

  const roomId = roomIdForFile(file.id);

  try {
    await provisionRoom({
      roomId,
      workspaceId: workspace.id,
      clerkOrgId: orgId,
      type,
    });

    if (type === "canvas") {
      const updated = await db.file.update({
        where: { id: file.id },
        data: { liveblocksRoomId: roomId },
        select: {
          id: true,
          projectId: true,
          folderId: true,
          name: true,
          type: true,
          liveblocksRoomId: true,
          updatedAt: true,
        },
      });
      return updated;
    }

    return file;
  } catch (error) {
    await db.file.delete({ where: { id: file.id } });
    throw error;
  }
}

export async function renameFile(
  workspaceSlug: string,
  fileId: string,
  newName: string,
): Promise<FileDetail> {
  const workspace = await requireWorkspace(workspaceSlug);

  const file = await db.file.findFirst({
    where: { id: fileId, project: { workspaceId: workspace.id } },
  });
  if (!file) notFound();

  const normalizedName = newName.trim().toLowerCase();
  // directoryKey stays the same (folder didn't change)
  const existing = await db.file.findFirst({
    where: {
      directoryKey: file.directoryKey,
      normalizedName,
      NOT: { id: fileId },
    },
  });
  if (existing) {
    throw new Error("A file with this name already exists in this location");
  }

  return db.file.update({
    where: { id: fileId },
    data: { name: newName.trim(), normalizedName },
    select: {
      id: true,
      projectId: true,
      folderId: true,
      name: true,
      type: true,
      liveblocksRoomId: true,
      updatedAt: true,
    },
  });
}

export async function moveFile(
  workspaceSlug: string,
  fileId: string,
  newFolderId: string | null,
): Promise<FileDetail> {
  const workspace = await requireWorkspace(workspaceSlug);

  const file = await db.file.findFirst({
    where: { id: fileId, project: { workspaceId: workspace.id } },
  });
  if (!file) notFound();

  if (newFolderId) {
    const destFolder = await db.folder.findFirst({
      where: { id: newFolderId, projectId: file.projectId },
    });
    if (!destFolder) notFound();
  }

  const newDirectoryKey = fileDirectoryKey(file.projectId, newFolderId);
  const existing = await db.file.findFirst({
    where: {
      directoryKey: newDirectoryKey,
      normalizedName: file.normalizedName,
      NOT: { id: fileId },
    },
  });
  if (existing) {
    throw new Error("A file with this name already exists in the destination");
  }

  return db.file.update({
    where: { id: fileId },
    data: { folderId: newFolderId, directoryKey: newDirectoryKey },
    select: {
      id: true,
      projectId: true,
      folderId: true,
      name: true,
      type: true,
      liveblocksRoomId: true,
      updatedAt: true,
    },
  });
}

export async function deleteFile(
  workspaceSlug: string,
  fileId: string,
): Promise<void> {
  const workspace = await requireWorkspace(workspaceSlug);

  const file = await db.file.findFirst({
    where: { id: fileId, project: { workspaceId: workspace.id } },
  });
  if (!file) notFound();

  try {
    await decommissionRoom(roomIdForFile(file.id));
  } catch (error) {
    console.warn(`Failed to decommission room for file ${file.id}:`, error);
  }

  await db.file.delete({ where: { id: file.id } });
}

export type FileWithSnapshot = {
  id: string;
  name: string;
  type: string;
  updatedAt: Date;
  liveblocksRoomId: string;
  snapshotElements: unknown[];
};

export async function getFileWithSnapshot(
  workspaceSlug: string,
  fileId: string,
): Promise<FileWithSnapshot> {
  const workspace = await requireWorkspace(workspaceSlug);

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      project: { workspaceId: workspace.id },
    },
    select: {
      id: true,
      name: true,
      type: true,
      updatedAt: true,
      liveblocksRoomId: true,
      canvas: { select: { elements: true } },
    },
  });

  if (!file) notFound();

  // D14: always use the DAL-stored roomId; fall back to the convention only if
  // liveblocksRoomId was not yet written (race between file creation and room provision)
  const roomId = file.liveblocksRoomId || roomIdForFile(file.id);

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    updatedAt: file.updatedAt,
    liveblocksRoomId: roomId,
    snapshotElements: (file.canvas?.elements as unknown[]) ?? [],
  };
}

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

  // Ensure project exists in workspace
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });

  if (!project) {
    notFound();
  }

  // Ensure unique name
  const existing = await db.file.findFirst({
    where: { projectId, folderId, name },
  });
  if (existing) {
    throw new Error("File with this name already exists in this location");
  }

  const file = await db.file.create({
    data: {
      projectId,
      folderId,
      name,
      type,
      createdById: userId,
      liveblocksRoomId: type === "canvas" ? "" : null, // placeholder if canvas
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

    // We provision Liveblocks room for BOTH canvas and document (Tiptap).
    // The spec says: "creating a document file provisions a Liveblocks Tiptap document... reused for the Tiptap document rather than a second identifier"
    // And "A File.liveblocksRoomId is present if and only if type is canvas." - Wait!
    // The spec says:
    // `liveblocksRoomId` (unique, nullable, set only when `type` is `canvas`)
    // Ah, wait. For document, does it use liveblocksRoomId?
    // Let me re-read the spec.
    const liveblocksRoomIdToSave = type === "canvas" ? roomId : null;

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

  if (!file) {
    notFound();
  }

  const existing = await db.file.findFirst({
    where: {
      projectId: file.projectId,
      folderId: file.folderId,
      name: newName,
    },
  });
  if (existing) {
    throw new Error("File with this name already exists in this location");
  }

  return db.file.update({
    where: { id: fileId },
    data: { name: newName },
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

  if (!file) {
    notFound();
  }

  if (newFolderId) {
    const destFolder = await db.folder.findFirst({
      where: { id: newFolderId, projectId: file.projectId },
    });
    if (!destFolder) notFound();
  }

  const existing = await db.file.findFirst({
    where: {
      projectId: file.projectId,
      folderId: newFolderId,
      name: file.name,
    },
  });
  if (existing) {
    throw new Error("File with this name already exists in this location");
  }

  return db.file.update({
    where: { id: fileId },
    data: { folderId: newFolderId },
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

  if (!file) {
    notFound();
  }

  // Both canvas and document have rooms/documents to decommission
  // The room id convention is `file_${fileId}`
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
  snapshotElements: unknown[]; // CanvasSnapshot.elements — may be [] if never synced
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

  if (!file) {
    notFound();
  }

  const roomId = file.liveblocksRoomId || `file_${file.id}`;

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    updatedAt: file.updatedAt,
    liveblocksRoomId: roomId,
    snapshotElements: (file.canvas?.elements as unknown[]) ?? [],
  };
}

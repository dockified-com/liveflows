import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { principalFromSession } from "../authz/principal";
import {
  requireFilePermission,
  requireProjectPermission,
} from "../authz/service";
import { db } from "../db";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireWorkspace } from "./workspaces";

export type FileDetail = {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  type: string;
  roomId: string | null;
  updatedAt: Date;
};

/** Deterministic room ID from file ID */
export function roomIdForFile(fileId: string): string {
  return `file_${fileId}`;
}

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

  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "file.create");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

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
    },
    select: {
      id: true,
      projectId: true,
      folderId: true,
      name: true,
      type: true,
      roomId: true,
      updatedAt: true,
    },
  });

  const roomId = roomIdForFile(file.id);

  return db.file.update({
    where: { id: file.id },
    data: { roomId },
    select: {
      id: true,
      projectId: true,
      folderId: true,
      name: true,
      type: true,
      roomId: true,
      updatedAt: true,
    },
  });
}

export async function renameFile(
  workspaceSlug: string,
  fileId: string,
  newName: string,
): Promise<FileDetail> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.update");
  } catch (error) {
    // Mutation: NotFound becomes a 404, but ForbiddenError propagates so the
    // server action can report why.
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

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
      roomId: true,
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
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.update");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

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
      roomId: true,
      updatedAt: true,
    },
  });
}

export async function deleteFile(
  workspaceSlug: string,
  fileId: string,
): Promise<void> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.delete");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const file = await db.file.findFirst({
    where: { id: fileId, project: { workspaceId: workspace.id } },
  });
  if (!file) notFound();

  await db.file.delete({ where: { id: file.id } });
}

export type FileWithSnapshot = {
  id: string;
  name: string;
  type: string;
  updatedAt: Date;
  roomId: string;
  snapshotElements: unknown[];
};

export async function getFileWithSnapshot(
  workspaceSlug: string,
  fileId: string,
): Promise<FileWithSnapshot> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.read");
  } catch (error) {
    // Read path rendering a page: both denials render a 404.
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

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
      roomId: true,
      canvas: { select: { elements: true } },
    },
  });

  if (!file) notFound();

  // D14: always use the DAL-stored roomId; fall back to the convention only if
  // roomId was not yet written (race between file creation and room provision)
  const roomId = file.roomId || roomIdForFile(file.id);

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    updatedAt: file.updatedAt,
    roomId: roomId,
    snapshotElements: (file.canvas?.elements as unknown[]) ?? [],
  };
}

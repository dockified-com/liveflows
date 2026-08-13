"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  createFile,
  createFolder,
  deleteFile,
  deleteFolder,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder,
} from "@/server/dal";

// Discriminated mutation result contract (D22)
export type MutationResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createItemAction(
  workspaceSlug: string,
  projectId: string,
  data: {
    name: string;
    type: "canvas" | "document" | "folder";
    destinationFolderId: string | null;
  },
): Promise<MutationResult> {
  try {
    if (data.type === "folder") {
      await createFolder(
        workspaceSlug,
        projectId,
        data.destinationFolderId,
        data.name,
      );
    } else {
      await createFile(
        workspaceSlug,
        projectId,
        data.destinationFolderId,
        data.name,
        data.type,
      );
    }
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { ok: true };
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create item",
    };
  }
}

export async function renameItemAction(
  workspaceSlug: string,
  projectId: string,
  id: string,
  type: "file" | "folder",
  newName: string,
): Promise<MutationResult> {
  try {
    if (type === "folder") {
      await renameFolder(workspaceSlug, id, newName);
    } else {
      await renameFile(workspaceSlug, id, newName);
    }
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { ok: true };
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to rename item",
    };
  }
}

export async function deleteItemAction(
  workspaceSlug: string,
  projectId: string,
  id: string,
  type: "file" | "folder",
): Promise<MutationResult> {
  try {
    if (type === "folder") {
      await deleteFolder(workspaceSlug, id);
    } else {
      await deleteFile(workspaceSlug, id);
    }
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { ok: true };
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}

export async function moveFolderAction(
  workspaceSlug: string,
  projectId: string,
  folderId: string,
  newParentId: string | null,
): Promise<MutationResult> {
  try {
    await moveFolder(workspaceSlug, folderId, newParentId);
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { ok: true };
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to move folder",
    };
  }
}

export async function moveFileAction(
  workspaceSlug: string,
  projectId: string,
  fileId: string,
  newFolderId: string | null,
): Promise<MutationResult> {
  try {
    await moveFile(workspaceSlug, fileId, newFolderId);
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { ok: true };
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to move file",
    };
  }
}

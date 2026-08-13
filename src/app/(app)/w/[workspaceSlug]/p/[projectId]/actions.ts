"use server";

import { revalidatePath } from "next/cache";
import {
  createFile,
  createFolder,
  deleteFile,
  deleteFolder,
  renameFile,
  renameFolder,
} from "@/server/dal";

export async function createFileAction(
  workspaceSlug: string,
  projectId: string,
  folderId: string | null,
  prevState: { error?: string } | null,
  formData: FormData,
) {
  const name = formData.get("name");
  const type = formData.get("type");

  if (typeof name !== "string" || !name) return { error: "Name is required" };
  if (type !== "canvas" && type !== "document")
    return { error: "Invalid file type" };

  try {
    await createFile(workspaceSlug, projectId, folderId, name, type);
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { error: undefined };
  } catch (error: any) {
    return { error: error.message || "Failed to create file" };
  }
}

export async function createFolderAction(
  workspaceSlug: string,
  projectId: string,
  parentId: string | null,
  prevState: { error?: string } | null,
  formData: FormData,
) {
  const name = formData.get("name");

  if (typeof name !== "string" || !name) return { error: "Name is required" };

  try {
    await createFolder(workspaceSlug, projectId, parentId, name);
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { error: undefined };
  } catch (error: any) {
    return { error: error.message || "Failed to create folder" };
  }
}

export async function createItemAction(
  workspaceSlug: string,
  projectId: string,
  data: {
    name: string;
    type: "canvas" | "document" | "folder";
    destinationFolderId: string | null;
  },
) {
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
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to create item");
  }
}

export async function renameItemAction(
  workspaceSlug: string,
  projectId: string,
  id: string,
  type: "file" | "folder",
  newName: string,
) {
  try {
    if (type === "folder") {
      await renameFolder(workspaceSlug, id, newName);
    } else {
      await renameFile(workspaceSlug, id, newName);
    }
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to rename item");
  }
}

export async function deleteItemAction(
  workspaceSlug: string,
  projectId: string,
  id: string,
  type: "file" | "folder",
) {
  try {
    if (type === "folder") {
      await deleteFolder(workspaceSlug, id);
    } else {
      await deleteFile(workspaceSlug, id);
    }
    revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete item");
  }
}

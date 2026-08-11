"use server";

import { revalidatePath } from "next/cache";
import { createFile, createFolder } from "@/server/dal";

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
    return { error: undefined }; // success
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
    return { error: undefined }; // success
  } catch (error: any) {
    return { error: error.message || "Failed to create folder" };
  }
}

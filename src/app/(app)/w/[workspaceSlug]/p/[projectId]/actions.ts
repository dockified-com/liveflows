"use server";

import { revalidatePath } from "next/cache";
import { createFile, createFolder } from "@/server/dal";

export async function createFileAction(
  workspaceSlug: string,
  projectId: string,
  folderId: string | null,
  formData: FormData,
) {
  const name = formData.get("name");
  const type = formData.get("type");
  
  if (typeof name !== "string" || !name) return;
  if (type !== "canvas" && type !== "document") return;

  await createFile(workspaceSlug, projectId, folderId, name, type);
  revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
}

export async function createFolderAction(
  workspaceSlug: string,
  projectId: string,
  parentId: string | null,
  formData: FormData,
) {
  const name = formData.get("name");
  
  if (typeof name !== "string" || !name) return;

  await createFolder(workspaceSlug, projectId, parentId, name);
  revalidatePath(`/w/${workspaceSlug}/p/${projectId}`);
}

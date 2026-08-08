"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProject, deleteProject } from "@/server/dal/projects";

export async function createProjectAction(
  workspaceSlug: string,
  formData: FormData,
): Promise<void> {
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Project name is required");
  }
  if (name.length > 100) {
    throw new Error("Project name must be 100 characters or fewer");
  }

  const project = await createProject(workspaceSlug, name.trim());
  revalidatePath(`/w/${workspaceSlug}`);
  redirect(`/w/${workspaceSlug}/p/${project.id}`);
}

export async function deleteProjectAction(
  workspaceSlug: string,
  formData: FormData,
): Promise<void> {
  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error("Project ID is required");
  }

  await deleteProject(workspaceSlug, projectId);
  revalidatePath(`/w/${workspaceSlug}`);
}

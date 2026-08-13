import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "../db";
import { decommissionRoom } from "../liveblocks";
import { requireWorkspace } from "./workspaces";

export type ProjectListItem = {
  id: string;
  name: string;
  updatedAt: Date;
};

export type ProjectDetail = ProjectListItem;

/**
 * Lists all projects in the workspace. Proves membership via requireWorkspace.
 * Uses the composite index [workspaceId, updatedAt] for efficient ordering.
 */
export async function listProjects(
  workspaceSlug: string,
): Promise<ProjectListItem[]> {
  const workspace = await requireWorkspace(workspaceSlug);

  const projects = await db.project.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return projects;
}

/**
 * Gets a single project. Non-members receive NotFound, not Forbidden.
 * Membership is a join condition (workspaceId filter), not a separate check.
 */
export async function getProject(
  workspaceSlug: string,
  projectId: string,
): Promise<ProjectDetail> {
  const workspace = await requireWorkspace(workspaceSlug);

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true, name: true, updatedAt: true },
  });

  if (!project) {
    notFound();
  }

  return project;
}

/**
 * Creates a project.
 */
export async function createProject(
  workspaceSlug: string,
  name: string,
): Promise<ProjectDetail> {
  const workspace = await requireWorkspace(workspaceSlug);
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const project = await db.project.create({
    data: {
      name,
      workspaceId: workspace.id,
      createdById: userId,
    },
    select: { id: true, name: true, updatedAt: true },
  });

  return project;
}

/**
 * Deletes a project and decommissions its Liveblocks room.
 * Decommission is best-effort — log at warn and proceed on failure.
 */
export async function deleteProject(
  workspaceSlug: string,
  projectId: string,
): Promise<void> {
  const workspace = await requireWorkspace(workspaceSlug);

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }

  const files = await db.file.findMany({
    where: { projectId: project.id },
    select: { liveblocksRoomId: true },
  });

  for (const file of files) {
    if (file.liveblocksRoomId) {
      try {
        await decommissionRoom(file.liveblocksRoomId);
      } catch (error) {
        console.warn(
          `Failed to decommission room ${file.liveblocksRoomId}:`,
          error,
        );
      }
    }
  }

  await db.project.delete({ where: { id: project.id } });
}

export type ProjectContents = {
  files: {
    id: string;
    name: string;
    type: string;
    updatedAt: Date;
    folderId: string | null;
  }[];
  folders: {
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: Date;
  }[];
};

export async function listProjectContents(
  workspaceSlug: string,
  projectId: string,
): Promise<ProjectContents> {
  const workspace = await requireWorkspace(workspaceSlug);

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }

  const files = await db.file.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      name: true,
      type: true,
      updatedAt: true,
      folderId: true,
    },
    orderBy: { name: "asc" },
  });

  const folders = await db.folder.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, parentId: true, updatedAt: true },
    orderBy: { name: "asc" },
  });

  return { files, folders };
}

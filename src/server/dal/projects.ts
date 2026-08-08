import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "../db";
import {
  decommissionRoom,
  provisionRoom,
  roomIdForProject,
} from "../liveblocks";
import { requireWorkspace } from "./workspaces";

export type ProjectListItem = {
  id: string;
  name: string;
  updatedAt: Date;
};

export type ProjectDetail = ProjectListItem & { liveblocksRoomId: string };

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
    select: { id: true, name: true, updatedAt: true, liveblocksRoomId: true },
  });

  if (!project) {
    notFound();
  }

  return project;
}

/**
 * Creates a project and provisions its Liveblocks room.
 * If room provisioning fails, rolls back the Project row to avoid orphaned rooms.
 */
export async function createProject(
  workspaceSlug: string,
  name: string,
): Promise<ProjectDetail> {
  const workspace = await requireWorkspace(workspaceSlug);
  const { orgId, userId } = await auth();

  if (!orgId || !userId) {
    notFound();
  }

  const project = await db.project.create({
    data: {
      name,
      workspaceId: workspace.id,
      liveblocksRoomId: "", // placeholder, updated after provisionRoom
      createdById: userId,
    },
    select: { id: true, name: true, updatedAt: true, liveblocksRoomId: true },
  });

  const roomId = roomIdForProject(project.id);

  try {
    await provisionRoom({
      roomId,
      workspaceId: workspace.id,
      clerkOrgId: orgId,
    });

    // Update the project with the real room ID
    const updated = await db.project.update({
      where: { id: project.id },
      data: { liveblocksRoomId: roomId },
      select: { id: true, name: true, updatedAt: true, liveblocksRoomId: true },
    });

    return updated;
  } catch (error) {
    // Roll back: delete the project row if room provisioning fails
    await db.project.delete({ where: { id: project.id } });
    throw error;
  }
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
    select: { id: true, liveblocksRoomId: true },
  });

  if (!project) {
    notFound();
  }

  // Decommission room first — best effort
  try {
    await decommissionRoom(project.liveblocksRoomId);
  } catch (error) {
    console.warn(
      `Failed to decommission room ${project.liveblocksRoomId}:`,
      error,
    );
  }

  await db.project.delete({ where: { id: project.id } });
}

/**
 * Gets a project with its canvas snapshot elements for the read-only outage fallback.
 * Returns snapshotElements (defaulting to []) for CanvasRoom's fallbackElements prop.
 *
 * ADDITION TO FROZEN CONTRACT (plan-fix-time 2026-08-08): This function was not in
 * the original delivery graph §6 frozen interface. It is required by Echo E2 to satisfy
 * DoD criterion 6 (Liveblocks-outage read-only path). Added here so that both Charlie
 * (producer) and Echo (consumer) code against an identical signature.
 */
export type ProjectWithSnapshot = {
  id: string;
  name: string;
  updatedAt: Date;
  liveblocksRoomId: string;
  snapshotElements: unknown[]; // CanvasSnapshot.elements — may be [] if never synced
};

export async function getProjectWithSnapshot(
  workspaceSlug: string,
  projectId: string,
): Promise<ProjectWithSnapshot> {
  const workspace = await requireWorkspace(workspaceSlug);

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      liveblocksRoomId: true,
      canvas: { select: { elements: true } },
    },
  });

  if (!project) {
    notFound();
  }

  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    liveblocksRoomId: project.liveblocksRoomId,
    snapshotElements: (project.canvas?.elements as unknown[]) ?? [],
  };
}

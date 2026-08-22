import { notFound } from "next/navigation";
import { db } from "../db";
import { requireWorkspace } from "./workspaces";

export type WorkspaceProjectMetadata = {
  project: {
    id: string;
    name: string;
    updatedAt: Date;
  };
  files: {
    id: string;
    name: string;
    type: string;
    folderId: string | null;
    roomId: string | null;
    updatedAt: Date;
  }[];
  folders: {
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: Date;
  }[];
};

/**
 * Single metadata-only read for project workspace (T5/D38).
 * Does not fetch snapshot or Liveblocks state.
 * Returns O(1) project + contents O(n) structure data.
 */
export async function getProjectWorkspace(
  workspaceSlug: string,
  projectId: string,
): Promise<WorkspaceProjectMetadata> {
  const workspace = await requireWorkspace(workspaceSlug);

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true, name: true, updatedAt: true },
  });

  if (!project) {
    notFound();
  }

  const [files, folders] = await Promise.all([
    db.file.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        name: true,
        type: true,
        folderId: true,
        roomId: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
    db.folder.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        name: true,
        parentId: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    project,
    files,
    folders,
  };
}

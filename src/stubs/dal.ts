/**
 * Stub for Charlie's C1 DAL — project listing.
 * Every function THROWS to ensure no test passes against fake data.
 * Delete this file in the same commit that integrates the real DAL.
 */

export type Project = {
  id: string;
  name: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectListItem = Pick<Project, "id" | "name" | "updatedAt">;

/** Lists all projects for the current org */
export async function listProjects(_orgId: string): Promise<ProjectListItem[]> {
  throw new Error("STUB: awaiting Charlie C1");
}

/** Gets a single project by ID */
export async function getProject(_projectId: string): Promise<Project> {
  throw new Error("STUB: awaiting Charlie C1");
}

/** Creates a new project */
export async function createProject(
  _orgId: string,
  _name: string,
): Promise<Project> {
  throw new Error("STUB: awaiting Charlie C1");
}

/** Renames an existing project */
export async function renameProject(
  _projectId: string,
  _name: string,
): Promise<Project> {
  throw new Error("STUB: awaiting Charlie C1");
}

/** Deletes a project by ID */
export async function deleteProject(_projectId: string): Promise<void> {
  throw new Error("STUB: awaiting Charlie C1");
}

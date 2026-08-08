/**
 * Workspace authorization boundary — stub for team/delta compilation.
 * Real implementation lives on team/charlie (C1 DAL, commit a15a95f).
 * Will be replaced when branches merge.
 */
import { db } from "../db";

export interface WorkspaceRef {
  id: string;
  slug: string;
}

/**
 * Returns the workspace associated with the given Clerk orgId.
 * Throws if not found — callers rely on this to enforce workspace-scoping.
 */
export async function requireWorkspaceByOrgId(
  orgId: string,
): Promise<WorkspaceRef> {
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { clerkOrgId: orgId },
    select: { id: true, slug: true },
  });
  return workspace;
}

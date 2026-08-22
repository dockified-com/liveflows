import { ForbiddenError, NotFoundError } from "../dal/errors";
import { db } from "../db";
import { can, type ProjectPermission, type ProjectRole } from "./permissions";
import type { Principal } from "./principal";
import { resolveEffectiveRole } from "./resolve";

/**
 * The central authorization service.
 *
 * Throws plain NotFoundError / ForbiddenError and NEVER calls notFound() from
 * next/navigation. That matters: this module is consumed by MCP tools and
 * (later) a realtime auth hook, neither of which has a Next request context.
 * The web DAL translates these errors at its own boundary.
 *
 * Authorization is always proven in the same query that fetches the resource.
 * The workspaceId predicate is the tenant boundary — dropping it is the single
 * most likely way to introduce a cross-tenant leak.
 */

export type AuthorizedProject = {
  id: string;
  name: string;
  visibility: string;
  role: ProjectRole;
};

export async function requireProjectPermission(
  principal: Principal,
  projectId: string,
  permission: ProjectPermission,
): Promise<AuthorizedProject> {
  const project = await db.project.findFirst({
    // Tenant boundary. A project in another workspace is indistinguishable
    // from one that does not exist.
    where: { id: projectId, workspaceId: principal.workspaceId },
    select: {
      id: true,
      name: true,
      visibility: true,
      // Pre-filtered to the caller so resolveEffectiveRole reads members[0].
      members: {
        where: { userId: principal.userId },
        select: { role: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError();
  }

  const role = resolveEffectiveRole(principal, project);

  // No role at all means the caller must not learn this project exists.
  if (role === null) {
    throw new NotFoundError();
  }

  // Has a role but not this permission. Safe to admit it exists.
  if (!can(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return {
    id: project.id,
    name: project.name,
    visibility: project.visibility,
    role,
  };
}

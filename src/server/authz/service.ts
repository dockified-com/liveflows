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

export type AuthorizedFile = {
  id: string;
  name: string;
  type: string;
  projectId: string;
  folderId: string | null;
  role: ProjectRole;
};

/**
 * Files inherit their project's permissions — there is no per-file ACL.
 *
 * The nested `project: { workspaceId }` predicate is the tenant boundary. That
 * exact shape already appears throughout src/server/dal/files.ts.
 */
export async function requireFilePermission(
  principal: Principal,
  fileId: string,
  permission: ProjectPermission,
): Promise<AuthorizedFile> {
  const file = await db.file.findFirst({
    where: { id: fileId, project: { workspaceId: principal.workspaceId } },
    select: {
      id: true,
      name: true,
      type: true,
      projectId: true,
      folderId: true,
      project: {
        select: {
          visibility: true,
          members: {
            where: { userId: principal.userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!file) {
    throw new NotFoundError();
  }

  const role = resolveEffectiveRole(principal, file.project);

  if (role === null) {
    throw new NotFoundError();
  }

  if (!can(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    projectId: file.projectId,
    folderId: file.folderId,
    role,
  };
}

export type AuthorizedFolder = {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  role: ProjectRole;
};

/** Folders inherit their project's permissions — there is no per-folder ACL. */
export async function requireFolderPermission(
  principal: Principal,
  folderId: string,
  permission: ProjectPermission,
): Promise<AuthorizedFolder> {
  const folder = await db.folder.findFirst({
    where: { id: folderId, project: { workspaceId: principal.workspaceId } },
    select: {
      id: true,
      name: true,
      projectId: true,
      parentId: true,
      project: {
        select: {
          visibility: true,
          members: {
            where: { userId: principal.userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!folder) {
    throw new NotFoundError();
  }

  const role = resolveEffectiveRole(principal, folder.project);

  if (role === null) {
    throw new NotFoundError();
  }

  if (!can(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return {
    id: folder.id,
    name: folder.name,
    projectId: folder.projectId,
    parentId: folder.parentId,
    role,
  };
}

import { isProjectRole, type ProjectRole } from "./permissions";

export const ORG_ADMIN_ROLE = "org:admin";

/** Role granted to any org member on a workspace-visible project. */
export const WORKSPACE_DEFAULT_ROLE: ProjectRole = "editor";

export const PROJECT_VISIBILITY_WORKSPACE = "workspace";
export const PROJECT_VISIBILITY_PRIVATE = "private";

/** The minimum a caller must carry for a role decision. */
export type PrincipalRef = {
  userId: string;
  orgRole: string;
};

/**
 * The minimum a project row must carry for a role decision.
 *
 * `members` is expected to be pre-filtered to the calling user — the service
 * queries with `where: { userId }` — so only the first entry is consulted.
 */
export type ProjectAuthzShape = {
  visibility: string;
  members: readonly { role: string }[];
};

/**
 * Resolves the caller's effective role on one project, or null for no access.
 *
 * Precedence, in order:
 *   1. org:admin              -> owner        (floor, unconditional)
 *   2. explicit member row    -> that role    (override, including downgrade)
 *   3. visibility=workspace   -> editor       (default)
 *   4. otherwise              -> null         (private, no row)
 *
 * The admin check is a FLOOR, not a fallback: it runs first and cannot be
 * overridden by a lower explicit row. Without that ordering, downgrading the
 * last admin on a private project is unrecoverable in-app, because a viewer
 * holds neither member.manage nor project.update.
 *
 * Pure — no I/O. Callers fetch the project shape themselves.
 */
export function resolveEffectiveRole(
  principal: PrincipalRef,
  project: ProjectAuthzShape,
): ProjectRole | null {
  if (principal.orgRole === ORG_ADMIN_ROLE) {
    return "owner";
  }

  const explicit = project.members[0]?.role;
  if (explicit !== undefined) {
    // Roles are opaque strings in the database. An unrecognised value is
    // treated as no access — never as a silent grant.
    return isProjectRole(explicit) ? explicit : null;
  }

  if (project.visibility === PROJECT_VISIBILITY_WORKSPACE) {
    return WORKSPACE_DEFAULT_ROLE;
  }

  return null;
}

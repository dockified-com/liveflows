/**
 * The single authoritative definition of what each project role may do.
 *
 * Postgres answers "which role does this user have on this project".
 * This file answers "what does that role mean". Do not create
 * roles / permissions / role_permissions tables — see
 * docs/specs/0005-authorization.md for why.
 */

export const PROJECT_ROLES = ["owner", "editor", "viewer"] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

export type ProjectPermission =
  | "project.read"
  | "project.update"
  | "project.delete"
  | "member.read"
  | "member.manage"
  | "folder.read"
  | "folder.create"
  | "folder.update"
  | "folder.delete"
  | "file.read"
  | "file.create"
  | "file.update"
  | "file.delete";

const OWNER_PERMISSIONS: readonly ProjectPermission[] = [
  "project.read",
  "project.update",
  "project.delete",
  "member.read",
  "member.manage",
  "folder.read",
  "folder.create",
  "folder.update",
  "folder.delete",
  "file.read",
  "file.create",
  "file.update",
  "file.delete",
];

// An editor may rename a project (project.update) but not delete it,
// and may not manage members.
const EDITOR_PERMISSIONS: readonly ProjectPermission[] = [
  "project.read",
  "project.update",
  "member.read",
  "folder.read",
  "folder.create",
  "folder.update",
  "folder.delete",
  "file.read",
  "file.create",
  "file.update",
  "file.delete",
];

// A viewer reads everything and mutates nothing. member.read is
// deliberate: the member list is visible to everyone on the project.
const VIEWER_PERMISSIONS: readonly ProjectPermission[] = [
  "project.read",
  "member.read",
  "folder.read",
  "file.read",
];

const ROLE_PERMISSIONS: Record<ProjectRole, readonly ProjectPermission[]> = {
  owner: OWNER_PERMISSIONS,
  editor: EDITOR_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
};

export function can(role: ProjectRole, permission: ProjectPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(
  role: ProjectRole,
): readonly ProjectPermission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Narrows a database string to a known role.
 *
 * Roles are stored as opaque strings, so an unrecognised value must be
 * treated as no access rather than crashing or silently granting something.
 */
export function isProjectRole(value: string): value is ProjectRole {
  return (PROJECT_ROLES as readonly string[]).includes(value);
}

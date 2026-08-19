# Task 01 — Permission map and `can()`

**Wave:** 1 (parallel with task-03, task-05)
**Depends on:** nothing
**Database:** not needed
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Create the single authoritative definition of what each project role may do.
Pure functions, no I/O, no database. Every other task consumes this.

## Files

- **Create:** `src/server/authz/permissions.ts`
- **Create:** `src/server/authz/permissions.test.ts`

Do not modify any other file.

## Interfaces

**Consumes:** nothing.

**Produces** — later tasks import these exact names:

```ts
type ProjectRole = "owner" | "editor" | "viewer"
type ProjectPermission          // 13-member string union, listed below
const PROJECT_ROLES: readonly ProjectRole[]
can(role: ProjectRole, permission: ProjectPermission): boolean
permissionsForRole(role: ProjectRole): readonly ProjectPermission[]
isProjectRole(value: string): value is ProjectRole
```

## Context

Thirteen permissions across four resource families. Two details that look like
mistakes but are deliberate:

- An `editor` holds `project.update` — renaming a project is allowed; only
  deletion is gated on `project.delete`.
- A `viewer` holds `member.read` — the member list is visible to everyone on
  the project.

`isProjectRole` exists because roles are stored as opaque strings in Postgres.
An unrecognized value must resolve to *no access*, never a silent grant. Task
02 depends on this narrowing.

---

## Step 1: Write the failing test

Create `src/server/authz/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  can,
  isProjectRole,
  permissionsForRole,
  type ProjectPermission,
} from "./permissions";

const ALL_PERMISSIONS: ProjectPermission[] = [
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

describe("can — owner", () => {
  it("grants every permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can("owner", permission), permission).toBe(true);
    }
  });
});

describe("can — editor", () => {
  it("can rename a project but not delete it", () => {
    expect(can("editor", "project.update")).toBe(true);
    expect(can("editor", "project.delete")).toBe(false);
  });

  it("can read members but not manage them", () => {
    expect(can("editor", "member.read")).toBe(true);
    expect(can("editor", "member.manage")).toBe(false);
  });

  it("has full file write access", () => {
    expect(can("editor", "file.create")).toBe(true);
    expect(can("editor", "file.update")).toBe(true);
    expect(can("editor", "file.delete")).toBe(true);
  });

  it("has full folder write access", () => {
    expect(can("editor", "folder.create")).toBe(true);
    expect(can("editor", "folder.update")).toBe(true);
    expect(can("editor", "folder.delete")).toBe(true);
  });
});

describe("can — viewer", () => {
  it("can read every resource family", () => {
    expect(can("viewer", "project.read")).toBe(true);
    expect(can("viewer", "member.read")).toBe(true);
    expect(can("viewer", "folder.read")).toBe(true);
    expect(can("viewer", "file.read")).toBe(true);
  });

  it("is denied every mutation", () => {
    const mutations: ProjectPermission[] = [
      "project.update",
      "project.delete",
      "member.manage",
      "folder.create",
      "folder.update",
      "folder.delete",
      "file.create",
      "file.update",
      "file.delete",
    ];
    for (const permission of mutations) {
      expect(can("viewer", permission), permission).toBe(false);
    }
  });
});

describe("permissionsForRole", () => {
  it("returns all 13 for an owner", () => {
    expect(permissionsForRole("owner")).toHaveLength(13);
  });

  it("returns 11 for an editor", () => {
    expect(permissionsForRole("editor")).toHaveLength(11);
  });

  it("returns exactly the four reads for a viewer", () => {
    expect(permissionsForRole("viewer")).toEqual([
      "project.read",
      "member.read",
      "folder.read",
      "file.read",
    ]);
  });
});

describe("isProjectRole", () => {
  it("accepts the three known roles", () => {
    expect(isProjectRole("owner")).toBe(true);
    expect(isProjectRole("editor")).toBe(true);
    expect(isProjectRole("viewer")).toBe(true);
  });

  it("rejects unknown, empty, and wrongly-cased values", () => {
    expect(isProjectRole("admin")).toBe(false);
    expect(isProjectRole("")).toBe(false);
    expect(isProjectRole("Owner")).toBe(false);
    expect(isProjectRole("org:admin")).toBe(false);
  });
});
```

## Step 2: Run the test and confirm it fails

```bash
pnpm vitest run src/server/authz/permissions.test.ts
```

Expected: failure resolving `./permissions`. If it fails for any other reason,
stop and investigate.

## Step 3: Write the implementation

Create `src/server/authz/permissions.ts`:

```ts
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

export function can(
  role: ProjectRole,
  permission: ProjectPermission,
): boolean {
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
```

## Step 4: Run the test and confirm it passes

```bash
pnpm vitest run src/server/authz/permissions.test.ts
```

Expected: PASS, 12 tests.

## Step 5: Lint and commit

```bash
pnpm lint
git add src/server/authz/permissions.ts src/server/authz/permissions.test.ts
git commit -m "feat(authz): add project permission map and can()"
```

## Step 6: Update progress

In [`progress.md`](./progress.md), set task 01 to `done` with the commit SHA and
date, and append a log entry.

## Done when

- [ ] `permissions.test.ts` passes with 12 tests
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated

## Do not

- Add a permission not in the 13-member union (later tasks type-check against it)
- Use a Prisma enum or import anything from Prisma — this file has no I/O
- Add `workspace.*` or `org.*` permissions; workspace access is `requireWorkspace`'s job

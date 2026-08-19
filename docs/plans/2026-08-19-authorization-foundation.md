# Authorization Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side authorization core — project roles, effective-role resolution, and a central service enforcing them through the DAL — so that `owner` / `editor` / `viewer` are enforced on every project, folder, and file operation.

**Architecture:** A new `src/server/authz/` module owns all policy. Pure functions (`permissions.ts`, `resolve.ts`) hold the role-to-permission map and precedence rules with no I/O. A service layer (`service.ts`) proves authorization in the same Prisma query that fetches the resource, throwing plain `NotFoundError` / `ForbiddenError` rather than calling Next's `notFound()` — that is what lets realtime and MCP consume it later. The existing five DAL files keep their public signatures and delegate policy to the service.

**Tech Stack:** TypeScript, Prisma 7 with `@prisma/adapter-pg`, Postgres, Vitest 4, Clerk.

**Spec:** [`docs/specs/0005-authorization.md`](../specs/0005-authorization.md)
**Feature docs:** [`docs/features/authorization/`](../features/authorization/README.md)

## Scope

This plan covers **phases 1 and 2** of the spec: schema, pure policy logic, the service, and the DAL refactor. That is a complete, enforced, tested authorization core.

Deliberately **not** in this plan, each needing its own:

| Phase | Contents | Why separate |
|---|---|---|
| 3 | Server-side discovery filtering (`discovery.ts`) | Additive; needs the service to exist first |
| 4 | Frontend `authorization` field, provider, `can()`, hide-vs-disable | Large surface, purely additive |
| 5 | MCP rewrite, realtime contract, proxy + session-ownership bug fixes | Independent consumers |

Acceptance criteria covered here: **AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-13.**

## Global Constraints

- Package manager is `pnpm`. Never `npm` or `yarn`.
- Lint and format with Biome: `pnpm lint`, `pnpm format`. Never ESLint or Prettier.
- Prisma 7 requires the driver adapter (`@prisma/adapter-pg`). The generator is `prisma-client` with output checked in at `src/generated/prisma`.
- Migrations need `DIRECT_URL` (Supabase session mode), not `DATABASE_URL` (pooler).
- Test file naming is load-bearing: `*.test.ts` is collected by Vitest, `*.spec.ts` by Playwright. A Playwright spec collected by Vitest fails in a way that looks like a broken test rather than a config error (`vitest.unit.config.ts:11-22`).
- Nothing outside `src/server/dal/` and `src/server/authz/` may call Prisma directly.
- Roles are stored as `String`, never a Prisma enum. The schema has zero enums and the Clerk webhook stores org roles as opaque strings deliberately.
- Unauthorized access returns `NotFoundError`, never `ForbiddenError` or a 403. Never disclose existence.
- `orgId` / `orgSlug` / `orgRole` used for authorization always come from `await auth()`, never from client input or the URL.
- Commit after every task. Run `pnpm lint` before each commit.

## Prerequisite reading

Before Task 1, read these files in full. The plan references their exact behavior:

- `src/server/dal/workspaces.ts` (61 lines) — `requireWorkspace` is the org boundary and does **not** change in this plan.
- `src/server/dal/errors.ts` (13 lines) — `NotFoundError` and `UnauthorizedError` already exist.
- `prisma/schema.prisma` lines 44-56 — the `Project` model you will modify.

---

### Task 1: Permission map and `can()`

Pure, no I/O, no database. This is the single authoritative definition of what each role may do.

**Files:**
- Create: `src/server/authz/permissions.ts`
- Test: `src/server/authz/permissions.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ProjectRole = "owner" | "editor" | "viewer"`
  - `type ProjectPermission` (14-member string union, listed in the code below)
  - `can(role: ProjectRole, permission: ProjectPermission): boolean`
  - `permissionsForRole(role: ProjectRole): readonly ProjectPermission[]`
  - `isProjectRole(value: string): value is ProjectRole`

- [ ] **Step 1: Write the failing test**

Create `src/server/authz/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  can,
  isProjectRole,
  permissionsForRole,
  type ProjectPermission,
} from "./permissions";

describe("can", () => {
  it("grants an owner every permission", () => {
    const all: ProjectPermission[] = [
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
    for (const permission of all) {
      expect(can("owner", permission), permission).toBe(true);
    }
  });

  it("lets an editor rename a project but not delete it", () => {
    expect(can("editor", "project.update")).toBe(true);
    expect(can("editor", "project.delete")).toBe(false);
  });

  it("does not let an editor manage members", () => {
    expect(can("editor", "member.read")).toBe(true);
    expect(can("editor", "member.manage")).toBe(false);
  });

  it("gives an editor full file and folder write access", () => {
    expect(can("editor", "file.create")).toBe(true);
    expect(can("editor", "file.update")).toBe(true);
    expect(can("editor", "file.delete")).toBe(true);
    expect(can("editor", "folder.create")).toBe(true);
    expect(can("editor", "folder.update")).toBe(true);
    expect(can("editor", "folder.delete")).toBe(true);
  });

  it("restricts a viewer to reads", () => {
    expect(can("viewer", "project.read")).toBe(true);
    expect(can("viewer", "member.read")).toBe(true);
    expect(can("viewer", "folder.read")).toBe(true);
    expect(can("viewer", "file.read")).toBe(true);
  });

  it("denies a viewer every mutation", () => {
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
  it("returns 13 permissions for an owner", () => {
    expect(permissionsForRole("owner")).toHaveLength(13);
  });

  it("returns 4 permissions for a viewer", () => {
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

  it("rejects anything else", () => {
    expect(isProjectRole("admin")).toBe(false);
    expect(isProjectRole("")).toBe(false);
    expect(isProjectRole("Owner")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/server/authz/permissions.test.ts`
Expected: FAIL — cannot resolve `./permissions`.

- [ ] **Step 3: Write the implementation**

Create `src/server/authz/permissions.ts`:

```ts
/**
 * The single authoritative definition of what each project role may do.
 *
 * Postgres answers "which role does this user have". This file answers
 * "what does that role mean". Do not create roles/permissions tables —
 * see docs/specs/0005-authorization.md for why.
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
 * Narrows a database string to a known role. Roles are stored as opaque
 * strings, so an unrecognised value must be treated as no access rather
 * than crashing or silently granting something.
 */
export function isProjectRole(value: string): value is ProjectRole {
  return (PROJECT_ROLES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/server/authz/permissions.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint
git add src/server/authz/permissions.ts src/server/authz/permissions.test.ts
git commit -m "feat(authz): add project permission map and can()"
```

---

### Task 2: Effective-role resolution

Still pure. This is the precedence chain, and it is the single place the visibility default and the explicit override are reconciled.

**Files:**
- Create: `src/server/authz/resolve.ts`
- Test: `src/server/authz/resolve.test.ts`

**Interfaces:**
- Consumes: `ProjectRole`, `isProjectRole` from `./permissions`.
- Produces:
  - `type PrincipalRef = { userId: string; orgRole: string }`
  - `type ProjectAuthzShape = { visibility: string; members: readonly { role: string }[] }`
  - `resolveEffectiveRole(principal: PrincipalRef, project: ProjectAuthzShape): ProjectRole | null`
  - `const ORG_ADMIN_ROLE = "org:admin"`
  - `const WORKSPACE_DEFAULT_ROLE: ProjectRole = "editor"`

- [ ] **Step 1: Write the failing test**

Create `src/server/authz/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  type ProjectAuthzShape,
  resolveEffectiveRole,
} from "./resolve";

const member = { userId: "user_1", orgRole: "org:member" };
const admin = { userId: "user_1", orgRole: "org:admin" };

function project(
  visibility: string,
  members: { role: string }[] = [],
): ProjectAuthzShape {
  return { visibility, members };
}

describe("resolveEffectiveRole — workspace-visible projects", () => {
  it("grants editor to an org member with no explicit row", () => {
    expect(resolveEffectiveRole(member, project("workspace"))).toBe("editor");
  });

  it("lets an explicit owner row upgrade a member", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "owner" }])),
    ).toBe("owner");
  });

  it("lets an explicit viewer row downgrade a member", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "viewer" }])),
    ).toBe("viewer");
  });
});

describe("resolveEffectiveRole — private projects", () => {
  it("denies an org member with no explicit row", () => {
    expect(resolveEffectiveRole(member, project("private"))).toBeNull();
  });

  it("grants the explicit role when a row exists", () => {
    expect(
      resolveEffectiveRole(member, project("private", [{ role: "viewer" }])),
    ).toBe("viewer");
  });
});

describe("resolveEffectiveRole — org admin floor", () => {
  it("grants owner on a workspace-visible project", () => {
    expect(resolveEffectiveRole(admin, project("workspace"))).toBe("owner");
  });

  it("grants owner on a private project with no row", () => {
    expect(resolveEffectiveRole(admin, project("private"))).toBe("owner");
  });

  // The floor property: an explicit lower row must NOT reduce an admin,
  // otherwise downgrading the last admin on a private project is
  // unrecoverable in-app. See docs/specs/0005-authorization.md.
  it("grants owner even when an explicit viewer row exists", () => {
    expect(
      resolveEffectiveRole(admin, project("private", [{ role: "viewer" }])),
    ).toBe("owner");
  });
});

describe("resolveEffectiveRole — defensive cases", () => {
  it("treats an unrecognised stored role as no access", () => {
    expect(
      resolveEffectiveRole(
        member,
        project("workspace", [{ role: "org:some_future_role" }]),
      ),
    ).toBeNull();
  });

  it("treats an unrecognised visibility as private", () => {
    expect(resolveEffectiveRole(member, project("team"))).toBeNull();
  });

  it("treats an unrecognised org role as a plain member", () => {
    expect(
      resolveEffectiveRole(
        { userId: "user_1", orgRole: "org:billing_manager" },
        project("workspace"),
      ),
    ).toBe("editor");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/server/authz/resolve.test.ts`
Expected: FAIL — cannot resolve `./resolve`.

- [ ] **Step 3: Write the implementation**

Create `src/server/authz/resolve.ts`:

```ts
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

/** The minimum a project row must carry for a role decision. */
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
 * overridden by a lower explicit row. Without that ordering, downgrading
 * the last admin on a private project is unrecoverable in-app, because a
 * viewer holds neither member.manage nor project.update.
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/server/authz/resolve.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint
git add src/server/authz/resolve.ts src/server/authz/resolve.test.ts
git commit -m "feat(authz): add effective role resolution with org admin floor"
```

---

### Task 3: Schema migration

Adds `ProjectMember`, `Project.visibility`, and the `createdById` relation. Additive and zero-backfill — `visibility` defaults to `workspace` and the default role is `editor`, which is exactly today's behavior.

**Files:**
- Modify: `prisma/schema.prisma` (the `User` model at lines 10-19, `Project` at 44-56; append the new model)
- Create: `prisma/migrations/<timestamp>_project_members_and_visibility/migration.sql` (generated)

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma client types `ProjectMember`, and `Project.visibility: string`. Tasks 6-9 rely on `db.projectMember` and `project.visibility` existing.

- [ ] **Step 1: Add the `ProjectMember` model**

Append to `prisma/schema.prisma`:

```prisma
model ProjectMember {
  projectId String
  userId    String
  role      String   // "owner" | "editor" | "viewer" — opaque string, see D-authz
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@index([userId])
}
```

The `@@index([userId])` is required, not optional — the phase 3 discovery query filters on `userId` and would otherwise scan.

- [ ] **Step 2: Add `visibility` and relations to `Project`**

In `prisma/schema.prisma`, replace the `Project` model (lines 44-56) with:

```prisma
model Project {
  id          String    @id @default(cuid())
  name        String
  workspaceId String
  createdById String
  visibility  String    @default("workspace") // "workspace" | "private"
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy   User      @relation("ProjectCreator", fields: [createdById], references: [id])
  members     ProjectMember[]
  folders     Folder[]
  files       File[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId, updatedAt])
}
```

- [ ] **Step 3: Add the back-relations to `User`**

In `prisma/schema.prisma`, the `User` model (lines 10-19) gains two fields. Add them after `tokens`:

```prisma
  projectMemberships ProjectMember[]
  createdProjects    Project[]       @relation("ProjectCreator")
```

- [ ] **Step 4: Verify the schema is valid**

Run: `pnpm exec prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

If it complains about a missing opposite relation, you missed Step 3.

- [ ] **Step 5: Create and apply the migration**

```bash
pnpm exec prisma migrate dev --name project_members_and_visibility
```

Expected: a new directory under `prisma/migrations/`, applied cleanly, client regenerated into `src/generated/prisma`.

> **If `createdById` holds ids with no matching `User` row**, the new foreign key will fail to apply. That is real possibility since the column had no FK before. If it fails, inspect with:
> ```sql
> SELECT p.id, p."createdById" FROM "Project" p
> LEFT JOIN "User" u ON u.id = p."createdById" WHERE u.id IS NULL;
> ```
> Resolve by creating the missing `User` rows or clearing the orphaned values, then re-run. Do **not** drop the relation to make the migration pass — Task 8 depends on it.

- [ ] **Step 6: Verify the generated SQL is additive**

Read the generated `migration.sql`. Confirm it contains only `CREATE TABLE`, `ALTER TABLE ... ADD COLUMN`, `CREATE INDEX`, and `ADD CONSTRAINT`. There must be no `DROP` and no `UPDATE`. If there is, stop and re-check Steps 2-3.

- [ ] **Step 7: Commit**

```bash
pnpm lint
git add prisma/schema.prisma prisma/migrations src/generated/prisma
git commit -m "feat(authz): add ProjectMember and Project.visibility

Additive and zero-backfill: visibility defaults to workspace and the
workspace default role is editor, so no existing user's access changes."
```

---

### Task 4: Database-backed test harness

There is no DB-backed test pattern in this repo yet, and two things block one: `vitest.config.ts` declares no `globalSetup` despite `vitest.global-setup.ts` existing, and `src/server/db.ts:6` throws unless `DATABASE_URL` is set (tests set `TEST_DATABASE_URL`). Fix both before writing service tests.

**Files:**
- Modify: `vitest.config.ts` (add `globalSetup` to both projects)
- Create: `src/server/authz/test-support/db.ts`
- Create: `src/server/authz/test-support/factories.ts`

**Interfaces:**
- Consumes: `TEST_DATABASE_URL`, already set by both Vitest projects.
- Produces:
  - `testDb` — a `PrismaClient` bound to the test database
  - `resetDb(): Promise<void>`
  - `makeWorkspace(overrides?): Promise<{ id: string; slug: string }>`
  - `makeUser(overrides?): Promise<{ id: string }>`
  - `makeProject(args: { workspaceId: string; createdById: string; visibility?: string; name?: string }): Promise<{ id: string }>`
  - `makeProjectMember(args: { projectId: string; userId: string; role: string }): Promise<void>`
  - `makeFolder(args: { projectId: string; parentId?: string | null; name?: string }): Promise<{ id: string }>`
  - `makeFile(args: { projectId: string; folderId?: string | null; createdById: string; name?: string; type?: string }): Promise<{ id: string }>`

> Files under `test-support/` do not end in `.test.ts`, so Vitest will not collect them as suites.

- [ ] **Step 1: Wire `globalSetup` into `vitest.config.ts`**

Add `globalSetup` at the **root** `test` level, as a sibling of `projects` — not inside the project blocks. In `vitest.config.ts`, change line 10-11 from:

```ts
  test: {
    projects: [
```

to:

```ts
  test: {
    // Starts the disposable test Postgres and pushes the schema.
    // Root level, not per-project: a project-level globalSetup is legal but
    // would run docker compose and prisma db push once per project.
    globalSetup: ["./vitest.global-setup.ts"],
    projects: [
```

Leave both project blocks otherwise unchanged.

- [ ] **Step 2: Verify the harness starts Postgres**

Run: `pnpm vitest run src/server/authz/permissions.test.ts`
Expected: docker compose output starting `postgres-test`, then `prisma db push`, then the 9 tests pass.

If Docker is not running, start it — the rest of this task needs it.

- [ ] **Step 3: Write the test database client**

Create `src/server/authz/test-support/db.ts`:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

/**
 * A Prisma client bound to the disposable test Postgres.
 *
 * src/server/db.ts reads DATABASE_URL and throws when it is absent, but the
 * Vitest projects set TEST_DATABASE_URL instead. Tests therefore build their
 * own client rather than importing the app singleton.
 */
const connectionString =
  process.env.TEST_DATABASE_URL ??
  "postgresql://test:test@localhost:5433/liveflows_test";

export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Truncates every table the authorization tests touch. Order matters only
 * where cascades do not cover it; deleting parents first is sufficient here.
 */
export async function resetDb(): Promise<void> {
  await testDb.projectMember.deleteMany();
  await testDb.project.deleteMany();
  await testDb.workspaceMember.deleteMany();
  await testDb.workspace.deleteMany();
  await testDb.user.deleteMany();
}
```

- [ ] **Step 4: Write the factories**

Create `src/server/authz/test-support/factories.ts`:

```ts
import { testDb } from "./db";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}_${Date.now()}`;
}

export async function makeUser(
  overrides: { id?: string; email?: string } = {},
): Promise<{ id: string }> {
  const id = overrides.id ?? uid("user");
  return testDb.user.create({
    data: { id, email: overrides.email ?? `${id}@example.test` },
    select: { id: true },
  });
}

export async function makeWorkspace(
  overrides: { slug?: string } = {},
): Promise<{ id: string; slug: string }> {
  const slug = overrides.slug ?? uid("ws");
  return testDb.workspace.create({
    data: { clerkOrgId: uid("org"), name: slug, slug },
    select: { id: true, slug: true },
  });
}

export async function makeProject(args: {
  workspaceId: string;
  createdById: string;
  visibility?: string;
  name?: string;
}): Promise<{ id: string }> {
  return testDb.project.create({
    data: {
      name: args.name ?? uid("project"),
      workspaceId: args.workspaceId,
      createdById: args.createdById,
      visibility: args.visibility ?? "workspace",
    },
    select: { id: true },
  });
}

export async function makeProjectMember(args: {
  projectId: string;
  userId: string;
  role: string;
}): Promise<void> {
  await testDb.projectMember.create({ data: args });
}

export async function makeFolder(args: {
  projectId: string;
  parentId?: string | null;
  name?: string;
}): Promise<{ id: string }> {
  const name = args.name ?? uid("folder");
  const parentId = args.parentId ?? null;
  return testDb.folder.create({
    data: {
      projectId: args.projectId,
      parentId,
      name,
      normalizedName: name.toLowerCase(),
      directoryKey: `${args.projectId}:${parentId ?? "ROOT"}`,
    },
    select: { id: true },
  });
}

export async function makeFile(args: {
  projectId: string;
  createdById: string;
  folderId?: string | null;
  name?: string;
  type?: string;
}): Promise<{ id: string }> {
  const name = args.name ?? uid("file");
  const folderId = args.folderId ?? null;
  return testDb.file.create({
    data: {
      projectId: args.projectId,
      folderId,
      name,
      normalizedName: name.toLowerCase(),
      directoryKey: `${args.projectId}:${folderId ?? "ROOT"}`,
      type: args.type ?? "canvas",
      createdById: args.createdById,
    },
    select: { id: true },
  });
}
```

- [ ] **Step 5: Prove the harness works**

Create `src/server/authz/test-support/harness.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./db";
import { makeProject, makeUser, makeWorkspace } from "./factories";

describe("test harness", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("creates a project with a workspace and creator", async () => {
    const user = await makeUser();
    const workspace = await makeWorkspace();
    const project = await makeProject({
      workspaceId: workspace.id,
      createdById: user.id,
    });

    const found = await testDb.project.findUnique({
      where: { id: project.id },
      select: { visibility: true, workspaceId: true },
    });

    expect(found?.visibility).toBe("workspace");
    expect(found?.workspaceId).toBe(workspace.id);
  });

  it("resets between tests", async () => {
    expect(await testDb.project.count()).toBe(0);
  });
});
```

- [ ] **Step 6: Run it**

Run: `pnpm vitest run src/server/authz/test-support/harness.test.ts`
Expected: PASS, 2 tests. This confirms Postgres starts, the schema pushes, `visibility` defaults to `workspace`, and the new FK accepts the factory data.

- [ ] **Step 7: Commit**

```bash
pnpm lint
git add vitest.config.ts src/server/authz/test-support
git commit -m "test(authz): wire vitest globalSetup and add db test harness

vitest.config.ts declared no globalSetup despite vitest.global-setup.ts
existing, so pnpm test never started the test Postgres."
```

---

### Task 5: `ForbiddenError` and the Principal

**Files:**
- Modify: `src/server/dal/errors.ts` (append)
- Create: `src/server/authz/principal.ts`
- Test: `src/server/authz/principal.test.ts`

**Interfaces:**
- Consumes: `auth` from `@clerk/nextjs/server`; `PrincipalRef` from `./resolve`.
- Produces:
  - `ForbiddenError` in `src/server/dal/errors.ts`
  - `type Principal = { userId: string; workspaceId: string; orgRole: string; source: { type: "user" } | { type: "mcp"; tokenId: string } }`
  - `principalFromSession(workspaceId: string): Promise<Principal>`

> `principalFromToken` is deliberately **not** in this plan — it belongs with the MCP rewrite in phase 5.

- [ ] **Step 1: Add `ForbiddenError`**

Append to `src/server/dal/errors.ts`:

```ts
/**
 * The caller is authenticated and may see the resource exists, but lacks the
 * permission for this operation.
 *
 * Do NOT use this when the caller should not learn the resource exists at
 * all — throw NotFoundError instead. See docs/specs/0005-authorization.md.
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `src/server/authz/principal.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

const { principalFromSession } = await import("./principal");
const { UnauthorizedError } = await import("../dal/errors");

describe("principalFromSession", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("builds a user principal from the session", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });

    const principal = await principalFromSession("ws_1");

    expect(principal).toEqual({
      userId: "user_1",
      workspaceId: "ws_1",
      orgRole: "org:admin",
      source: { type: "user" },
    });
  });

  it("defaults a missing orgRole to org:member", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: null,
    });

    const principal = await principalFromSession("ws_1");

    expect(principal.orgRole).toBe("org:member");
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false });
    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws when there is no active organization", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: null,
    });
    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run src/server/authz/principal.test.ts`
Expected: FAIL — cannot resolve `./principal`.

- [ ] **Step 4: Write the implementation**

Create `src/server/authz/principal.ts`:

```ts
import { auth } from "@clerk/nextjs/server";
import { UnauthorizedError } from "../dal/errors";

export const ORG_MEMBER_ROLE = "org:member";

/**
 * Who is asking. Built at the edge, consumed by the authorization service.
 *
 * Every field is server-resolved. Nothing here may originate from client
 * input or the URL — the session is the authority, the URL slug is a label.
 */
export type Principal = {
  userId: string;
  workspaceId: string;
  orgRole: string;
  source: { type: "user" } | { type: "mcp"; tokenId: string };
};

/**
 * Builds a principal for a browser request.
 *
 * orgRole comes from the live Clerk session rather than WorkspaceMember, so
 * it does not depend on webhook delivery. This matches requireWorkspace,
 * which also authorizes off the session alone.
 *
 * Callers pass workspaceId because requireWorkspace has already resolved and
 * verified it against the session's active organization.
 */
export async function principalFromSession(
  workspaceId: string,
): Promise<Principal> {
  const { isAuthenticated, userId, orgId, orgRole } = await auth();

  if (!isAuthenticated || !userId || !orgId) {
    throw new UnauthorizedError();
  }

  return {
    userId,
    workspaceId,
    orgRole: orgRole ?? ORG_MEMBER_ROLE,
    source: { type: "user" },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run src/server/authz/principal.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
pnpm lint
git add src/server/dal/errors.ts src/server/authz/principal.ts src/server/authz/principal.test.ts
git commit -m "feat(authz): add ForbiddenError and session principal"
```

---

### Task 6: `requireProjectPermission`

The first service function. Authorization is proven in the same query that fetches the resource — never a separate round trip.

**Files:**
- Create: `src/server/authz/service.ts`
- Test: `src/server/authz/service.test.ts`

**Interfaces:**
- Consumes: `Principal` from `./principal`; `resolveEffectiveRole` from `./resolve`; `can`, `ProjectPermission`, `ProjectRole` from `./permissions`; `NotFoundError`, `ForbiddenError` from `../dal/errors`; `db` from `../db`.
- Produces: `requireProjectPermission(principal: Principal, projectId: string, permission: ProjectPermission): Promise<{ id: string; name: string; visibility: string; role: ProjectRole }>`

- [ ] **Step 1: Write the failing test**

Create `src/server/authz/service.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, testDb } from "./test-support/db";
import {
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "./test-support/factories";

// The service imports the app db singleton; point it at the test database.
vi.mock("../db", async () => {
  const { testDb } = await import("./test-support/db");
  return { db: testDb };
});

const { requireProjectPermission } = await import("./service");
const { ForbiddenError, NotFoundError } = await import("../dal/errors");

function principal(
  userId: string,
  workspaceId: string,
  orgRole = "org:member",
) {
  return { userId, workspaceId, orgRole, source: { type: "user" } as const };
}

describe("requireProjectPermission", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("allows an org member to update a workspace-visible project", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.update",
    );

    expect(result.id).toBe(project.id);
    expect(result.role).toBe("editor");
  });

  it("denies an editor project.delete with ForbiddenError", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        project.id,
        "project.delete",
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("denies a viewer a mutation", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        project.id,
        "file.create",
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("hides a private project from a non-member with NotFoundError", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });

    await expect(
      requireProjectPermission(
        principal(outsider.id, ws.id),
        project.id,
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("lets an org admin reach a private project they are not a member of", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });

    const result = await requireProjectPermission(
      principal(admin.id, ws.id, "org:admin"),
      project.id,
      "project.delete",
    );

    expect(result.role).toBe("owner");
  });

  // AC-7: a cross-workspace id must be indistinguishable from a missing one.
  it("throws NotFoundError for a project in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ownWs.id),
        project.id,
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for an id that does not exist", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        "project_missing",
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/server/authz/service.test.ts`
Expected: FAIL — cannot resolve `./service`.

- [ ] **Step 3: Write the implementation**

Create `src/server/authz/service.ts`:

```ts
import { db } from "../db";
import { ForbiddenError, NotFoundError } from "../dal/errors";
import {
  can,
  type ProjectPermission,
  type ProjectRole,
} from "./permissions";
import type { Principal } from "./principal";
import { resolveEffectiveRole } from "./resolve";

/**
 * The central authorization service.
 *
 * Throws plain NotFoundError / ForbiddenError and NEVER calls notFound()
 * from next/navigation. That matters: this module is consumed by MCP tools
 * and (later) a Hocuspocus onAuthenticate hook, neither of which has a Next
 * request context. The web DAL translates these errors at its own boundary.
 *
 * Authorization is always proven in the same query that fetches the
 * resource. The `workspaceId` predicate is the tenant boundary — dropping it
 * is the single most likely way to introduce a cross-tenant leak.
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
    where: { id: projectId, workspaceId: principal.workspaceId },
    select: {
      id: true,
      name: true,
      visibility: true,
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/server/authz/service.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
pnpm lint
git add src/server/authz/service.ts src/server/authz/service.test.ts
git commit -m "feat(authz): add requireProjectPermission"
```

---

### Task 7: `requireFilePermission` and `requireFolderPermission`

Files and folders inherit their project's permissions (AC-5). Both walk the relation in one query.

**Files:**
- Modify: `src/server/authz/service.ts` (append)
- Modify: `src/server/authz/service.test.ts` (append)

**Interfaces:**
- Consumes: everything Task 6 consumed, plus the `makeFile` / `makeFolder` factories.
- Produces:
  - `requireFilePermission(principal, fileId, permission): Promise<AuthorizedFile>` where `AuthorizedFile = { id: string; name: string; type: string; projectId: string; folderId: string | null; role: ProjectRole }`
  - `requireFolderPermission(principal, folderId, permission): Promise<AuthorizedFolder>` where `AuthorizedFolder = { id: string; name: string; projectId: string; parentId: string | null; role: ProjectRole }`

- [ ] **Step 1: Write the failing tests**

Append to `src/server/authz/service.test.ts`. Also extend the import from `./test-support/factories` to include `makeFile` and `makeFolder`, and the import from `./service` to include the two new functions.

```ts
describe("requireFilePermission", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lets an editor update a file in a workspace-visible project", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    const result = await requireFilePermission(
      principal(user.id, ws.id),
      file.id,
      "file.update",
    );

    expect(result.id).toBe(file.id);
    expect(result.projectId).toBe(project.id);
    expect(result.role).toBe("editor");
  });

  it("lets a viewer read a file but not update it", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    await expect(
      requireFilePermission(principal(user.id, ws.id), file.id, "file.read"),
    ).resolves.toMatchObject({ role: "viewer" });

    await expect(
      requireFilePermission(principal(user.id, ws.id), file.id, "file.update"),
    ).rejects.toThrow(ForbiddenError);
  });

  it("hides a file in a private project from a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });

    await expect(
      requireFilePermission(
        principal(outsider.id, ws.id),
        file.id,
        "file.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for a file in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    await expect(
      requireFilePermission(principal(user.id, ownWs.id), file.id, "file.read"),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("requireFolderPermission", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lets an editor update a folder", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      folder.id,
      "folder.update",
    );

    expect(result.id).toBe(folder.id);
    expect(result.projectId).toBe(project.id);
  });

  it("denies a viewer folder.delete", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });
    const folder = await makeFolder({ projectId: project.id });

    await expect(
      requireFolderPermission(
        principal(user.id, ws.id),
        folder.id,
        "folder.delete",
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for a folder in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });

    await expect(
      requireFolderPermission(
        principal(user.id, ownWs.id),
        folder.id,
        "folder.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/server/authz/service.test.ts`
Expected: FAIL — `requireFilePermission` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/server/authz/service.ts`:

```ts
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
 * The nested `project: { workspaceId }` predicate is the tenant boundary.
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

/** Folders inherit their project's permissions. */
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/server/authz/service.test.ts`
Expected: PASS, 14 tests total.

- [ ] **Step 5: Commit**

```bash
pnpm lint
git add src/server/authz/service.ts src/server/authz/service.test.ts
git commit -m "feat(authz): add file and folder permission checks

Files and folders inherit project permissions; no per-resource ACL."
```

---

### Task 8: Enforce permissions in `projects.ts`

The DAL keeps its public signatures and delegates policy to the service. Note the deliberate asymmetry: `requireWorkspace` already redirects on a bad org, so the service's `NotFoundError` is translated to `notFound()` here at the web boundary.

**Files:**
- Modify: `src/server/dal/projects.ts`
- Create: `src/server/dal/__tests__/projects-authz.test.ts`

**Interfaces:**
- Consumes: `principalFromSession` from `../authz/principal`; `requireProjectPermission` from `../authz/service`.
- Produces: no signature changes. `createProject` additionally writes an `owner` `ProjectMember` row for the creator.

- [ ] **Step 1: Add a permission check to `getProject`**

In `src/server/dal/projects.ts`, add these imports at the top:

```ts
import { principalFromSession } from "../authz/principal";
import { requireProjectPermission } from "../authz/service";
import { ForbiddenError, NotFoundError } from "./errors";
```

Replace the body of `getProject` (lines 37-53) with:

```ts
export async function getProject(
  workspaceSlug: string,
  projectId: string,
): Promise<ProjectDetail> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "project.read");
  } catch (error) {
    // The web boundary turns service errors into Next navigation signals.
    // Both cases render 404 — we never disclose that a project exists.
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true, name: true, updatedAt: true },
  });

  if (!project) {
    notFound();
  }

  return project;
}
```

- [ ] **Step 2: Gate `deleteProject` on `project.delete`**

Replace the authorization portion of `deleteProject` (lines 89-98) so the function begins:

```ts
export async function deleteProject(
  workspaceSlug: string,
  projectId: string,
): Promise<void> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "project.delete");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }
```

Leave the rest of the function (the room decommission loop and the delete) unchanged.

> Note the difference from `getProject`: here `ForbiddenError` is allowed to propagate. An editor attempting a delete has already seen the project, so a thrown error is correct — the server action reports it. Only `NotFoundError` becomes a 404.

- [ ] **Step 3: Gate `listProjectContents` on `project.read`**

Replace the authorization portion of `listProjectContents` (lines 141-150) so the function begins:

```ts
export async function listProjectContents(
  workspaceSlug: string,
  projectId: string,
): Promise<ProjectContents> {
  const workspace = await requireWorkspace(workspaceSlug);
  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "project.read");
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }
```

Leave the file and folder queries unchanged.

- [ ] **Step 4: Make `createProject` write an owner row**

Replace the `db.project.create` call in `createProject` (lines 69-78) with:

```ts
  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name,
        workspaceId: workspace.id,
        createdById: userId,
      },
      select: { id: true, name: true, updatedAt: true },
    });

    // The creator is an explicit owner, so they can manage members and
    // delete the project even after it is made private.
    await tx.projectMember.create({
      data: { projectId: created.id, userId, role: "owner" },
    });

    return created;
  });

  return project;
```

- [ ] **Step 5: Write the tests**

Create `src/server/dal/__tests__/projects-authz.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, testDb } from "../../authz/test-support/db";
import {
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "../../authz/test-support/factories";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("../../db", async () => {
  const { testDb } = await import("../../authz/test-support/db");
  return { db: testDb };
});

vi.mock("../../liveblocks", () => ({
  decommissionRoom: vi.fn().mockResolvedValue(undefined),
}));

const { deleteProject, getProject } = await import("../projects");
const { ForbiddenError } = await import("../errors");

describe("projects DAL authorization", () => {
  beforeEach(async () => {
    await resetDb();
    mockAuth.mockReset();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  function signIn(userId: string, slug: string, orgRole = "org:member") {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId,
      orgId: `clerk_${slug}`,
      orgSlug: slug,
      orgRole,
    });
  }

  it("returns a workspace-visible project to an org member", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      name: "Backend Platform",
    });
    signIn(user.id, ws.slug);

    const result = await getProject(ws.slug, project.id);

    expect(result.name).toBe("Backend Platform");
  });

  it("404s a private project for a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    signIn(outsider.id, ws.slug);

    await expect(getProject(ws.slug, project.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("refuses deletion by an editor", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    signIn(user.id, ws.slug);

    await expect(deleteProject(ws.slug, project.id)).rejects.toThrow(
      ForbiddenError,
    );

    expect(await testDb.project.count()).toBe(1);
  });

  it("allows deletion by an explicit owner", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "owner",
    });
    signIn(user.id, ws.slug);

    await deleteProject(ws.slug, project.id);

    expect(await testDb.project.count()).toBe(0);
  });

  it("allows deletion by an org admin who is not a member", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    signIn(admin.id, ws.slug, "org:admin");

    await deleteProject(ws.slug, project.id);

    expect(await testDb.project.count()).toBe(0);
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/server/dal/__tests__/projects-authz.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Confirm the existing suite still passes**

Run: `pnpm vitest run src/server/dal`
Expected: PASS. The pre-existing `projects.test.ts` and `workspaces.test.ts` are fully mocked; if `projects.test.ts` now fails because `createProject` opens a transaction, add `$transaction` to its `db` mock rather than reverting Step 4.

- [ ] **Step 8: Commit**

```bash
pnpm lint
git add src/server/dal/projects.ts src/server/dal/__tests__/projects-authz.test.ts
git commit -m "feat(authz): enforce project permissions in the projects DAL

Creator now gets an explicit owner row so they retain member.manage and
project.delete after a project is made private."
```

---

### Task 9: Enforce permissions in `files.ts` and `folders.ts`

These files currently have no tests at all. Each mutating function gains the matching permission check.

**Files:**
- Modify: `src/server/dal/files.ts`
- Modify: `src/server/dal/folders.ts`
- Create: `src/server/dal/__tests__/files-authz.test.ts`

**Interfaces:**
- Consumes: `principalFromSession`, `requireFilePermission`, `requireFolderPermission`, `requireProjectPermission`.
- Produces: no signature changes.

**Permission mapping** — apply exactly this:

| Function | Check | Resource |
|---|---|---|
| `createFile` | `file.create` | project (`projectId` argument) |
| `renameFile` | `file.update` | file |
| `moveFile` | `file.update` | file |
| `deleteFile` | `file.delete` | file |
| `getFileWithSnapshot` | `file.read` | file |
| `createFolder` | `folder.create` | project |
| `renameFolder` | `folder.update` | folder |
| `moveFolder` | `folder.update` | folder |
| `deleteFolder` | `folder.delete` | folder |

- [ ] **Step 1: Add the checks to `files.ts`**

Add the imports:

```ts
import { principalFromSession } from "../authz/principal";
import {
  requireFilePermission,
  requireProjectPermission,
} from "../authz/service";
import { ForbiddenError, NotFoundError } from "./errors";
```

In each of the five functions, immediately after the existing `const workspace = await requireWorkspace(workspaceSlug);` line, insert the principal and the check. For the four file-scoped functions (`renameFile`, `moveFile`, `deleteFile`, `getFileWithSnapshot`), use this shape with the permission from the table:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.update");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
```

For `getFileWithSnapshot`, also convert `ForbiddenError` to `notFound()` — it is a read path rendering a page, so it should 404 rather than surface an error:

```ts
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound();
    }
```

For `createFile`, the resource is the project, so check against `projectId`:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "file.create");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
```

Leave every existing query, the uniqueness pre-check, and the room provisioning rollback untouched.

- [ ] **Step 2: Add the checks to `folders.ts`**

Same pattern with `requireFolderPermission`. Use `requireProjectPermission(principal, projectId, "folder.create")` for `createFolder`, and `requireFolderPermission(principal, folderId, ...)` for the other three, with permissions from the table.

For `moveFolder`, place the check **before** the `$transaction` that takes the advisory lock — do not authorize inside the transaction.

- [ ] **Step 3: Write the tests**

Create `src/server/dal/__tests__/files-authz.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, testDb } from "../../authz/test-support/db";
import {
  makeFile,
  makeFolder,
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "../../authz/test-support/factories";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("../../db", async () => {
  const { testDb } = await import("../../authz/test-support/db");
  return { db: testDb };
});

vi.mock("../../liveblocks", () => ({
  decommissionRoom: vi.fn().mockResolvedValue(undefined),
  provisionRoom: vi.fn().mockResolvedValue(undefined),
  roomIdForFile: (id: string) => `file_${id}`,
}));

const { deleteFile, renameFile } = await import("../files");
const { renameFolder } = await import("../folders");
const { ForbiddenError } = await import("../errors");

function signIn(userId: string, slug: string, orgRole = "org:member") {
  mockAuth.mockResolvedValue({
    isAuthenticated: true,
    userId,
    orgId: `clerk_${slug}`,
    orgSlug: slug,
    orgRole,
  });
}

describe("files and folders DAL authorization", () => {
  beforeEach(async () => {
    await resetDb();
    mockAuth.mockReset();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("lets an editor rename a file", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });
    signIn(user.id, ws.slug);

    const result = await renameFile(ws.slug, file.id, "renamed");

    expect(result.name).toBe("renamed");
  });

  it("refuses a rename by a viewer", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      name: "original",
    });
    signIn(user.id, ws.slug);

    await expect(renameFile(ws.slug, file.id, "hacked")).rejects.toThrow(
      ForbiddenError,
    );

    const unchanged = await testDb.file.findUnique({
      where: { id: file.id },
      select: { name: true },
    });
    expect(unchanged?.name).toBe("original");
  });

  it("refuses a delete by a viewer", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });
    signIn(user.id, ws.slug);

    await expect(deleteFile(ws.slug, file.id)).rejects.toThrow(ForbiddenError);
    expect(await testDb.file.count()).toBe(1);
  });

  it("404s a file in a private project for a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(outsider.id, ws.slug);

    await expect(renameFile(ws.slug, file.id, "x")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("refuses a folder rename by a viewer", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws.slug);

    await expect(renameFolder(ws.slug, folder.id, "hacked")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("lets an org admin rename a file in a private project", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(admin.id, ws.slug, "org:admin");

    const result = await renameFile(ws.slug, file.id, "admin-renamed");

    expect(result.name).toBe("admin-renamed");
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/server/dal/__tests__/files-authz.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the whole suite**

Run: `pnpm test -- --run`
Expected: PASS. Fix any pre-existing mocked test that now needs `projectMember` or `$transaction` on its `db` mock.

- [ ] **Step 6: Verify the build**

Run: `pnpm build`
Expected: success. This catches type errors in call sites the tests do not exercise.

- [ ] **Step 7: Commit**

```bash
pnpm lint
git add src/server/dal/files.ts src/server/dal/folders.ts src/server/dal/__tests__/files-authz.test.ts
git commit -m "feat(authz): enforce file and folder permissions in the DAL"
```

---

## Verification

After Task 9, confirm the acceptance criteria this plan claims:

| AC | How to verify |
|---|---|
| AC-1 | `resolve.test.ts` — explicit rows upgrade and downgrade |
| AC-2 | `resolve.test.ts` — workspace grants editor, private denies |
| AC-3 | `resolve.test.ts` + `service.test.ts` + both DAL suites — admin floor |
| AC-4 | All DAL mutations route through the service; grep for any remaining direct policy logic |
| AC-5 | `service.test.ts` — file and folder inheritance |
| AC-7 | `service.test.ts` — cross-workspace ids throw `NotFoundError` |
| AC-13 | Task 3 Step 6 — migration SQL is additive only; Task 4 Step 6 — `visibility` defaults to `workspace` |

Then verify AC-13 against real data, since this is the criterion that protects a paying team:

```bash
# Against a COPY of production, never production itself.
# Every project should report visibility=workspace.
psql "$DIRECT_URL" -c 'SELECT visibility, count(*) FROM "Project" GROUP BY visibility;'
```

Expected: one row, `workspace`, count equal to the total project count.

## Follow-up plans

- **Phase 3** — `discovery.ts` and server-side filtering (AC-6)
- **Phase 4** — frontend `authorization` field, provider, `can()`, hide-vs-disable (AC-8)
- **Phase 5** — MCP rewrite, realtime contract, proxy exemption, session-ownership fix (AC-9 through AC-12)
- **Member-management UI** — until it ships, `ProjectMember` rows and `visibility` need direct database access

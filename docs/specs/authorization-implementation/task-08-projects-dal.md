# Task 08 — Enforce permissions in `projects.ts`

**Wave:** 4 (parallel with task-07)
**Depends on:** task-06 (`requireProjectPermission` must exist and be committed)
**Database:** yes — test Postgres
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Wire the authorization service into the projects DAL. Public function signatures
do not change — callers keep working — but every operation now enforces a
permission, and creating a project grants its creator an explicit `owner` row.

## Files

- **Modify:** `src/server/dal/projects.ts`
- **Create:** `src/server/dal/__tests__/projects-authz.test.ts`

Do not modify `src/server/authz/service.ts` — task-07 runs concurrently and owns
it. Do not modify `files.ts` or `folders.ts` — that is task-09.

## Interfaces

**Consumes:**

```ts
import { principalFromSession } from "../authz/principal";        // task 05
import { requireProjectPermission } from "../authz/service";      // task 06
import { ForbiddenError, NotFoundError } from "./errors";         // task 05
```

**Produces:** no signature changes. `createProject` additionally writes a
`ProjectMember` row with role `owner` for the creator.

## Context

**Read `src/server/dal/projects.ts` in full first** — it is 171 lines with five
exported functions.

**The web boundary translates service errors.** The service throws
`NotFoundError` / `ForbiddenError`; this file converts them to Next navigation
signals where appropriate. The rule differs per function and it is deliberate:

| Function | `NotFoundError` | `ForbiddenError` | Why |
|---|---|---|---|
| `getProject` | `notFound()` | `notFound()` | A read path rendering a page. Both mean "you get a 404". |
| `listProjectContents` | `notFound()` | `notFound()` | Same — read path. |
| `deleteProject` | `notFound()` | **propagate** | A mutation. The caller already saw the project, so an editor attempting a delete should get a real error the server action can report, not a confusing 404. |

**Why the creator gets an explicit `owner` row.** Without it, a creator who
later makes their project private would lose `member.manage` and
`project.delete` — they would resolve to `editor` via the workspace default,
then to nothing once private. The row makes their ownership durable.

**`requireWorkspace` does not change.** It stays the org boundary, called first
in every function. You add the principal and the permission check after it.

**Parallel-safety.** Task-07 is appending to `service.ts` while you read it.
Keep every test workspace-scoped — no truncation, no unscoped counts — or you
will break its concurrent run.

---

## Step 1: Read the current file

```bash
cat -n src/server/dal/projects.ts
```

Note the five functions: `listProjects` (19), `getProject` (37),
`createProject` (58), `deleteProject` (85), `listProjectContents` (137).

**`listProjects` is deliberately left alone in this task.** Filtering the list
is AC-6, which belongs to phase 3's discovery work. Adding a per-project check
here would mean N queries for N projects.

## Step 2: Add the imports

At the top of `src/server/dal/projects.ts`, add:

```ts
import { principalFromSession } from "../authz/principal";
import { requireProjectPermission } from "../authz/service";
import { ForbiddenError, NotFoundError } from "./errors";
```

Keep the existing imports (`auth`, `notFound`, `db`, `decommissionRoom`,
`requireWorkspace`).

## Step 3: Gate `getProject` on `project.read`

Replace the whole `getProject` function with:

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
    // Read path: both denials render a 404. We never disclose that a project
    // exists to someone who cannot open it.
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

## Step 4: Gate `deleteProject` on `project.delete`

In `deleteProject`, insert the principal and check immediately after the
existing `requireWorkspace` call, so the function begins:

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
    // Mutation path: NotFound becomes a 404, but ForbiddenError propagates so
    // the server action can report "you cannot delete this" rather than a
    // misleading 404 for a project the caller can plainly see.
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

Leave the rest of the function unchanged — the room decommission loop and the
final `db.project.delete`.

## Step 5: Gate `listProjectContents` on `project.read`

Insert after its `requireWorkspace` call, so the function begins:

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

## Step 6: Make `createProject` grant the creator an owner row

Replace the `db.project.create` call in `createProject` with a transaction:

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

    // An explicit owner row makes the creator's ownership durable. Without it
    // they would lose member.manage and project.delete the moment the project
    // is made private.
    await tx.projectMember.create({
      data: { projectId: created.id, userId, role: "owner" },
    });

    return created;
  });

  return project;
```

`createProject` needs no permission check — `requireWorkspace` already proved
org membership, and any member may create a project.

## Step 7: Write the tests

Create `src/server/dal/__tests__/projects-authz.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "../../authz/test-support/db";
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

const { createProject, deleteProject, getProject } = await import(
  "../projects"
);
const { ForbiddenError } = await import("../errors");

/**
 * requireWorkspace compares auth().orgSlug against the slug argument and
 * upserts by clerkOrgId, so the mocked session must agree with the workspace
 * row the factory created.
 */
function signIn(
  userId: string,
  workspace: { slug: string; clerkOrgId: string },
  orgRole = "org:member",
) {
  mockAuth.mockResolvedValue({
    isAuthenticated: true,
    userId,
    orgId: workspace.clerkOrgId,
    orgSlug: workspace.slug,
    orgRole,
  });
}

async function workspaceWithOrg() {
  const ws = await makeWorkspace();
  const row = await testDb.workspace.findUnique({
    where: { id: ws.id },
    select: { clerkOrgId: true },
  });
  return { ...ws, clerkOrgId: row?.clerkOrgId as string };
}

describe("projects DAL authorization", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("returns a workspace-visible project to an org member", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      name: "Backend Platform",
    });
    signIn(user.id, ws);

    const result = await getProject(ws.slug, project.id);

    expect(result.name).toBe("Backend Platform");
  });

  it("404s a private project for a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    signIn(outsider.id, ws);

    await expect(getProject(ws.slug, project.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s a project in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await workspaceWithOrg();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });
    signIn(user.id, ownWs);

    await expect(getProject(ownWs.slug, project.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("refuses deletion by an editor with ForbiddenError", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    await expect(deleteProject(ws.slug, project.id)).rejects.toThrow(
      ForbiddenError,
    );

    // Scoped count — never count across the whole table.
    expect(
      await testDb.project.count({ where: { workspaceId: ws.id } }),
    ).toBe(1);
  });

  it("allows deletion by an explicit owner", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "owner",
    });
    signIn(user.id, ws);

    await deleteProject(ws.slug, project.id);

    expect(
      await testDb.project.count({ where: { workspaceId: ws.id } }),
    ).toBe(0);
  });

  it("allows deletion by an org admin who is not a member", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    signIn(admin.id, ws, "org:admin");

    await deleteProject(ws.slug, project.id);

    expect(
      await testDb.project.count({ where: { workspaceId: ws.id } }),
    ).toBe(0);
  });

  it("gives the creator an explicit owner row", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    signIn(user.id, ws);

    const project = await createProject(ws.slug, "New Project");

    const members = await testDb.projectMember.findMany({
      where: { projectId: project.id },
      select: { userId: true, role: true },
    });

    expect(members).toEqual([{ userId: user.id, role: "owner" }]);
  });

  it("lets the creator delete their own project immediately", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    signIn(user.id, ws);

    const project = await createProject(ws.slug, "Disposable");
    await deleteProject(ws.slug, project.id);

    expect(
      await testDb.project.count({ where: { workspaceId: ws.id } }),
    ).toBe(0);
  });
});
```

## Step 8: Run the tests

```bash
pnpm vitest run src/server/dal/__tests__/projects-authz.test.ts
```

Expected: PASS, 8 tests.

## Step 9: Confirm the existing DAL suite still passes

```bash
pnpm vitest run src/server/dal
```

Expected: PASS. If the pre-existing `projects.test.ts` now fails because
`createProject` opens a transaction, **extend its `db` mock** with a
`$transaction` implementation that invokes its callback, and a `projectMember`
mock. Do not revert Step 6.

## Step 10: Verify the build

```bash
pnpm build
```

Expected: success. This catches type errors at call sites the tests miss.

## Step 11: Lint and commit

```bash
pnpm lint
git add src/server/dal/projects.ts src/server/dal/__tests__/projects-authz.test.ts
git commit -m "feat(authz): enforce project permissions in the projects DAL

Creator now gets an explicit owner row so they retain member.manage and
project.delete after a project is made private."
```

## Step 12: Update progress

In [`progress.md`](./progress.md), set task 08 to `done` with the commit SHA and
date, and append a log entry. Note whether you had to extend the existing
`projects.test.ts` mock.

## Done when

- [ ] `projects-authz.test.ts` passes with 8 tests
- [ ] `pnpm vitest run src/server/dal` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated

## Do not

- Change any exported function signature
- Modify `requireWorkspace`
- Add a per-project check to `listProjects` — that is phase 3's discovery work
- Convert `ForbiddenError` to `notFound()` in `deleteProject` (the caller needs the real error)
- Touch `src/server/authz/service.ts` — task-07 is editing it concurrently
- Use an unscoped `testDb.project.count()` — it would see other agents' rows
- Add a truncating `beforeEach`

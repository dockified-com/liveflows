# Task 06 — `requireProjectPermission`

**Wave:** 3 (runs alone)
**Depends on:** tasks 01, 02, 03, 04, 05 — all committed and green
**Database:** yes — test Postgres
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Create the central authorization service and its first function. This is the
chokepoint every consumer routes through — the web DAL, MCP tools, and later a
realtime auth hook.

## Files

- **Create:** `src/server/authz/service.ts`
- **Create:** `src/server/authz/service.test.ts`

Do not modify any file from tasks 01–05.

## Interfaces

**Consumes:**

```ts
import { db } from "../db";
import { ForbiddenError, NotFoundError } from "../dal/errors";        // task 05
import { can, type ProjectPermission, type ProjectRole } from "./permissions"; // task 01
import type { Principal } from "./principal";                        // task 05
import { resolveEffectiveRole } from "./resolve";                    // task 02
```

**Produces** — tasks 07, 08, 09 depend on these:

```ts
type AuthorizedProject = {
  id: string;
  name: string;
  visibility: string;
  role: ProjectRole;
}
requireProjectPermission(
  principal: Principal,
  projectId: string,
  permission: ProjectPermission,
): Promise<AuthorizedProject>
```

## Context

Three things this function must get right.

**Authorization is proven in the same query that fetches the resource.** One
round trip. The `workspaceId` predicate is the tenant boundary — dropping it is
the single most likely way to introduce a cross-tenant leak. Do not fetch the
project and then check membership separately.

**It throws, it never navigates.** No `notFound()` from `next/navigation`
anywhere in this file. That call is a Next navigation signal and cannot run
inside a WebSocket auth hook or an MCP tool. This is exactly why MCP grew a
parallel authorization implementation; do not repeat it. Task 08 translates
these errors to `notFound()` at the web boundary.

**Two distinct denials.** No role at all → `NotFoundError`, because the caller
must not learn the project exists. Has a role but lacks the permission →
`ForbiddenError`, because they already know it exists. Getting this backwards
leaks existence (AC-7).

---

## Step 1: Write the failing test

Create `src/server/authz/service.test.ts`:

```ts
import { afterAll, describe, expect, it, vi } from "vitest";
import { testDb } from "./test-support/db";
import {
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "./test-support/factories";

// The service imports the app db singleton, which throws without
// DATABASE_URL. Point it at the test database.
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

// Top level, NOT inside a describe. An afterAll registered inside a describe
// runs when that block finishes, which would disconnect the client before the
// later describes — and before the blocks task-07 appends to this file.
afterAll(async () => {
  await testDb.$disconnect();
});

describe("requireProjectPermission — workspace-visible projects", () => {
  it("allows an org member to read", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      name: "Backend Platform",
    });

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.read",
    );

    expect(result.id).toBe(project.id);
    expect(result.name).toBe("Backend Platform");
    expect(result.visibility).toBe("workspace");
    expect(result.role).toBe("editor");
  });

  it("allows an org member to update", async () => {
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

  it("denies an editor member.manage with ForbiddenError", async () => {
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
        "member.manage",
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("requireProjectPermission — explicit member rows", () => {
  it("lets an explicit owner delete", async () => {
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

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.delete",
    );

    expect(result.role).toBe("owner");
  });

  it("denies a viewer a mutation even on a workspace-visible project", async () => {
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

  it("still lets a viewer read", async () => {
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

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.read",
    );

    expect(result.role).toBe("viewer");
  });

  it("only consults the calling user's row", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: alice.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: alice.id,
      role: "owner",
    });
    await makeProjectMember({
      projectId: project.id,
      userId: bob.id,
      role: "viewer",
    });

    const bobResult = await requireProjectPermission(
      principal(bob.id, ws.id),
      project.id,
      "project.read",
    );

    expect(bobResult.role).toBe("viewer");
  });
});

describe("requireProjectPermission — private projects", () => {
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

  it("grants access to an explicit member", async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    await makeProjectMember({
      projectId: project.id,
      userId: owner.id,
      role: "owner",
    });

    const result = await requireProjectPermission(
      principal(owner.id, ws.id),
      project.id,
      "project.delete",
    );

    expect(result.role).toBe("owner");
  });
});

describe("requireProjectPermission — org admin floor", () => {
  it("lets an admin reach a private project they are not a member of", async () => {
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

  it("resolves an admin as owner even with an explicit viewer row", async () => {
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: admin.id,
      visibility: "private",
    });
    await makeProjectMember({
      projectId: project.id,
      userId: admin.id,
      role: "viewer",
    });

    const result = await requireProjectPermission(
      principal(admin.id, ws.id, "org:admin"),
      project.id,
      "member.manage",
    );

    expect(result.role).toBe("owner");
  });
});

describe("requireProjectPermission — tenant isolation (AC-7)", () => {
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

  it("does not leak existence via ForbiddenError across workspaces", async () => {
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
        "project.delete",
      ),
    ).rejects.not.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for an id that does not exist", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        "project_does_not_exist",
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("even an org admin cannot cross a workspace boundary", async () => {
    const admin = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: admin.id,
    });

    await expect(
      requireProjectPermission(
        principal(admin.id, ownWs.id, "org:admin"),
        project.id,
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
```

## Step 2: Run the test and confirm it fails

```bash
pnpm vitest run src/server/authz/service.test.ts
```

Expected: failure resolving `./service`.

## Step 3: Write the implementation

Create `src/server/authz/service.ts`:

```ts
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
```

## Step 4: Run the test and confirm it passes

```bash
pnpm vitest run src/server/authz/service.test.ts
```

Expected: PASS, 16 tests.

## Step 5: Confirm the whole authz module passes

```bash
pnpm vitest run src/server/authz
```

Expected: PASS — 12 (task 01) + 16 (task 02) + 7 (task 05) + 5 (task 04) + 16
(here) = 56 tests.

## Step 6: Lint and commit

```bash
pnpm lint
git add src/server/authz/service.ts src/server/authz/service.test.ts
git commit -m "feat(authz): add requireProjectPermission

Authorization is proven in the same query as the fetch. No role resolves to
NotFoundError so existence is never disclosed; insufficient permission
resolves to ForbiddenError."
```

## Step 7: Update progress

In [`progress.md`](./progress.md), set task 06 to `done` with the commit SHA and
date, tick AC-7, and append a log entry.

## Done when

- [ ] `service.test.ts` passes with 16 tests
- [ ] `pnpm vitest run src/server/authz` passes with 56 tests
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated, AC-7 ticked

## Do not

- Import `notFound` or anything from `next/navigation` in `service.ts`
- Split the fetch and the authorization check into two queries
- Omit `workspaceId` from the `where` clause
- Throw `ForbiddenError` when the role is `null` — that leaks existence
- Return the raw Prisma row; return the `AuthorizedProject` shape so callers cannot depend on `members`
- Add file or folder functions here — that is task 07

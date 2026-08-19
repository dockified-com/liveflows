# Task 07 — `requireFilePermission` and `requireFolderPermission`

**Wave:** 4 (parallel with task-08)
**Depends on:** task-06 (`service.ts` must exist and be committed)
**Database:** yes — test Postgres
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Extend the service so files and folders inherit their project's permissions
(AC-5). Both walk the relation in a single query.

## Files

- **Modify:** `src/server/authz/service.ts` (append only — do not touch `requireProjectPermission`)
- **Modify:** `src/server/authz/service.test.ts` (append only)

Do not modify any DAL file. Task-08 runs concurrently and owns `projects.ts`.

## Interfaces

**Consumes:** everything task-06 imported, plus `makeFile` and `makeFolder` from
`./test-support/factories`.

**Produces** — task-09 depends on these:

```ts
type AuthorizedFile = {
  id: string;
  name: string;
  type: string;
  projectId: string;
  folderId: string | null;
  role: ProjectRole;
}
requireFilePermission(
  principal: Principal,
  fileId: string,
  permission: ProjectPermission,
): Promise<AuthorizedFile>

type AuthorizedFolder = {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  role: ProjectRole;
}
requireFolderPermission(
  principal: Principal,
  folderId: string,
  permission: ProjectPermission,
): Promise<AuthorizedFolder>
```

## Context

**Files and folders have no ACL of their own.** Permission is always resolved
from the parent project. This is deliberate and keeps authorization predictable
— see `docs/features/authorization/requirements.md`.

**The tenant predicate is nested.** Where `requireProjectPermission` filters on
`workspaceId` directly, these filter through the relation:

```ts
where: { id: fileId, project: { workspaceId: principal.workspaceId } }
```

That exact predicate already appears four times in the existing
`src/server/dal/files.ts`, so you are following a established pattern, not
inventing one.

**Parallel-safety.** You are appending to `service.ts` while task-08 reads it.
No file collision, but both run database tests. Keep every test
workspace-scoped — no truncation, no unscoped counts.

---

## Step 1: Extend the test imports

In `src/server/authz/service.test.ts`, add `makeFile` and `makeFolder` to the
existing factories import, and the two new functions to the `./service` import:

```ts
import {
  makeFile,
  makeFolder,
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "./test-support/factories";

const {
  requireFilePermission,
  requireFolderPermission,
  requireProjectPermission,
} = await import("./service");
```

## Step 2: Append the failing tests

Add to the end of `src/server/authz/service.test.ts`:

```ts
describe("requireFilePermission", () => {
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
      name: "architecture",
    });

    const result = await requireFilePermission(
      principal(user.id, ws.id),
      file.id,
      "file.update",
    );

    expect(result.id).toBe(file.id);
    expect(result.name).toBe("architecture");
    expect(result.projectId).toBe(project.id);
    expect(result.type).toBe("canvas");
    expect(result.role).toBe("editor");
  });

  it("reports the containing folder", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      folderId: folder.id,
    });

    const result = await requireFilePermission(
      principal(user.id, ws.id),
      file.id,
      "file.read",
    );

    expect(result.folderId).toBe(folder.id);
  });

  it("reports null for a file at the project root", async () => {
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
      "file.read",
    );

    expect(result.folderId).toBeNull();
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

  it("denies a viewer file.delete", async () => {
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
      requireFilePermission(principal(user.id, ws.id), file.id, "file.delete"),
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

  it("lets an org admin update a file in a private project", async () => {
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

    const result = await requireFilePermission(
      principal(admin.id, ws.id, "org:admin"),
      file.id,
      "file.update",
    );

    expect(result.role).toBe("owner");
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

  it("throws NotFoundError for an id that does not exist", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();

    await expect(
      requireFilePermission(
        principal(user.id, ws.id),
        "file_does_not_exist",
        "file.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("requireFolderPermission", () => {
  it("lets an editor update a folder", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id, name: "infra" });

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      folder.id,
      "folder.update",
    );

    expect(result.id).toBe(folder.id);
    expect(result.name).toBe("infra");
    expect(result.projectId).toBe(project.id);
    expect(result.parentId).toBeNull();
    expect(result.role).toBe("editor");
  });

  it("reports the parent folder for a nested folder", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const parent = await makeFolder({ projectId: project.id });
    const child = await makeFolder({
      projectId: project.id,
      parentId: parent.id,
    });

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      child.id,
      "folder.read",
    );

    expect(result.parentId).toBe(parent.id);
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

  it("still lets a viewer read a folder", async () => {
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

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      folder.id,
      "folder.read",
    );

    expect(result.role).toBe("viewer");
  });

  it("hides a folder in a private project from a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const folder = await makeFolder({ projectId: project.id });

    await expect(
      requireFolderPermission(
        principal(outsider.id, ws.id),
        folder.id,
        "folder.read",
      ),
    ).rejects.toThrow(NotFoundError);
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

## Step 3: Run the tests and confirm they fail

```bash
pnpm vitest run src/server/authz/service.test.ts
```

Expected: failure because `requireFilePermission` is not exported.

## Step 4: Append the implementation

Add to the end of `src/server/authz/service.ts`:

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
```

## Step 5: Run the tests and confirm they pass

```bash
pnpm vitest run src/server/authz/service.test.ts
```

Expected: PASS, 31 tests (16 from task-06, 15 here).

## Step 6: Confirm the whole authz module passes

```bash
pnpm vitest run src/server/authz
```

Expected: PASS, 71 tests.

## Step 7: Lint and commit

```bash
pnpm lint
git add src/server/authz/service.ts src/server/authz/service.test.ts
git commit -m "feat(authz): add file and folder permission checks

Files and folders inherit project permissions; no per-resource ACL."
```

## Step 8: Update progress

In [`progress.md`](./progress.md), set task 07 to `done` with the commit SHA and
date, tick AC-5, and append a log entry.

## Done when

- [ ] `service.test.ts` passes with 31 tests
- [ ] `pnpm vitest run src/server/authz` passes with 71 tests
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated, AC-5 ticked

## Do not

- Modify `requireProjectPermission` — append only
- Add a `FileMember` or `FolderMember` model, or any per-file permission concept
- Use `findUnique` by id without the nested workspace predicate
- Import `notFound` from `next/navigation`
- Touch any file in `src/server/dal/` — task-08 is running concurrently
- Add a truncating `beforeEach` — it would break task-08's concurrent run

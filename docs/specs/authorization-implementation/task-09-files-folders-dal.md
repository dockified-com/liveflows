# Task 09 — Enforce permissions in `files.ts` and `folders.ts`

**Wave:** 5 (runs alone, final task)
**Depends on:** task-07 (`requireFilePermission`, `requireFolderPermission` committed)
**Database:** yes — test Postgres
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Wire authorization into the file and folder DAL — the last enforcement gap.
After this, every project, folder, and file operation checks a permission.
Neither file currently has any test coverage.

## Files

- **Modify:** `src/server/dal/files.ts`
- **Modify:** `src/server/dal/folders.ts`
- **Create:** `src/server/dal/__tests__/files-authz.test.ts`

## Interfaces

**Consumes:**

```ts
// files.ts
import { principalFromSession } from "../authz/principal";
import { requireFilePermission, requireProjectPermission } from "../authz/service";
import { ForbiddenError, NotFoundError } from "./errors";

// folders.ts
import { principalFromSession } from "../authz/principal";
import { requireFolderPermission, requireProjectPermission } from "../authz/service";
import { NotFoundError } from "./errors";
```

**Produces:** no signature changes.

## Context

**Read both files in full first.** `files.ts` is 258 lines with five exported
functions; `folders.ts` is 194 lines with four.

### Permission mapping — apply exactly this

| Function | Permission | Checked against | Line |
|---|---|---|---|
| `createFile` | `file.create` | project (`projectId` arg) | 22 |
| `renameFile` | `file.update` | file | 108 |
| `moveFile` | `file.update` | file | 148 |
| `deleteFile` | `file.delete` | file | 194 |
| `getFileWithSnapshot` | `file.read` | file | 223 |
| `createFolder` | `folder.create` | project (`projectId` arg) | 22 |
| `renameFolder` | `folder.update` | folder | 63 |
| `moveFolder` | `folder.update` | folder | 92 |
| `deleteFolder` | `folder.delete` | folder | 156 |

Creates check the **project** because the file or folder does not exist yet.
Everything else checks the resource itself.

### Error translation

Same split as task-08, for the same reason:

- **`getFileWithSnapshot`** is a read path rendering a page — convert both
  `NotFoundError` and `ForbiddenError` to `notFound()`.
- **Every other function** is a mutation — convert only `NotFoundError`; let
  `ForbiddenError` propagate so the server action can report a real message.

### Three traps specific to these files

**`moveFolder` has an advisory-lock transaction at line 114.** Put the
permission check *before* it, right after the existing folder fetch. Never
authorize inside a transaction that holds a lock — it lengthens lock hold time
for no benefit.

**`createFile` already reads `auth()` for `orgId` and `userId`** (line 30) and
provisions a Liveblocks room with rollback on failure (lines 76-105). Leave all
of that alone. Your check goes after the existing project fetch.

**`folders.ts` does not currently import `auth`.** It does not need to —
`principalFromSession` calls it internally.

Do not "fix" the dead try/catch around `decommissionRoom`. It never throws, but
that cleanup is out of scope for this batch.

---

## Step 1: Add the imports

To `src/server/dal/files.ts`:

```ts
import { principalFromSession } from "../authz/principal";
import {
  requireFilePermission,
  requireProjectPermission,
} from "../authz/service";
import { ForbiddenError, NotFoundError } from "./errors";
```

To `src/server/dal/folders.ts`:

```ts
import { principalFromSession } from "../authz/principal";
import {
  requireFolderPermission,
  requireProjectPermission,
} from "../authz/service";
import { NotFoundError } from "./errors";
```

## Step 2: Gate the four file-scoped functions

For `renameFile`, `moveFile`, and `deleteFile`, insert immediately after the
existing `const workspace = await requireWorkspace(workspaceSlug);` line, using
the permission from the mapping table:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.update");
  } catch (error) {
    // Mutation: NotFound becomes a 404, but ForbiddenError propagates so the
    // server action can report why.
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
```

Use `"file.delete"` in `deleteFile`.

For `getFileWithSnapshot`, use `"file.read"` and convert both errors:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFilePermission(principal, fileId, "file.read");
  } catch (error) {
    // Read path rendering a page: both denials render a 404.
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }
```

Leave every existing query, uniqueness pre-check, and room call untouched.

## Step 3: Gate `createFile` on the project

In `createFile`, insert after the existing project fetch and its
`if (!project) notFound();` (line 39):

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

## Step 4: Gate the folder functions

For `renameFolder` and `deleteFolder`, insert after `requireWorkspace`:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFolderPermission(principal, folderId, "folder.update");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
```

Use `"folder.delete"` in `deleteFolder`.

For `createFolder`, check the project after its existing project fetch:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireProjectPermission(principal, projectId, "folder.create");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
```

For `moveFolder`, the check goes after the destination-folder validation (line
109) and **before** `return db.$transaction(...)` at line 114:

```ts
  const principal = await principalFromSession(workspace.id);

  try {
    await requireFolderPermission(principal, folderId, "folder.update");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  // D43: Postgres advisory lock scoped to the project ...
  return db.$transaction(async (tx) => {
```

## Step 5: Write the tests

Create `src/server/dal/__tests__/files-authz.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "../../authz/test-support/db";
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

const { createFile, deleteFile, getFileWithSnapshot, renameFile } =
  await import("../files");
const { createFolder, deleteFolder, renameFolder } = await import(
  "../folders"
);
const { ForbiddenError } = await import("../errors");

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

/** Workspace-visible project plus a viewer row for the given user. */
async function projectWithViewer(userId: string, workspaceId: string) {
  const project = await makeProject({ workspaceId, createdById: userId });
  await makeProjectMember({
    projectId: project.id,
    userId,
    role: "viewer",
  });
  return project;
}

// Top level, NOT inside a describe. An afterAll registered inside a describe
// runs when that block finishes, which would disconnect the client before the
// "folders DAL authorization" block below.
afterAll(async () => {
  await testDb.$disconnect();
});

describe("files DAL authorization", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("lets an editor rename a file", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    const result = await renameFile(ws.slug, file.id, "renamed");

    expect(result.name).toBe("renamed");
  });

  it("refuses a rename by a viewer and leaves the name intact", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      name: "original",
    });
    signIn(user.id, ws);

    await expect(renameFile(ws.slug, file.id, "hacked")).rejects.toThrow(
      ForbiddenError,
    );

    const unchanged = await testDb.file.findUnique({
      where: { id: file.id },
      select: { name: true },
    });
    expect(unchanged?.name).toBe("original");
  });

  it("refuses a delete by a viewer and leaves the file in place", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    await expect(deleteFile(ws.slug, file.id)).rejects.toThrow(ForbiddenError);

    expect(
      await testDb.file.count({ where: { projectId: project.id } }),
    ).toBe(1);
  });

  it("refuses file creation by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    signIn(user.id, ws);

    await expect(
      createFile(ws.slug, project.id, null, "new-canvas", "canvas"),
    ).rejects.toThrow(ForbiddenError);

    expect(
      await testDb.file.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });

  it("lets an editor create a file", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    const file = await createFile(
      ws.slug,
      project.id,
      null,
      "diagram",
      "canvas",
    );

    expect(file.name).toBe("diagram");
    expect(file.projectId).toBe(project.id);
  });

  it("lets a viewer read a file", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      name: "readable",
    });
    signIn(user.id, ws);

    const result = await getFileWithSnapshot(ws.slug, file.id);

    expect(result.name).toBe("readable");
  });

  it("404s a file in a private project for a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(outsider.id, ws);

    await expect(renameFile(ws.slug, file.id, "x")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s a private file read for a non-member rather than erroring", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(outsider.id, ws);

    await expect(getFileWithSnapshot(ws.slug, file.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("lets an org admin rename a file in a private project", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(admin.id, ws, "org:admin");

    const result = await renameFile(ws.slug, file.id, "admin-renamed");

    expect(result.name).toBe("admin-renamed");
  });
});

describe("folders DAL authorization", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("lets an editor rename a folder", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws);

    const result = await renameFolder(ws.slug, folder.id, "renamed");

    expect(result.name).toBe("renamed");
  });

  it("refuses a folder rename by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const folder = await makeFolder({ projectId: project.id, name: "keep" });
    signIn(user.id, ws);

    await expect(renameFolder(ws.slug, folder.id, "hacked")).rejects.toThrow(
      ForbiddenError,
    );

    const unchanged = await testDb.folder.findUnique({
      where: { id: folder.id },
      select: { name: true },
    });
    expect(unchanged?.name).toBe("keep");
  });

  it("refuses a folder delete by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws);

    await expect(deleteFolder(ws.slug, folder.id)).rejects.toThrow(
      ForbiddenError,
    );

    expect(
      await testDb.folder.count({ where: { projectId: project.id } }),
    ).toBe(1);
  });

  it("refuses folder creation by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    signIn(user.id, ws);

    await expect(
      createFolder(ws.slug, project.id, null, "new-folder"),
    ).rejects.toThrow(ForbiddenError);

    expect(
      await testDb.folder.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });

  it("lets an editor delete a folder", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws);

    await deleteFolder(ws.slug, folder.id);

    expect(
      await testDb.folder.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });
});
```

## Step 6: Run the tests

```bash
pnpm vitest run src/server/dal/__tests__/files-authz.test.ts
```

Expected: PASS, 14 tests.

## Step 7: Run the entire suite

```bash
pnpm test -- --run
```

Expected: PASS. If a pre-existing mocked test fails because it now needs
`projectMember` or `$transaction` on its `db` mock, extend the mock. Do not
revert enforcement and do not skip the test.

## Step 8: Verify the build

```bash
pnpm build
```

Expected: success.

## Step 9: Lint and commit

```bash
pnpm lint
git add src/server/dal/files.ts src/server/dal/folders.ts src/server/dal/__tests__/files-authz.test.ts
git commit -m "feat(authz): enforce file and folder permissions in the DAL

Completes the authorization foundation: every project, folder, and file
operation now checks a permission through the central service."
```

## Step 10: Final verification and progress

Fill in the final verification section of [`progress.md`](./progress.md):

```bash
pnpm lint
pnpm test -- --run
pnpm build
```

Then AC-13 against a **copy** of production, never production itself:

```bash
psql "$DIRECT_URL" -c 'SELECT visibility, count(*) FROM "Project" GROUP BY visibility;'
```

Expected: one row, `workspace`, count equal to the total project count. A
`private` row means something set visibility during implementation, which this
batch must not do.

Set task 09 to `done`, tick AC-4, mark the feature complete, and append a log
entry.

## Done when

- [ ] `files-authz.test.ts` passes with 14 tests
- [ ] `pnpm test -- --run` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` final verification filled in, AC-4 ticked

## Do not

- Change any exported function signature
- Authorize inside `moveFolder`'s `$transaction` — the check goes before it
- Convert `ForbiddenError` to `notFound()` in a mutation (only `getFileWithSnapshot` does that)
- Remove or alter `createFile`'s room-provisioning rollback
- "Fix" the dead try/catch around `decommissionRoom` — out of scope
- Use unscoped `count()` calls
- Add a truncating `beforeEach`

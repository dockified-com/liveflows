# Task 04 — Database-backed test harness

**Wave:** 2 (parallel with task-02)
**Depends on:** task-03 (`ProjectMember` and `Project.visibility` must exist)
**Database:** yes — establishes the test Postgres pattern
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Make database-backed tests possible. Two things currently block them, and this
task fixes both, then adds a client and factories every later task uses.

## Files

- **Modify:** `vitest.config.ts`
- **Create:** `src/server/authz/test-support/db.ts`
- **Create:** `src/server/authz/test-support/factories.ts`
- **Create:** `src/server/authz/test-support/harness.test.ts`

Do not modify `vitest.unit.config.ts`, `vitest.global-setup.ts`, or `src/server/db.ts`.

## Interfaces

**Consumes:** `TEST_DATABASE_URL`, already set by both Vitest projects.

**Produces** — tasks 06, 07, 08, 09 import these exact names:

```ts
// from ./test-support/db
testDb                     // PrismaClient bound to the test database

// from ./test-support/factories
makeUser(overrides?: { id?: string; email?: string }): Promise<{ id: string }>
makeWorkspace(overrides?: { slug?: string }): Promise<{ id: string; slug: string }>
makeProject(args: { workspaceId: string; createdById: string; visibility?: string; name?: string }): Promise<{ id: string }>
makeProjectMember(args: { projectId: string; userId: string; role: string }): Promise<void>
makeFolder(args: { projectId: string; parentId?: string | null; name?: string }): Promise<{ id: string }>
makeFile(args: { projectId: string; createdById: string; folderId?: string | null; name?: string; type?: string }): Promise<{ id: string }>
```

**There is deliberately no `resetDb`.** See the isolation note below.

## Context

Two blockers, both real:

1. **`vitest.config.ts` declares no `globalSetup`** even though
   `vitest.global-setup.ts` exists at the repo root and starts the test
   Postgres via `docker-compose.test.yml` plus `prisma db push`. So `pnpm test`
   currently never starts the database.
2. **`src/server/db.ts` throws if `DATABASE_URL` is unset**, but the Vitest
   projects set `TEST_DATABASE_URL`. Tests therefore cannot import the app
   singleton and must build their own client.

There are no database-backed tests in this repo yet. Every existing test is
fully mocked. You are establishing the pattern, not following one.

### Isolation: no truncation, ever

Multiple agents may run tests concurrently against the same Postgres on port
5433 (wave 4 runs two tasks in parallel). A truncating `beforeEach` would wipe
another agent's data mid-run and produce failures that look like logic bugs.

So every test creates its own `Workspace` and asserts only within it. Factories
generate unique ids, so parallel runs cannot collide. Rows accumulate across
runs; that is fine, because the test Postgres uses `tmpfs` and is discarded when
the container stops.

This is why no `resetDb` helper exists. Do not add one.

---

## Step 1: Wire `globalSetup` into `vitest.config.ts`

Add `globalSetup` at the **root** `test` level, as a sibling of `projects` —
not inside either project block. Change:

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

Leave both project blocks otherwise unchanged, including their
`TEST_DATABASE_URL` env entries.

## Step 2: Confirm the harness starts Postgres

Docker must be running.

```bash
pnpm vitest run src/server/authz/permissions.test.ts
```

Expected output order: `docker compose` starting `postgres-test`, then
`prisma db push`, then task-01's tests passing.

If Docker is not running, start it. If `prisma db push` hangs, you are pointed
at a pooler rather than the test container — check `vitest.global-setup.ts`.

## Step 3: Write the test database client

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
 *
 * There is deliberately no resetDb() helper. Tests are workspace-scoped so
 * that parallel agents can share this database safely — truncating shared
 * tables would wipe a concurrent run. See AGENT-BRIEFING.md section 7.
 */
const connectionString =
  process.env.TEST_DATABASE_URL ??
  "postgresql://test:test@localhost:5433/liveflows_test";

export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
```

## Step 4: Write the factories

Create `src/server/authz/test-support/factories.ts`:

```ts
import { testDb } from "./db";

/**
 * Factories for authorization tests.
 *
 * Every id is unique per process and per call, so concurrent test runs against
 * the same database cannot collide. Tests scope their assertions to the
 * workspace they created rather than truncating shared tables.
 */

let counter = 0;

function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${process.pid}_${counter}_${Date.now()}`;
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
      // directoryKey denormalises the parent scope so a single query proves
      // name uniqueness. Format: "<projectId>:<parentId|ROOT>".
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

Files under `test-support/` do not end in `.test.ts`, so Vitest will not collect
`db.ts` or `factories.ts` as suites.

## Step 5: Prove the harness works

Create `src/server/authz/test-support/harness.test.ts`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import { testDb } from "./db";
import {
  makeFile,
  makeFolder,
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "./factories";

describe("test harness", () => {
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("creates a project defaulting to workspace visibility", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    const found = await testDb.project.findUnique({
      where: { id: project.id },
      select: { visibility: true, workspaceId: true },
    });

    expect(found?.visibility).toBe("workspace");
    expect(found?.workspaceId).toBe(ws.id);
  });

  it("honours an explicit private visibility", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      visibility: "private",
    });

    const found = await testDb.project.findUnique({
      where: { id: project.id },
      select: { visibility: true },
    });

    expect(found?.visibility).toBe("private");
  });

  it("creates a project member row", async () => {
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

    const members = await testDb.projectMember.findMany({
      where: { projectId: project.id },
      select: { userId: true, role: true },
    });

    expect(members).toEqual([{ userId: user.id, role: "viewer" }]);
  });

  it("creates folders and files inside a project", async () => {
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

    const found = await testDb.file.findUnique({
      where: { id: file.id },
      select: { folderId: true, projectId: true, type: true },
    });

    expect(found).toEqual({
      folderId: folder.id,
      projectId: project.id,
      type: "canvas",
    });
  });

  // Isolation guarantee that wave 4's parallelism depends on.
  it("scopes each workspace independently", async () => {
    const user = await makeUser();
    const wsA = await makeWorkspace();
    const wsB = await makeWorkspace();
    await makeProject({ workspaceId: wsA.id, createdById: user.id });

    expect(
      await testDb.project.count({ where: { workspaceId: wsA.id } }),
    ).toBe(1);
    expect(
      await testDb.project.count({ where: { workspaceId: wsB.id } }),
    ).toBe(0);
  });
});
```

## Step 6: Run it

```bash
pnpm vitest run src/server/authz/test-support/harness.test.ts
```

Expected: PASS, 5 tests. This confirms Postgres starts, the schema pushes,
`visibility` defaults correctly, task-03's `ProjectMember` exists, and the new
`createdBy` foreign key accepts factory data.

## Step 7: Confirm the whole suite still passes

```bash
pnpm test -- --run
```

Expected: PASS. Adding `globalSetup` now starts Docker for every run, which is
new but should not break the existing mocked tests.

## Step 8: Lint and commit

```bash
pnpm lint
git add vitest.config.ts src/server/authz/test-support
git commit -m "test(authz): wire vitest globalSetup and add db test harness

vitest.config.ts declared no globalSetup despite vitest.global-setup.ts
existing, so pnpm test never started the test Postgres. Tests are
workspace-scoped rather than truncating so parallel runs can share the
database."
```

## Step 9: Update progress

In [`progress.md`](./progress.md), set task 04 to `done` with the commit SHA and
date, and append a log entry.

## Done when

- [ ] `globalSetup` at root level in `vitest.config.ts`
- [ ] `harness.test.ts` passes with 5 tests
- [ ] `pnpm test -- --run` passes
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated

## Do not

- Add a `resetDb` helper or any `deleteMany` / `TRUNCATE` in a `beforeEach` — it breaks parallel agents
- Put `globalSetup` inside the project blocks (legal, but runs docker and `db push` twice)
- Modify `src/server/db.ts` to read `TEST_DATABASE_URL` — production code must not know about tests
- Import `db` from `src/server/db.ts` in a test — it throws without `DATABASE_URL`
- Use fixed ids like `"user_1"` in factories — parallel runs would collide on the primary key

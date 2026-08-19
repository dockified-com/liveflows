# Agent Briefing — Authorization Implementation

**Read this before starting any task file in this folder.** It carries the
conventions, invariants, and source-file context that apply to all nine tasks.
You are implementing one task; this document is the shared ground truth.

---

## 1. What you are building

LiveFlows is a collaborative diagramming app. Right now authorization is
binary: you are in a Clerk organization or you are not. Every organization
member has full write access to every project, folder, and file.

You are adding three project roles — `owner`, `editor`, `viewer` — enforced by
one central service, with folders and files inheriting their project's
permissions.

Full spec: [`docs/specs/0005-authorization.md`](../0005-authorization.md).

## 2. The model you are implementing

Effective role resolves in this precedence order:

```
1. org:admin                 → owner        (floor, unconditional)
2. explicit ProjectMember    → that role    (override, including downgrade)
3. visibility = "workspace"  → editor       (default = today's behavior)
4. visibility = "private"    → no access    (invisible, 404)
```

Two properties that are easy to get wrong:

- **The admin check is a FLOOR, not a fallback.** It runs first and cannot be
  overridden by a lower explicit row. Without that ordering, downgrading the
  last admin on a private project is unrecoverable in-app, because a `viewer`
  holds neither `member.manage` nor `project.update`.
- **`ProjectMember` is an override table, not an allow-list.** A project with
  zero rows is fully functional. This is what makes the migration zero-backfill.

Permission matrix:

| Permission | owner | editor | viewer |
|---|---|---|---|
| `project.read` | ✓ | ✓ | ✓ |
| `project.update` | ✓ | ✓ | — |
| `project.delete` | ✓ | — | — |
| `member.read` | ✓ | ✓ | ✓ |
| `member.manage` | ✓ | — | — |
| `folder.read` | ✓ | ✓ | ✓ |
| `folder.create` / `folder.update` / `folder.delete` | ✓ | ✓ | — |
| `file.read` | ✓ | ✓ | ✓ |
| `file.create` / `file.update` / `file.delete` | ✓ | ✓ | — |

Thirteen permissions total. An `editor` can rename a project but not delete
it. A `viewer` can see the member list.

## 3. Non-negotiable invariants

Violating any of these is a defect even if tests pass.

**Unauthorized means 404, never 403.** A resource the caller cannot reach must
be indistinguishable from one that does not exist. Cross-workspace ids
included. Never disclose existence.

**The service throws, it does not navigate.** `src/server/authz/service.ts`
throws plain `NotFoundError` / `ForbiddenError`. It must **never** call
`notFound()` from `next/navigation`, which the DAL currently does in 18
places. That call is a Next navigation signal and cannot run inside a
WebSocket auth hook or an MCP tool. This is precisely why MCP grew a parallel
authorization implementation — do not repeat it. The web DAL translates
service errors to `notFound()` at its own boundary.

**Authorization is proven in the same query that fetches the resource.** Never
a separate round trip. The `workspaceId` predicate (or nested
`project: { workspaceId }`) is the tenant boundary; dropping it is the single
most likely way to introduce a cross-tenant leak.

**Nothing authorization-related comes from the client.** Not role, not
permissions, not `workspaceId`, not membership. `orgId` / `orgSlug` / `orgRole`
come from `await auth()`. The URL slug is a label; the session is the authority.

**Roles are stored as `String`, never a Prisma enum.** The schema has zero
enums and the Clerk webhook stores org roles as opaque strings deliberately —
there is a test named for it. An unrecognized stored role must resolve to *no
access*, never a silent grant.

**Nothing outside `src/server/dal/` and `src/server/authz/` may call Prisma.**

## 4. Repo conventions

| Rule | Detail |
|---|---|
| Package manager | `pnpm` only. Never `npm` or `yarn`. |
| Lint / format | Biome: `pnpm lint`, `pnpm format`. Never ESLint or Prettier. |
| Test naming | `*.test.ts` → Vitest. `*.spec.ts` → Playwright. **Load-bearing:** a Playwright spec collected by Vitest fails in a way that looks like a broken test rather than a config error. |
| Prisma | v7, driver adapter mandatory (`@prisma/adapter-pg`). Generator is `prisma-client`, output checked in at `src/generated/prisma`. |
| Migrations | Need `DIRECT_URL` (session mode), not `DATABASE_URL` (pooler). |
| Middleware | The file is `src/proxy.ts`, not `middleware.ts` — Next.js 16 renamed it. |
| Commits | One per task, at the end. Run `pnpm lint` first. |

Stack is locked: Next.js 16, React 19, Tailwind v4, Clerk, Prisma 7, Vitest 4.
Do not introduce a UI library, an ORM helper, or a validation library that is
not already in `package.json`.

## 5. Source files you must read

Read these in full before writing code. They are short and the tasks reference
their exact behavior.

| File | Lines | Why |
|---|---|---|
| `src/server/dal/workspaces.ts` | 61 | `requireWorkspace` is the org boundary. **It does not change in this batch.** Note it authorizes off the Clerk session alone and never reads `WorkspaceMember`. |
| `src/server/dal/errors.ts` | 13 | `NotFoundError` and `UnauthorizedError` already exist. Task 05 appends `ForbiddenError`. |
| `prisma/schema.prisma` | 144 | Especially `User` (10-19), `Workspace` (21-30), `WorkspaceMember` (32-42), `Project` (44-56), `Folder` (58-77), `File` (79-100). |
| `src/server/db.ts` | 21 | The app Prisma singleton. **Throws if `DATABASE_URL` is unset** — this is why tests build their own client. |

If your task modifies a DAL file, read that file in full first. `projects.ts`
is 171 lines, `files.ts` ~258, `folders.ts` ~193.

## 6. Things about this repo that will surprise you

**There are no database-backed tests yet.** Every existing test is fully
mocked — `src/server/dal/__tests__/workspaces.test.ts` mocks Clerk,
`next/navigation`, and `../../db`. Task 04 establishes the DB-backed pattern.
Do not assume one exists.

**`vitest.config.ts` declares no `globalSetup`** even though
`vitest.global-setup.ts` exists at the repo root and starts the test Postgres.
So `pnpm test` currently does **not** start the database. Task 04 fixes this.
Until then, DB-backed tests cannot pass.

**`WorkspaceMember.role` is written but never read.** The Clerk webhook writes
it as an opaque string; zero code paths read it back. This batch does not
change that — `orgRole` comes from the live session instead.

**`Project.createdById` has no foreign key.** It is a bare `String` with no
relation and no index. Task 03 adds the relation, which can fail if any row
points at a missing `User`. That task includes the diagnostic.

**`decommissionRoom` never throws** — it swallows errors with `console.warn`.
The try/catch wrappers around it in `projects.ts:107`, `folders.ts:185`, and
`files.ts:205` are therefore dead code. Leave them; do not "fix" them in this
batch.

**AGENTS.md is stale on the data model.** It describes one canvas per project
and `CanvasSnapshot.viewBackgroundColor` as a flat column. Reality: `Folder`,
`File`, `CanvasSnapshot` keyed on `fileId`, `DocumentSnapshot`, and `appState`
as JSON. Trust `prisma/schema.prisma` over AGENTS.md.

## 7. Testing rules

**Tests must be workspace-scoped, never truncating.** Multiple agents may run
tests concurrently against the same Postgres on port 5433. Every test creates
its own `Workspace` via a factory and asserts only within it.

Do **not** write:

```ts
beforeEach(async () => {
  await testDb.project.deleteMany();   // WRONG — wipes a parallel agent's data
});
```

Do write:

```ts
const ws = await makeWorkspace();      // isolated scope
const project = await makeProject({ workspaceId: ws.id, createdById: user.id });
// assert on ws.id / project.id only
```

Count assertions must be scoped too:

```ts
// WRONG
expect(await testDb.project.count()).toBe(0);
// RIGHT
expect(await testDb.project.count({ where: { workspaceId: ws.id } })).toBe(0);
```

**TDD order, every task:** write the failing test → run it and confirm it
fails for the expected reason → write the minimal implementation → run and
confirm it passes → lint → commit.

A test that passes before you write the implementation is testing nothing.
Confirm the failure message matches what you expect.

## 8. When you finish

1. `pnpm lint` — must be clean.
2. Run your task's tests plus the existing suite for files you touched.
3. Commit with the message given in your task file.
4. Update [`progress.md`](./progress.md): set your task's status, date, commit
   SHA, and note anything the next agent needs to know.

## 9. When to stop and ask

Stop and report rather than improvising if:

- A migration would delete or modify existing data (this batch must be purely additive).
- A test only passes if you weaken an assertion.
- You need to change a file your task's **Files** section does not list.
- Making your task work seems to require changing `requireWorkspace`.
- An existing test breaks and the fix is not obviously a mock needing a new
  Prisma model.

Report what you found, what you tried, and what you think the right call is.
Do not silently expand scope, and do not disable a failing test.

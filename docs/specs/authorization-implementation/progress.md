# Authorization Implementation — Progress

Single source of truth for this feature's implementation status. Agents update
their own row and the log at the bottom when they finish a task.

**Feature:** Authorization foundation (phases 1–2 of [`docs/specs/0005-authorization.md`](../0005-authorization.md))
**Started:** not yet
**Status:** `not started`

## Status board

| Task | Deliverable | Wave | Status | Commit | Date |
|---|---|---|---|---|---|
| [01](./task-01-permission-map.md) | `permissions.ts` — role→permission map, `can()` | 1 | `not started` | — | — |
| [02](./task-02-role-resolution.md) | `resolve.ts` — precedence chain, admin floor | 2 | `not started` | — | — |
| [03](./task-03-schema-migration.md) | `ProjectMember`, `Project.visibility` | 1 | `not started` | — | — |
| [04](./task-04-test-harness.md) | vitest `globalSetup`, test client, factories | 2 | `not started` | — | — |
| [05](./task-05-principal.md) | `ForbiddenError`, `principalFromSession` | 1 | `not started` | — | — |
| [06](./task-06-project-permission.md) | `requireProjectPermission` | 3 | `not started` | — | — |
| [07](./task-07-file-folder-permission.md) | `requireFilePermission`, `requireFolderPermission` | 4 | `not started` | — | — |
| [08](./task-08-projects-dal.md) | enforce in `projects.ts` | 4 | `not started` | — | — |
| [09](./task-09-files-folders-dal.md) | enforce in `files.ts`, `folders.ts` | 5 | `not started` | — | — |

Status values: `not started` · `in progress` · `blocked` · `done`

## Wave gate

Do not start a wave until every task in the previous wave is `done` and its
tests pass.

| Wave | Tasks | Parallel? | Gate |
|---|---|---|---|
| 1 | 01, 03, 05 | yes, 3 agents | — |
| 2 | 02, 04 | yes, 2 agents | wave 1 done |
| 3 | 06 | no | wave 2 done |
| 4 | 07, 08 | yes, 2 agents | wave 3 done |
| 5 | 09 | no | wave 4 done |

## Acceptance criteria

Ticked only when a test proves it, not when the code looks right.

| AC | Requirement | Proven by | Status |
|---|---|---|---|
| AC-1 | Explicit `ProjectMember` row overrides the workspace default | `resolve.test.ts` | ☐ |
| AC-2 | `visibility=workspace` grants `editor`; `private` denies without a row | `resolve.test.ts` | ☐ |
| AC-3 | `org:admin` resolves to at least `owner` regardless of visibility or row | `resolve.test.ts`, `service.test.ts`, DAL suites | ☐ |
| AC-4 | Every permission decision routes through one service | code review + DAL suites | ☐ |
| AC-5 | Folders and files inherit project permissions | `service.test.ts` | ☐ |
| AC-7 | Unauthorized returns `NotFoundError`, never `ForbiddenError` | `service.test.ts` | ☐ |
| AC-13 | Applying the migration changes no existing user's access | task 03 SQL review + production-copy query | ☐ |

AC-6, AC-8, AC-9, AC-10, AC-11, AC-12 are out of scope for this batch — see
[README](./README.md) for which phase owns them.

## Final verification

Run after task 09. All three must pass before this feature is considered done.

```bash
pnpm lint
pnpm test -- --run
pnpm build
```

Then AC-13 against a **copy** of production, never production:

```bash
psql "$DIRECT_URL" -c 'SELECT visibility, count(*) FROM "Project" GROUP BY visibility;'
```

Expected: one row, `workspace`, count equal to the total project count. A
`private` row means something set visibility during implementation, which this
batch must not do.

| Check | Status | Notes |
|---|---|---|
| `pnpm lint` clean | ☐ | |
| `pnpm test -- --run` green | ☐ | |
| `pnpm build` succeeds | ☐ | |
| AC-13 verified on production copy | ☐ | |

## Known risks

Carried from the spec. Update if one materializes.

| Risk | Detail | Owner |
|---|---|---|
| `createdById` orphans | The column never had a foreign key. Task 03's new relation fails if any row points at a missing `User`. Diagnostic is in that task. | task 03 |
| No DB test pattern exists | Every current test is fully mocked, and `vitest.config.ts` declares no `globalSetup`, so `pnpm test` never starts the test Postgres. | task 04 |
| Existing mocked tests may break | `projects.test.ts` mocks `db`; adding `$transaction` and `projectMember` usage may require extending that mock. Extend the mock, do not revert the feature. | tasks 08, 09 |
| Parallel test interference | Tests are workspace-scoped by design. A truncating `beforeEach` added later would break wave 4's concurrency. | all |

## Decisions log

Settled during design. Do not relitigate these mid-implementation; if one looks
wrong, stop and report.

| Decision | Rationale |
|---|---|
| Org-visible default, private opt-in | Zero backfill, no regression for the paying team, member UI not a launch blocker. |
| `editor` as the workspace default role | Exactly today's behavior, so applying the migration changes nobody's access. |
| `org:admin` is a floor, not a fallback | Prevents a private project becoming permanently orphaned when its last owner leaves. Admins can already delete the org via Clerk. |
| Roles as `String`, not a Prisma enum | Schema has zero enums; the Clerk webhook stores roles as opaque strings deliberately. Adding a custom role becomes a code change, not a migration. |
| Service throws, never navigates | `notFound()` cannot run in a WebSocket hook or MCP tool. This is why MCP grew a parallel authz path. |
| No member-management UI in this batch | Keeps the release from depending on invitation flows. Private projects are enforced but need DB access to configure. |

## Log

Append an entry per task. Keep it short — what shipped, and anything the next
agent needs to know.

```
(no entries yet)
```

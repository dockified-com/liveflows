# Authorization Implementation — Task Index

Nine self-contained task files for external coding agents. Each produces a
working, tested, committed deliverable.

**Every agent must read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) before starting any task.**
It carries the repo conventions, invariants, and must-read source files that
apply to all nine tasks.

Track status in [`progress.md`](./progress.md). Agents update it as they finish.

## Scope

Phases 1–2 of [`docs/specs/0005-authorization.md`](../0005-authorization.md):
schema, pure policy logic, the central authorization service, and the DAL
refactor. The result is enforced, tested authorization on every project,
folder, and file operation.

Covers acceptance criteria **AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-13**.

Not in this batch — each needs its own plan once this foundation is real:

| Phase | Contents | AC |
|---|---|---|
| 3 | Server-side discovery filtering | AC-6 |
| 4 | Frontend `authorization` field, provider, `can()`, hide-vs-disable | AC-8 |
| 5 | MCP rewrite, realtime contract, proxy + session-ownership fixes | AC-9…AC-12 |

## Execution waves

Tasks within a wave touch **no shared files** and may run concurrently.
Waves themselves are strictly ordered — do not start a wave until every task
in the previous one is committed and green.

```
Wave 1  ──┬── task-01-permission-map        (pure, no DB)
          ├── task-03-schema-migration      (migrates dev DB)
          └── task-05-principal             (pure, no DB)
                    │
Wave 2  ──┬── task-02-role-resolution       (needs 01)
          └── task-04-test-harness          (needs 03)
                    │
Wave 3  ───── task-06-project-permission    (needs 01,02,03,04,05)
                    │
Wave 4  ──┬── task-07-file-folder-permission (needs 06)
          └── task-08-projects-dal           (needs 06)
                    │
Wave 5  ───── task-09-files-folders-dal      (needs 07)
```

### Parallel dispatch table

| Wave | Run in parallel | Agents | Files touched (no overlap) |
|---|---|---|---|
| 1 | `task-01`, `task-03`, `task-05` | 3 | `authz/permissions.ts` · `prisma/schema.prisma` · `dal/errors.ts` + `authz/principal.ts` |
| 2 | `task-02`, `task-04` | 2 | `authz/resolve.ts` · `vitest.config.ts` + `authz/test-support/` |
| 3 | `task-06` alone | 1 | `authz/service.ts` |
| 4 | `task-07`, `task-08` | 2 | `authz/service.ts` · `dal/projects.ts` |
| 5 | `task-09` alone | 1 | `dal/files.ts` + `dal/folders.ts` |

Maximum useful concurrency is **3 agents** (wave 1).

### Wave 4 caveat

`task-07` appends to `src/server/authz/service.ts` while `task-08` only reads
it. They do not collide on files, but both run database tests. That is safe
here because tests are workspace-scoped — every test creates its own
`Workspace` and asserts only within it. **No test truncates shared tables.**
If you add a test, keep that property or wave 4 must go serial.

### Git concurrency

Two agents committing to the same working tree will race on `.git/index.lock`.
Pick one:

- **Separate worktrees (recommended for true parallelism)**
  ```bash
  git worktree add ../lf-task-01 -b feat/authz-task-01
  git worktree add ../lf-task-03 -b feat/authz-task-03
  git worktree add ../lf-task-05 -b feat/authz-task-05
  ```
  Merge in task-number order after the wave completes.
- **Shared tree, staggered commits** — agents run concurrently but commit one
  at a time. Simpler, slightly slower.

Note each worktree needs its own `pnpm install` and shares the same test
Postgres on port 5433, which is fine given workspace-scoped tests.

## Task list

| File | Deliverable | Depends on | DB? |
|---|---|---|---|
| [task-01-permission-map.md](./task-01-permission-map.md) | `permissions.ts` — role→permission map, `can()` | — | no |
| [task-02-role-resolution.md](./task-02-role-resolution.md) | `resolve.ts` — precedence chain, admin floor | 01 | no |
| [task-03-schema-migration.md](./task-03-schema-migration.md) | `ProjectMember`, `Project.visibility` | — | dev |
| [task-04-test-harness.md](./task-04-test-harness.md) | vitest `globalSetup`, test client, factories | 03 | test |
| [task-05-principal.md](./task-05-principal.md) | `ForbiddenError`, `principalFromSession` | — | no |
| [task-06-project-permission.md](./task-06-project-permission.md) | `requireProjectPermission` | 01–05 | test |
| [task-07-file-folder-permission.md](./task-07-file-folder-permission.md) | `requireFilePermission`, `requireFolderPermission` | 06 | test |
| [task-08-projects-dal.md](./task-08-projects-dal.md) | enforce in `projects.ts` | 06 | test |
| [task-09-files-folders-dal.md](./task-09-files-folders-dal.md) | enforce in `files.ts`, `folders.ts` | 07 | test |

## Reference documents

Agents should read these as needed. Ordered by how often they are useful.

| Document | Purpose |
|---|---|
[`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) | **Required.** Conventions, invariants, must-read source files. |
| [`docs/specs/0005-authorization.md`](../0005-authorization.md) | Full spec: 13 ACs, options considered, rationale for every decision. |
| [`docs/features/authorization/design.md`](../../features/authorization/design.md) | Technical design: module layout, API surface, invariants. |
| [`docs/features/authorization/requirements.md`](../../features/authorization/requirements.md) | Plain-language behavior. Useful for judging intent. |
| `AGENTS.md` (repo root) | Repo-wide stack rules. Note it is stale on the data model — the schema has `Folder`/`File`/`DocumentSnapshot` and `appState` as JSON. |

## Final verification

After task-09, run from the repo root:

```bash
pnpm lint
pnpm test -- --run
pnpm build
```

Then confirm AC-13 against a **copy** of production, never production:

```bash
psql "$DIRECT_URL" -c 'SELECT visibility, count(*) FROM "Project" GROUP BY visibility;'
```

Expected: a single row, `workspace`, count equal to the total project count.
Any `private` row means something set visibility during implementation, which
this batch must not do.

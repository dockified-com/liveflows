# Authorization and Permissions

**Status**: Approved, not yet implemented
**Spec**: [`docs/superpowers/specs/2026-08-19-authorization-design.md`](../../superpowers/specs/2026-08-19-authorization-design.md)
**Depends on**: nothing (ships independently)
**Depended on by**: [realtime-collaboration](../realtime-collaboration/README.md) consumes the realtime contract

## What this feature does

Gives projects `owner` / `editor` / `viewer` roles so a team can share a workspace without everyone holding full write on everything. Folders and files inherit their project's permissions. One authorization service is the sole authority, consumed identically by the web app, the realtime layer, and MCP.

## Why it exists

LiveFlows authorization is binary today: you are in a Clerk organization or you are not. Every organization member has full write access to every project, folder, and file. That was fine for a single-operator tool. It is not fine now that the product is sold to a paying team, where "let someone review a diagram without letting them change it" is a normal request.

`WorkspaceMember.role` is already written by the Clerk webhook and read by no code path. This feature makes it load-bearing for the first time.

## The model in one screen

```
Clerk                          LiveFlows
├── authentication            ├── project membership
├── user identity             ├── project roles
├── organizations             ├── resource permissions
├── org membership            ├── folder/file authorization (inherited)
├── invitations               ├── realtime authorization
└── org roles                 └── MCP authorization
```

Clerk decides who you are and which organization you are in. LiveFlows decides which resources you may touch.

```
Organization / Workspace
      │
      ▼
   Project ──── ProjectMember (owner | editor | viewer)
      │
      ├──── Folder ──── File      permissions inherit downward
      └──── File
```

### Effective role resolution

Precedence, evaluated in order:

```
1. org:admin                 → owner        (floor, unconditional)
2. explicit ProjectMember    → that role    (override, including downgrade)
3. visibility = "workspace"  → editor       (default, today's behavior)
4. visibility = "private"    → no access    (invisible, 404)
```

Two properties worth internalizing:

- **The admin bypass is a floor, not a fallback.** An `org:admin` resolves to `owner` even against an explicit `viewer` row. Without this, downgrading the last admin on a private project is unrecoverable in-app: a viewer holds neither `member.manage` nor `project.update`, so they cannot restore access or flip visibility back. It grants no new authority, since an `org:admin` can already delete the organization through Clerk.
- **`ProjectMember` is an override table, not an allow-list.** A project with no rows at all is fully functional. This is what makes the migration zero-backfill.

### Permission matrix

| Permission | owner | editor | viewer |
|---|---|---|---|
| `project.read` | yes | yes | yes |
| `project.update` | yes | yes | no |
| `project.delete` | yes | no | no |
| `member.read` | yes | yes | yes |
| `member.manage` | yes | no | no |
| `folder.read` | yes | yes | yes |
| `folder.create` / `folder.update` / `folder.delete` | yes | yes | no |
| `file.read` | yes | yes | yes |
| `file.create` / `file.update` / `file.delete` | yes | yes | no |

Roles are stored in Postgres. Role-to-permission mapping lives in application code as one frozen object. Postgres answers "which role," code answers "what does that role mean."

## Where the code lives

```
src/server/authz/
├── permissions.ts     # permission union, role → permission map, can()
├── principal.ts       # Principal type and edge adapters
├── resolve.ts         # effective-role resolution (pure, no I/O)
├── service.ts         # requireProjectPermission / requireFilePermission / requireFolderPermission
├── discovery.ts       # accessible-projects query fragment
├── realtime.ts        # authorizeRealtimeConnection contract
└── errors.ts          # ForbiddenError
```

Existing code this touches: `prisma/schema.prisma`, all five files in `src/server/dal/`, `src/server/mcp.ts`, `src/proxy.ts`, the project route and `project-workspace-view.tsx`, `vitest.config.ts`.

## Conventions to follow when working here

**The service throws, it does not navigate.** `service.ts` throws plain `NotFoundError` and `ForbiddenError`. It must never call `notFound()` from `next/navigation`, which the DAL currently does in 18 places (`src/server/dal/projects.ts:49` and equivalents). That call is a Next navigation signal and cannot run inside a Hocuspocus `onAuthenticate` hook or an MCP tool. This is exactly why MCP grew its own parallel authorization implementation. The web DAL translates service errors to `notFound()` at its own boundary.

**Unauthorized means 404, never 403.** A resource the caller cannot reach is indistinguishable from one that does not exist. Cross-workspace ids included. Do not leak existence.

**Authorization is proven in the same query as the fetch**, never as a separate round trip:

```ts
where: { id: fileId, project: { workspaceId: principal.workspaceId } }
```

That predicate is the tenant filter, already present at `files.ts:116,156,201,230`.

**Discovery filters in the database.** Never fetch everything and filter in the client. Use the exported `accessibleProjectsWhere(principal)` fragment so no caller hand-rolls it.

**Components check capabilities, not roles.** `can("project.delete")`, never `role === "owner"`. This is what makes custom roles a later non-event.

**The frontend is UX, the backend is security.** Hiding a button is never the enforcement. The same check runs in the server action and again at the socket.

**Nothing authorization-related is accepted from the client.** Not role, not permissions, not `workspaceId`, not membership. `orgId` and `orgSlug` come from `await auth()`; the URL slug is a label, the session is the authority.

## Build phases

Each is independently shippable.

| Phase | Contents |
|---|---|
| 1 | Schema (`ProjectMember`, `Project.visibility`, `createdById` relation) plus `permissions.ts` and `resolve.ts` with exhaustive unit tests. No behavior change. |
| 2 | `principal.ts`, `service.ts`, `errors.ts`; DAL refactor; wire `vitest.config.ts` globalSetup; add missing `files.ts` / `folders.ts` DAL tests. |
| 3 | `discovery.ts` applied to `listProjects` and every project-resolving read. |
| 4 | `authorization` field on project DAL responses, `ProjectAuthorizationProvider`, `usePermissions()`, hide-versus-disable across the UI. |
| 5 | `realtime.ts` contract (tested, no consumer), MCP rewritten onto the service, proxy exemption and session-ownership fixes. |

## Migration safety

Additive and zero-backfill. `ProjectMember` is new, `visibility` defaults to `"workspace"`, and the workspace default role is `editor` — exactly today's behavior. Applying the migration changes no user's effective access. Permissions only begin to bite when someone sets a project private or adds an explicit row.

This matters because there is a paying team on this codebase. A backfill that missed rows would mean real users silently losing access to real work.

## Bugs fixed as part of this feature

- **`/api/mcp/*` is not in `proxy.ts`'s public-route list** (`src/proxy.ts:14-19`) while the matcher includes `/(api|trpc)(.*)`, so `auth.protect()` should reject bearer-token clients before their own authentication runs. Read from the matcher, not confirmed with a live request — verify first.
- **`/api/mcp/message` never checks session ownership.** It validates the bearer token, then calls `activeTransports.get(sessionId)` and dispatches without confirming the session belongs to that token's user. Session ids are random UUIDs so this is not trivially exploitable, but the check is missing.
- **`vitest.config.ts` declares no `globalSetup`** despite `vitest.global-setup.ts` existing at the repository root, so `pnpm test` does not start the test Postgres. Blocks every database-backed test.

## Testing

Repository split is load-bearing: `*.test.ts` runs under Vitest, `*.spec.ts` under Playwright. `vitest.unit.config.ts:11-22` documents why — Vitest collecting a Playwright spec fails in a way that looks like a broken test rather than a configuration error.

- `permissions.test.ts`, `resolve.test.ts` — pure, no database. Every combination of organization role, visibility, and explicit row, including the admin floor beating an explicit viewer.
- `service.test.ts` — against the disposable `postgres:17` from `docker-compose.test.yml`. Cross-workspace ids must throw `NotFoundError`.
- `discovery.test.ts` — a private project absent for a non-member, present for an `org:admin`.
- `realtime.test.ts` — all four outcomes, with no Next request context and no Hocuspocus.

## Deliberately not in this feature

File and folder ACLs, custom roles, database-driven role definitions, permission-builder UI, teams and groups, guest access, public sharing, complex deny rules, ABAC, ReBAC, personal access token expiry and scopes, live invalidation of open realtime connections, audit logging, and user preferences storage.

Member-management UI is also not here. Until it ships, `ProjectMember` rows and visibility changes need direct database access, so private projects are unusable in-product. Every default path works untouched.

## Open items

- Audit logging for `org:admin` access to private projects. The floor is deliberate, but unlogged administrator access to a project marked private is a gap worth closing.
- `docs/scope/scope.md` has no permissions feature row. Permissions are net-new scope, neither planned nor deferred there.
- `src/server/rayu/` is an undocumented subsystem of nine source files, mentioned in neither AGENTS.md nor scope.md. Its authorization posture was not assessed.

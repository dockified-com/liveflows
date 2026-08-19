# Authorization and Permissions — Design

**Status**: Approved, not yet built
**Requirements**: [requirements.md](./requirements.md)
**Full spec**: [`docs/specs/0005-authorization.md`](../../specs/0005-authorization.md)
**Consumed by**: [realtime-collaboration](../realtime-collaboration/design.md)

## Where we start from

Authorization today is one function. `requireWorkspace` (`src/server/dal/workspaces.ts:12-38`) compares `auth().orgSlug` against the URL slug, redirects on mismatch, and lazily upserts the workspace row. Every DAL query then filters on `workspaceId` — directly, or through `project: { workspaceId }` for file- and folder-scoped calls — so cross-tenant ids return 404 rather than 403.

Inside a workspace there are no gradations. `provisionRoom` grants `groupsAccesses: { [workspaceId]: ["*:write"] }` (`src/server/liveblocks.ts:37`), and `/api/liveblocks-auth` issues an ID token asserting `groupIds: [workspace.id]` without ever seeing which room is being joined.

Two facts worth internalizing before touching anything:

- **`WorkspaceMember.role` has zero reads.** The Clerk webhook writes it as an opaque string, and nothing anywhere reads it back. This design makes it load-bearing for the first time, on the MCP path only.
- **MCP is already a second authorization surface.** All three tools in `src/server/mcp.ts` bypass the DAL, resolve a workspace by `slug` alone, and gate on `WorkspaceMember` row existence — so a token reaches every workspace its holder belongs to, with full write, regardless of active organization.

## Architecture

```
                        Clerk session
                              │
                    ┌─────────┴─────────┐
                    │                   │
            principalFromSession   principalFromToken
                    │                   │
                    └─────────┬─────────┘
                              │
                          Principal
                    { userId, workspaceId,
                      orgRole, source }
                              │
                    ┌─────────┴─────────┐
                    │  authz service    │
                    │  resolve → can()  │
                    └─────────┬─────────┘
                              │
        ┌─────────────┬───────┴───────┬─────────────┐
        │             │               │             │
     Web DAL    Server Actions   Realtime hook    MCP tools
        │                              │
   notFound()                  write / read / deny
```

One service, four consumers, no consumer reimplementing policy.

## Data model

Three changes to `prisma/schema.prisma`.

**`ProjectMember`** — new. An override table, not an allow-list:

```prisma
model ProjectMember {
  projectId String
  userId    String
  role      String   // "owner" | "editor" | "viewer"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@index([userId])
}
```

`@@index([userId])` makes "every project this user can reach" an indexed lookup rather than a scan. It is required by the discovery query, not optional.

**`Project.visibility`** — new column, `String @default("workspace")`, one of `"workspace"` or `"private"`. The default is the entire reason this migration needs no backfill.

**`Project.createdById`** — currently a bare `String` with no foreign key and no index (`prisma/schema.prisma:48`). Add the relation to `User`, since the creator receives an `owner` row and a dangling id makes that unreliable. `File.createdById` has the same latent issue; leave it, out of scope.

**Roles stay `String`, not a Prisma enum.** The schema has no enums (verified: zero `enum` declarations), and the Clerk webhook deliberately stores organization roles as opaque strings with a test named for it (`src/app/api/webhooks/clerk/__tests__/route.test.ts:381`). A TypeScript union gives compile-time safety where it matters; a string column makes adding a custom role a code change rather than a migration. Validate at the DAL boundary.

## Permission model

Thirteen permissions, one frozen definition in `src/server/authz/permissions.ts`:

```ts
type ProjectPermission =
  | "project.read" | "project.update" | "project.delete"
  | "member.read"  | "member.manage"
  | "folder.read"  | "folder.create"  | "folder.update" | "folder.delete"
  | "file.read"    | "file.create"    | "file.update"   | "file.delete";
```

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

Two calls settled during design, both deliberate: an `editor` holds `project.update`, so renaming a project is allowed while deletion is gated on `project.delete`; and a `viewer` holds `member.read`, so the member list is visible to everyone on the project.

Postgres answers *which role*. Application code answers *what that role means*. Do not build `roles` / `permissions` / `role_permissions` tables.

## Module structure

```
src/server/authz/
├── permissions.ts     # permission union, role → permission map, can()
├── principal.ts       # Principal type and the two edge adapters
├── resolve.ts         # effective-role resolution (pure, no I/O)
├── service.ts         # requireProjectPermission / requireFilePermission / requireFolderPermission
├── discovery.ts       # accessible-projects where fragment
├── realtime.ts        # authorizeRealtimeConnection contract
└── errors.ts          # ForbiddenError (NotFoundError already exists)
```

## Principal

```ts
type Principal = {
  userId: string;
  workspaceId: string;   // internal cuid, always server-resolved
  orgRole: string;       // "org:admin" | "org:member" | opaque future value
  source: { type: "user" } | { type: "mcp"; tokenId: string };
};
```

`orgRole` lives on the principal because the two entry points source it differently, and that difference belongs in two small adapters rather than leaking into policy:

| Adapter | Source of `orgRole` | Trade-off |
|---|---|---|
| `principalFromSession()` | `await auth()` | Fresh, no webhook dependency. Matches how `requireWorkspace` already avoids reading `WorkspaceMember`. |
| `principalFromToken(token, workspaceSlug)` | `WorkspaceMember.role` in Postgres | No session exists for a token. Depends on webhook delivery — but not newly, since `src/server/mcp.ts` already gates on `WorkspaceMember` row existence. |

Everything downstream consumes one shape and cannot tell which door the caller came through.

## Resolution

Pure, no I/O, exhaustively testable:

```ts
function resolveEffectiveRole(principal, project): ProjectRole | null {
  if (principal.orgRole === "org:admin") return "owner";   // floor, unconditional
  const explicit = project.members[0]?.role;
  if (explicit) return explicit;                            // override
  if (project.visibility === "workspace") return "editor";  // default
  return null;                                              // private, no row
}
```

**The admin check is a floor, not a fallback.** It runs first and cannot be overridden by an explicit lower row. Without this ordering, downgrading the last admin on a private project is unrecoverable in-app: a `viewer` holds neither `member.manage` nor `project.update`, so they cannot restore access or flip visibility back.

## Authorization proven in the fetch

One round trip. This extends the tenant predicate already present throughout `files.ts`:

```ts
const file = await db.file.findFirst({
  where: { id: fileId, project: { workspaceId: principal.workspaceId } },
  select: {
    id: true, name: true, type: true, projectId: true,
    project: {
      select: {
        id: true, visibility: true,
        members: { where: { userId: principal.userId }, select: { role: true } },
      },
    },
  },
});
if (!file) throw new NotFoundError();
```

Never authorize in a separate query from the fetch. The `project: { workspaceId }` predicate is the tenant boundary, and dropping it is the single most likely way to introduce a cross-tenant leak.

## Discovery

One exported fragment so no caller hand-rolls it:

```ts
{ workspaceId, OR: [{ visibility: "workspace" }, { members: { some: { userId } } }] }
```

For `org:admin`, omit the `OR` entirely — the whole workspace is in scope. Private projects never reach the client.

## API surface

| Function | Returns | Throws |
|---|---|---|
| `can(role, permission)` | boolean | — |
| `resolveEffectiveRole(principal, project)` | role or `null` | — |
| `requireProjectPermission(principal, projectId, permission)` | project row | `NotFoundError`, `ForbiddenError` |
| `requireFilePermission(principal, fileId, permission)` | file row with project | `NotFoundError`, `ForbiddenError` |
| `requireFolderPermission(principal, folderId, permission)` | folder row with project | `NotFoundError`, `ForbiddenError` |
| `authorizeRealtimeConnection(principal, fileId)` | `"write"` / `"read"` / `"deny"` | never throws |
| `accessibleProjectsWhere(principal)` | Prisma `where` fragment | — |

## Invariants

**The service throws, it does not navigate.** `service.ts` throws plain `NotFoundError` and `ForbiddenError`, and must never call `notFound()` from `next/navigation` — which the DAL currently does in 18 places (`src/server/dal/projects.ts:49` and equivalents). That call is a Next navigation signal and cannot run inside a Hocuspocus `onAuthenticate` hook or an MCP tool. **This is precisely why MCP grew a parallel authorization implementation in the first place.** The web DAL translates service errors to `notFound()` at its own boundary.

**Unauthorized is 404, never 403.** Cross-workspace ids included. Do not disclose existence.

**Nothing authorization-related comes from the client.** Not role, not permissions, not `workspaceId`, not membership. `orgId` and `orgSlug` come from `await auth()`; the URL slug is a label, the session is the authority.

**Components check capabilities, not roles.** `can("project.delete")`, never `role === "owner"`. This is what makes custom roles a later non-event.

**The frontend is UX, the backend is security.** The same check runs in the server action and again at the socket.

## Frontend

`getProject` and `getProjectWorkspace` gain an `authorization: { role, permissions }` field, computed server-side. The project page is already a Server Component, so this needs no new endpoint and no client fetch.

A `ProjectAuthorizationProvider` at the project layout holds the permission array; `usePermissions()` exposes `can()`. Context rather than prop drilling, because `project-workspace-view.tsx` renders a deep tree — file tree, tabs, context menus, toolbar — and threading an array through all of it invites someone to skip it. This is per-request server-derived data, so it stays in context and not Zustand, which AGENTS.md reserves for ephemeral client UI state.

**Hide vs disable.** Hide management and destructive affordances (delete project, manage members, create/rename/move/delete for viewers). Disable with a lock hint on the editing surface itself, so a viewer understands a canvas is read-only rather than finding silently inert tools. Concretely: Excalidraw gets `viewModeEnabled`, Tiptap gets `editable: false`, both driven by `can("file.update")`.

## Realtime contract

```ts
authorizeRealtimeConnection(principal, fileId): Promise<"write" | "read" | "deny">
```

Resolves file → project → effective role, then maps `file.update` → `write`, `file.read` → `read`, else `deny`. **Shipped with full tests and no consumer.** The Hocuspocus migration calls it from `onAuthenticate`.

Two obligations belong to that migration, not here: constructing a `Principal` from a WebSocket handshake (there is no `await auth()` in a raw upgrade), and mapping room identity to `fileId`. The service is built to accept a principal rather than reach for Next internals precisely so both are possible.

## MCP

| Tool | Required permission |
|---|---|
| `list_files` | `project.read` |
| `read_canvas` | `file.read` |
| `read_document` | `file.read` |
| `draw_elements` | `file.update` |
| `update_document` | `file.update` |

A token still resolves workspaces by slug, since a token has no active organization. That becomes safe once each resolved workspace requires a `WorkspaceMember` row **and** a per-resource permission check, rather than row existence alone granting full write.

## Build phases

Each independently shippable.

| Phase | Contents | ACs |
|---|---|---|
| 1 | Schema (`ProjectMember`, `visibility`, `createdById` relation) + `permissions.ts` + `resolve.ts` with exhaustive unit tests. No behavior change. | 1, 2, 3, 13 |
| 2 | Wire `vitest.config.ts` globalSetup. `principal.ts`, `service.ts`, `errors.ts`. DAL refactor, signatures unchanged. Add missing `files.ts` / `folders.ts` DAL tests. | 4, 5, 7 |
| 3 | `discovery.ts` applied to `listProjects` and every project-resolving read. | 6 |
| 4 | `authorization` field on project DAL responses, provider, `usePermissions()`, hide-vs-disable across the UI. | 8 |
| 5 | `realtime.ts` (tested, no consumer). MCP rewritten onto the service. Proxy exemption and session-ownership fixes. | 9, 10, 11, 12 |

## Migration safety

Additive and zero-backfill. `ProjectMember` is new, `visibility` defaults to `"workspace"`, and the workspace default role is `editor` — exactly today's behavior. Applying the migration changes no user's effective access.

This is not a stylistic preference. There is a paying team on this codebase, and a backfill that missed rows would mean real users silently losing access to real work.

## Bugs to fix here

- **`/api/mcp/*` is absent from `proxy.ts`'s public-route list** (`src/proxy.ts:14-19`) while the matcher includes `/(api|trpc)(.*)`, so `auth.protect()` should reject bearer-token clients before their own authentication runs. Read from the matcher, **not confirmed with a live request** — verify first, then exempt.
- **`/api/mcp/message` never checks session ownership.** It validates the bearer token, then calls `activeTransports.get(sessionId)` and dispatches without confirming the session belongs to that token's user. Session ids are random UUIDs, so not trivially exploitable, but the check is missing.
- **`vitest.config.ts` declares no `globalSetup`** despite `vitest.global-setup.ts` existing at the repository root, so `pnpm test` never starts the test Postgres. Blocks every database-backed test in phase 2.

## Testing

`*.test.ts` runs under Vitest, `*.spec.ts` under Playwright. This naming is load-bearing — `vitest.unit.config.ts:11-22` documents that Vitest collecting a Playwright spec fails in a way resembling a broken test rather than a configuration error.

| File | Scope |
|---|---|
| `permissions.test.ts` | Every role × permission pair. Pure, no database. |
| `resolve.test.ts` | Every `orgRole` × `visibility` × explicit-row combination, including the admin floor beating an explicit `viewer` on a private project. |
| `service.test.ts` | Against the disposable `postgres:17` from `docker-compose.test.yml`. Cross-workspace ids must throw `NotFoundError`, never `ForbiddenError`. |
| `discovery.test.ts` | Private project absent for a non-member, present for an `org:admin`. |
| `realtime.test.ts` | All four outcomes, with no Next request context and no Hocuspocus present. |

## Consequences

- `WorkspaceMember.role` becomes load-bearing on the MCP path. A missed membership webhook now affects MCP authorization, where before it affected only row existence.
- Two access mechanisms coexist — visibility default and explicit override. `resolve.ts` is the single place reconciling them, which is why it is pure and exhaustively tested.
- No member-management UI ships here, so `ProjectMember` rows and `visibility` changes need direct database access. Private projects are not usable as a product feature until a follow-up. Every default path works untouched.
- The `org:admin` floor means an admin cannot be scoped down per project in-app. Deliberate. Audit logging deferred.
- `authorizeRealtimeConnection` ships without a consumer and stays untested end-to-end until the Hocuspocus migration lands.
- Personal access tokens still carry no expiry and no scopes. They are now bounded by their user's project permissions — a real reduction in blast radius, not a substitute for lifecycle controls.

## Deferred

File and folder ACLs, custom roles, database-driven role definitions, permission-builder UI, teams and groups, guest access, public sharing, complex deny rules, ABAC, ReBAC, external authorization engines, PAT expiry and scopes, live invalidation of open realtime connections, audit logging, user preferences storage.

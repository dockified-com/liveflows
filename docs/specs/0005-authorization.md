# Authorization: Hierarchical RBAC with Inherited Resource Permissions

**Status**: Approved
**Date**: 2026-08-19
**Scope**: Organization, workspace, project, folder, file, frontend, backend, realtime, and MCP authorization
**Feature docs**: [`docs/features/authorization/`](../features/authorization/README.md)

## Summary

LiveFlows currently has binary authorization: you are in a Clerk organization or you are not. Every organization member has full write access to every project, every folder, and every file in the workspace. `WorkspaceMember.role` is captured from Clerk and stored, but no code path reads it.

This spec introduces hierarchical role-based access control. Projects gain `owner` / `editor` / `viewer` roles stored in Postgres, folders and files inherit permissions from their project, and one central authorization service becomes the single authority consumed by the web app, the realtime layer, and MCP.

The spec deliberately excludes the Hocuspocus/Yjs migration. It defines and tests the realtime authorization contract that migration will consume, but wires no realtime code.

## Context

### What exists today

Authorization is concentrated in one function, `requireWorkspace` (`src/server/dal/workspaces.ts:12-38`). It compares `auth().orgSlug` against the URL slug, redirects on mismatch, and lazily upserts the workspace row. Every DAL query then filters on `workspaceId`, directly or through `project: { workspaceId }` for file- and folder-scoped calls, so cross-tenant ids return 404 rather than 403.

Inside a workspace, access is uniform and total. `provisionRoom` (`src/server/liveblocks.ts:35-39`) grants `groupsAccesses: { [workspaceId]: ["*:write"] }`, and `/api/liveblocks-auth` issues an ID token asserting `groupIds: [workspace.id]` without ever seeing which room is being joined. There is no `ProjectMember` table, no per-file ACL, no read-only mode.

MCP is a second, independent authorization surface. All three tools in `src/server/mcp.ts` bypass the DAL, resolve a workspace by `slug` alone, and gate on `WorkspaceMember` row existence — so a personal access token reaches every workspace its holder belongs to, with full write, regardless of which organization is active.

### Constraints

**Liveblocks is cancelled.** LiveFlows is a commercial product with a paying customer, and the Liveblocks bill is not covered by the MVP budget. The engineering team has decided to replace it with self-hosted Hocuspocus/Yjs. This is a settled decision and not revisited here. Two consequences matter for this spec:

1. All realtime authorization must be expressed against a Hocuspocus `onAuthenticate` hook, not Liveblocks room permissions.
2. Because the realtime replacement is required for the product to function at all, it is a large project on the critical path. Coupling authorization to it would block permissions behind new infrastructure.

The migration also unblocks two features `docs/scope/scope.md:149-154` records as blocked by Liveblocks: named version history (Storage version retrieval is undocumented and Yjs-only) and images on canvas (waiting on `LiveFile`).

**Permissions are net-new scope.** `docs/scope/scope.md` contains no permissions or sharing feature — not planned, not deferred. The flat workspace-wide-write model is the documented intent, so nothing here is a correction of an unfinished feature.

**AGENTS.md is stale.** It describes a single canvas per project and `CanvasSnapshot.viewBackgroundColor` as a flat column. The shipped schema has `Folder`, `File`, `CanvasSnapshot` keyed on `fileId`, `DocumentSnapshot`, and `appState` as JSON. It also cites `docs/superpowers/specs/2026-08-08-liveflows-design.md`, which does not exist in the tree.

## Options considered

### Project default access

1. **Org-visible default, private opt-in** — projects stay visible and editable by all organization members; `ProjectMember` is an override table; a `visibility` flag opts a project into allow-list-only access.
   - *Pros*: zero backfill, no regression for the paying team, member-management UI is not a launch blocker, extends to teams later without reworking precedence.
   - *Cons*: two access mechanisms (default plus override) rather than one.
2. **Private by default** — `ProjectMember` is the sole source of project access; no row means invisible and 404.
   - *Pros*: one mechanism, conceptually clean, matches the strictest reading of the requirement.
   - *Cons*: requires backfilling a row for every existing member on every existing project, where a missed row means a real user silently loses access to real work; member-management UI must ship in the same release or projects are unusable on creation.
3. **Private model with default-invite** — projects are created private, but creation invites the whole organization.
   - *Pros*: single mechanism with less day-one friction.
   - *Cons*: writes N rows per project and requires the Clerk membership webhook to fan out writes across every project, so a missed webhook becomes a silent access bug.

**Decision: option 1.** The product's normal state is a team collaborating on shared architecture diagrams, so private-by-default puts friction on the common path to guard a rare one. Precedence rules in one pure function are easier to test than denormalized rows kept correct by an eventually-consistent webhook.

### Realtime permission mechanism

Deferred to the Hocuspocus migration spec. This spec defines the contract only. Liveblocks alternatives (stable per-project group IDs with ID tokens, or per-room access tokens) were evaluated and are viable, but moot given the vendor decision.

### Spec boundary

1. **Authorization now, realtime contract defined but not wired** — everything vendor-neutral ships here; `authorizeRealtimeConnection` is built and tested with no consumer.
   - *Pros*: authorization is written once, neither project blocks the other, the migration inherits a ready-made hook.
   - *Cons*: one function ships without a live consumer until the migration lands.
2. **Migration first, authorization after** — nothing written speculatively.
   - *Cons*: permissions blocked behind a multi-week infrastructure project while the paying team keeps flat workspace-wide write.
3. **One combined spec** — designed against each other with no interface guesswork.
   - *Cons*: very large single branch, permissions cannot ship incrementally.

**Decision: option 1.**

### Admin bypass semantics

**Decision: floor, not fallback.** An `org:admin` always resolves to at least `owner`, even against an explicit lower row. This guarantees no project can be orphaned: without it, downgrading the last admin on a private project is unrecoverable in-app, because a `viewer` holds neither `member.manage` nor `project.update` and so cannot restore access or flip visibility back. It grants no new authority, since an `org:admin` can already delete the organization through Clerk.

### Personal access token hardening

**Decision: fix the authorization bugs, defer token lifecycle.** Routing MCP tools through the authorization service means a token inherits its user's real per-project limits, which addresses the actual risk. `expiresAt` and scope columns are lifecycle concerns with their own UI (expiry picker, scope vocabulary, rotation, intersection semantics) and belong in a separate spec.

## Decision

Clerk owns authentication, organization membership, invitations, and organization-level roles. Postgres stores project membership and assigned project roles. Role-to-permission mapping lives in application code as a single frozen definition. One central authorization service is the sole authority for resource authorization, consumed identically by the web app, the realtime layer, and MCP.

The backend enforces security. The frontend consumes resolved permissions to control visibility and available actions, and is never the only place a permission is checked.

**Implementation skills**: Prisma migration, backend DAL refactor, React context, MCP integration.

## Requirements

- **AC-1**: A `ProjectMember` row grants a user an explicit `owner`, `editor`, or `viewer` role on one project, overriding the workspace default.
- **AC-2**: A project with `visibility = "workspace"` grants `editor` to every organization member with no row present. A project with `visibility = "private"` grants no access without a row.
- **AC-3**: An `org:admin` resolves to at least `owner` on every project in the workspace, regardless of visibility or an explicit lower row.
- **AC-4**: Every permission decision in the application resolves through one authorization service. No consumer reimplements role or permission logic.
- **AC-5**: Folders and files inherit permissions from their parent project. No file- or folder-specific ACL exists.
- **AC-6**: A private project the caller cannot access is absent from every list, search, and autocomplete response, filtered in the database query rather than by the client.
- **AC-7**: Requesting a resource the caller cannot access returns `NotFoundError`, never `ForbiddenError`, so existence is not disclosed. Cross-workspace ids are indistinguishable from nonexistent ones.
- **AC-8**: A server-rendered project response carries `authorization: { role, permissions }`. Client components branch on `can(permission)` and never on a role string.
- **AC-9**: `authorizeRealtimeConnection(principal, fileId)` returns `"write"`, `"read"`, or `"deny"` from the same resolution logic, with no dependency on Next.js request context.
- **AC-10**: Every MCP tool authorizes through the service against a mapped permission before reading or mutating. A personal access token is bounded by its user's project permissions.
- **AC-11**: `/api/mcp/*` reaches its own bearer-token authentication rather than being intercepted by `proxy.ts`.
- **AC-12**: `/api/mcp/message` rejects a `sessionId` that does not belong to the presenting token's user.
- **AC-13**: Applying the migration changes no existing user's effective access.

## Feature design

### Data model

Three changes to `prisma/schema.prisma`.

**New model, `ProjectMember`** — an override table, not an allow-list:

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

The `@@index([userId])` makes "every project this user can reach" a single indexed lookup rather than a scan.

**New column, `Project.visibility`** — `String @default("workspace")`, one of `"workspace"` or `"private"`. The default is what makes the migration zero-backfill.

**Relation on `Project.createdById`** — currently a bare `String` with no foreign key and no index (`prisma/schema.prisma:48`). The creator receives an `owner` row, so a dangling id makes that unreliable. `File.createdById` has the same latent issue and is left alone as out of scope.

Roles stay `String`, not a Prisma enum. The schema has no enums, and the Clerk webhook deliberately stores organization roles as opaque strings with a test named for it (`src/app/api/webhooks/clerk/__tests__/route.test.ts:381`). A TypeScript union gives compile-time safety where it matters; a string column makes adding a custom role a code change rather than a migration. Validation happens at the DAL boundary.

### Permission model

Thirteen permissions, defined once in `src/server/authz/permissions.ts`:

```ts
type ProjectPermission =
  | "project.read" | "project.update" | "project.delete"
  | "member.read"  | "member.manage"
  | "folder.read"  | "folder.create"  | "folder.update" | "folder.delete"
  | "file.read"    | "file.create"    | "file.update"   | "file.delete";
```

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

Two clarifications resolved during design: an `editor` holds `project.update`, so renaming a project is permitted while deletion is gated on `project.delete`; and a `viewer` holds `member.read`, so the member list is visible to all project members. Both are deliberate.

The map is a frozen object, making `can(role, permission)` a pure function with no I/O.

### Module structure

```
src/server/authz/
├── permissions.ts     # permission union, role → permission map, can()
├── principal.ts       # Principal type and edge adapters
├── resolve.ts         # effective-role resolution (pure)
├── service.ts         # requireProjectPermission / requireFilePermission / requireFolderPermission
├── discovery.ts       # accessible-projects query fragment
└── errors.ts          # ForbiddenError
```

The service throws plain `NotFoundError` and `ForbiddenError`. It never calls `notFound()` from `next/navigation`, which the DAL currently does in 18 places (`src/server/dal/projects.ts:49` and equivalents). That call is a Next navigation signal and cannot run inside a Hocuspocus `onAuthenticate` hook or an MCP tool — which is precisely why MCP grew its own authorization implementation. The web DAL translates service errors to `notFound()` at its own boundary.

### Principal

```ts
type Principal = {
  userId: string;
  workspaceId: string;   // internal cuid, always server-resolved
  orgRole: string;       // "org:admin" | "org:member" | opaque future value
  source: { type: "user" } | { type: "mcp"; tokenId: string };
};
```

`orgRole` lives on the principal because entry points source it differently, and that difference belongs in two small adapters rather than leaking into policy:

- `principalFromSession()` reads `orgRole` from `await auth()`. Fresh, with no webhook dependency, consistent with how `requireWorkspace` already avoids reading `WorkspaceMember`.
- `principalFromToken(token, workspaceSlug)` has no session, so it reads `WorkspaceMember.role` from Postgres. This depends on webhook delivery, but not newly so: `src/server/mcp.ts` already gates on `WorkspaceMember` row existence.

### Resolution

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

### Authorization proven in the fetch

One round trip, extending the tenant filter already present at `files.ts:116,156,201,230`:

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

### Discovery

One exported `where` fragment so no caller hand-rolls it:

```ts
{ workspaceId, OR: [{ visibility: "workspace" }, { members: { some: { userId } } }] }
```

For an `org:admin`, the `OR` is omitted and the whole workspace is in scope. Private projects never reach the client.

### API surface

| Function | Inputs | Outputs | Errors |
|---|---|---|---|
| `can(role, permission)` | role, permission | boolean | — |
| `resolveEffectiveRole(principal, project)` | principal, project shape | role or null | — |
| `requireProjectPermission(principal, projectId, permission)` | ids, permission | project row | `NotFoundError`, `ForbiddenError` |
| `requireFilePermission(principal, fileId, permission)` | ids, permission | file row with project | `NotFoundError`, `ForbiddenError` |
| `requireFolderPermission(principal, folderId, permission)` | ids, permission | folder row with project | `NotFoundError`, `ForbiddenError` |
| `authorizeRealtimeConnection(principal, fileId)` | principal, fileId | `"write"` / `"read"` / `"deny"` | never throws |
| `accessibleProjectsWhere(principal)` | principal | Prisma `where` fragment | — |

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Resolve organization boundary | `orgId`, `orgSlug`, `orgRole` | Clerk session via `await auth()` |
| Resolve organization boundary (MCP) | `WorkspaceMember.role` | Postgres, written by the Clerk webhook |
| Resolve project role | `owner` / `editor` / `viewer` / null | `ProjectMember` row, else `Project.visibility` |
| Resolve permissions | permission array | Frozen map in application code |
| Project list | accessible projects | `db.project.findMany` with `accessibleProjectsWhere` |
| Frontend capabilities | `authorization: { role, permissions }` | Server Component via DAL |

### Realtime contract

```ts
// src/server/authz/realtime.ts
authorizeRealtimeConnection(principal, fileId): Promise<"write" | "read" | "deny">
```

Resolves file to project to effective role, then maps `file.update` to `write`, `file.read` to `read`, otherwise `deny`. Shipped with tests and no consumer.

Two obligations fall on the Hocuspocus migration spec, not this one:

1. **Producing a `Principal` from a WebSocket handshake.** There is no `await auth()` in a raw upgrade, so the migration must verify a Clerk session token server-side and construct the principal. This spec's contribution is ensuring the function accepts a principal rather than reaching for Next internals.
2. **Mapping room identity to `fileId`.** Rooms are `file_<cuid>` today (`src/server/liveblocks.ts:15-17`). The contract takes a `fileId`, so whatever naming the migration adopts, that mapping is its concern.

Revocation mid-session is satisfied at the MVP bar: authorization is re-evaluated on every new connection, because `onAuthenticate` runs per connection. Invalidating an already-open socket is deferred.

### MCP

All three tools in `src/server/mcp.ts` are rewritten onto the service:

| Tool | Required permission |
|---|---|
| `list_files` | `project.read` |
| `read_canvas` | `file.read` |
| `read_document` | `file.read` |
| `draw_elements` | `file.update` |
| `update_document` | `file.update` |

A token still resolves workspaces by slug, since a token has no active organization. That becomes safe once each resolved workspace requires a `WorkspaceMember` row **and** a per-resource permission check, rather than row existence alone granting full write.

### Frontend

`getProject` and `getProjectWorkspace` gain an `authorization: { role, permissions }` field, computed server-side. The project page is already a Server Component (`src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`), so this needs no new endpoint and no client fetch.

A `ProjectAuthorizationProvider` at the project layout holds the permission array; `usePermissions()` exposes `can("file.update")`. Context rather than prop drilling, because `project-workspace-view.tsx` renders a deep tree of file tree, tabs, context menus, and toolbar, and threading an array through all of it invites someone to skip it. This is per-request server-derived data, so it stays in context and not Zustand, which AGENTS.md reserves for ephemeral client UI state.

Components call `can("project.delete")`, never `role === "owner"`. That separation is what makes custom roles a non-event later.

**Hide versus disable.** Hide management and destructive affordances the user should not consider: delete project, manage members, and create / rename / move / delete for viewers. Disable with a lock hint on the editing surface itself, so a viewer opening a canvas understands it is read-only rather than finding a silently inert tool. Concretely, Excalidraw receives `viewModeEnabled` and Tiptap receives `editable: false`, both driven by `can("file.update")`.

This is defense in depth, not enforcement. The same check runs in the server action and again at the socket.

**Direct-URL protection** already works structurally, since the page's DAL call authorizes before render. What changes is that private projects now 404 for non-members.

### Security model

1. No authorization input is accepted from the client: not role, not permissions, not `workspaceId`, not membership.
2. Authentication resolves server-side through Clerk.
3. Organization membership is proven by the session's active organization, or by `WorkspaceMember` for token principals.
4. Project membership comes only from Postgres.
5. Unauthorized projects are excluded in the query, never filtered by the client.
6. Every mutation authorizes server-side regardless of what the UI displayed.
7. Frontend checks never substitute for backend checks.
8. Realtime and MCP consume the same service as web requests.
9. Restricted resources return `NotFoundError`, disclosing nothing.
10. Every resource resolves to a workspace, and cross-workspace access is always rejected.

### Bugs fixed here

- `/api/mcp/*` is absent from `proxy.ts`'s public-route list (`src/proxy.ts:14-19`), while the matcher includes `/(api|trpc)(.*)`, so `auth.protect()` should reject bearer-token clients before their own authentication runs. This was read from the matcher, not confirmed with a live request; verify first, then add the exemption.
- `/api/mcp/message` validates the bearer token but never checks that `sessionId` belongs to that token's user — it calls `activeTransports.get(sessionId)` and dispatches. Session ids are random UUIDs, so this is not trivially exploitable, but the ownership check is missing.
- `vitest.config.ts` declares no `globalSetup` despite `vitest.global-setup.ts` existing at the repository root, so `pnpm test` does not start the test Postgres. Any database-backed test fails until this is wired.

### Configuration

No new environment variables and no new third-party services.

### Critical test scenarios

- Every combination of organization role, visibility, and explicit row resolves to the expected role, including an `org:admin` floor beating an explicit `viewer` on a private project. (AC-1, AC-2, AC-3)
- A `viewer` calling a mutating server action is rejected server-side even with the UI bypassed. (AC-4)
- A `viewer` on a project cannot write to any file or folder in it; an `editor` can. (AC-5)
- A private project is absent from the project list for a non-member and present for an `org:admin`. (AC-6)
- A file id from another workspace throws `NotFoundError`, never `ForbiddenError`. (AC-7)
- A project response carries the permission array matching the resolved role. (AC-8)
- `authorizeRealtimeConnection` returns `write` for an editor, `read` for a viewer, and `deny` for a non-member on a private project, with no Next request context present. (AC-9)
- An MCP token cannot read or write a private project its user is not a member of. (AC-10)
- A bearer-token request to `/api/mcp/sse` reaches PAT verification. (AC-11)
- A token presenting another user's `sessionId` is rejected. (AC-12)
- Applying the migration to a seeded database leaves every existing member's effective role at `editor`. (AC-13)

Tests follow the repository split: `*.test.ts` for Vitest, `*.spec.ts` for Playwright. `vitest.unit.config.ts:11-22` documents that this naming is load-bearing, because Vitest collecting a Playwright spec fails in a way that resembles a broken test rather than a configuration error.

## Build plan

**Phase 1 — Schema and pure logic.** Add `ProjectMember`, `Project.visibility`, and the `createdById` relation; migrate. Write `permissions.ts` and `resolve.ts` with exhaustive unit tests. No behavior change. (AC-1, AC-2, AC-3, AC-13)

**Phase 2 — Service and DAL.** Wire `vitest.config.ts` `globalSetup`. Build `principal.ts`, `service.ts`, `errors.ts`. Refactor the five DAL files to authorize through the service, keeping their signatures. Add the missing `files.ts` and `folders.ts` DAL tests. (AC-4, AC-5, AC-7)

**Phase 3 — Discovery.** Build `discovery.ts` and apply it to `listProjects` and every project-resolving read. (AC-6)

**Phase 4 — Frontend.** Add `authorization` to the project DAL responses, build the provider and `usePermissions()`, apply hide-versus-disable across the file tree, tabs, context menus, toolbar, and both editors. (AC-8)

**Phase 5 — Realtime contract, MCP, bug fixes.** Ship `realtime.ts` with tests and no consumer. Rewrite the MCP tools onto the service. Fix the proxy exemption and the session-ownership check. (AC-9, AC-10, AC-11, AC-12)

Each phase is independently shippable.

## Consequences

- `WorkspaceMember.role` becomes load-bearing for the first time, through the `org:admin` floor on the MCP path. A missed membership webhook now affects MCP authorization, where before it affected only row existence.
- Two access mechanisms coexist: the visibility default and the explicit override. Resolution precedence is the single place that reconciles them, which is why it is a pure function with exhaustive tests.
- Member-management UI is not built here. Until it exists, `ProjectMember` rows and `visibility` changes require direct database access, so private projects are effectively unusable until a later slice ships. Every default path works untouched.
- The `org:admin` floor means an administrator cannot be scoped down per project inside the application. This is deliberate, and audit logging for administrator access to private projects is deferred.
- `authorizeRealtimeConnection` ships without a consumer and stays untested end-to-end until the Hocuspocus migration lands.
- Personal access tokens still carry no expiry and no scopes. They are now bounded by their user's project permissions, which is a real reduction in blast radius but not a substitute for lifecycle controls.

## Explicitly deferred

File-specific and folder-specific ACLs, custom roles, database-driven role definitions, permission-builder UI, teams and groups, guest access, public sharing, resource-specific sharing, complex deny rules, ABAC, ReBAC, external authorization engines, personal access token expiry and scopes, live invalidation of open realtime connections, audit logging, and user preferences storage (a settings feature, not authorization).

## Follow-up

- **Hocuspocus/Yjs migration spec** — required for the product to function once Liveblocks is cancelled. Consumes `authorizeRealtimeConnection` in `onAuthenticate`. Covers the WebSocket deployable, `y-excalidraw`, `y-prosemirror`, persistence through `onStoreDocument`, retiring `element-sync.ts` and the `storageUpdated` mirror, and migrating existing room data. See `docs/features/realtime-collaboration/`.
- **Member-management UI** — invite, change role, remove, and toggle visibility. Turns `ProjectMember` from a database-only construct into a product feature.
- **Personal access token lifecycle** — expiry and scopes with the accompanying UI.
- **Audit logging** — administrator access to private projects, and role changes.
- **AGENTS.md and scope.md reconciliation** — both are stale on the data model, both cite a design document that does not exist, and neither mentions permissions. `docs/scope/scope.md` needs a permissions feature row.
- `src/server/rayu/` is an undocumented subsystem of nine source files with eight tests, mentioned in neither AGENTS.md nor scope.md. Its authorization posture was not assessed here.

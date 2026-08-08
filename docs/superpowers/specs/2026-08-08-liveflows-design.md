# LiveFlows — MVP 1a Design

**Date:** 2026-08-08
**Status:** Approved
**Scope:** MVP 1a (core app). MCP agent support is MVP 1b and gets its own spec.

---

## 1. Product

LiveFlows is a collaborative diagramming app for software system design. Teams of
developers brainstorm architecture diagrams together in realtime on an Excalidraw
canvas. External AI coding agents can also read and draw diagrams through MCP.

**MVP 1a ships:**

- Clerk authentication with Organizations as the team/workspace primitive
- Workspace → Project hierarchy, projects listed from Postgres
- Excalidraw canvas with realtime multiplayer via Liveblocks
- Room-level permissions derived from workspace membership
- Postgres canvas mirror kept fresh by the Liveblocks `storageUpdated` webhook

**MVP 1a explicitly excludes:**

| Excluded | Reason |
|---|---|
| MCP server | Separate spec (1b). Its tool design depends on 1a's reconciliation pattern |
| In-app AI chat / copilot | MVP 2. All AI in MVP 1 arrives via MCP from an external agent |
| Images on canvas | Drags in uploads, MIME validation, orphan cleanup, and room-size pressure. Use Liveblocks `LiveFile` when added, not Supabase Storage |
| Project thumbnails | Deferred. When added, generate server-side from the Postgres snapshot |
| Named version history | Liveblocks Storage version *retrieval* is not documented (only Yjs). Do not build on it |
| Comments, notifications | Liveblocks ships both; MVP 2 |
| Offline editing / write queue | Would reintroduce the second-writer problem the architecture avoids |

---

## 2. Tech stack (LOCKED)

Exact versions, no carets. Resolved from the registry on 2026-08-08.

### Already installed

| Package | Version |
|---|---|
| `next` | `16.3.0` |
| `react`, `react-dom` | `19.2.8` |
| `babel-plugin-react-compiler` | `1.0.0` |
| `tailwindcss`, `@tailwindcss/postcss` | `4.x` |
| `@biomejs/biome` | `2.4.2` |
| `typescript` | `5.x` (≥5.4 required by Prisma 7) |
| pnpm | `11.20.0` |

### To add

| Package | Version | Role |
|---|---|---|
| `@clerk/nextjs` | `7.7.1` | auth (Core 3) |
| `@liveblocks/client` | `3.23.1` | realtime client |
| `@liveblocks/react` | `3.23.1` | hooks |
| `@liveblocks/node` | `3.23.1` | server SDK, webhook verification |
| `@excalidraw/excalidraw` | `0.18.1` | canvas |
| `@prisma/client` | `7.9.1` | ORM runtime |
| `@prisma/adapter-pg` | `7.9.1` | driver adapter (mandatory in v7) |
| `pg` | `8.22.0` | Postgres driver |
| `zustand` | `5.0.14` | client UI + canvas session state |
| `zod` | `4.4.3` | input validation |
| `prisma` | `7.9.1` | CLI (dev) |
| `@types/pg` | `8.21.0` | dev |
| `vitest` | `4.1.10` | unit/integration (dev) |
| `@playwright/test` | `1.62.1` | E2E (dev) |
| `@clerk/testing` | `2.2.19` | E2E auth helpers (dev) |

### Required tooling

| Tool | Purpose |
|---|---|
| Context7 MCP (`@upstash/context7-mcp@4.0.0`) | Fetch current library docs before writing integration code |

**Rule:** query Context7 before writing code against Liveblocks, Excalidraw,
Prisma 7, or Clerk. All four shipped breaking changes recently; three assumptions
made from training data during this design were wrong.

### Version-specific rules

These are breaking changes from what a model assumes by default.

**Next.js 16**

- `proxy.ts`, **not** `middleware.ts`. Renamed; now defaults to the Node.js runtime
- Proxy enforces **authentication** only — is there a session? **Authorization** —
  may this user touch this resource? — lives in the DAL. `auth.protect()` in the
  proxy is the former, not the latter
- Renamed flags, e.g. `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`

**Prisma 7**

- `provider = "prisma-client"`, **not** `"prisma-client-js"`
- `output` is **required**: `output = "../src/generated/prisma"`. The client is no
  longer emitted into `node_modules`; generated code is treated as source
- Driver adapter is **mandatory**: `new PrismaPg({ connectionString })`
- `prisma.config.ts` at project root is the config home; connection URLs move there
- ESM-only. Either `"type": "module"` in `package.json` or `moduleFormat = "cjs"`
  on the generator
- Adapters require a direct connection string. Use the Supabase pooler URL at
  runtime and the direct URL for migrations

**Clerk Core 3 (v7)**

- `isAuthenticated` from `await auth()`, not `!!userId`
- `<Show when={...}>` replaced `<Protect>`, `<SignedIn>`, `<SignedOut>`
- `verifyWebhook(req)` from `@clerk/nextjs/webhooks`. Do not hand-roll Svix
- Only real permission slugs: `org:sys_memberships:manage`, `org:sys_billing:read`.
  Invented slugs silently return `false`
- `auth()` is always awaited

**Excalidraw 0.18**

- Client-only: `dynamic(() => import(...), { ssr: false })`
- Remote updates use `captureUpdate: CaptureUpdateAction.NEVER`
- Never share `appState` beyond `viewBackgroundColor`
- Do not call `updateScene({ elements })` during an active drag — it calls
  `replaceAllElements` internally

### Forbidden

| Don't | Use instead |
|---|---|
| `npm`, `yarn` | `pnpm` |
| ESLint, Prettier | Biome (`pnpm lint`, `pnpm format`) |
| `middleware.ts` | `proxy.ts` |
| `prisma-client-js` generator | `prisma-client` |
| Prisma without a driver adapter | `@prisma/adapter-pg` |
| Supabase JS client, Supabase Auth, Supabase Realtime, Supabase RLS | Prisma for data, Clerk for auth, Liveblocks for realtime. Supabase is only the Postgres host |
| Supabase Storage | Nothing in 1a; Liveblocks `LiveFile` later |
| `@liveblocks/zustand`, `@liveblocks/redux` | `@liveblocks/react` |
| A UI component library | Tailwind v4 + Clerk's prebuilt auth components |
| Jest | Vitest |
| Yjs, `y-excalidraw` | Liveblocks Storage. Yjs is the documented fallback only if Spike 2 fails |
| `useEffect` for data fetching | Server Components + DAL |

### Required environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client |
| `CLERK_SECRET_KEY` | Clerk server |
| `CLERK_WEBHOOK_SIGNING_SECRET` | read automatically by `verifyWebhook()` |
| `LIVEBLOCKS_SECRET_KEY` | Liveblocks Node SDK, token issuance, REST |
| `LIVEBLOCKS_WEBHOOK_SECRET` | `storageUpdated` signature verification |
| `DATABASE_URL` | Supabase **pooler** URL, used at runtime |
| `DIRECT_DATABASE_URL` | Supabase **direct** URL, used for migrations |

Prisma 7 driver adapters reject `prisma://` and `prisma+postgres://` URLs — both
values must be direct Postgres connection strings.

Clerk redirect URLs (`NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc.) are only needed if the
defaults are overridden. 1a uses the defaults.

### PREREQUISITE — blocking

Whether to set `"type": "module"` in `package.json` or `moduleFormat = "cjs"` on
the Prisma generator is **unresolved**. Spike 1 must decide it. Do not default to
either option and do not begin implementation until it is resolved — the choice
affects `next.config.ts` resolution and Biome configuration, not just Prisma.

---

## 3. Architecture

**Liveblocks is the write path. Postgres is the read path.**

| Concern | Owner |
|---|---|
| Live canvas elements | Liveblocks Storage — source of truth while editing |
| Users, workspaces, members, projects, roles | Postgres |
| Canvas mirror for lists, search, outage fallback | Postgres, refreshed by webhook |
| Identity, orgs, invites | Clerk |
| Drawing UX | Excalidraw |
| Ephemeral client UI state | Zustand |

### Why not Postgres as source of truth

Considered and rejected. Excalidraw's data model makes it mechanically wrong:

- Elements carry `version` / `versionNonce` for last-write-wins. Writing back to
  Postgres on every change creates a second sync system racing with Liveblocks'
  CRDT, requiring hand-built conflict resolution on top of Excalidraw's own
- Deletion is soft (`isDeleted: true`); the array only grows. Hydrating from
  Postgres means serializing every deleted ghost in both directions
- `onChange` fires every frame during a drag. Debouncing writes back to Postgres
  reinvents the webhook mirror, client-side and worse

Liveblocks Storage is durable — "persists until the room is explicitly deleted"
([data-storage](https://liveblocks.io/docs/platform/data-storage)) — and Liveblocks'
own Supabase guide says to treat your database as "an eventually consistent
mirror, not as the live editing channel."

### Data flow

| Event | Flow |
|---|---|
| User opens a project | Server Component → DAL → Postgres for project metadata. Client connects to Liveblocks room; Storage hydrates the canvas |
| User draws | `onChange` (throttled ~100ms) → diff by `version` → write changed elements to `LiveMap` → Liveblocks broadcasts → peers apply via `updateScene` |
| Mirror refresh | Liveblocks `storageUpdated` (default throttle 60s) → our route fetches storage → upserts `CanvasSnapshot` |
| User views project list | Server Component → DAL → Postgres only. No Liveblocks call |
| Liveblocks outage | Canvas renders read-only from `CanvasSnapshot` with a banner. Auth, lists, workspace pages unaffected. No data loss — availability issue, not durability |

---

## 4. Repository structure

```
src/
  app/
    (marketing)/page.tsx                 landing
    (auth)/sign-in|sign-up/              Clerk components
    (app)/
      layout.tsx                         shell: OrganizationSwitcher, nav
      w/[workspaceSlug]/
        page.tsx                         project list  → Postgres
        p/[projectId]/page.tsx           canvas        → Liveblocks
    session-tasks/choose-organization/page.tsx   Clerk TaskChooseOrganization
    api/
      liveblocks-auth/route.ts           issues Liveblocks ID token
      webhooks/clerk/route.ts            user/org/membership → Postgres
      webhooks/liveblocks/route.ts       storageUpdated → CanvasSnapshot
  server/
    db.ts                                Prisma singleton + PrismaPg adapter
    liveblocks.ts                        Liveblocks Node client
    dal/
      workspaces.ts  projects.ts         ALL authorization lives here
  features/
    canvas/
      canvas-room.tsx                    RoomProvider wrapper
      excalidraw-client.tsx              dynamic(ssr:false)
      use-liveblocks-excalidraw.ts       the reconciliation loop
      element-sync.ts                    pure diff/merge functions
      store.ts                           Zustand canvas session store
      store-provider.tsx                 per-room store factory
  stores/
    ui.ts                                Zustand global UI state
  generated/prisma/                      Prisma 7 output (checked in)
proxy.ts                                 Clerk optimistic redirect only
prisma.config.ts                         Prisma 7 config
prisma/schema.prisma
```

Two boundaries that carry weight:

**`server/dal/`** — nothing outside this directory calls Prisma. Every function
resolves the Clerk session and proves membership in the same query.

**`element-sync.ts` is pure** — arrays in, arrays out. No React, no Liveblocks.
This is the only genuinely novel logic in the project, so it must be testable
without a browser or a socket.

---

## 5. Data model

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // NOTE: `url` is intentionally absent. Prisma 7 moves connection URLs to
  // prisma.config.ts. Adding `url = env("DATABASE_URL")` here is a v6 habit
  // and will conflict with the driver adapter.
}

model User {
  id          String   @id                    // Clerk user_xxx, used directly
  email       String   @unique
  name        String?
  avatarUrl   String?
  memberships WorkspaceMember[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Workspace {
  id         String   @id @default(cuid())
  clerkOrgId String   @unique                 // mirrors Clerk Organization
  name       String
  slug       String   @unique
  members    WorkspaceMember[]
  projects   Project[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  role        String    @default("org:member") // Clerk role string, not an enum
  user        User      @relation(fields: [userId],      references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([workspaceId])
}

model Project {
  id               String    @id @default(cuid())
  name             String
  workspaceId      String
  liveblocksRoomId String    @unique           // "proj_<id>" — the bridge
  createdById      String
  workspace        Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  canvas           CanvasSnapshot?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([workspaceId, updatedAt])
}

model CanvasSnapshot {
  projectId    String   @id
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  elements     Json     @default("[]")         // mirror, NOT authoritative
  appState     Json     @default("{}")
  elementCount Int      @default(0)            // storage-ceiling early warning
  syncedAt     DateTime @default(now())
}

model ProcessedWebhook {
  id         String   @id                      // svix-id header
  source     String                            // 'clerk' | 'liveblocks'
  receivedAt DateTime @default(now())

  @@index([receivedAt])                        // for periodic pruning
}
```

| Decision | Reason |
|---|---|
| `User.id` is the Clerk id | No mapping table. Liveblocks `userId` is the same string |
| `WorkspaceMember` exists despite Clerk owning membership | Project lists stay one local query; Clerk stays swappable |
| `role` is `String`, not an enum | Clerk allows up to 10 custom roles per instance; an enum needs a migration each time |
| `CanvasSnapshot` is a separate table | The `elements` blob can be multiple MB and must never load during a list query |
| `@@index([workspaceId, updatedAt])` | The project list is always "this workspace, most recent first" |
| `Project.createdById` has **no** relation to `User` | Deliberate. A project must survive its creator being removed from the workspace or deleted in Clerk. Treat it as an audit field, and never join on it |
| `ProcessedWebhook` is a real table | Idempotency needs to survive process restarts; an in-memory set does not |

`prisma.config.ts` supplies the connection:

```ts
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: { adapter: () => new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL! }) },
  adapter: () => new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})
```

Confirm the exact `defineConfig` shape against the installed `prisma@7.9.1` types —
the v7 config API is new and the field names above must be verified, not assumed.

---

## 6. Auth and authorization

Three separate concerns, deliberately not conflated.

**Identity** — Clerk. Sign-up, sign-in, org creation, invite emails, org switcher.
With `Membership required` mode (Clerk's default since 2025-08-22), users without
an org are routed through the `choose-organization` session task rendered by
`TaskChooseOrganization`. No custom workspace-picker page is needed.

Hosting that task requires registering the route on the provider, otherwise Clerk
renders it inside `<SignIn />` and the app never sees it:

```tsx
<ClerkProvider taskUrls={{ 'choose-organization': '/session-tasks/choose-organization' }}>
```

`TaskChooseOrganization` throws if rendered outside a `choose-organization` task
context, so that route must not be linked to or rendered unconditionally.

**Membership state** — Clerk webhook → Postgres. Subscribed events: `user.created`,
`user.updated`, `user.deleted`, `organization.created`, `organization.updated`,
`organizationMembership.created|updated|deleted`. Verified with `verifyWebhook(req)`,
deduplicated on the `svix-id` header, all handlers idempotent upserts.

**Authorization** — the DAL, on every query.

```ts
// server/dal/workspaces.ts
export async function requireWorkspace(slugFromUrl: string) {
  const { isAuthenticated, userId, orgId, orgSlug } = await auth()
  if (!isAuthenticated || !orgId) redirect('/sign-in')

  // slug-safety invariant: the session is the authority, the URL is just a label
  if (orgSlug !== slugFromUrl) redirect(`/w/${orgSlug}`)

  // lazy upsert — never block onboarding on webhook delivery
  return db.workspace.upsert({
    where:  { clerkOrgId: orgId },
    update: {},
    create: { clerkOrgId: orgId, name: orgSlug!, slug: orgSlug! },
    select: { id: true, slug: true },
  })
}
```

Rules:

- `orgId` always comes from `auth()`, never from client input. This makes
  cross-org writes impossible rather than merely unlikely
- Membership is a join condition, not a separate check. There is no code path
  that returns a project without proving membership in the same query
- Non-members receive `NotFound`, not `Forbidden` — don't leak existence
- Webhooks reconcile; they never gate. The lazy upsert covers the acting user,
  and the webhook brings other members' rows into line
- `redirect()` throws. Nothing after it runs

**`proxy.ts`** does one thing — redirect unauthenticated users away from app
routes — and must mark webhook routes public or Clerk returns 401:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublic = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

**Liveblocks tokens** — ID tokens, not access tokens, because permissions live in
our backend. Room permissions are set once at project creation:

```ts
await liveblocks.createRoom(roomId, {
  defaultAccesses: [],                             // deny by default
  groupsAccesses: { [workspaceId]: ['*:write'] },
  organizationId: clerkOrgId,                      // hard tenant isolation
})
```

Scopes are `*:write` and `*:read`. Every documented example uses this form; do not
invent `room:write`.

`organizationId` on the room, matched by `organizationId` on the token, compartment-
alises every room to one workspace at the Liveblocks layer — a second barrier
independent of our own checks. It is **immutable after room creation**, which is
why 1a does not support moving a project between workspaces.

```ts
// app/api/liveblocks-auth/route.ts
const { isAuthenticated, userId, orgId } = await auth()
if (!isAuthenticated || !orgId) return new Response('Unauthorized', { status: 401 })

const ws = await requireWorkspaceByOrgId(orgId)   // queries by clerkOrgId, no slug involved
const { status, body } = await liveblocks.identifyUser(
  { userId, groupIds: [ws.id], organizationId: orgId },
  { userInfo: { name, avatar } },
)
return new Response(body, { status })
```

The DAL exposes two entry points, and which one you use depends on whether a slug
is present in the request:

| Function | Used by | Behaviour |
|---|---|---|
| `requireWorkspace(slugFromUrl)` | pages and actions under `/w/[workspaceSlug]` | asserts `orgSlug === slugFromUrl`, then lazy-upserts |
| `requireWorkspaceByOrgId(orgId)` | route handlers with no slug, e.g. `liveblocks-auth` | lazy-upserts by `clerkOrgId` only |

`defaultAccesses: []` means a room is invisible unless the workspace group grants
it. Adding a member to the Clerk org grants every project in that workspace with
no per-room bookkeeping.

---

## 7. The reconciliation loop

The novel component. No prior art exists for Excalidraw + Liveblocks: Liveblocks
ships official React Flow, Tiptap, Lexical and BlockNote packages, but none for
Excalidraw, and a GitHub and examples-gallery search found no third-party
integration.

### Storage shape

```ts
type Storage = {
  elements: LiveMap<string, LiveObject<ExcalidrawElement>>
  meta: LiveObject<{ viewBackgroundColor: string }>
}
```

`LiveMap` keyed by element id, not `LiveList` — O(1) per-element updates and no
index churn when elements are added concurrently.

### Loop prevention: a version ledger

A boolean `isRemoteUpdate` flag breaks under interleaved local and remote edits.
Instead, a per-element ledger consulted by both directions:

```ts
const synced = useRef(new Map<string, number>())   // elementId → version
```

**Local → remote.** `onChange` throttled to ~100ms trailing. For each element, if
`el.version > synced.get(el.id)` it is a genuine local edit: batch it into the
`LiveMap` and record the new version. Elements whose version already matches the
ledger are skipped, so a change that originated remotely is never echoed back.

**Remote → local.** On `LiveMap` change, build the incoming array and merge per
element — higher `version` wins, `versionNonce` breaks ties. This is Excalidraw's
own rule, so we inherit its semantics rather than inventing merge behaviour.
Record accepted versions into the ledger *before* calling `updateScene`.

### Pointer gating (required)

Excalidraw's `updateScene` calls `scene.replaceAllElements` when `elements` is
passed, which must not happen during an active drag or resize. Remote updates are
therefore buffered while the pointer is down:

```ts
const isPointerDown = useRef(false)
const pendingRemote = useRef(new Map<string, ExcalidrawElement>())

// onPointerDown          → isPointerDown.current = true
// remote update arrives  → if pointer down, accumulate into pendingRemote, return
// onPointerUp            → isPointerDown.current = false; flush via updateScene
```

Remote edits are delayed by at most one drag gesture. The version ledger merges
correctly whenever it runs, so deferring changes *when*, never *what*.

### Project and room lifecycle

Ordering matters, and neither system supports a transaction spanning both.

**Creation** — Postgres first, Liveblocks second:

1. `db.project.create(...)` to obtain the cuid
2. `liveblocks.createRoom('proj_' + id, { defaultAccesses: [], groupsAccesses, organizationId })`
3. `liveblocks.initializeStorageDocument(roomId, emptyStorage)`

If step 2 or 3 fails, delete the `Project` row and surface the error. A project row
without a room is a broken project; an orphan room costs nothing and is cleaned up
by step 4 below never being reached.

`POST /storage` (step 3) is safe here and **only** here, because it disconnects all
connected users and nobody is connected to a room created microseconds ago. Every
later server-side write must use `PATCH /storage/json-patch`, which is atomic and
does not disconnect.

**Deletion** — Liveblocks first, Postgres second:

1. `liveblocks.deleteRoom(liveblocksRoomId)`
2. `db.project.delete(...)` — cascades `CanvasSnapshot`

If step 1 fails, log and continue to step 2. A stuck deletion is worse than an
orphan room. Orphan rooms consume plan limits, so log them at warn level with the
room id so they can be swept later.

Cascade deletes from `Workspace` do **not** delete rooms — Prisma cascades cannot
call an external API. Deleting a workspace must therefore enumerate its projects
and delete each room first. This is the one place where a bulk operation needs an
explicit loop rather than relying on the database.

### Throttling, precisely

| Where | Value | Behaviour |
|---|---|---|
| `onChange` → Liveblocks | 100ms | trailing edge, no leading call |
| `onPointerUpdate` → presence | 50ms | trailing edge |
| `storageUpdated` webhook | 60s | Liveblocks default; configurable via the Management API but the design must not depend on lowering it |

The `onChange` throttle must fire on the trailing edge so the final position of a
drag is always transmitted. A leading-edge-only throttle would send the start of a
gesture and silently drop where it ended.

### Undo isolation

```ts
api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER })
```

Per Excalidraw source: `IMMEDIATELY` is for undoable local updates, `NEVER` for
remote and initialization, `EVENTUALLY` is the default. `NEVER` keeps teammates'
edits out of the local undo stack — undo must reverse *your* last action.

### Deletion

No special handling. Excalidraw sets `isDeleted: true` and bumps `version`; it is
an ordinary update. The array only grows, which is why `CanvasSnapshot.elementCount`
is tracked — it is the early warning for the ~10MB per-room storage ceiling.
Garbage collection is deferred, monitored not solved.

### Presence

`collaborators` is a first-class `updateScene` parameter:

```ts
collaborators?: Map<string, { username: string; avatarUrl: string }>
```

So Excalidraw renders remote cursors and name labels natively. `onPointerUpdate`
→ throttled `updateMyPresence({ cursor, selectedIds })`; `useOthers()` → build the
map → `updateScene({ collaborators })`. `LiveCollaborationTrigger` provides the
collaborator-count button via `renderTopRightUI`.

### appState

Local only. Zoom, scroll and selection (`selectedElementIds` lives in `appState`)
are per-user. Only `viewBackgroundColor` is shared, via `meta`. Sharing more makes
every user's viewport jump when someone else pans.

---

## 8. Client state (Zustand)

Zustand holds only ephemeral client state that a page reload may forget. It never
holds server data or canvas elements.

```ts
// features/canvas/store.ts
type CanvasSessionState = {
  syncStatus: 'initial' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  isReadOnly: boolean          // true when falling back to the Postgres mirror
  elementCount: number         // drives the storage-ceiling warning
  lastSyncedAt: number | null
}
```

```ts
// stores/ui.ts
type UiState = {
  sidebarOpen: boolean
  modal: null | { kind: 'create-project' } | { kind: 'rename-project'; id: string }
}
```

`syncStatus` mirrors Liveblocks' own status values, so the reconciliation loop
just forwards them. The store is what lets a toolbar status pill and the read-only
banner both read connection state without either knowing about Excalidraw.

**Created per room via a provider factory, not a module singleton** — a
module-level store can leak state across requests during SSR.

`@liveblocks/zustand` is rejected: it would make a third source of truth
(Excalidraw scene, Zustand store, Liveblocks Storage) and its `storageMapping`
diffs a whole slice, hiding the per-element granularity the conflict design
depends on.

---

## 9. Canvas mirror webhook

`storageUpdated` is notification-only — it reports that a room changed, not what
changed. So: verify, fetch, upsert.

```ts
// app/api/webhooks/liveblocks/route.ts
const event = webhookHandler.verifyRequest({ headers, rawBody })
if (event.type !== 'storageUpdated') return ok()

// idempotency — survives restarts, unlike an in-memory set
const svixId = headers.get('svix-id')!
try {
  await db.processedWebhook.create({ data: { id: svixId, source: 'liveblocks' } })
} catch {
  return ok()                        // unique violation = already handled
}

// Look up by the indexed column, never by parsing the room id
const project = await db.project.findUnique({
  where: { liveblocksRoomId: event.data.roomId },
  select: { id: true },
})
if (!project) return ok()            // room with no project: log and ignore

const doc = await liveblocks.getStorageDocument(event.data.roomId, 'json')
const elements = Object.values(doc.elements ?? {}) as ExcalidrawElement[]
const elementCount = elements.filter((e) => !e.isDeleted).length

await db.canvasSnapshot.upsert({
  where:  { projectId: project.id },
  update: { elements, appState: doc.meta ?? {}, elementCount, syncedAt: new Date() },
  create: { projectId: project.id, elements, appState: doc.meta ?? {}, elementCount },
})
return ok()
```

`elementCount` counts only **live** elements, because the point of the number is to
warn on real content growth, and the total including soft-deleted ghosts would
alarm long before storage is actually at risk. Total array length is what pressures
the storage ceiling, so if a ceiling warning is added later it needs both numbers.

The lookup is by `liveblocksRoomId` — a unique indexed column — rather than slicing
the `proj_` prefix off the room id. Same result today, but it does not silently
break if the naming convention ever changes.

`storageUpdated` fires at most once per **60 seconds** by default. It is adjustable
via `storageUpdatedThrottleSeconds` on the Management API webhook endpoints, but
1a assumes the 60s default so that nothing depends on a plan-specific setting.

Two properties make this safe. It is **idempotent** — the fetch always returns
current truth, so a replayed event converges to the same row. And it is
**lossless on failure** — a dropped webhook leaves the mirror stale while
Liveblocks still holds the real data. Freshness is lost, never content.

---

## 10. Error handling

| Failure | Behaviour |
|---|---|
| Liveblocks unreachable | Canvas read-only from `CanvasSnapshot` with a banner. Lists, workspace, auth unaffected |
| Liveblocks webhook drops | Mirror goes stale; Liveblocks retries. Canvas unaffected — it reads Liveblocks directly |
| Clerk webhook late | Covered by the DAL lazy upsert |
| Room missing, Project row present | Recreate room and seed empty storage on next open. Log it — a room was deleted out of band |
| Storage nearing ~10MB | `elementCount` threshold → UI warning |
| Excalidraw throws | Error boundary around the canvas only; the shell survives so the user can navigate away |
| Bad webhook signature | 400, no processing |
| Replayed webhook | `ProcessedWebhook` unique constraint on `svix-id` short-circuits to 200 |
| Room creation fails during project creation | Delete the `Project` row, surface the error. No half-created projects |
| Room deletion fails during project deletion | Log at warn with the room id, proceed with the Postgres delete. Orphan rooms are swept manually |
| Workspace deleted | Enumerate projects and delete each room before the cascade. Prisma cascades cannot call an external API |

---

## 11. Testing

Vitest for unit and integration, Playwright for E2E (`@clerk/testing` supports
Playwright directly). Effort is concentrated where risk is.

| Target | Method | Rationale |
|---|---|---|
| `element-sync.ts` | Vitest, pure functions | The only novel logic. Concurrent edits, `version` ties broken by `versionNonce`, soft-delete propagation, echo suppression via the ledger. Cheap to test exhaustively |
| DAL | Vitest + test Postgres | Authorization. Explicit negatives: non-member gets `NotFound`, slug/session mismatch redirects, cross-org write rejected |
| Webhook handlers | Vitest + fixture payloads | Bad signature → 400; replayed `svix-id` → no duplicate; unknown event → 200 |
| Two-client collaboration | Playwright, two browser contexts | One draws, the other sees it; one deletes, the other loses it |
| Undo isolation | Playwright | After a remote edit arrives, local undo must reverse the local action. Proves `CaptureUpdateAction.NEVER` is wired correctly |
| Pointer gating | Playwright | Remote update during an active drag must not disrupt the drag |
| Auth flows | Playwright + `@clerk/testing` | Sign-up → org creation → project → canvas |

**Test database.** DAL tests run against a disposable Postgres, not the Supabase
project. Use a `docker-compose.test.yml` with a plain `postgres:17` container;
`prisma db push` against it in global test setup, truncate between suites. Never
point tests at `DATABASE_URL`.

**Liveblocks in tests.** Unit and DAL tests never touch Liveblocks — that is the
point of keeping `element-sync.ts` pure. Playwright tests use a real Liveblocks
development project, since mocking a CRDT sync engine would test the mock.

---

## 12. Spikes (prerequisites)

Both must complete before an implementation plan is written.

**Spike 1 — React Compiler + Excalidraw.** ~0.5 day. Install Excalidraw in this
app with `babel-plugin-react-compiler` enabled; draw, undo, redo, multi-select.
Excalidraw mutates elements internally via `mutateElement`; the compiler assumes
immutability, and no issues exist either way, meaning nobody has tested the
combination. Exit criteria: works as-is, or `"use no memo"` on the canvas wrapper,
or compiler disabled for that route. Also resolve the Prisma ESM/`"type": "module"`
question here.

**Spike 2 — Excalidraw ↔ Liveblocks round-trip.** 1–2 days. Two browsers, one
room, full loop: draw, move, delete, undo, reconnect, and a remote update landing
mid-drag. Confirms the version ledger suppresses echoes and that pointer gating
holds. Worth an hour reviewing `zimengxiong/excalidash` — a self-hosted Excalidraw
app with live collaboration and persistent storage, the closest available prior art
(not Liveblocks-based).

Spike 2 can change the architecture. If the round-trip proves unworkable, the
fallback is Liveblocks Yjs with `y-excalidraw`, trading the inspectable `LiveMap`
model for a binary CRDT that cannot be queried in SQL.

---

## 13. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | React Compiler + Excalidraw untested by anyone | High | Spike 1; `"use no memo"` escape hatch |
| 2 | No prior art for Excalidraw + Liveblocks | High | Spike 2; Yjs fallback documented |
| 3 | ~10MB room ceiling vs soft-delete accumulation | Medium | Track `elementCount`; warn in UI; GC deferred |
| 4 | `json-patch` performance on large documents (docs warn "very large documents may not be suitable") | Medium | Batch MCP writes in 1b; profile during Spike 2 |
| 5 | Simultaneous-connection limits per plan | Medium | Agents use REST presence, not WebSockets. Confirm connection accounting with Liveblocks |
| 6 | Mirror is up to 60s stale | Low | Acceptable for list views; show last-synced time. Lowering the throttle needs the Management API |
| 7 | Liveblocks `organizationId` immutable after room creation | Low | No project transfers between workspaces in 1a |

---

## 14. Open questions

1. **BLOCKING —** `"type": "module"` vs Prisma `moduleFormat = "cjs"`. Spike 1 decides
2. Exact `defineConfig` field names in `prisma.config.ts` for `prisma@7.9.1` —
   verify against installed types, do not copy from memory
3. Whether REST presence (`POST /rooms/{id}/presence`) consumes a simultaneous-
   connection slot. Matters for 1b, not 1a. Ask Liveblocks support

Resolved during design, recorded so they are not re-litigated:

| Question | Resolution |
|---|---|
| Permission scope string | `*:write` / `*:read`. `room:write` is not documented anywhere |
| `storageUpdated` throttle | 60s default; `storageUpdatedThrottleSeconds` exists on the Management API webhook endpoints but 1a assumes the default |
| Does Excalidraw render remote cursors natively | Yes — `collaborators` is a first-class `updateScene` parameter |

---

## 15. Next steps

1. Run Spike 1 and Spike 2
2. Fold spike findings back into this spec if they change any decision
3. Write the implementation plan for 1a
4. After 1a is working, write the MVP 1b (MCP server) spec — its tool surface
   depends on the reconciliation pattern established here

**Note for 1b:** `convertToExcalidrawElements()` accepts element *skeletons* and
generates valid elements, including arrow-to-shape binding by id and v0.18 elbow
arrows. Agents therefore emit `{ type, x, y, width, height }` rather than full
element JSON with `version`, `versionNonce`, `seed` and index. This substantially
reduces 1b's difficulty.

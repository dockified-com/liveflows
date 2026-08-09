<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LiveFlows

## What this is

A collaborative diagramming app for software system design. Teams brainstorm
architecture diagrams together in realtime on an Excalidraw canvas, organized by
Clerk Organizations as workspaces. External AI coding agents will later read and
draw diagrams via MCP (MVP 1b, not yet built).

**MVP 1a** (in progress, largely built — see `## Current state`):

- Clerk auth with Organizations as the workspace primitive
- Workspace → Project hierarchy, projects listed from Postgres
- Excalidraw canvas with realtime multiplayer via Liveblocks
- Room-level permissions derived from workspace membership
- Postgres canvas mirror kept fresh by the Liveblocks `storageUpdated` webhook

**Explicitly out of scope for 1a:** MCP server (1b), in-app AI chat/copilot (MVP 2),
images on canvas, project thumbnails, named version history, comments/notifications,
offline editing.

Full product/architecture rationale: `docs/superpowers/specs/2026-08-08-liveflows-design.md`.

## Build approach

Design first for anything nontrivial (`/architect` → spec in `docs/specs/`,
if this repo adopts the `.agents/skills` spec flow), coarse plan in `docs/scope/`.

## Architecture (locked)

**Liveblocks is the write path. Postgres is the read path.**

| Concern | Owner |
|---|---|
| Live canvas elements while editing | Liveblocks Storage (source of truth) |
| Users, workspaces, members, projects, roles | Postgres (via Prisma) |
| Canvas mirror for lists, search, outage fallback | Postgres, refreshed by the `storageUpdated` webhook |
| Identity, orgs, invites | Clerk |
| Drawing UX | Excalidraw |
| Ephemeral client UI state | Zustand |

Do not make Postgres authoritative for canvas elements — Excalidraw's
`version`/`versionNonce` last-write-wins model and soft-delete-only array make
that mechanically wrong (see design doc §3 for the full reasoning). Postgres is an
eventually-consistent mirror, refreshed at most every 60s by the Liveblocks webhook.

### Data flow

- Open a project → Server Component → DAL → Postgres for metadata; client connects
  to the Liveblocks room; Storage hydrates the canvas.
- Draw → `onChange` (throttled ~100ms) → diff by `version` → write to `LiveMap` →
  Liveblocks broadcasts → peers apply via `updateScene`.
- Mirror refresh → `storageUpdated` webhook (≤ once/60s) → fetch storage → upsert
  `CanvasSnapshot`.
- Project list → Server Component → DAL → Postgres only, no Liveblocks call.
- Liveblocks outage → canvas renders read-only from `CanvasSnapshot` with a banner;
  auth, lists, workspace pages unaffected.

## Repository conventions

- **`src/server/dal/`** — nothing outside this directory calls Prisma directly.
  Every DAL function resolves the Clerk session and proves membership in the same
  query. Non-members get `NotFoundError`, not `UnauthorizedError` — don't leak
  existence. `redirect()` throws; nothing after it runs.
- **`src/features/canvas/element-sync.ts`** is pure — arrays in, arrays out, no
  React, no Liveblocks. The reconciliation logic (merge by `version`, tie-break by
  `versionNonce`, echo suppression) is the one genuinely novel piece of this
  codebase; keep it testable without a browser or socket.
- **`proxy.ts`** (not `middleware.ts` — Next.js 16 renamed it) does authentication
  only: is there a session? Authorization — may this user touch this resource? —
  always lives in the DAL, never in proxy.
- `orgId`/`orgSlug` used for authorization always come from `await auth()`, never
  from client input or the URL. The URL slug is a label; the session is the
  authority (see `requireWorkspace` in `src/server/dal/workspaces.ts`).
- Webhooks (`src/app/api/webhooks/*`) reconcile; they never gate. Idempotent on
  the `svix-id` header via the `ProcessedWebhook` table (survives restarts, not an
  in-memory set).
- Liveblocks room lifecycle is not transactional with Postgres: create the
  `Project` row first, then the room (`src/server/liveblocks.ts`); delete the room
  first, then the row. See design doc §7 "Project and room lifecycle" before
  touching creation/deletion code.

## Stack (locked — do not substitute)

Next.js 16, React 19 (React Compiler on), Tailwind v4, TypeScript. Clerk (`@clerk/nextjs`)
for auth, Liveblocks (`@liveblocks/client|react|node`) for realtime, Excalidraw
(`@excalidraw/excalidraw`) for the canvas, Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`,
driver adapter mandatory) + `pg` against Supabase-hosted Postgres, Zustand for
ephemeral client UI/session state only (never server data or canvas elements).

**Document editing (planned, feature N):** Tiptap (MIT-licensed core) via
`@liveblocks/react-tiptap` — the same Liveblocks vendor already used for the canvas,
no second realtime backend. Build our own toolbar UI (matches the Industrial/Utilitarian
design direction in `DESIGN.md`); do not adopt BlockNote's pre-built Notion-style UI, a
different visual language layered on the same Tiptap/Prosemirror engine. Comes with
realtime multi-cursor editing, comments, mentions, notifications, and version history for
free on our existing Liveblocks infra, and `withProsemirrorDocument` for server-side
document edits — directly reusable for MVP 1b's MCP agents. See
`docs/scope/scope.md` feature N.

| Don't | Use instead |
|---|---|
| `npm`, `yarn` | `pnpm` |
| ESLint, Prettier | Biome (`pnpm lint`, `pnpm format`) |
| `middleware.ts` | `proxy.ts` |
| `prisma-client-js` generator | `prisma-client` (output checked into `src/generated/prisma`) |
| Prisma without a driver adapter | `@prisma/adapter-pg` |
| Supabase JS client / Auth / Realtime / RLS | Prisma for data, Clerk for auth, Liveblocks for realtime. Supabase is only the Postgres host |
| Supabase Storage | Nothing in 1a; Liveblocks `LiveFile` later |
| `@liveblocks/zustand`, `@liveblocks/redux` | `@liveblocks/react` directly (a third store would hide per-element granularity the sync design depends on) |
| A UI component library | Tailwind v4 + Clerk's prebuilt auth components |
| Jest | Vitest (unit/integration) + Playwright (E2E, with `@clerk/testing`) |
| Yjs, `y-excalidraw` | Liveblocks Storage (`LiveMap`). Documented fallback only if the round-trip proves unworkable |
| `useEffect` for data fetching | Server Components + the DAL |

Query Context7 MCP before writing integration code against Liveblocks, Excalidraw,
Prisma 7, or Clerk — all four have shipped recent breaking changes.

## Environment variables (required)

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`,
`LIVEBLOCKS_SECRET_KEY`, `LIVEBLOCKS_WEBHOOK_SECRET`, `DATABASE_URL` (Supabase
pooler, runtime), `DIRECT_URL` (Supabase direct/session-mode, migrations and
`prisma.config.ts`).

## Commands

```bash
pnpm dev            # Next.js dev server
pnpm build          # production build
pnpm lint           # Biome check
pnpm format         # Biome format --write
pnpm test           # Vitest (unit/integration)
pnpm test:e2e       # Playwright E2E
```

Test DB: a disposable `postgres:17` via `docker-compose.test.yml`, never
`DATABASE_URL`/the Supabase project.

## Current state

Substantial MVP 1a implementation exists under `src/`:

- Auth/routing: `src/proxy.ts`, `src/app/(auth)/sign-in|sign-up/`,
  `src/app/session-tasks/choose-organization/`
- Webhooks: `src/app/api/webhooks/clerk/route.ts`,
  `src/app/api/liveblocks-auth/route.ts`
- DAL: `src/server/dal/{workspaces,projects}.ts`
- Workspace/project UI: `src/app/(app)/w/[workspaceSlug]/`,
  `src/components/{project-list,create-project-modal,delete-project-dialog,app-nav}.tsx`
- Canvas + reconciliation: `src/features/canvas/{canvas-room.tsx,element-sync.ts}`,
  `src/app/canvas/[roomId]/page.tsx`, `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`
- Liveblocks room lifecycle: `src/server/liveblocks.ts`
- Client UI state: `src/stores/ui.ts`

**Not yet in the schema/mirror path:** `CanvasSnapshot` currently stores
`viewBackgroundColor` as a flat string column rather than the design doc's
`appState` JSON field — confirm which is current before changing either the
webhook handler or the schema. The `zod` dependency listed in the design doc is
not yet installed; check before assuming it's available.

Still pending per the design doc: MCP server (1b), in-app AI chat, image support,
project thumbnails, named version history, comments/notifications.
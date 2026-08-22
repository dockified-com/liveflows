# LiveFlows — Product Requirements Document

**Version:** 1.0
**Last updated:** 2026-08-16
**Status:** MVP 1a complete, MVP 1b complete, MVP 2 planned

---

## 1. Product overview

LiveFlows is a collaborative diagramming application for software system design.
Engineering teams brainstorm architecture diagrams together in realtime on an
Excalidraw canvas, organized by Clerk Organizations as workspaces. External AI
coding agents can read and draw diagrams via MCP (Model Context Protocol).

### 1.1 Vision

Every software team sketches architecture before building — on whiteboards,
Miro, draw.io, Figma. LiveFlows collapses the gap between "the diagram we drew"
and "the system we built" by making diagrams machine-readable and agent-writable.
Humans brainstorm; AI agents consume the same canvas to understand intent and
propose changes.

### 1.2 Target users

| Persona | Description |
|---|---|
| **Tech Lead / Architect** | Designs system architecture, wants real-time collaboration with the team and AI agent access to diagrams |
| **Software Engineer** | Participates in design sessions, references diagrams during implementation |
| **AI Coding Agent** | Reads architecture diagrams for context, draws proposed changes via MCP |

### 1.3 Core value proposition

- **Real-time multiplayer diagramming** on a proven canvas (Excalidraw)
- **Workspace-level organization** via Clerk Organizations — teams, roles, projects
- **Multi-file projects** with folders, split-pane editing, tabs, and drag-and-drop
- **AI agent interop** — MCP server exposes `list_files`, `read_canvas`, `draw_elements`
- **Document editing** alongside canvases (Tiptap + Liveblocks realtime)
- **Resilient architecture** — Liveblocks outage degrades to read-only, never data loss

---

## 2. Architecture summary

**Liveblocks is the write path. Postgres is the read path.**

| Concern | Owner |
|---|---|
| Live canvas elements while editing | Liveblocks Storage (source of truth) |
| Users, workspaces, members, projects, roles | Postgres (via Prisma 7) |
| Canvas mirror for lists, search, outage fallback | Postgres, refreshed by `storageUpdated` webhook (max 1/60s) |
| Identity, orgs, invites | Clerk |
| Drawing UX | Excalidraw |
| Document editing | Tiptap via `@liveblocks/react-tiptap` |
| Ephemeral client UI state | Zustand |

### 2.1 Data flow

1. **Open a project** — Server Component reads metadata from Postgres via DAL; client connects to Liveblocks room; Storage hydrates the canvas.
2. **Draw** — `onChange` (throttled ~100ms) diffs by `version`, writes to `LiveMap`, Liveblocks broadcasts, peers apply via `updateScene`.
3. **Mirror refresh** — `storageUpdated` webhook (at most 1/60s) fetches storage, upserts `CanvasSnapshot`.
4. **Project list** — Server Component reads Postgres only, no Liveblocks call.
5. **Liveblocks outage** — canvas renders read-only from `CanvasSnapshot` with a banner; auth, lists, workspace pages unaffected.

---

## 3. Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js 16 | 16.3.0 |
| UI | React 19 (React Compiler on) | 19.2.8 |
| Styling | Tailwind v4 | 4.x |
| Auth | `@clerk/nextjs` | 7.7.1 |
| Realtime | `@liveblocks/client`, `react`, `node` | 3.23.1 |
| Canvas | `@excalidraw/excalidraw` | 0.18.1 |
| ORM | Prisma 7 + `@prisma/adapter-pg` | 7.9.1 |
| Database | PostgreSQL (Supabase-hosted) | — |
| Document editor | `@tiptap/react` + `@liveblocks/react-tiptap` | 3.30.0 / 3.23.1 |
| MCP | `@modelcontextprotocol/sdk` | 1.30.0 |
| DnD | `@dnd-kit/core`, `@dnd-kit/sortable` | 6.3.1 / 10.0.0 |
| Client state | Zustand | 5.0.5 |
| Validation | Zod | 4.4.3 |
| Lint/Format | Biome | 2.4.2 |
| Testing | Vitest + Playwright + `@clerk/testing` | — |
| Package manager | pnpm | 11.20.0 |

---

## 4. Data model

| Model | Purpose |
|---|---|
| `User` | Clerk-synced user (email, name, avatar) |
| `Workspace` | 1:1 with Clerk Organization (`clerkOrgId` unique) |
| `WorkspaceMember` | User–Workspace join with role (opaque string) |
| `Project` | Container for files/folders within a workspace |
| `Folder` | Recursive hierarchy via `parentId`; case-insensitive uniqueness |
| `File` | Canvas or document file; `liveblocksRoomId` for canvases |
| `CanvasSnapshot` | Postgres mirror of Liveblocks storage (elements JSON, appState JSON) |
| `DocumentSnapshot` | Postgres mirror of Tiptap document (Prosemirror JSON) |
| `ProcessedWebhook` | Idempotency table with durable leases |
| `PersonalAccessToken` | PAT for MCP agent auth (SHA-256 hashed) |

---

## 5. Features

### 5.1 MVP 1a — Collaborative diagramming (complete)

| # | Feature | Status |
|---|---|---|
| A | Stack and architecture | Done |
| B | Data model (Prisma schema) | Done |
| C | Auth and workspace resolution (Clerk + proxy.ts) | Done |
| D | Clerk membership sync webhook | Done |
| E | Workspace project list | Done |
| F | Project create/delete | Done |
| G | Liveblocks room lifecycle (provision/decommission) | Done |
| H | Canvas realtime reconciliation (`element-sync.ts`) | Done |
| I | Liveblocks auth token issuance | Done |
| J | Canvas mirror (`storageUpdated` webhook → `CanvasSnapshot`) | Done |
| K | Liveblocks outage read-only fallback | Done |
| L | Storage-ceiling warning UI (element count thresholds) | Done |
| M | Landing/marketing page | Done |
| N | Multi-file projects (files, folders, tabs, split pane, DnD) | Done |

### 5.2 MVP 1b — MCP server (complete)

| # | Feature | Status |
|---|---|---|
| 1 | MCP SSE server (`/api/mcp/sse` + `/api/mcp/message`) | Done |
| | `list_files` tool — list project files/folders | Done |
| | `read_canvas` tool — read canvas elements | Done |
| | `draw_elements` tool — write elements to canvas | Done |
| | PAT-based authentication (SHA-256 hashed tokens) | Done |

### 5.3 MVP 2 — AI chat/copilot (planned)

| # | Feature | Status |
|---|---|---|
| 2 | In-app AI chat/copilot | Planned |

### 5.4 Deferred features

| # | Feature | Notes |
|---|---|---|
| 3 | Images on canvas | Liveblocks `LiveFile` when ready |
| 4 | Project thumbnails | — |
| 5 | Named version history | — |
| 6 | Comments and notifications | Via `@liveblocks/react-tiptap` infrastructure |
| 7 | Offline editing / write queue | — |

---

## 6. Functional requirements

### 6.1 Authentication and authorization

- **FR-AUTH-1:** Users sign in/up via Clerk (`@clerk/nextjs`).
- **FR-AUTH-2:** `proxy.ts` handles authentication only (session presence check). Authorization lives exclusively in the DAL.
- **FR-AUTH-3:** `orgId`/`orgSlug` for authorization always comes from `await auth()`, never from client input or URL.
- **FR-AUTH-4:** Non-members receive `NotFoundError`, never `UnauthorizedError` — no existence leaking.

### 6.2 Workspaces

- **FR-WS-1:** Each workspace maps 1:1 to a Clerk Organization.
- **FR-WS-2:** Workspace creation/membership sync happens via Clerk webhooks (idempotent on `svix-id`).
- **FR-WS-3:** Workspace member roles are opaque strings stored in `WorkspaceMember`.

### 6.3 Projects and files

- **FR-PROJ-1:** Projects belong to a workspace. Listed via Server Components reading Postgres (no Liveblocks call).
- **FR-PROJ-2:** Each project contains files and folders in a recursive hierarchy.
- **FR-PROJ-3:** Files are typed — currently `canvas` or `document`.
- **FR-PROJ-4:** File tree supports create, rename, move (with cycle prevention via advisory locks), and delete (recursive CTE for folders).
- **FR-PROJ-5:** Tab-based editing with split-pane support and drag-and-drop reorder.

### 6.4 Canvas (Excalidraw)

- **FR-CANVAS-1:** Each canvas file gets a Liveblocks room (provisioned on file creation, decommissioned on deletion).
- **FR-CANVAS-2:** Realtime reconciliation via `element-sync.ts` — version-based LWW merge, `versionNonce` tie-break, echo suppression via ledger, pointer gating during drag.
- **FR-CANVAS-3:** Canvas mirror in Postgres (`CanvasSnapshot`) refreshed by `storageUpdated` webhook, max once per 60 seconds.
- **FR-CANVAS-4:** During Liveblocks outage, canvas renders read-only from snapshot with a visible banner.
- **FR-CANVAS-5:** Element count warning at configurable thresholds (storage ceiling).

### 6.5 Document editing (Tiptap)

- **FR-DOC-1:** Document files open in Tiptap editor with Liveblocks realtime collaboration.
- **FR-DOC-2:** Multi-cursor editing, backed by `@liveblocks/react-tiptap`.
- **FR-DOC-3:** Document snapshots mirrored to Postgres (`DocumentSnapshot`).

### 6.6 MCP server

- **FR-MCP-1:** SSE transport at `/api/mcp/sse` (GET) + `/api/mcp/message` (POST).
- **FR-MCP-2:** Authenticated via Personal Access Tokens (SHA-256 hashed, stored in `PersonalAccessToken` table).
- **FR-MCP-3:** Three tools exposed: `list_files`, `read_canvas`, `draw_elements`.
- **FR-MCP-4:** Agents can read architecture diagrams and propose changes on the same canvas humans use.

---

## 7. Non-functional requirements

### 7.1 Performance

- **NFR-PERF-1:** Canvas `onChange` throttled to ~100ms for smooth multiplayer feel.
- **NFR-PERF-2:** Webhook mirror updates capped at 1 per 60 seconds to avoid DB pressure.
- **NFR-PERF-3:** Project list reads Postgres only — no Liveblocks roundtrip.

### 7.2 Reliability

- **NFR-REL-1:** Liveblocks outage does not take down auth, workspace pages, or project lists.
- **NFR-REL-2:** Webhook idempotency via `ProcessedWebhook` with durable leases (survives restarts).
- **NFR-REL-3:** Room lifecycle is not transactional with Postgres — create row first then room; delete room first then row (designed for partial-failure safety).

### 7.3 Security

- **NFR-SEC-1:** All authorization in DAL, never in proxy or client.
- **NFR-SEC-2:** MCP PATs hashed with SHA-256 before storage.
- **NFR-SEC-3:** Non-members get `NotFoundError` to prevent resource enumeration.

### 7.4 Design

- **NFR-DESIGN-1:** Light SaaS theme. `--bg: #F8FAFC`, `--accent: #2563EB`, `--ink: #1E293B`.
- **NFR-DESIGN-2:** Geist / Geist Mono fonts. 4px grid spacing. 12px card radius.
- **NFR-DESIGN-3:** WCAG AA contrast minimum.
- **NFR-DESIGN-4:** Dark theme only on landing page; authenticated UI is light-only.

---

## 8. Key design decisions

1. **Dual-path architecture** — Liveblocks Storage is canonical for live editing; Postgres is eventually-consistent mirror for reads, search, and fallback.
2. **Pure reconciliation** — `element-sync.ts` is pure functions (arrays in, arrays out). No React, no Liveblocks imports. Testable without a browser.
3. **Auth vs authz separation** — `proxy.ts` checks session existence. DAL proves membership in the same query that fetches data.
4. **Webhook-driven sync** — Canvas and document mirrors refresh passively via webhooks, not on every client write.
5. **Non-transactional room lifecycle** — Designed for partial failures between Postgres and Liveblocks.
6. **File/Folder as separate tables** — Not polymorphic. Each file has exactly one type.
7. **Advisory locks for folder moves** — Postgres advisory locks + parent-chain walk for cycle prevention.

---

## 9. Success metrics

| Metric | Target |
|---|---|
| Canvas load time (P95) | < 2 seconds |
| Realtime sync latency (P95) | < 200ms |
| Concurrent users per room | 10+ without degradation |
| Webhook mirror freshness | < 60 seconds |
| Liveblocks outage → read-only fallback | < 5 seconds detection |
| MCP tool response time (P95) | < 1 second |

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Liveblocks outage | Users cannot edit canvases | Read-only fallback from `CanvasSnapshot` with banner |
| Excalidraw element count explosion | Slow canvas, high storage cost | Storage-ceiling warning UI at configurable thresholds |
| Webhook delivery failure | Stale Postgres mirror | Idempotent `ProcessedWebhook` with retry; mirror is non-critical |
| Clerk org sync lag | Users see stale membership | Webhook reconciliation; `requireWorkspace` lazy-upserts on first access |
| MCP abuse via stolen PAT | Unauthorized canvas writes | SHA-256 hashing, per-token revocation, `lastUsedAt` tracking |

---

## 11. Out of scope (current phase)

- In-app AI chat/copilot (MVP 2)
- Images on canvas
- Project thumbnails
- Named version history
- Comments and notifications
- Offline editing / write queue
- Supabase Auth / RLS / Realtime (explicitly not used — Clerk + Liveblocks instead)
- Dark theme in authenticated UI

---

## 12. Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client-side key |
| `CLERK_SECRET_KEY` | Clerk server-side key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Verify Clerk webhook signatures |
| `LIVEBLOCKS_SECRET_KEY` | Liveblocks server SDK auth |
| `LIVEBLOCKS_WEBHOOK_SECRET` | Verify Liveblocks webhook signatures |
| `DATABASE_URL` | Supabase pooler connection (runtime) |
| `DIRECT_URL` | Supabase direct connection (migrations, `prisma.config.ts`) |

---

## 13. Development commands

```bash
pnpm dev            # Next.js dev server
pnpm build          # Production build
pnpm lint           # Biome check
pnpm format         # Biome format --write
pnpm test           # Vitest (unit/integration)
pnpm test:e2e       # Playwright E2E
```

Test database: disposable `postgres:17` via `docker-compose.test.yml`, never production `DATABASE_URL`.

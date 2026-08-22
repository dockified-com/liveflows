# Agent Briefing — Realtime Migration

**Read this before starting any task file in this folder.** It carries the
conventions, invariants, and source-file context that apply to every task.

---

## 1. What this migration is

LiveFlows runs realtime canvas and document editing on Liveblocks. Liveblocks is
being cancelled for cost reasons — the bill is not covered by the MVP budget for
this commercial product. You are replacing it with a self-hosted Hocuspocus + Yjs
server running as a Docker Compose service on the existing rented server.

Full spec: [`docs/specs/0007-realtime-migration.md`](../0007-realtime-migration.md).

This is **not** an optimization. Every canvas and document currently depends on
Liveblocks, so the product does not function without a working replacement.

## 2. The one irreversible risk

**`DocumentSnapshot` has never been written to.** Verify it yourself:

```bash
grep -rn "documentSnapshot" src/ --include="*.ts" --include="*.tsx" | grep -v generated
```

That returns nothing. Every Tiptap document exists **only** inside Liveblocks. The
`storageUpdated` webhook explicitly bails on non-canvas files
(`src/app/api/webhooks/liveblocks/route.ts:127-142`), which is why.

Canvases are safe — `CanvasSnapshot` is populated.

**Task 00 exports documents and must complete before anything else.** If you are
assigned any other task and task 00 is not `done` in `progress.md`, stop and say so.

## 3. Documents are Yjs, not JSON

This surprised the spec author and is worth stating plainly.

`@liveblocks/react-tiptap` stores documents as **Yjs documents**, not as Storage
JSON. `@liveblocks/node` exposes `getYjsDocumentAsBinaryUpdate`, confirming it.

Consequences:

- Document migration is **Yjs → Yjs**: fetch a binary update, apply it into a fresh
  `Y.Doc`. Lossless.
- Reconstructing a `Y.Doc` from ProseMirror JSON is **lossy** — it discards the
  CRDT's internal history and client-id structure. Never seed a document that way.
- `DocumentSnapshot` therefore carries two columns: `yjsUpdate` (Bytes, lossless,
  for seeding) and `content` (JSON, readable, for MCP tools, search, and outage
  fallback). Both get written.

Canvases need no binary column — Excalidraw elements are plain data and
`element-sync.ts` reconciles them deterministically.

## 4. `element-sync.ts` survives — do not delete it

`src/features/canvas/element-sync.ts` is 54 lines: `mergeIncoming` (higher
`version` wins, lower `versionNonce` breaks ties) and `collectLocalChanges` (echo
suppression via a version ledger).

An earlier feature doc assumed a CRDT would make it redundant. **That is wrong.**
`Y.Map` gives per-key last-write-wins, but Excalidraw's own `version` /
`versionNonce` semantics still need applying on top. `Y.Map` is the direct analogue
of the `LiveMap` already in use, so the port is close to mechanical.

Its tests must pass **unchanged** (AC-9). If you find yourself editing them, stop
and report.

We are also deliberately **not** adopting `y-excalidraw`. Trading working, tested
reconciliation for a less mature third-party binding is the wrong risk. Do not
install it.

## 5. Repo conventions

| Rule | Detail |
|---|---|
| Package manager | `pnpm` only. Never npm/yarn. |
| Lint / format | Biome: `pnpm lint`, `pnpm format`. Never ESLint or Prettier. |
| Test naming | `*.test.ts` → Vitest (node), `*.test.tsx` → Vitest (jsdom), `*.spec.ts` → Playwright. **Load-bearing** — see `vitest.unit.config.ts:11-22`. |
| Prisma | v7, driver adapter mandatory (`@prisma/adapter-pg`). Generator output is checked in at `src/generated/prisma`. |
| Migrations | Need `DIRECT_URL` (session mode), not `DATABASE_URL` (pooler). |
| Middleware | The file is `src/proxy.ts` — Next.js 16 renamed it. |
| Commits | One per task. Run `pnpm lint` first. |

## 6. Source files you must read

| File | Lines | Why |
|---|---|---|
| `src/server/liveblocks.ts` | 73 | `provisionRoom`, `decommissionRoom`, `roomIdForFile`. Being deleted. |
| `src/features/canvas/element-sync.ts` | 54 | Preserved. Read it before touching canvas sync. |
| `src/features/canvas/canvas-room.tsx` | 317 | Keeps its structure; only the transport changes. |
| `src/features/document/document-editor.tsx` | 188 | Note the provider seam it uses. |
| `src/app/api/webhooks/liveblocks/route.ts` | 198 | Its persistence logic moves to `onStoreDocument`. |
| `prisma/schema.prisma` | 144 | `File.liveblocksRoomId` at line 88; both snapshot models. |
| `docker-compose.test.yml` | ~20 | The established Compose idiom in this repo. |

## 7. Things that will surprise you

**There is no deployment configuration.** No `Dockerfile`, no production
`docker-compose.yml`, no `vercel.json`, no CI deploy step. `next.config.ts` is four
lines. So this migration also establishes the deployment story — unavoidable,
because a WebSocket server cannot run serverless.

**`pnpm-workspace.yaml` already exists** but holds only `allowBuilds` and
`minimumReleaseAgeExclude` — there is no `packages:` field. Adding one turns it into
a real workspace. This is an addition, not new tooling.

**`decommissionRoom` never throws.** It swallows errors with `console.warn`
(`liveblocks.ts:64-73`), which makes the try/catch wrappers at `projects.ts:107`,
`folders.ts:185`, and `files.ts:205` dead code. Delete them with the function.

**`files.ts:248` already tolerates an empty room id**, falling back to the
`roomIdForFile` convention. That is why the column can become advisory.

**`src/server/mcp.ts:10-11` already requires a single instance or sticky sessions**
via a module-level session `Map`. The single-instance constraint this migration
accepts is therefore not new.

**`pnpm test` does not start the test Postgres** — `vitest.config.ts` declares no
`globalSetup` despite `vitest.global-setup.ts` existing. The authorization batch
fixes this; if your task needs a database, check whether that landed.

**AGENTS.md forbids what you are building.** Its stack table (line 123) says
"Yjs, `y-excalidraw` → Use Liveblocks Storage (`LiveMap`)". This migration overrides
that deliberately, for budget reasons. Task 09 updates it. Do not treat the existing
rule as blocking.

## 8. Authorization ships in two stages

The authorization batch's phase 5 produces
`authorizeRealtimeConnection(principal, fileId)`. **It is not built yet.**

Task 03 implements stage one: resolve `file → project → workspace`, require a
`WorkspaceMember` row, return `write` or `deny`. This matches exactly what
Liveblocks enforces today, so there is no regression — but viewers are not
read-only until stage two.

Keep the function signature identical to the eventual one so the swap is a
one-file change. Do not invent a different shape.

## 9. Security rules

**Never trust the client.** `documentName` is the `fileId` and arrives from the
client, so it must be authorized server-side on every connection. A payload like
`{ fileId, role: "editor" }` is never trusted — the server resolves the role.

**Verify the Clerk token server-side.** There is no `await auth()` in a raw
WebSocket upgrade. Use `verifyToken` from `@clerk/backend` with `CLERK_SECRET_KEY`.
Rejecting means throwing from `onAuthenticate` — that is Hocuspocus's contract.

**The WS server gets no public port.** It is reachable only over the Compose
internal network, with the reverse proxy handling TLS and the upgrade.

**Do not log tokens or secrets**, including in debug output.

## 10. Testing

**Convergence is the thing worth testing.** Boot a server on an ephemeral port,
connect two `Y.Doc`s, apply changes to each, assert both converge. That is the
property this whole migration must preserve.

**`element-sync.ts` tests must pass unchanged.**

**The export script needs a dry-run mode** so it can be verified before it writes.

Do not test against the production Liveblocks account beyond read-only calls, and
never against the production database.

## 11. When you finish

1. `pnpm lint` — must be clean.
2. Run your task's tests, plus existing suites for anything you touched.
3. `pnpm build` if you changed app code.
4. Commit with the message in your task file.
5. Update [`progress.md`](./progress.md): status, date, commit SHA, and anything the
   next agent needs.

## 12. When to stop and ask

Report rather than improvising if:

- Task 00 has not completed and you were assigned another task.
- An export would overwrite existing `DocumentSnapshot` content.
- A migration would delete or rewrite data rather than add to it.
- You need to install `y-excalidraw`, or delete `element-sync.ts`.
- A Hocuspocus or Yjs API differs from what your task file states — these libraries
  move, and the spec's code samples are written from documentation, not a compiled
  build.
- Making your task work seems to require changing `element-sync.ts`.
- Anything would require cancelling or degrading the Liveblocks account before
  task 09.

State what you found, what you tried, and what you think the right call is. Do not
silently expand scope, and do not disable a failing test.

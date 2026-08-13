# MCP Server (MVP 1b)

**Status**: Proposed
**Date**: 2026-08-11

## Summary

External AI coding agents need to read and draw diagrams in LiveFlows workspaces. This spec defines the Model Context Protocol (MCP) server implementation for MVP 1b. It allows agents to list files, read the current canvas state from the Postgres mirror, and push updates directly to Liveblocks without disrupting concurrent human edits.

## Context

LiveFlows is a SaaS application. MVP 1a established the real-time canvas architecture using Liveblocks as the write path and Postgres as the read path mirror. For MVP 1b, we need to expose these capabilities to external AI agents. The standard protocol for agent-tool integration is MCP.

The primary constraints are:
1. **Concurrency**: Agent writes must not clobber human writes. We must reuse the existing reconciliation logic (`element-sync.ts`).
2. **Read efficiency**: Agents should read the canvas state from the Postgres mirror (`CanvasSnapshot`) rather than opening a Liveblocks socket.
3. **Transport**: The server must support standard MCP transports so agents like Claude Desktop or Antigravity can connect.

## Options considered

1. **Hosted SSE MCP Server (Next.js `/api/mcp`)**
   - *Pros*: Built directly into the existing Next.js backend, shares DAL and Clerk auth logic, reads from the existing Postgres DB, no extra infrastructure.
   - *Cons*: Agents must support the SSE MCP transport (which is standard, but less ubiquitous than `stdio`).
2. **Standalone Local MCP Server (`npx @liveflows/mcp`)**
   - *Pros*: Runs over standard `stdio` transport.
   - *Cons*: Requires users to install and run a local Node process, needs complex local authentication (e.g. issuing a personal access token to the CLI), splits the codebase.
3. **Liveblocks as the direct read path**
   - *Pros*: Always 100% up to date.
   - *Cons*: Opening a Liveblocks room connection from an API route is slow and expensive. The Postgres mirror is designed exactly for this read-heavy use case.

## Decision

We will implement a **Hosted SSE MCP Server** directly in the Next.js application at `/api/mcp/sse` and `/api/mcp/message`.

**Implementation skills**: Backend DAL Dev, MCP standard integration.

## Rationale

A hosted SSE server leverages our existing Next.js infrastructure, Prisma DAL, and Clerk session logic (via Personal Access Tokens for agents). The Postgres mirror already solves the read problem, and `@liveblocks/node` allows us to push updates server-side. This avoids the complexity of distributing a local CLI tool and managing its lifecycle.

## Requirements

- **AC-1**: Agents can authenticate to the MCP server using a Personal Access Token (PAT) associated with a Clerk User.
- **AC-2**: The MCP server exposes a `list_files` tool that returns all canvases and documents accessible to the authenticated user.
- **AC-3**: The MCP server exposes a `read_canvas` tool that returns the current `CanvasSnapshot` (Excalidraw JSON) for a given `fileId` from Postgres.
- **AC-4**: The MCP server exposes a `draw_elements` tool that takes a `fileId` and a list of new Excalidraw elements. It pushes these to the Liveblocks room via `@liveblocks/node` `updateStorageDocument`, applying our standard `version`/`versionNonce` reconciliation to avoid clobbering human edits.

## Feature design

**Data model sketch**:
- Need a new model: `PersonalAccessToken` (to allow agents to authenticate as a user).
  - `id` (String, PK)
  - `userId` (String, indexed)
  - `tokenHash` (String, unique)
  - `name` (String)
  - `createdAt` / `lastUsedAt`

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/mcp/sse` | GET | `Authorization: Bearer <PAT>` | SSE stream, `sessionId` | Bearer PAT | 401 Unauthorized |
| `/api/mcp/message` | POST | `sessionId`, JSON-RPC payload | 200 OK | Bearer PAT | 401 Unauthorized, 404 session not found |

**MCP Tools**:
1. `list_files(workspaceSlug)` -> Returns list of `{ id, name, type }` for the workspace.
2. `read_canvas(fileId)` -> Returns `{ elements, appState }` from Postgres `CanvasSnapshot`.
3. `draw_elements(fileId, elements)` -> Pushes elements to Liveblocks, returns `{ success: true }`.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| List files | Workspace files | `db.file.findMany` scoped by user membership in workspace. |
| Read canvas | Canvas JSON | `db.canvasSnapshot.findUnique` |
| Draw elements | Room update | `@liveblocks/node` SDK |

**Security model**:
- MCP endpoints are protected by the Bearer PAT.
- The PAT resolves to a `userId`.
- All file access is routed through the existing DAL (`requireWorkspace` / `getFile`) to enforce org membership.

**Configuration required**:
- No new external third-party keys are needed.

**Critical test scenarios**:
- Happy path: Agent connects via SSE, calls `list_files`, reads a canvas, and draws a rectangle successfully. (Verifies AC-1, AC-2, AC-3, AC-4).
- Failure case: Agent provides an invalid PAT (401 Unauthorized). (Verifies AC-1).
- Failure case: Agent tries to read or draw to a file in a workspace they do not belong to (404 Not Found). (Verifies AC-3, AC-4).
- Concurrency: Agent draws an element while a human is drawing. The Liveblocks reconciliation logic ensures both elements survive. (Verifies AC-4).

## Build plan

1. **Migration + Data model**: Add `PersonalAccessToken` model to Prisma schema, run migration. (AC-1)
2. **Token Management UI**: Add a simple UI in `/w/[workspaceSlug]/settings` (or user profile) to generate and revoke PATs. (AC-1)
3. **MCP Server Core**: Implement the SSE and POST endpoints using `@modelcontextprotocol/sdk`. Set up PAT verification. (AC-1)
4. **MCP Tools (Read)**: Implement `list_files` and `read_canvas` tools using the existing DAL. (AC-2, AC-3)
5. **MCP Tools (Write)**: Implement `draw_elements` tool. Use `@liveblocks/node` to fetch current storage, merge new elements, and update storage. (AC-4)

## Consequences

- We take on the maintenance of an SSE endpoint, which requires keeping connections open. On serverless (Vercel), SSE connections have duration limits, but MCP clients typically reconnect automatically.
- AI agents will generate load on Liveblocks storage and our webhook mirror.

## Follow-up

- Consider how agents will read and edit Tiptap documents (MVP 1b extension).
- Evaluate if we need rate limiting specific to PATs to prevent runaway agents.

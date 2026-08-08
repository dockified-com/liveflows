# Team Delta — Liveblocks Plumbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the server-side Liveblocks integration — ID token issuance, room lifecycle (create/delete), and the `storageUpdated` mirror webhook.

**Architecture:** Three route handlers (`liveblocks-auth`, `webhooks/liveblocks`) plus a shared `src/server/liveblocks.ts` module exposing the Liveblocks Node client and room lifecycle functions. Delta owns the server side of Liveblocks; Team Bravo owns the client side. The seam is the room id and the Storage shape.

**Tech Stack:** `@liveblocks/node@3.23.1`, `next@16.3.0` (App Router route handlers), `vitest@4.1.10`, `@clerk/nextjs@7.7.1` (for `auth()` in the token endpoint).

## Global Constraints

- Package manager: `pnpm` only. No npm, no yarn.
- Linter/formatter: Biome only. No ESLint, no Prettier.
- Test runner: Vitest only. No Jest.
- Next.js 16: `proxy.ts` not `middleware.ts`. Route handlers export named HTTP method functions (`GET`, `POST`, etc.) using the Web Request/Response API.
- Prisma 7: `prisma-client` generator, driver adapter mandatory, output to `src/generated/prisma`.
- Environment: `LIVEBLOCKS_SECRET_KEY` and `LIVEBLOCKS_WEBHOOK_SECRET` from `process.env`. Never committed. Staging and production use different Liveblocks projects with no shared credentials.
- Delta does NOT touch: `package.json`, `prisma/`, `prisma.config.ts`, `src/features/canvas/**`.
- Permission scopes: `*:write` and `*:read` — NOT `room:write`. Verified via Context7 against `@liveblocks/node` docs.
- ID tokens are the multi-tenant authentication path for Liveblocks.
- `createRoom` accepts `organizationId` which is IMMUTABLE after creation.
- `POST /v2/rooms/{id}/storage` (i.e. `initializeStorageDocument`) disconnects every connected user — only safe at room creation time.
- `PATCH /v2/rooms/{id}/storage/json-patch` is atomic and does not disconnect.
- The `storageUpdated` webhook is notification-only — carries no payload of the change. Handler must fetch the room's storage. Default throttle is 60 seconds.
- Webhook handlers must verify their signature, must be idempotent (Liveblocks retries), and the `/api/webhooks(.*)` path must be public in `proxy.ts` or Clerk returns 401.
- Unit tests: a test that asserts against a mock of the code under test is a defect, not coverage. Test real logic with real inputs.

## Binding Liveblocks Facts (verified against Context7 2026-08-08)

1. Permission scopes are `*:write` and `*:read`. Every documented example uses this form.
2. ID tokens are issued via `liveblocks.identifyUser({ userId, groupIds, organizationId }, { userInfo })` — the multi-tenant path.
3. `createRoom(roomId, { defaultAccesses, groupsAccesses, organizationId })` — `organizationId` is immutable after creation.
4. `initializeStorageDocument(roomId, data)` disconnects all active users. Only safe at creation.
5. `getStorageDocument(roomId, 'json')` returns the Storage tree in JSON format.
6. `WebhookHandler` class: `new WebhookHandler(secret)`, then `webhookHandler.verifyRequest({ headers, rawBody })` returns the typed event.
7. `storageUpdated` event shape: `event.type === 'storageUpdated'`, `event.data.roomId` — no storage payload included.
8. `deleteRoom` is available on the Liveblocks client (could not verify exact method name from installed types as `@liveblocks/node` is not yet installed; plan assumes `liveblocks.deleteRoom(roomId)` per documented REST API pattern — verify at implementation time).

## Storage Shape (frozen at gate G1 — shared with Team Bravo)

This shape is frozen. Neither Delta nor Bravo may change it unilaterally.

```ts
type Storage = {
  elements: LiveMap<string, LiveObject<ExcalidrawElement>>
  meta: LiveObject<{ viewBackgroundColor: string }>
}
```

---

## Task 0: D0 — Liveblocks Auth (ID Token Endpoint)

**Files:**
- Create: `src/server/liveblocks.ts`
- Create: `src/app/api/liveblocks-auth/route.ts`
- Create: `src/server/liveblocks.test.ts`
- Create: `src/app/api/liveblocks-auth/route.test.ts`

**Interfaces:**
- Consumes: `requireWorkspaceByOrgId(orgId: string): Promise<{ id: string; slug: string }>` from `src/server/dal/workspaces.ts` (Team Charlie C1)
- Consumes: `auth()` from `@clerk/nextjs/server` — returns `{ isAuthenticated, userId, orgId, orgSlug }`
- Produces: `liveblocks` singleton (the `Liveblocks` Node client instance) from `src/server/liveblocks.ts`
- Produces: `POST /api/liveblocks-auth` route handler returning `{ status, body }` from `identifyUser`

### Steps

- [ ] **Step 1: Create the Liveblocks Node client singleton**

```ts
// src/server/liveblocks.ts
import { Liveblocks } from '@liveblocks/node'

if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  throw new Error('LIVEBLOCKS_SECRET_KEY is not set')
}

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
})
```

- [ ] **Step 2: Write the failing test for the auth route handler**

```ts
// src/app/api/liveblocks-auth/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the route handler logic by calling the exported POST function
// with a constructed Request. The dependencies (auth, DAL, liveblocks)
// are mocked at the module level — we are NOT mocking the code under test,
// we are mocking its collaborators.

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/server/dal/workspaces', () => ({
  requireWorkspaceByOrgId: vi.fn(),
}))

vi.mock('@/server/liveblocks', () => ({
  liveblocks: {
    identifyUser: vi.fn(),
  },
}))

import { POST } from './route'
import { auth } from '@clerk/nextjs/server'
import { requireWorkspaceByOrgId } from '@/server/dal/workspaces'
import { liveblocks } from '@/server/liveblocks'

describe('POST /api/liveblocks-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      userId: null,
      orgId: null,
    } as any)

    const req = new Request('http://localhost/api/liveblocks-auth', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when no orgId in session', async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_123',
      orgId: null,
    } as any)

    const req = new Request('http://localhost/api/liveblocks-auth', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns the identifyUser response on success', async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_123',
      orgId: 'org_abc',
    } as any)

    vi.mocked(requireWorkspaceByOrgId).mockResolvedValue({
      id: 'ws_xyz',
      slug: 'my-workspace',
    })

    vi.mocked(liveblocks.identifyUser).mockResolvedValue({
      status: 200,
      body: '{"token":"xxx"}',
    } as any)

    const req = new Request('http://localhost/api/liveblocks-auth', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('{"token":"xxx"}')
    expect(liveblocks.identifyUser).toHaveBeenCalledWith(
      {
        userId: 'user_123',
        groupIds: ['ws_xyz'],
        organizationId: 'org_abc',
      },
      { userInfo: expect.objectContaining({}) },
    )
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/liveblocks-auth/route.test.ts`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 4: Implement the route handler**

```ts
// src/app/api/liveblocks-auth/route.ts
import { auth } from '@clerk/nextjs/server'
import { liveblocks } from '@/server/liveblocks'
import { requireWorkspaceByOrgId } from '@/server/dal/workspaces'

export async function POST(_request: Request) {
  const { isAuthenticated, userId, orgId } = await auth()

  if (!isAuthenticated || !orgId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const ws = await requireWorkspaceByOrgId(orgId)

  const { status, body } = await liveblocks.identifyUser(
    {
      userId,
      groupIds: [ws.id],
      organizationId: orgId,
    },
    { userInfo: {} },
  )

  return new Response(body, { status })
}
```

> **Note:** `userInfo` is intentionally `{}` for now. Team Echo will pass `name` and `avatar` when wiring the canvas page (E2). The route handler accepts whatever userInfo is needed; the contract is the token shape, not the metadata.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/liveblocks-auth/route.test.ts`
Expected: PASS — all three assertions green.

- [ ] **Step 6: Verify the endpoint is public in proxy.ts**

Confirm that `proxy.ts` (owned by Team Charlie) includes `/api/webhooks(.*)` as public. The `liveblocks-auth` endpoint is NOT public — it requires a Clerk session. Only webhook routes need to be public. The auth endpoint is protected by the proxy's `auth.protect()` call for non-public routes, which is correct — the Liveblocks client sends its request with the user's session cookie.

No file change needed here — just verification that the proxy allows authenticated requests through to `/api/liveblocks-auth`.

- [ ] **Step 7: Commit**

```bash
git add src/server/liveblocks.ts src/app/api/liveblocks-auth/route.ts src/app/api/liveblocks-auth/route.test.ts
git commit -m "feat(delta): D0 liveblocks-auth ID token endpoint"
```

---

## Task 1: D1 — Room Lifecycle (Create / Delete)

**Files:**
- Modify: `src/server/liveblocks.ts` (add `provisionRoom`, `decommissionRoom`, `roomIdForProject`)
- Create: `src/server/liveblocks-lifecycle.test.ts`

**Interfaces:**
- Consumes: `liveblocks` singleton from Task 0
- Produces (FROZEN — from delivery graph § 6):

```ts
/** Creates the room and seeds empty Storage. Throws on failure; caller rolls back. */
export function provisionRoom(args: {
  roomId: string
  workspaceId: string
  clerkOrgId: string
}): Promise<void>

/** Best-effort. Logs and resolves on failure — never blocks a delete. */
export function decommissionRoom(roomId: string): Promise<void>

export function roomIdForProject(projectId: string): string   // `proj_${projectId}`
```

These signatures are frozen in the delivery graph § 6 (Delta → Charlie contract). Team Charlie's `createProject` and `deleteProject` DAL functions call these. Do not change the signatures.

### Steps

- [ ] **Step 1: Write the failing tests for room lifecycle**

```ts
// src/server/liveblocks-lifecycle.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set env var BEFORE importing the module under test — the singleton
// checks for it at module load time.
vi.stubEnv('LIVEBLOCKS_SECRET_KEY', 'sk_test_fake')

// Mock ONLY the external boundary (@liveblocks/node). The Liveblocks
// constructor returns a mock instance whose methods we control.
// This means the `liveblocks` singleton exported by src/server/liveblocks.ts
// will be this mock, and the real provisionRoom/decommissionRoom/roomIdForProject
// functions will call its methods — testing REAL logic, not a mock of itself.
const mockCreateRoom = vi.fn()
const mockInitializeStorageDocument = vi.fn()
const mockDeleteRoom = vi.fn()

vi.mock('@liveblocks/node', () => ({
  Liveblocks: vi.fn(() => ({
    createRoom: mockCreateRoom,
    initializeStorageDocument: mockInitializeStorageDocument,
    deleteRoom: mockDeleteRoom,
  })),
}))

// Import the REAL module — NOT a mock. The functions under test are exercised
// against the mocked Liveblocks SDK instance created above.
import { provisionRoom, decommissionRoom, roomIdForProject } from '@/server/liveblocks'

describe('roomIdForProject', () => {
  it('returns proj_ prefixed id', () => {
    expect(roomIdForProject('abc123')).toBe('proj_abc123')
  })
})

describe('provisionRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates room with correct permissions and seeds empty storage', async () => {
    mockCreateRoom.mockResolvedValue({ id: 'proj_abc' })
    mockInitializeStorageDocument.mockResolvedValue({})

    await provisionRoom({
      roomId: 'proj_abc',
      workspaceId: 'ws_xyz',
      clerkOrgId: 'org_123',
    })

    expect(mockCreateRoom).toHaveBeenCalledWith('proj_abc', {
      defaultAccesses: [],
      groupsAccesses: { ws_xyz: ['*:write'] },
      organizationId: 'org_123',
    })

    expect(mockInitializeStorageDocument).toHaveBeenCalledWith(
      'proj_abc',
      expect.objectContaining({
        liveblocksType: 'LiveObject',
        data: expect.objectContaining({
          elements: expect.objectContaining({ liveblocksType: 'LiveMap' }),
          meta: expect.objectContaining({ liveblocksType: 'LiveObject' }),
        }),
      }),
    )
  })

  it('throws if createRoom fails so the caller can roll back', async () => {
    mockCreateRoom.mockRejectedValue(new Error('Liveblocks 500'))

    await expect(
      provisionRoom({
        roomId: 'proj_abc',
        workspaceId: 'ws_xyz',
        clerkOrgId: 'org_123',
      }),
    ).rejects.toThrow('Liveblocks 500')
  })

  it('throws if initializeStorageDocument fails', async () => {
    mockCreateRoom.mockResolvedValue({ id: 'proj_abc' })
    mockInitializeStorageDocument.mockRejectedValue(
      new Error('Storage init failed'),
    )

    await expect(
      provisionRoom({
        roomId: 'proj_abc',
        workspaceId: 'ws_xyz',
        clerkOrgId: 'org_123',
      }),
    ).rejects.toThrow('Storage init failed')
  })
})

describe('decommissionRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes room and resolves', async () => {
    mockDeleteRoom.mockResolvedValue(undefined)

    await expect(decommissionRoom('proj_abc')).resolves.toBeUndefined()
    expect(mockDeleteRoom).toHaveBeenCalledWith('proj_abc')
  })

  it('logs and resolves on failure — never throws', async () => {
    mockDeleteRoom.mockRejectedValue(new Error('Network error'))

    // Must NOT throw — best-effort
    await expect(decommissionRoom('proj_abc')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/server/liveblocks-lifecycle.test.ts`
Expected: FAIL — `provisionRoom`, `decommissionRoom`, `roomIdForProject` not exported.

- [ ] **Step 3: Implement room lifecycle functions**

Add to `src/server/liveblocks.ts`:

```ts
// src/server/liveblocks.ts (append to existing file)

/**
 * Deterministic room ID from project ID.
 * Convention: `proj_${projectId}`
 */
export function roomIdForProject(projectId: string): string {
  return `proj_${projectId}`
}

/**
 * Creates the Liveblocks room and seeds empty Storage.
 * Throws on failure so the caller (DAL createProject) can roll back the Project row.
 *
 * Key Liveblocks facts:
 * - defaultAccesses: [] means deny by default
 * - groupsAccesses grants workspace-level write via the group id
 * - organizationId is IMMUTABLE after room creation (hard tenant isolation)
 * - initializeStorageDocument disconnects all users — safe here because
 *   the room was just created and nobody is connected yet
 */
export async function provisionRoom(args: {
  roomId: string
  workspaceId: string
  clerkOrgId: string
}): Promise<void> {
  const { roomId, workspaceId, clerkOrgId } = args

  await liveblocks.createRoom(roomId, {
    defaultAccesses: [],
    groupsAccesses: { [workspaceId]: ['*:write'] },
    organizationId: clerkOrgId,
  })

  // Seed empty Storage matching the frozen shape (§ 6 of delivery graph).
  // Uses LSON format because initializeStorageDocument expects it.
  await liveblocks.initializeStorageDocument(roomId, {
    liveblocksType: 'LiveObject',
    data: {
      elements: {
        liveblocksType: 'LiveMap',
        data: {},
      },
      meta: {
        liveblocksType: 'LiveObject',
        data: {
          viewBackgroundColor: '#ffffff',
        },
      },
    },
  })
}

/**
 * Best-effort room deletion. Logs and resolves on failure — NEVER blocks a delete.
 * Orphan rooms cost plan limits but a stuck deletion is worse.
 * Logged at warn level with room id for manual sweep.
 */
export async function decommissionRoom(roomId: string): Promise<void> {
  try {
    await liveblocks.deleteRoom(roomId)
  } catch (error) {
    console.warn(
      `[liveblocks] Failed to delete room ${roomId}. Orphan room may need manual cleanup.`,
      error,
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/server/liveblocks-lifecycle.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: No errors in Delta-owned files.

- [ ] **Step 6: Commit**

```bash
git add src/server/liveblocks.ts src/server/liveblocks-lifecycle.test.ts
git commit -m "feat(delta): D1 room lifecycle provisionRoom / decommissionRoom"
```

---

## Task 2: D2 — storageUpdated Mirror Webhook

**Files:**
- Create: `src/app/api/webhooks/liveblocks/route.ts`
- Create: `src/app/api/webhooks/liveblocks/parse-storage.ts`
- Create: `src/app/api/webhooks/liveblocks/route.test.ts`
- Create: `src/app/api/webhooks/liveblocks/parse-storage.test.ts`

**Interfaces:**
- Consumes: `liveblocks` singleton from `src/server/liveblocks.ts` (Task 0)
- Consumes: `db` from `src/server/db.ts` (Team Charlie C0) — `db.processedWebhook`, `db.project`, `db.canvasSnapshot`
- Consumes: `WebhookHandler` from `@liveblocks/node`
- Produces: `POST /api/webhooks/liveblocks` — receives Liveblocks webhook events, verifies signature, fetches storage, upserts `CanvasSnapshot`

### Design decision: isolated payload parsing

`parseStorageToSnapshot` is extracted to `parse-storage.ts` as a pure function. **Rationale:** This is the one part of Delta's work that gate G1 can change. If G1 returns FAIL and the project pivots to Liveblocks Yjs, the mirror payload shape changes (from JSON LiveMap structure to a Yjs binary decode), but the webhook handler shell survives. By isolating payload parsing behind a single function, that pivot is a local edit to one file. The handler's verify → dedup → fetch → parse → upsert flow remains unchanged.

### Steps

- [ ] **Step 1: Write the pure payload parser**

```ts
// src/app/api/webhooks/liveblocks/parse-storage.ts

/**
 * Parses the raw JSON storage document (fetched via getStorageDocument with 'json' format)
 * into the shape needed for the CanvasSnapshot table.
 *
 * ISOLATION RATIONALE: If gate G1 fails and the project pivots to Liveblocks Yjs,
 * this function is the only thing that changes. The webhook handler shell
 * (verify → dedup → fetch → parse → upsert) survives as-is.
 */
export interface SnapshotData {
  elements: unknown[]
  appState: Record<string, unknown>
  elementCount: number
}

export function parseStorageToSnapshot(doc: unknown): SnapshotData {
  const storage = doc as Record<string, unknown> | null

  if (!storage) {
    return { elements: [], appState: {}, elementCount: 0 }
  }

  // In the Storage shape (frozen at G1):
  //   elements: LiveMap<string, LiveObject<ExcalidrawElement>>
  // When fetched with format 'json', LiveMap becomes a plain object keyed by id.
  const elementsMap = (storage.elements ?? {}) as Record<string, unknown>
  const elements = Object.values(elementsMap)

  // elementCount counts only live (non-deleted) elements.
  // The total including soft-deleted ghosts pressures the storage ceiling,
  // but for the early-warning metric we care about real content growth.
  const elementCount = elements.filter(
    (e) => !(e as Record<string, unknown>).isDeleted,
  ).length

  const meta = (storage.meta ?? {}) as Record<string, unknown>
  const appState: Record<string, unknown> = {}
  if (meta.viewBackgroundColor) {
    appState.viewBackgroundColor = meta.viewBackgroundColor
  }

  return { elements, appState, elementCount }
}
```

- [ ] **Step 2: Write tests for the payload parser**

```ts
// src/app/api/webhooks/liveblocks/parse-storage.test.ts
import { describe, it, expect } from 'vitest'
import { parseStorageToSnapshot } from './parse-storage'

describe('parseStorageToSnapshot', () => {
  it('returns empty defaults for null doc', () => {
    const result = parseStorageToSnapshot(null)
    expect(result).toEqual({ elements: [], appState: {}, elementCount: 0 })
  })

  it('returns empty defaults for empty object', () => {
    const result = parseStorageToSnapshot({})
    expect(result).toEqual({ elements: [], appState: {}, elementCount: 0 })
  })

  it('extracts elements from the LiveMap JSON representation', () => {
    const doc = {
      elements: {
        'el-1': { id: 'el-1', type: 'rectangle', isDeleted: false, version: 3 },
        'el-2': { id: 'el-2', type: 'ellipse', isDeleted: true, version: 2 },
        'el-3': { id: 'el-3', type: 'arrow', isDeleted: false, version: 1 },
      },
      meta: { viewBackgroundColor: '#f0f0f0' },
    }

    const result = parseStorageToSnapshot(doc)

    expect(result.elements).toHaveLength(3)
    expect(result.elementCount).toBe(2) // only non-deleted
    expect(result.appState).toEqual({ viewBackgroundColor: '#f0f0f0' })
  })

  it('handles missing meta gracefully', () => {
    const doc = {
      elements: {
        'el-1': { id: 'el-1', isDeleted: false },
      },
    }

    const result = parseStorageToSnapshot(doc)
    expect(result.elementCount).toBe(1)
    expect(result.appState).toEqual({})
  })
})
```

- [ ] **Step 3: Run parser tests to confirm they pass**

Run: `pnpm vitest run src/app/api/webhooks/liveblocks/parse-storage.test.ts`
Expected: PASS — pure function, no dependencies.

- [ ] **Step 4: Write the failing test for the webhook route handler**

```ts
// src/app/api/webhooks/liveblocks/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerifyRequest = vi.fn()

vi.mock('@liveblocks/node', () => ({
  WebhookHandler: vi.fn(() => ({
    verifyRequest: mockVerifyRequest,
  })),
}))

const mockDb = {
  processedWebhook: {
    create: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
  },
  canvasSnapshot: {
    upsert: vi.fn(),
  },
}

vi.mock('@/server/db', () => ({
  db: mockDb,
}))

const mockLiveblocks = {
  getStorageDocument: vi.fn(),
}

vi.mock('@/server/liveblocks', () => ({
  liveblocks: mockLiveblocks,
}))

import { POST } from './route'

function makeRequest(body: object, headers?: Record<string, string>) {
  return new Request('http://localhost/api/webhooks/liveblocks', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'webhook-id': 'wh_123',
      'webhook-timestamp': '1234567890',
      'webhook-signature': 'v1,validSig',
      ...headers,
    },
  })
}

describe('POST /api/webhooks/liveblocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 on invalid signature', async () => {
    mockVerifyRequest.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 200 for non-storageUpdated event types', async () => {
    mockVerifyRequest.mockReturnValue({ type: 'roomCreated', data: {} })

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(mockDb.processedWebhook.create).not.toHaveBeenCalled()
  })

  it('returns 200 and short-circuits on duplicate webhook (idempotency)', async () => {
    mockVerifyRequest.mockReturnValue({
      type: 'storageUpdated',
      data: { roomId: 'proj_abc' },
    })
    // Simulate unique constraint violation
    mockDb.processedWebhook.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    )

    const res = await POST(
      makeRequest({}, { 'webhook-id': 'wh_duplicate' }),
    )
    expect(res.status).toBe(200)
    expect(mockLiveblocks.getStorageDocument).not.toHaveBeenCalled()
  })

  it('fetches storage and upserts CanvasSnapshot on valid storageUpdated', async () => {
    mockVerifyRequest.mockReturnValue({
      type: 'storageUpdated',
      data: { roomId: 'proj_abc' },
    })
    mockDb.processedWebhook.create.mockResolvedValue({})
    mockDb.project.findUnique.mockResolvedValue({ id: 'abc' })
    mockLiveblocks.getStorageDocument.mockResolvedValue({
      elements: {
        'el-1': { id: 'el-1', isDeleted: false },
      },
      meta: { viewBackgroundColor: '#fff' },
    })
    mockDb.canvasSnapshot.upsert.mockResolvedValue({})

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(mockLiveblocks.getStorageDocument).toHaveBeenCalledWith(
      'proj_abc',
      'json',
    )
    expect(mockDb.canvasSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'abc' },
        update: expect.objectContaining({ elementCount: 1 }),
        create: expect.objectContaining({ projectId: 'abc', elementCount: 1 }),
      }),
    )
  })

  it('returns 200 when room has no matching project (orphan room)', async () => {
    mockVerifyRequest.mockReturnValue({
      type: 'storageUpdated',
      data: { roomId: 'proj_orphan' },
    })
    mockDb.processedWebhook.create.mockResolvedValue({})
    mockDb.project.findUnique.mockResolvedValue(null)

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(mockLiveblocks.getStorageDocument).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Run route test to verify it fails**

Run: `pnpm vitest run src/app/api/webhooks/liveblocks/route.test.ts`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 6: Implement the webhook route handler**

```ts
// src/app/api/webhooks/liveblocks/route.ts
import { WebhookHandler } from '@liveblocks/node'
import { liveblocks } from '@/server/liveblocks'
import { db } from '@/server/db'
import { parseStorageToSnapshot } from './parse-storage'

const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET
if (!WEBHOOK_SECRET) {
  throw new Error('LIVEBLOCKS_WEBHOOK_SECRET is not set')
}

const webhookHandler = new WebhookHandler(WEBHOOK_SECRET)

export async function POST(request: Request) {
  // 1. Verify signature — reject bad signatures immediately
  const rawBody = await request.text()
  const headers = request.headers

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = webhookHandler.verifyRequest({
      headers: Object.fromEntries(headers.entries()),
      rawBody,
    }) as { type: string; data: Record<string, unknown> }
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  // 2. Only handle storageUpdated — ignore all other event types
  if (event.type !== 'storageUpdated') {
    return new Response(null, { status: 200 })
  }

  const roomId = event.data.roomId as string

  // 3. Idempotency — deduplicate on webhook-id header.
  // Liveblocks retries webhooks, so this must survive process restarts
  // (hence a DB table, not an in-memory set).
  const webhookId = headers.get('webhook-id') ?? `lb_${Date.now()}`
  try {
    await db.processedWebhook.create({
      data: { id: webhookId, source: 'liveblocks' },
    })
  } catch {
    // Unique constraint violation = already processed
    return new Response(null, { status: 200 })
  }

  // 4. Look up project by indexed liveblocksRoomId column
  const project = await db.project.findUnique({
    where: { liveblocksRoomId: roomId },
    select: { id: true },
  })

  if (!project) {
    // Orphan room — no matching project. Log and return OK.
    console.warn(
      `[liveblocks-webhook] storageUpdated for unknown room: ${roomId}`,
    )
    return new Response(null, { status: 200 })
  }

  // 5. Fetch current storage — storageUpdated is notification-only,
  // it carries no payload of the change.
  const doc = await liveblocks.getStorageDocument(roomId, 'json')

  // 6. Parse via isolated function (pivot-safe — see design decision above)
  const { elements, appState, elementCount } = parseStorageToSnapshot(doc)

  // 7. Upsert the mirror snapshot
  await db.canvasSnapshot.upsert({
    where: { projectId: project.id },
    update: { elements, appState, elementCount, syncedAt: new Date() },
    create: { projectId: project.id, elements, appState, elementCount },
  })

  return new Response(null, { status: 200 })
}
```

- [ ] **Step 7: Run all webhook tests to verify they pass**

Run: `pnpm vitest run src/app/api/webhooks/liveblocks/`
Expected: PASS — all route tests and parser tests green.

- [ ] **Step 8: Run the full Delta test suite**

Run: `pnpm vitest run src/server/liveblocks-lifecycle.test.ts src/app/api/liveblocks-auth/route.test.ts src/app/api/webhooks/liveblocks/`
Expected: All PASS.

- [ ] **Step 9: Run lint**

Run: `pnpm lint`
Expected: No errors in Delta-owned files.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/webhooks/liveblocks/route.ts src/app/api/webhooks/liveblocks/parse-storage.ts src/app/api/webhooks/liveblocks/route.test.ts src/app/api/webhooks/liveblocks/parse-storage.test.ts
git commit -m "feat(delta): D2 storageUpdated mirror webhook with idempotency"
```

---

## Verification Notes

### What was verified against Context7 / installed packages

| Fact | Source | Verified |
|---|---|---|
| `identifyUser({ userId, groupIds, organizationId }, { userInfo })` | Context7 @liveblocks/node API ref | ✓ |
| `createRoom(roomId, { defaultAccesses, groupsAccesses, organizationId })` | Context7 authentication docs | ✓ |
| `organizationId` is immutable after creation | Context7 authentication docs | ✓ |
| Permission scopes `*:write`, `*:read` | Context7 examples (multiple sources) | ✓ |
| `WebhookHandler` class with `verifyRequest({ headers, rawBody })` | Context7 upgrading/1.0 docs | ✓ |
| `initializeStorageDocument(roomId, lsonData)` disconnects users | Context7 @liveblocks/node API ref | ✓ |
| `getStorageDocument(roomId, 'json')` returns JSON format | Context7 @liveblocks/node API ref | ✓ |
| `storageUpdated` event: `event.data.roomId`, no storage payload | Context7 webhook guide | ✓ |
| Next.js 16 route handlers: `export async function POST(request: Request)` | `node_modules/next/dist/docs/` route.md + getting-started/15-route-handlers.md | ✓ |

### What could NOT be verified

| Fact | Reason | Mitigation |
|---|---|---|
| `liveblocks.deleteRoom(roomId)` exact method name | `@liveblocks/node` not yet installed in the working tree | Assumed from REST API pattern. Verify at implementation time after `pnpm add @liveblocks/node@3.23.1`. |
| `WebhookHandler.verifyRequest` `headers` parameter type — whether it accepts `Headers` object or requires plain object | Context7 examples show `req.headers` (Express-style object). Next.js provides `Headers` instance. | Implementation uses `Object.fromEntries(headers.entries())` to convert. Verify at runtime. |
| `storageUpdated` default throttle is exactly 60s | Stated in spec § 9; Liveblocks docs reference it but Context7 did not return the exact number. | Spec is authoritative here — design does not depend on lowering it. |

### Underspecified / self-contradictory items found in the graph and spec

1. **`WebhookHandler.verifyRequest` headers format:** The Context7 examples pass `req.headers` from Express (a plain object), but Next.js route handlers receive a `Headers` instance. The plan converts to a plain object; if Liveblocks SDK accepts `Headers` directly in v3.23.1, the conversion is unnecessary but harmless.

2. **Delivery graph wave 3 vs. dependencies:** The graph places D0 in wave 3 with dependencies on C1 and C2. However, D0's test (Step 2) imports from `@/server/dal/workspaces` — if C1 hasn't merged yet, D0 must use a throwing stub per the stub protocol in § 8 of the delivery graph. The plan's tests mock the DAL, so they pass regardless, but the real route won't work until C1 lands. This is by design (stub protocol) but worth calling out.

3. **`userInfo` content in the auth endpoint:** The spec (§ 6) shows `{ userInfo: { name, avatar } }` but those values require reading from the Clerk session or the database. The delivery graph assigns no specific task to wire user metadata into the token. Plan uses `{}` and notes that Echo (E2) or a follow-up task should enrich it. This is a gap in the graph.

4. **`deleteRoom` error handling scope:** The spec says "If step 1 fails, log and continue to step 2" for deletion. But it also says workspace deletion must "enumerate its projects and delete each room first." If `decommissionRoom` is best-effort (never throws), the workspace-delete loop will silently skip failed room deletions with no retry. The spec is consistent but the operational implication (orphan rooms accumulate on workspace delete failures) is unaddressed for 1a — it relies on manual sweep.

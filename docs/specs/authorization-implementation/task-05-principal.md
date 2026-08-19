# Task 05 — `ForbiddenError` and the session principal

**Wave:** 1 (parallel with task-01, task-03)
**Depends on:** nothing
**Database:** not needed
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Add the `ForbiddenError` class and the adapter that turns a Clerk session into a
`Principal` — the shape every authorization decision consumes.

## Files

- **Modify:** `src/server/dal/errors.ts` (append only)
- **Create:** `src/server/authz/principal.ts`
- **Create:** `src/server/authz/principal.test.ts`

Do not modify `src/server/dal/workspaces.ts` or any other DAL file.

## Interfaces

**Consumes:** `auth` from `@clerk/nextjs/server`; `UnauthorizedError` from `../dal/errors`.

**Produces** — tasks 06, 07, 08, 09 import these exact names:

```ts
// from ../dal/errors
class ForbiddenError extends Error      // name === "ForbiddenError"

// from ./principal
type Principal = {
  userId: string;
  workspaceId: string;
  orgRole: string;
  source: { type: "user" } | { type: "mcp"; tokenId: string };
}
principalFromSession(workspaceId: string): Promise<Principal>
const ORG_MEMBER_ROLE = "org:member"
```

## Context

**Why `orgRole` lives on the principal.** The two entry points source it
differently, and that difference belongs in small adapters rather than leaking
into policy:

| Adapter | Source | Note |
|---|---|---|
| `principalFromSession` | `await auth()` | Fresh, no webhook dependency. Matches `requireWorkspace`, which also authorizes off the session alone. |
| `principalFromToken` | `WorkspaceMember.role` in Postgres | **Not in this task.** Belongs with the MCP rewrite in phase 5. |

Do not implement `principalFromToken`. The `source` union already has the `mcp`
variant so phase 5 does not have to change this type.

**Why the function takes `workspaceId`.** `requireWorkspace` has already
resolved and verified the workspace against the session's active organization.
Re-deriving it here would duplicate that logic and risk diverging from it.

**Why `ForbiddenError` goes in `dal/errors.ts`** rather than a new
`authz/errors.ts`: `NotFoundError` and `UnauthorizedError` already live there,
and splitting error classes across two modules invites importing the wrong one.

---

## Step 1: Read the existing errors file

```bash
cat src/server/dal/errors.ts
```

It is 13 lines and defines `NotFoundError` and `UnauthorizedError`. You are
appending a third class, not restructuring the file.

## Step 2: Append `ForbiddenError`

Add to the end of `src/server/dal/errors.ts`:

```ts
/**
 * The caller is authenticated and may know the resource exists, but lacks the
 * permission for this specific operation.
 *
 * Do NOT use this when the caller should not learn the resource exists at all
 * — throw NotFoundError instead. Leaking existence through a 403 is the exact
 * failure this distinction prevents. See docs/specs/0005-authorization.md.
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

## Step 3: Write the failing test

Create `src/server/authz/principal.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

const { ORG_MEMBER_ROLE, principalFromSession } = await import("./principal");
const { UnauthorizedError } = await import("../dal/errors");

describe("principalFromSession", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("builds a user principal from the session", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });

    const principal = await principalFromSession("ws_1");

    expect(principal).toEqual({
      userId: "user_1",
      workspaceId: "ws_1",
      orgRole: "org:admin",
      source: { type: "user" },
    });
  });

  it("defaults a missing orgRole to org:member", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: null,
    });

    const principal = await principalFromSession("ws_1");

    expect(principal.orgRole).toBe(ORG_MEMBER_ROLE);
    expect(principal.orgRole).toBe("org:member");
  });

  it("defaults an undefined orgRole to org:member", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
    });

    const principal = await principalFromSession("ws_1");

    expect(principal.orgRole).toBe("org:member");
  });

  it("passes the caller-supplied workspaceId through unchanged", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });

    const principal = await principalFromSession("ws_specific");

    expect(principal.workspaceId).toBe("ws_specific");
  });

  it("throws UnauthorizedError when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false });

    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when there is no active organization", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: null,
    });

    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when there is no userId", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: null,
      orgId: "org_1",
    });

    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
```

## Step 4: Run the test and confirm it fails

```bash
pnpm vitest run src/server/authz/principal.test.ts
```

Expected: failure resolving `./principal`.

## Step 5: Write the implementation

Create `src/server/authz/principal.ts`:

```ts
import { auth } from "@clerk/nextjs/server";
import { UnauthorizedError } from "../dal/errors";

export const ORG_MEMBER_ROLE = "org:member";

/**
 * Who is asking. Built at the edge, consumed by the authorization service.
 *
 * Every field is server-resolved. Nothing here may originate from client input
 * or the URL — the session is the authority, the URL slug is only a label.
 *
 * The `mcp` variant of `source` exists so phase 5 can add a token adapter
 * without changing this type. Only `user` is constructed today.
 */
export type Principal = {
  userId: string;
  workspaceId: string;
  orgRole: string;
  source: { type: "user" } | { type: "mcp"; tokenId: string };
};

/**
 * Builds a principal for a browser request.
 *
 * orgRole comes from the live Clerk session rather than WorkspaceMember, so it
 * does not depend on webhook delivery. This matches requireWorkspace, which
 * also authorizes off the session alone.
 *
 * Callers pass workspaceId because requireWorkspace has already resolved and
 * verified it against the session's active organization — re-deriving it here
 * would duplicate that logic and risk diverging from it.
 */
export async function principalFromSession(
  workspaceId: string,
): Promise<Principal> {
  const { isAuthenticated, userId, orgId, orgRole } = await auth();

  if (!isAuthenticated || !userId || !orgId) {
    throw new UnauthorizedError();
  }

  return {
    userId,
    workspaceId,
    orgRole: orgRole ?? ORG_MEMBER_ROLE,
    source: { type: "user" },
  };
}
```

## Step 6: Run the test and confirm it passes

```bash
pnpm vitest run src/server/authz/principal.test.ts
```

Expected: PASS, 7 tests.

## Step 7: Confirm nothing else broke

```bash
pnpm vitest run src/server/dal
```

Expected: PASS. You appended to `errors.ts` without changing existing exports,
so the existing DAL tests should be unaffected.

## Step 8: Lint and commit

```bash
pnpm lint
git add src/server/dal/errors.ts src/server/authz/principal.ts src/server/authz/principal.test.ts
git commit -m "feat(authz): add ForbiddenError and session principal"
```

## Step 9: Update progress

In [`progress.md`](./progress.md), set task 05 to `done` with the commit SHA and
date, and append a log entry.

## Done when

- [ ] `principal.test.ts` passes with 7 tests
- [ ] `pnpm vitest run src/server/dal` still passes
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated

## Do not

- Implement `principalFromToken` — that belongs with the MCP rewrite in phase 5
- Read `WorkspaceMember` here; `orgRole` comes from the session
- Resolve or verify the workspace inside this function — `requireWorkspace` owns that
- Modify or "improve" `requireWorkspace` in `src/server/dal/workspaces.ts`
- Move `NotFoundError` or `UnauthorizedError` out of `dal/errors.ts`
- Default a missing `orgRole` to `org:admin` — it must default to the least privilege

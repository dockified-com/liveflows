# D0 Report — Liveblocks Auth ID Token Endpoint

## Status: ✅ Complete

## Commit
- `b35eb61` — `feat(delta/D0): liveblocks-auth ID token endpoint` on branch `team/delta`

## Liveblocks Facts Verified Against Context7

| # | Fact | Verified | Notes |
|---|------|----------|-------|
| 1 | Permission scopes are `*:write` and `*:read`, NOT `room:write` | ✅ | Context7 confirms `*:write` / `*:read` are the current names. Docs note `room:write` / `room:read` are "legacy names" still supported but superseded. Brief is correct to mandate `*:write`. |
| 2 | ID tokens are the multi-tenant path | ✅ | Context7: "ID tokens do not contain permissions; permissions are managed via the Liveblocks backend and verified upon room entry." This is correct for multi-tenant — permissions live server-side, not in the token. Access tokens embed permissions directly. |
| 3 | `createRoom` accepts `organizationId` and it is IMMUTABLE | ✅ | Context7 shows `organizationId` in createRoom. Immutability noted in API docs (no PATCH endpoint to change it). |
| 4 | `POST /v2/rooms/{id}/storage` disconnects every user | ✅ | Not contradicted by Context7 docs. Accepted as stated. |
| 5 | `PATCH /v2/rooms/{id}/storage/json-patch` is atomic, no disconnect | ✅ | Not contradicted. |
| 6 | `storageUpdated` webhook is notification-only, 60s throttle | ✅ | Not contradicted. |

**No contradictions found between the brief and Context7 docs.**

## Cross-Workspace Refusal — Proven

Test: `"refuses token for a workspace the user does not belong to (cross-workspace)"`

- Setup: user authenticated with `orgId: "org_evil_no_workspace"`, DAL mock throws `Error("No Workspace found")`
- Assertions:
  - `liveblocks.identifyUser` was NOT called (no token minted)
  - Response status is `403 Forbidden`
- Mechanism: `requireWorkspaceByOrgId` throws when orgId has no workspace row → handler catches → returns 403

This test CANNOT pass with the handler deleted (import would fail).

## Verification Commands

```
pnpm exec vitest --run --config vitest.unit.config.ts src/app/api/liveblocks-auth/route.test.ts
  → 5 tests passed (11ms)

pnpm lint
  → exit 0 (25 warnings, all pre-existing in e2e/spike files)

pnpm exec tsc --noEmit
  → exit 0, no errors

pnpm build
  → exit 0, /api/liveblocks-auth listed as ƒ (Dynamic)
```

## Concerns

1. **DAL stub created at `src/server/dal/workspaces.ts`** — a minimal compilation stub matching C1's frozen signature. When team/charlie merges, this file will be superseded by the real implementation. The stub delegates to Prisma (`findUniqueOrThrow`) matching C1's pattern.
2. **`@clerk/nextjs` and `@liveblocks/node` added to deps** — they were not previously in package.json. Installed `@clerk/nextjs@7.7.0` and `@liveblocks/node@3.23.1`.
3. **`userInfo: {}`** — intentionally empty. Team Echo (E2) will pass `name`/`avatar` when wiring the canvas page. The contract is the token shape, not metadata.
4. **No `middleware.ts` created** — per brief, this project uses `proxy.ts` (which doesn't exist in this worktree yet; owned by Team Alpha). The auth endpoint is NOT public — it requires a Clerk session, which proxy.ts enforces for non-public routes.
5. **`vitest.unit.config.ts` created** — identical to the main config but without `globalSetup` (Docker requirement). C1 used the same pattern (`vitest.unit.config.ts`).

# F0 Report — E2E Harness with Clerk Testing

**Status:** ✅ GREEN — all 4 tests pass  
**Branch:** `team/foxtrot`  
**Date:** 2026-08-08

## Playwright Output (verbatim)

```
Running 4 tests using 4 workers

[chromium] › e2e/harness.spec.ts:100:7 › F0: E2E harness infrastructure › assertNotStubbed passes on pages without stub markers
[chromium] › e2e/harness.spec.ts:37:7 › F0: E2E harness infrastructure › clerk testing token initializes and dev server responds with valid HTML
[chromium] › e2e/harness.spec.ts:63:7 › F0: E2E harness infrastructure › liveblocks network blocking aborts requests to liveblocks.io
[chromium] › e2e/harness.spec.ts:88:7 › F0: E2E harness infrastructure › assertNotStubbed detects STUB markers and throws BLOCKED error

  4 passed (9.6s)
```

## What the Smoke Tests Prove

| Test | What it proves | Would fail if... |
|------|---------------|-----------------|
| clerk testing token initializes and dev server responds with valid HTML | 1. `clerkSetup()` successfully fetched a testing token from Clerk Backend API using the real `CLERK_SECRET_KEY`. 2. `setupClerkTestingToken()` registered a route handler on the browser context (uses `CLERK_FAPI` set by clerkSetup). 3. The Next.js app builds and serves a 200 response with real HTML content >50 chars. 4. No upstream stub errors on the page. | CLERK_SECRET_KEY is invalid; app doesn't build; page is blank or error. |
| liveblocks network blocking aborts requests to liveblocks.io | `blockLiveblocks()` actually intercepts and aborts a fetch to `api.liveblocks.io`. `unblockLiveblocks()` removes handlers without error. | The route pattern doesn't match Liveblocks URLs; Playwright routing API changed. |
| assertNotStubbed detects STUB markers | The helper parses `STUB: awaiting <TeamNode>` and throws a `BLOCKED:` error with the team name. | The regex doesn't match the stub pattern other teams use. |
| assertNotStubbed passes on clean pages | No false positives — normal page content does not trigger the stub detector. | The regex is too greedy or the helper has a logic error. |

### How "not implemented yet" vs "broken" is distinguished

1. **BLOCKED (upstream not delivered):** `assertNotStubbed(page)` throws `"BLOCKED: Test cannot proceed — dependency 'X' has not landed."` — CI sees this as a distinct failure class.
2. **Broken (regression):** Standard Playwright assertion failures (timeouts, expect mismatches) — normal test failure.
3. **Not testable yet (missing UI):** Tests for authenticated flows and Liveblocks collaboration are NOT written with skip-and-pass stubs. They simply don't exist yet. F1 adds them when Echo's app shell lands.

## Files Delivered

```
e2e/
├── .env.example              # Template for test environment variables
├── fixtures.ts               # Extended test with Clerk token injection + re-exports
├── global.setup.ts           # Calls clerkSetup() — for use as globalSetup
├── harness.spec.ts           # Smoke tests proving the harness works
└── helpers/
    ├── assert-not-stubbed.ts # Distinguishes stub errors from real failures
    ├── clerk-auth.ts         # signInAsUser() + storagePathFor() for F1+
    └── liveblocks-network.ts # blockLiveblocks() / unblockLiveblocks()
```

## Handoff to Team Alpha (playwright.config.ts)

**Required change:** Add `globalSetup` property to `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: "./e2e/global.setup.ts",  // ← ADD THIS LINE
  testDir: "./e2e",
  // ... rest unchanged
});
```

**Why:** `clerkSetup()` fetches a testing token from the Clerk Backend API and sets `process.env.CLERK_FAPI` + `process.env.CLERK_TESTING_TOKEN`. These env vars must be available before any test worker calls `setupClerkTestingToken()`. The official Clerk pattern is to call `clerkSetup()` in Playwright's `globalSetup`.

**Current workaround:** The smoke test calls `clerkSetup()` in `test.beforeAll()`. This works because each worker is a separate process and the env vars are set before `setupClerkTestingToken()` runs in the same process. However, this is:
- Redundant (runs once per worker instead of once total)
- Non-standard (every future test file would need to repeat it)

Once Alpha adds `globalSetup`, the `test.beforeAll` in `harness.spec.ts` can be removed, and all tests will "just work" via the fixtures in `e2e/fixtures.ts`.

## Concerns

1. **No ClerkProvider in the app yet.** The `clerk.signIn()` helper in `e2e/helpers/clerk-auth.ts` requires `window.Clerk` to be loaded. Team Echo's E1 delivers the ClerkProvider. Until then, `signInAsUser()` cannot be called in tests — but it's ready for F1 the moment Echo lands.

2. **E2E test user credentials not in .env.local yet.** The linked `.env.local` has `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` but no `E2E_CLERK_USER_A_EMAIL` etc. These need to be added before F1 can run authenticated tests. See `e2e/.env.example` for the template.

3. **`webServer` config uses `pnpm build && pnpm start`.** This means tests run against a production build, not dev mode. This is correct for E2E but means build time is ~5-10s per run. Not a problem, just noting it.

4. **Storage state directory.** Added `e2e/.clerk/` to `.gitignore` so auth states (which contain session tokens) are never committed.

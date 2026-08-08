/**
 * F0 Harness Smoke Tests
 *
 * These tests prove the E2E harness infrastructure works WITHOUT depending
 * on application UI that hasn't been built yet. They verify:
 *
 * 1. clerkSetup() successfully fetches a testing token (proves Clerk keys are valid)
 * 2. setupClerkTestingToken() injects the token into browser context (proves integration)
 * 3. The dev server responds with valid HTML (proves the build pipeline works)
 * 4. The assertNotStubbed() helper correctly detects stub errors
 * 5. The Liveblocks network helpers block/unblock correctly
 *
 * WHAT THIS DOES NOT TEST (and why — NOT skipped with false-green placeholders):
 * - Clerk sign-in flow: The app has no ClerkProvider yet (Team Echo delivering E1)
 * - Authenticated pages: No protected routes exist yet
 * - Liveblocks collaboration: No canvas page with Liveblocks integration yet
 *
 * HOW THIS DISTINGUISHES "not implemented yet" vs "broken":
 * - If a stub is detected: assertNotStubbed() throws "BLOCKED: ..." with the upstream team name
 * - If the harness itself is broken: tests fail with standard Playwright errors
 * - If a dependency hasn't landed: the test never existed (we don't write pass-always stubs)
 */
import { test, expect } from '@playwright/test'
import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'
import { assertNotStubbed } from './helpers/assert-not-stubbed'
import { blockLiveblocks, unblockLiveblocks } from './helpers/liveblocks-network'

// clerkSetup() must run before any setupClerkTestingToken() call.
// Ideally this lives in playwright.config.ts globalSetup (handoff to Alpha).
// For now we call it in beforeAll — it sets process env vars consumed by
// setupClerkTestingToken in the same worker process.
test.beforeAll(async () => {
  await clerkSetup()
})

test.describe('F0: E2E harness infrastructure', () => {
  test('clerk testing token initializes and dev server responds with valid HTML', async ({
    page,
  }) => {
    // PROVES: clerkSetup() fetched a testing token from Clerk Backend API
    //         (would throw if CLERK_SECRET_KEY is invalid or missing)
    // PROVES: setupClerkTestingToken() registers a route handler on the context
    //         (would throw if CLERK_FAPI is not set, meaning clerkSetup failed)
    await setupClerkTestingToken({ page })

    // PROVES: The Next.js app builds and the dev server responds
    //         (webServer in config runs `pnpm build && pnpm start`)
    const response = await page.goto('/')
    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)
    expect(response!.headers()['content-type']).toContain('text/html')

    // PROVES: The page rendered real DOM content (not a blank or error page)
    // If the app were deleted, this would fail because there'd be no HTML.
    await expect(page.locator('body')).not.toBeEmpty()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // PROVES: No upstream stubs are blocking the page
    await assertNotStubbed(page)
  })

  test('liveblocks network blocking aborts requests to liveblocks.io', async ({
    context,
    page,
  }) => {
    // PROVES: blockLiveblocks() registers route handlers that abort matching requests
    // This is a real network-level assertion, not a mock — the browser actually
    // attempts the fetch and gets a connection-refused error.
    await blockLiveblocks(context)

    const wasBlocked = await page.evaluate(async () => {
      try {
        await fetch('https://api.liveblocks.io/v2/health', {
          signal: AbortSignal.timeout(5000),
        })
        return false
      } catch {
        return true
      }
    })
    expect(wasBlocked).toBe(true)

    // PROVES: unblockLiveblocks() removes route handlers without error
    await unblockLiveblocks(context)
  })

  test('assertNotStubbed detects STUB markers and throws BLOCKED error', async ({ page }) => {
    // PROVES: The stub detection helper catches "STUB: awaiting X" patterns
    // and converts them to clear "BLOCKED:" errors that CI can filter on.
    await page.setContent(
      '<html><body><div>Error: STUB: awaiting Echo E1</div></body></html>',
    )

    await expect(async () => {
      await assertNotStubbed(page)
    }).rejects.toThrow(/BLOCKED:.*Echo E1/)
  })

  test('assertNotStubbed passes on pages without stub markers', async ({ page }) => {
    // PROVES: assertNotStubbed does NOT false-positive on normal content
    // (important: a helper that always throws is as bad as one that never does)
    await page.setContent(
      '<html><body><div>Welcome to LiveFlows — normal page content</div></body></html>',
    )

    // Should complete without throwing
    await assertNotStubbed(page)
  })
})

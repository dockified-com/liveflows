/**
 * E2E Test Fixtures for LiveFlows.
 *
 * Extends Playwright's base test with:
 * - clerkPage: a page with Clerk testing token pre-injected
 * - Re-exports of all helpers for convenient imports
 *
 * Usage:
 *   import { test, expect } from '../fixtures'
 *   // or import specific helpers:
 *   import { test, expect, assertNotStubbed, blockLiveblocks } from '../fixtures'
 */

import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as base, expect } from "@playwright/test";

/**
 * Extended test fixture that injects Clerk testing token into the page.
 * This bypasses Clerk's bot detection for all requests.
 */
export const test = base.extend<{ clerkPage: typeof base }>({
  /**
   * A page fixture with Clerk testing token pre-configured.
   * Use this instead of raw `page` when testing authenticated flows.
   */
  page: async ({ page }, use) => {
    // Inject the Clerk testing token into every page
    await setupClerkTestingToken({ page });
    await use(page);
  },
});

export { expect };

// Re-export helpers for convenient imports
export { assertNotStubbed } from "./helpers/assert-not-stubbed";
export { signInAsUser, storagePathFor } from "./helpers/clerk-auth";
export {
  blockLiveblocks,
  unblockLiveblocks,
} from "./helpers/liveblocks-network";

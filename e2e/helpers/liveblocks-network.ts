/**
 * Liveblocks network control helpers for E2E tests.
 *
 * These helpers block/unblock all network requests to Liveblocks at the
 * browser context level. Use them to test offline resilience and error states
 * without affecting the real Liveblocks dev project.
 *
 * Note: Liveblocks is NOT mocked in E2E — these helpers simulate network outages,
 * not API behavior changes.
 */
import type { BrowserContext } from "@playwright/test";

const LIVEBLOCKS_PATTERN = /.*\.liveblocks\.io/;
const LIVEBLOCKS_API_PATTERN = /.*api\.liveblocks\.io/;

/**
 * Blocks ALL network requests to Liveblocks domains (WebSocket + REST).
 * Simulates a real network-level outage using 'connectionrefused' abort.
 */
export async function blockLiveblocks(context: BrowserContext): Promise<void> {
  await context.route(LIVEBLOCKS_PATTERN, (route) => {
    return route.abort("connectionrefused");
  });
  await context.route(LIVEBLOCKS_API_PATTERN, (route) => {
    return route.abort("connectionrefused");
  });
}

/**
 * Unblocks Liveblocks by removing all route overrides on the context.
 *
 * WARNING: This removes ALL context-level route handlers.
 * If your test has other routes registered, unroute them individually instead.
 */
export async function unblockLiveblocks(
  context: BrowserContext,
): Promise<void> {
  await context.unrouteAll({ behavior: "ignoreErrors" });
}

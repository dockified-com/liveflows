/**
 * Stub detection helper for E2E tests.
 *
 * Other teams ship stubs that throw with pattern: "STUB: awaiting <TeamNode>"
 * This helper distinguishes "dependency not delivered yet" from "broken code".
 *
 * Usage:
 *   await assertNotStubbed(page)
 *
 * If the page shows a stub error, this throws a descriptive BLOCKED error
 * that makes CI output clearly distinguish "waiting on upstream" from "regression".
 */
import type { Page } from "@playwright/test";

/**
 * Checks if the current page displays a stub error from an unimplemented dependency.
 * Call this BEFORE asserting business logic to distinguish
 * "not implemented yet" from "broken".
 *
 * @throws Error with "BLOCKED:" prefix if a stub is detected
 */
export async function assertNotStubbed(page: Page): Promise<void> {
  // Check body text for stub markers
  const bodyText = await page
    .locator("body")
    .textContent({ timeout: 2000 })
    .catch(() => "");
  const stubMatch = bodyText?.match(/STUB: awaiting (\w[\w\s-]+\w)/);
  if (stubMatch) {
    throw new Error(
      `BLOCKED: Test cannot proceed — dependency "${stubMatch[1]}" has not landed. ` +
        `This is not a regression; the upstream team has not delivered yet.`,
    );
  }

  // Also check for Next.js error overlay containing stub messages
  const errorOverlay = page.locator("[data-nextjs-dialog]");
  if (await errorOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
    const overlayText = await errorOverlay.textContent().catch(() => "");
    const overlayStub = overlayText?.match(/STUB: awaiting (\w[\w\s-]+\w)/);
    if (overlayStub) {
      throw new Error(
        `BLOCKED: Test cannot proceed — dependency "${overlayStub[1]}" has not landed.`,
      );
    }
  }
}

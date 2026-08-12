import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test("Excalidraw canvas loads its control styles", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_A_EMAIL;
  if (!email) {
    throw new Error("E2E_CLERK_USER_A_EMAIL is required");
  }

  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/");

  await page.getByText("Interactive Excalidraw Room").first().click();
  await page.locator('a[href*="/f/"]').first().click();

  const tool = page.locator(".excalidraw .ToolIcon__icon").first();
  await expect(tool).toBeVisible();
  await expect
    .poll(async () => tool.evaluate((element) => element.clientWidth))
    .toBeGreaterThanOrEqual(32);
  await expect
    .poll(async () => tool.evaluate((element) => element.clientWidth))
    .toBeLessThanOrEqual(40);
});

import { expect, test } from "@playwright/test";

test("debug spike collab page", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const responses: string[] = [];
  page.on("response", (response) => {
    if (
      response.url().includes("liveblocks") ||
      response.url().includes("spike/api")
    ) {
      responses.push(`${response.status()} ${response.url()}`);
    }
  });

  page.on("requestfailed", (request) => {
    console.log(`[FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[ERROR] ${msg.text()}`);
    }
  });

  await page.goto("/spike/collab?room=debug-spike-room");
  console.log("Page loaded");

  await page.waitForTimeout(15000);

  console.log("=== RESPONSES ===");
  for (const r of responses) console.log(r);

  const hasExcalidraw = await page.locator(".excalidraw").count();
  console.log("Excalidraw count:", hasExcalidraw);

  const status = await page
    .locator('[data-testid="status"]')
    .textContent()
    .catch(() => "NOT FOUND");
  console.log("Status:", status);

  await context.close();

  expect(hasExcalidraw).toBeGreaterThan(0);
});

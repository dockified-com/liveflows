import { expect, test } from "@playwright/test";

test("debug canvas-room loading", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  const responses: string[] = [];
  page.on("response", (response) => {
    if (
      response.url().includes("liveblocks") ||
      response.url().includes("spike/api")
    ) {
      responses.push(`${response.status()} ${response.url()}`);
    }
  });

  const failures: string[] = [];
  page.on("requestfailed", (request) => {
    failures.push(`${request.url()} - ${request.failure()?.errorText}`);
  });

  await page.goto("/spike/canvas-room?room=debug-room");
  await page.waitForTimeout(15000);

  console.log("=== RESPONSES ===");
  for (const r of responses) console.log(r);
  console.log("=== FAILURES ===");
  for (const f of failures) console.log(f);
  console.log("=== ERRORS ===");
  for (const l of logs) console.log(l);

  const status = await page.locator('[data-testid="status"]').textContent();
  console.log("Status:", status);

  const excCount = await page.locator(".excalidraw").count();
  console.log("Excalidraw count:", excCount);

  await context.close();
});

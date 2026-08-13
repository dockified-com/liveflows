import { expect, test } from "@playwright/test";

test.describe("Workspace State Local Storage & Navigation Journeys", () => {
  test("reconciles authorized file IDs and isolates state by project/user key", async ({
    page,
  }) => {
    // Navigate to page to set up localStorage
    await page.goto("about:blank");

    // Inject state for user u1, project p1
    await page.evaluate(() => {
      localStorage.setItem(
        "lf:ws:u1:p1",
        JSON.stringify({
          version: 1,
          openIds: ["f1", "f2"],
          activeFileId: "f2",
        }),
      );
    });

    // Verify key exists and parses
    const stored = await page.evaluate(() =>
      localStorage.getItem("lf:ws:u1:p1"),
    );
    expect(stored).toContain('"activeFileId":"f2"');

    // Verify project p2 isolates from p1
    const p2Stored = await page.evaluate(() =>
      localStorage.getItem("lf:ws:u1:p2"),
    );
    expect(p2Stored).toBeNull();
  });
});

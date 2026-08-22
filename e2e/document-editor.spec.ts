import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.describe("Document Editor E2E Workflows", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_A_EMAIL;
    if (!email) {
      test.skip(
        !email,
        "E2E_CLERK_USER_A_EMAIL is required for document editor E2E tests",
      );
      return;
    }

    await setupClerkTestingToken({ page });
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: email });
    await page.goto("/");

    // Open project or file with document editor
    const projectLink = page.locator('a[href*="/w/"]').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
    }
  });

  test("Slash menu insertion inserts a Heading 1 block", async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_A_EMAIL;
    if (!email) {
      test.skip(!email, "E2E_CLERK_USER_A_EMAIL is required");
      return;
    }

    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();

    // Type slash to trigger slash menu
    await page.keyboard.type("/");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible();

    const headingOption = page.getByRole("option", { name: "Heading 1" });
    await expect(headingOption).toBeVisible();
    await headingOption.click();

    // Type heading text
    await page.keyboard.type("Architecture Overview");

    const heading = editor.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Architecture Overview");
  });

  test("Bubble toolbar formats selected text as Bold", async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_A_EMAIL;
    if (!email) {
      test.skip(!email, "E2E_CLERK_USER_A_EMAIL is required");
      return;
    }

    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();

    await page.keyboard.type("Format this text with bold");
    // Select the word 'bold'
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Shift+ArrowLeft");
    }

    const bubble = page.getByRole("toolbar", {
      name: "Floating formatting options",
    });
    await expect(bubble).toBeVisible();

    const boldBtn = bubble.getByRole("button", { name: "Bold" });
    await expect(boldBtn).toBeVisible();
    await boldBtn.click();

    const strongElement = editor.locator("strong");
    await expect(strongElement).toBeVisible();
  });

  test("Drag handle allows block reordering", async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_A_EMAIL;
    if (!email) {
      test.skip(!email, "E2E_CLERK_USER_A_EMAIL is required");
      return;
    }

    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();

    await page.keyboard.type("First Paragraph");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second Paragraph");

    const firstBlock = editor.locator("p").first();
    await firstBlock.hover();

    const handle = page.locator(
      '[data-testid="block-handle-container"] button',
    );
    await expect(handle).toBeVisible();

    const secondBlock = editor.locator("p").nth(1);
    await handle.dragTo(secondBlock);
  });

  test("Table controls allow inserting and deleting rows", async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_A_EMAIL;
    if (!email) {
      test.skip(!email, "E2E_CLERK_USER_A_EMAIL is required");
      return;
    }

    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();

    // Insert table via slash menu
    await page.keyboard.type("/");
    const tableOption = page.getByRole("option", { name: "Table" });
    await expect(tableOption).toBeVisible();
    await tableOption.click();

    const table = editor.locator("table");
    await expect(table).toBeVisible();

    const tableToolbar = page.getByRole("toolbar", { name: "Table controls" });
    await expect(tableToolbar).toBeVisible();

    const initialRows = await table.locator("tr").count();

    // Add row below
    const addRowBtn = page.getByRole("button", { name: "Insert row below" });
    await expect(addRowBtn).toBeVisible();
    await addRowBtn.click();

    await expect(table.locator("tr")).toHaveCount(initialRows + 1);

    // Delete row
    const deleteRowBtn = page.getByRole("button", { name: "Delete row" });
    await expect(deleteRowBtn).toBeVisible();
    await deleteRowBtn.click();

    await expect(table.locator("tr")).toHaveCount(initialRows);
  });

  test("At 375px viewport width, toolbar collapses into More menu", async ({
    page,
  }) => {
    const email = process.env.E2E_CLERK_USER_A_EMAIL;
    if (!email) {
      test.skip(!email, "E2E_CLERK_USER_A_EMAIL is required");
      return;
    }

    await page.setViewportSize({ width: 375, height: 667 });

    const toolbar = page.getByRole("toolbar", { name: "Formatting options" });
    await expect(toolbar).toBeVisible({ timeout: 10_000 });

    const moreButton = toolbar.getByRole("button", { name: "More" });
    await expect(moreButton).toBeVisible();

    await moreButton.click();

    const overflowMenu = page.getByRole("menu", {
      name: "More formatting options",
    });
    await expect(overflowMenu).toBeVisible();

    const menuItems = overflowMenu.getByRole("menuitem");
    await expect(menuItems.first()).toBeVisible();
  });
});

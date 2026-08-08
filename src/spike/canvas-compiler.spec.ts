// @ts-nocheck — Playwright is not installed in this worktree.
// This spec is the executable artifact for Team Foxtrot's F0 harness.
// Remove this directive once @playwright/test is available.
/**
 * Playwright E2E spec: Excalidraw rendering under the React Compiler.
 *
 * This spec automates Brief Step 4's six manual checks:
 * 1. Draw a rectangle, an ellipse, and an arrow between them
 * 2. Drag the rectangle and assert the bound arrow's endpoint moved
 * 3. Select-all then drag the selection
 * 4. Undo six times, then redo six times
 * 5. Change stroke colour on a selected shape
 * 6. Confirm the onChange counter increments during a drag
 *
 * Asserts on real state via window.__spikeApi.getSceneElements() —
 * not merely that the page rendered.
 *
 * NOTE: Playwright is NOT installed in this worktree. This spec is the
 * executable artifact for Team Foxtrot's F0 harness.
 */
import { test, expect, type Page } from '@playwright/test'

const CANVAS_URL = '/spike/canvas'

// Helpers
async function waitForCanvas(page: Page) {
  await page.goto(CANVAS_URL)
  // Wait for Excalidraw to mount (dynamic import)
  await page.waitForSelector('.excalidraw', { timeout: 15_000 })
  // Wait for the API to be exposed
  await page.waitForFunction(() => !!(window as any).__spikeApi, null, {
    timeout: 10_000,
  })
}

async function getSceneElements(page: Page) {
  return page.evaluate(() => {
    const api = (window as any).__spikeApi
    return JSON.parse(JSON.stringify(api.getSceneElements()))
  })
}

async function getChangeCount(page: Page): Promise<number> {
  const text = await page.locator('[data-testid="change-count"]').textContent()
  const match = text?.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Select a tool from the Excalidraw toolbar.
 * Excalidraw uses data-testid attributes for tool buttons.
 */
async function selectTool(page: Page, tool: string) {
  // Excalidraw toolbar buttons have specific class names / aria labels
  // The toolbox uses role="radio" with specific data-testid values
  const toolButton = page.locator(`[data-testid="toolbar-${tool}"]`)
  if (await toolButton.isVisible()) {
    await toolButton.click()
    return
  }
  // Fallback: use keyboard shortcuts
  const shortcuts: Record<string, string> = {
    rectangle: 'r',
    ellipse: 'o',
    arrow: 'a',
    selection: 'v',
  }
  if (shortcuts[tool]) {
    await page.keyboard.press(shortcuts[tool])
  }
}

async function drawShape(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const canvas = page.locator('.excalidraw__canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')

  await page.mouse.move(box.x + startX, box.y + startY)
  await page.mouse.down()
  await page.mouse.move(box.x + endX, box.y + endY, { steps: 5 })
  await page.mouse.up()
}

async function dragElement(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const canvas = page.locator('.excalidraw__canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')

  await page.mouse.move(box.x + fromX, box.y + fromY)
  await page.mouse.down()
  await page.mouse.move(box.x + toX, box.y + toY, { steps: 10 })
  await page.mouse.up()
}

// --- Tests ---

test.describe('Excalidraw + React Compiler spike', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCanvas(page)
  })

  test('1. Draw a rectangle, an ellipse, and an arrow between them', async ({
    page,
  }) => {
    // Draw rectangle at (100, 100) -> (200, 180)
    await selectTool(page, 'rectangle')
    await drawShape(page, 100, 100, 200, 180)

    // Draw ellipse at (350, 100) -> (450, 180)
    await selectTool(page, 'ellipse')
    await drawShape(page, 350, 100, 450, 180)

    // Draw arrow from rectangle to ellipse
    await selectTool(page, 'arrow')
    await drawShape(page, 200, 140, 350, 140)

    const elements = await getSceneElements(page)
    expect(elements.length).toBeGreaterThanOrEqual(3)

    const types = elements.map((el: any) => el.type)
    expect(types).toContain('rectangle')
    expect(types).toContain('ellipse')
    expect(types).toContain('arrow')

    // Assert geometry: rectangle should have non-zero width/height
    const rect = elements.find((el: any) => el.type === 'rectangle')
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)

    const ellipse = elements.find((el: any) => el.type === 'ellipse')
    expect(ellipse.width).toBeGreaterThan(0)
    expect(ellipse.height).toBeGreaterThan(0)
  })

  test('2. Drag a shape and assert bound arrow endpoint moved', async ({
    page,
  }) => {
    // Draw rectangle
    await selectTool(page, 'rectangle')
    await drawShape(page, 100, 100, 200, 180)

    // Draw ellipse
    await selectTool(page, 'ellipse')
    await drawShape(page, 350, 100, 450, 180)

    // Draw arrow connecting them
    await selectTool(page, 'arrow')
    await drawShape(page, 200, 140, 350, 140)

    const beforeElements = await getSceneElements(page)
    const arrowBefore = beforeElements.find((el: any) => el.type === 'arrow')
    const arrowPointsBefore = arrowBefore.points

    // Select the rectangle and drag it
    await selectTool(page, 'selection')
    // Click center of rectangle to select it
    await page.mouse.click(
      (await page.locator('.excalidraw__canvas').boundingBox())!.x + 150,
      (await page.locator('.excalidraw__canvas').boundingBox())!.y + 140,
    )

    // Drag rectangle down by 50px
    await dragElement(page, 150, 140, 150, 250)

    const afterElements = await getSceneElements(page)
    const arrowAfter = afterElements.find((el: any) => el.type === 'arrow')

    // The arrow's geometry should have changed (start or end point moved)
    // Either x, y or points should differ
    const geometryChanged =
      arrowAfter.x !== arrowBefore.x ||
      arrowAfter.y !== arrowBefore.y ||
      JSON.stringify(arrowAfter.points) !== JSON.stringify(arrowPointsBefore)

    expect(geometryChanged).toBe(true)

    // Version should have incremented (Excalidraw bumps version on mutation)
    expect(arrowAfter.version).toBeGreaterThan(arrowBefore.version)
  })

  test('3. Select-all then drag the entire selection', async ({ page }) => {
    // Draw two shapes
    await selectTool(page, 'rectangle')
    await drawShape(page, 100, 100, 200, 180)
    await selectTool(page, 'ellipse')
    await drawShape(page, 300, 100, 400, 180)

    const beforeElements = await getSceneElements(page)

    // Select all (Cmd+A on macOS, Ctrl+A on others)
    await page.keyboard.press('Meta+a')

    // Drag selection
    await dragElement(page, 250, 140, 250, 300)

    const afterElements = await getSceneElements(page)

    // Every element's y should have increased
    for (let i = 0; i < beforeElements.length; i++) {
      const before = beforeElements[i]
      const after = afterElements.find((el: any) => el.id === before.id)
      expect(after).toBeDefined()
      expect(after.y).toBeGreaterThan(before.y)
      expect(after.version).toBeGreaterThan(before.version)
    }
  })

  test('4. Undo six times, then redo six times', async ({ page }) => {
    // Create 6 shapes to have 6 undoable actions
    for (let i = 0; i < 6; i++) {
      await selectTool(page, 'rectangle')
      await drawShape(page, 100 + i * 60, 100, 150 + i * 60, 150)
    }

    const afterDraw = await getSceneElements(page)
    expect(afterDraw.length).toBe(6)

    // Undo 6 times
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Meta+z')
      await page.waitForTimeout(100)
    }

    const afterUndo = await getSceneElements(page)
    // After undoing 6 creations, we should have 0 elements
    // (Excalidraw may keep deleted elements with isDeleted: true)
    const visibleAfterUndo = afterUndo.filter((el: any) => !el.isDeleted)
    expect(visibleAfterUndo.length).toBe(0)

    // Redo 6 times
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Meta+Shift+z')
      await page.waitForTimeout(100)
    }

    const afterRedo = await getSceneElements(page)
    const visibleAfterRedo = afterRedo.filter((el: any) => !el.isDeleted)
    expect(visibleAfterRedo.length).toBe(6)
  })

  test('5. Change stroke colour on a selected shape', async ({ page }) => {
    // Draw a rectangle
    await selectTool(page, 'rectangle')
    await drawShape(page, 100, 100, 250, 200)

    // Select it
    await selectTool(page, 'selection')
    const canvas = page.locator('.excalidraw__canvas')
    const box = await canvas.boundingBox()
    await page.mouse.click(box!.x + 175, box!.y + 150)

    const beforeElements = await getSceneElements(page)
    const rectBefore = beforeElements.find((el: any) => el.type === 'rectangle')
    const originalColor = rectBefore.strokeColor

    // Click the stroke color picker in the properties panel
    // Excalidraw uses a color picker panel with specific data-testids
    const colorPicker = page.locator(
      '[data-testid="color-top-picks"] button',
    )
    // Pick a different colour (second swatch should be different from default)
    const swatchCount = await colorPicker.count()
    if (swatchCount > 1) {
      // Pick the last swatch which is likely a different color
      await colorPicker.nth(swatchCount - 1).click()
    } else {
      // Fallback: open color picker and select a color
      const strokeButton = page.locator('[data-testid="stroke-color"]')
      if (await strokeButton.isVisible()) {
        await strokeButton.click()
        await page.waitForTimeout(300)
        // Click a color swatch
        const swatches = page.locator('.color-picker__swatch')
        if ((await swatches.count()) > 2) {
          await swatches.nth(2).click()
        }
      }
    }

    await page.waitForTimeout(200)
    const afterElements = await getSceneElements(page)
    const rectAfter = afterElements.find((el: any) => el.type === 'rectangle')

    // Stroke color should have changed
    expect(rectAfter.strokeColor).not.toBe(originalColor)
    expect(rectAfter.version).toBeGreaterThan(rectBefore.version)
  })

  test('6. onChange counter increments during a drag', async ({ page }) => {
    // Draw a rectangle
    await selectTool(page, 'rectangle')
    await drawShape(page, 100, 100, 250, 200)

    // Select it
    await selectTool(page, 'selection')
    const canvas = page.locator('.excalidraw__canvas')
    const box = await canvas.boundingBox()
    await page.mouse.click(box!.x + 175, box!.y + 150)

    const countBefore = await getChangeCount(page)

    // Perform a drag (which should fire onChange multiple times)
    await page.mouse.move(box!.x + 175, box!.y + 150)
    await page.mouse.down()
    // Move in steps to generate multiple onChange calls
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(box!.x + 175 + i * 10, box!.y + 150 + i * 5, {
        steps: 2,
      })
      await page.waitForTimeout(16) // ~1 frame
    }
    await page.mouse.up()

    const countAfter = await getChangeCount(page)

    // onChange should have fired multiple times during the drag
    expect(countAfter).toBeGreaterThan(countBefore)
    // It should have fired more than once (not just on mouseup)
    expect(countAfter - countBefore).toBeGreaterThan(1)
  })
})

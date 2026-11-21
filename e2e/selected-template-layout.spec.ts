import { expect, test, type Page } from "@playwright/test";

async function press(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

async function rects(page: Page, selectors: readonly string[]) {
  return page.evaluate((requested) => {
    const panel = document.querySelector<HTMLElement>("[data-testid='lcd']")?.getBoundingClientRect();
    const bounds: Record<string, { left: number; right: number; top: number; bottom: number }> = {};
    for (const selector of requested) {
      const rect = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      if (rect) {
        bounds[selector] = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }
    }
    return { panel: panel && { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom }, bounds };
  }, selectors);
}

function expectInsidePanel(layout: Awaited<ReturnType<typeof rects>>, selectors: readonly string[]) {
  expect(layout.panel).toBeTruthy();
  for (const selector of selectors) {
    const rect = layout.bounds[selector];
    expect(rect, `${selector} is rendered`).toBeTruthy();
    expect(rect!.left).toBeGreaterThanOrEqual(layout.panel!.left);
    expect(rect!.right).toBeLessThanOrEqual(layout.panel!.right);
    expect(rect!.top).toBeGreaterThanOrEqual(layout.panel!.top);
    expect(rect!.bottom).toBeLessThanOrEqual(layout.panel!.bottom);
  }
}

test("E-17 limits and derivative bar remain visible within the LCD", async ({ page }) => {
  await page.goto("./");
  await press(page, ["integral", "ln", "alpha", "rparen", "rparen", "right", "1", "right", "alpha", "exp10"]);

  const integral = await rects(page, [".nat-int-glyph", ".nat-int-upper", ".nat-int-lower"]);
  expectInsidePanel(integral, [".nat-int-glyph", ".nat-int-upper", ".nat-int-lower"]);
  expect(integral.bounds[".nat-int-upper"]!.left).toBeGreaterThan(integral.bounds[".nat-int-glyph"]!.left);
  expect(integral.bounds[".nat-int-lower"]!.left).toBeGreaterThan(integral.bounds[".nat-int-glyph"]!.left);
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result")).toHaveText("1");

  await page.locator('[data-key="ac"]').click();
  await press(page, ["shift", "mode", "4", "shift", "integral", "sin", "alpha", "rparen", "rparen", "right", "frac", "shift", "exp10", "right", "2"]);
  const derivative = await rects(page, [".nat-diff-numerator", ".nat-diff-bar", ".nat-diff-denominator"]);
  expectInsidePanel(derivative, [".nat-diff-numerator", ".nat-diff-bar", ".nat-diff-denominator"]);
  expect(derivative.bounds[".nat-diff-numerator"]!.bottom).toBeLessThanOrEqual(derivative.bounds[".nat-diff-bar"]!.top + 1);
  expect(derivative.bounds[".nat-diff-bar"]!.bottom).toBeLessThanOrEqual(derivative.bounds[".nat-diff-denominator"]!.top + 1);
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result")).toHaveText("0");

  await page.locator('[data-key="ac"]').click();
  await press(page, ["shift", "logab", "alpha", "rparen", "add", "1", "right", "1", "right", "5"]);
  const sigma = await rects(page, [".nat-sigma-upper", ".nat-sigma-glyph", ".nat-sigma-lower"]);
  expectInsidePanel(sigma, [".nat-sigma-upper", ".nat-sigma-glyph", ".nat-sigma-lower"]);
  expect(sigma.bounds[".nat-sigma-upper"]!.bottom).toBeLessThanOrEqual(sigma.bounds[".nat-sigma-glyph"]!.top + 1);
  expect(sigma.bounds[".nat-sigma-lower"]!.top).toBeGreaterThanOrEqual(sigma.bounds[".nat-sigma-glyph"]!.bottom - 1);
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result")).toHaveText("20");
});

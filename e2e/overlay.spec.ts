import { test, expect } from "@playwright/test";

test.describe("physical overlay", () => {
  test("LCD and a physical key are reachable", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByTestId("lcd")).toBeVisible();
    const seven = page.locator('[data-key="7"]');
    await expect(seven).toBeVisible();
    await seven.click();
    await expect(page.getByTestId("lcd-expr")).toContainText("7");
  });

  test("debug overlay paints hit-zones", async ({ page }) => {
    await page.goto("./?debug=true");
    await expect(page.locator("[data-debug-key='equals']")).toBeVisible();
    await expect(page.locator("[data-debug-key]")).toHaveCount(50);
    await page.screenshot({ path: "test-results/debug-overlay.png", fullPage: true });
  });

  test("touch activation of a physical key", async ({ page }) => {
    await page.goto("./");
    const box = page.locator('[data-key="8"]');
    await box.dispatchEvent("pointerdown");
    await expect(page.getByTestId("lcd-expr")).toContainText("8");
  });
});

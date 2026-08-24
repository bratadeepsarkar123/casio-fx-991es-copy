import { test, expect } from "@playwright/test";

test.describe("physical overlay", () => {
  test("LCD and a physical key are reachable", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByTestId("lcd")).toBeVisible();
    const seven = page.locator('[data-key="7"]');
    await expect(seven).toBeVisible();
    await seven.click();
    await expect(page.getByTestId("lcd-expr")).toContainText("7");
    await expect(page.getByTestId("lcd-caret")).toBeVisible();
  });

  test("hit-zone overlay is on by default", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("[data-debug-key='equals']")).toBeVisible();
    await expect(page.locator("[data-debug-key]")).toHaveCount(50);
    await expect(page.getByTestId("overlay-up")).toBeVisible();
    await expect(page.getByTestId("overlay-down")).toBeVisible();
    await expect(page.getByTestId("overlay-left")).toBeVisible();
    await expect(page.getByTestId("overlay-right")).toBeVisible();
    await page.screenshot({ path: "test-results/debug-overlay.png", fullPage: true });
  });

  test("?debug=false hides hit-zone outlines", async ({ page }) => {
    await page.goto("./?debug=false");
    await expect(page.getByTestId("lcd")).toBeVisible();
    await expect(page.locator("[data-debug-key]")).toHaveCount(0);
  });

  test("left arrow hitbox moves the caret", async ({ page }) => {
    await page.goto("./");
    for (const digit of ["1", "2", "3"] as const) {
      await page.locator(`[data-key="${digit}"]`).click();
    }
    await expect(page.getByTestId("lcd-expr")).toContainText("123");
    await page.locator('[data-key="left"]').click();
    await page.locator('[data-key="left"]').click();
    await page.locator('[data-key="0"]').click();
    await expect(page.getByTestId("lcd-expr")).toContainText("1023");
  });

  test("touch activation of a physical key", async ({ page }) => {
    await page.goto("./");
    const box = page.locator('[data-key="8"]');
    await box.dispatchEvent("pointerdown");
    await expect(page.getByTestId("lcd-expr")).toContainText("8");
  });
});

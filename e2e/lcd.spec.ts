import { test, expect } from "@playwright/test";

test.describe("Natural Textbook Display", () => {
  test("stacked fraction, root, and power templates", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="frac"]').click();
    await page.locator('[data-key="2"]').click();
    await expect(page.getByTestId("nat-frac")).toBeVisible();
    await expect(page.getByTestId("lcd-expr")).toContainText("1");
    await expect(page.getByTestId("lcd-expr")).toContainText("2");
    await expect(page.getByTestId("lcd-caret")).toBeVisible();
    await page.locator('[data-key="ac"]').click();
    await page.locator('[data-key="sqrt"]').click();
    await page.locator('[data-key="4"]').click();
    await expect(page.getByTestId("nat-sqrt")).toBeVisible();
    await page.locator('[data-key="ac"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="power"]').click();
    await page.locator('[data-key="3"]').click();
    await expect(page.getByTestId("nat-pow")).toBeVisible();
    await expect(page.getByTestId("ind-math")).toHaveText("Math");
  });
});

import { test, expect } from "@playwright/test";

test.describe("STAT mode", () => {
  test("MODE 3 then 1-VAR data then mean", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="3"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveText("STAT");
    await expect(page.getByTestId("lcd-result")).toContainText("1-VAR");
    await page.locator('[data-key="1"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("X1=");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="equals"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="equals"]').click();
    await page.locator('[data-key="3"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("X4=");
    await page.locator('[data-key="up"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("X3=");
    await expect(page.getByTestId("lcd-result")).toHaveText("3");
    await page.locator('[data-key="ac"]').click();
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="1"]').click();
    await expect(page.getByTestId("lcd-result")).toContainText("Var");
    await page.locator('[data-key="4"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("2");
  });
});

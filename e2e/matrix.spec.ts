import { test, expect } from "@playwright/test";

test.describe("MATRIX mode", () => {
  test("MODE 6 then Ex1 MatA×MatB shows Ans11=5", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="6"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveText("MAT");
    await expect(page.getByTestId("lcd-result")).toContainText("MatA");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="5"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("A11=");
    const mata = ["2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac"];
    for (const key of mata) {
      await page.locator(`[data-key="${key}"]`).click();
    }
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="4"]').click();
    await expect(page.getByTestId("lcd-result")).toContainText("Dim");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="5"]').click();
    const matb = ["2", "equals", "1", "equals", "1", "equals", "2", "equals", "ac"];
    for (const key of matb) {
      await page.locator(`[data-key="${key}"]`).click();
    }
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="4"]').click();
    await page.locator('[data-key="3"]').click();
    await page.locator('[data-key="mul"]').click();
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="4"]').click();
    await page.locator('[data-key="4"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("Ans11=");
    await expect(page.getByTestId("lcd-result")).toHaveText("5");
  });
});

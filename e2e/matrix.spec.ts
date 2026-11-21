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
    const matrixGrid = page.getByTestId("lcd-grid");
    await expect(matrixGrid).toHaveAttribute("data-grid-kind", "matrix");
    await expect(matrixGrid.locator(".lcd-grid-title")).toHaveText("A");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("0");
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
    await expect(matrixGrid.locator(".lcd-grid-title")).toHaveText("Ans");
    await expect(matrixGrid.locator('[data-grid-row="0"] [data-grid-column="0"]')).toHaveText("5");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("5");
  });
});

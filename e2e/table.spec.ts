import { test, expect } from "@playwright/test";

test.describe("TABLE mode", () => {
  test("MODE 7 then x² with default Start/End/Step shows the first row", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="7"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("f(x)=");
    await page.locator('[data-key="alpha"]').click();
    await page.locator('[data-key="rparen"]').click();
    await page.locator('[data-key="square"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("Start?");
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("End?");
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("Step?");
    await page.locator('[data-key="equals"]').click();
    const grid = page.getByTestId("lcd-grid");
    await expect(grid).toHaveAttribute("data-grid-kind", "table");
    await expect(grid.locator(".lcd-grid-header")).toContainText("X");
    await expect(grid.locator(".lcd-grid-header")).toContainText("F(X)");
    await expect(grid.locator('[data-grid-row="0"]')).toContainText("1");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("1");
    await page.locator('[data-key="right"]').click();
    await expect(grid.locator('[data-grid-row="0"] [data-selected="true"]')).toHaveText("1");
    await page.locator('[data-key="down"]').click();
    await expect(grid.locator('[data-grid-row="1"] [data-selected="true"]')).toHaveText("4");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("4");
  });
});

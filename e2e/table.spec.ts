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
    await expect(page.getByTestId("lcd-expr")).toContainText("X=1");
    await expect(page.getByTestId("lcd-result")).toHaveText("1");
  });
});

import { test, expect } from "@playwright/test";

test.describe("EQN mode", () => {
  test("MODE 5 then 2-UNK Ex1 shows X=-1 then Y=2", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="5"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveCount(0);
    await expect(page.getByTestId("ind-math")).toBeVisible();
    await expect(page.getByTestId("lcd-result")).toContainText("2-UNK");
    await page.locator('[data-key="1"]').click();
    await expect(page.getByTestId("lcd-grid")).toHaveAttribute("data-grid-kind", "eqn");
    await expect(page.getByTestId("lcd-grid").locator(".lcd-grid-header")).toContainText("a");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("0");
    const seq = ["1", "equals", "2", "equals", "3", "equals", "2", "equals", "3", "equals", "4", "equals", "equals"];
    for (const key of seq) {
      await page.locator(`[data-key="${key}"]`).click();
    }
    await expect(page.getByTestId("lcd-expr")).toHaveText("X=");
    await expect(page.getByTestId("lcd-result")).toHaveText("-1");
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("Y=");
    await expect(page.getByTestId("lcd-result")).toHaveText("2");
  });
});

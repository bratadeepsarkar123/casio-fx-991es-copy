import { test, expect } from "@playwright/test";

test.describe("persistence refresh", () => {
  test("Ans and result survive a full page reload", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="7"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("7");
    await page.reload();
    await expect(page.getByTestId("lcd")).toBeVisible();
    await expect(page.getByTestId("lcd-result")).toHaveText("7");
    await expect(page.getByTestId("ind-replay")).toBeVisible();
  });
});

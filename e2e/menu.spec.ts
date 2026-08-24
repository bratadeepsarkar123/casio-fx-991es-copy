import { test, expect } from "@playwright/test";

test.describe("LCD menus are fully visible", () => {
  test("MODE shows 1:COMP 2:CMPLX 3:STAT not only later items", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await expect(page.getByTestId("lcd-menu")).toBeVisible();
    await expect(page.getByTestId("lcd-result")).toContainText("1:COMP");
    await expect(page.getByTestId("lcd-result")).toContainText("2:CMPLX");
    await expect(page.getByTestId("lcd-result")).toContainText("3:STAT");
    await expect(page.getByTestId("lcd-menu")).toContainText("1:COMP");
    await expect(page.getByTestId("lcd-menu")).toContainText("8:VECTOR");
  });

  test("SETUP 1 shows Result Format? MathO LineO", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="mode"]').click();
    await expect(page.getByTestId("lcd-result")).toContainText("1:MthIO");
    await expect(page.getByTestId("lcd-result")).toContainText("2:LineIO");
    await expect(page.getByTestId("lcd-result")).toContainText("3:Deg");
    await page.locator('[data-key="1"]').click();
    await expect(page.getByTestId("lcd-menu")).toContainText("Result Format?");
    await expect(page.getByTestId("lcd-menu")).toContainText("1:MathO");
    await expect(page.getByTestId("lcd-menu")).toContainText("2:LineO");
  });
});

import { test, expect } from "@playwright/test";

test.describe("CMPLX mode", () => {
  test("MODE 2 then (2+6i)÷(2i) shows 3-i", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="2"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveText("CMPLX");
    await page.locator('[data-key="lparen"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="add"]').click();
    await page.locator('[data-key="6"]').click();
    await page.locator('[data-key="alpha"]').click();
    await page.locator('[data-key="eng"]').click();
    await page.locator('[data-key="rparen"]').click();
    await page.locator('[data-key="div"]').click();
    await page.locator('[data-key="lparen"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="alpha"]').click();
    await page.locator('[data-key="eng"]').click();
    await page.locator('[data-key="rparen"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("3-i");
  });
});

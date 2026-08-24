import { test, expect } from "@playwright/test";

test.describe("VECTOR mode", () => {
  test("MODE 8 then Ex1 VctA+VctB shows Ans1=4", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="8"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveText("VCT");
    await expect(page.getByTestId("lcd-result")).toContainText("VctA");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="2"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("A1=");
    const vcta = ["1", "equals", "2", "equals", "ac"];
    for (const key of vcta) {
      await page.locator(`[data-key="${key}"]`).click();
    }
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="5"]').click();
    await expect(page.getByTestId("lcd-result")).toContainText("Dim");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="2"]').click();
    const vctb = ["3", "equals", "4", "equals", "ac"];
    for (const key of vctb) {
      await page.locator(`[data-key="${key}"]`).click();
    }
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="5"]').click();
    await page.locator('[data-key="3"]').click();
    await page.locator('[data-key="add"]').click();
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="5"]').click();
    await page.locator('[data-key="4"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-expr")).toHaveText("Ans1=");
    await expect(page.getByTestId("lcd-result")).toHaveText("4");
  });
});

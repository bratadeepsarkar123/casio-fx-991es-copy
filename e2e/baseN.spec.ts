import { test, expect } from "@playwright/test";

test.describe("BASE-N mode", () => {
  test("MODE 4 then BIN 11+1 shows the official 16-bit result", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="4"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveText("BASE-N");
    await expect(page.getByTestId("ind-basen")).toHaveText("DEC");
    await page.locator('[data-key="log"]').click();
    await expect(page.getByTestId("ind-basen")).toHaveText("BIN");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="add"]').click();
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("0000000000000100");
  });
});

import { test, expect } from "@playwright/test";

test("matches the three E-17 Natural numerical examples", async ({ page }, testInfo) => {
  await page.goto("./");
  const lcd = page.getByTestId("lcd");
  const capture = async (name: string) => {
    if (testInfo.project.name === "chromium") {
      await lcd.screenshot({ path: testInfo.outputPath(name) });
    }
  };

  for (const key of ["integral", "ln", "alpha", "rparen", "rparen", "right", "1", "right", "alpha", "exp10", "equals"] as const) {
    await page.locator(`[data-key="${key}"]`).click();
  }
  await expect(page.getByTestId("lcd-result")).toHaveText("1");
  await capture("e17-integral-ln-1-to-e.png");

  await page.locator('[data-key="ac"]').click();
  for (const key of ["shift", "mode", "4", "shift", "integral", "sin", "alpha", "rparen", "rparen", "right", "frac", "shift", "exp10", "right", "2", "equals"] as const) {
    await page.locator(`[data-key="${key}"]`).click();
  }
  await expect(page.getByTestId("lcd-result")).toHaveText("0");
  await capture("e17-derivative-sin-pi-over-2-rad.png");

  await page.locator('[data-key="ac"]').click();
  for (const key of ["shift", "logab", "alpha", "rparen", "add", "1", "right", "1", "right", "5", "equals"] as const) {
    await page.locator(`[data-key="${key}"]`).click();
  }
  await expect(page.getByTestId("lcd-result")).toHaveText("20");
  await capture("e17-sum-x-plus-1-1-to-5.png");
});

test("AC interrupts an active Σ calculation and its late result stays discarded", async ({ page }) => {
  await page.goto("./");
  for (const key of ["shift", "logab", "alpha", "rparen", "right", "1", "right"] as const) {
    await page.locator(`[data-key="${key}"]`).click();
  }
  for (const digit of "9999999999") {
    await page.locator(`[data-key="${digit}"]`).click();
  }
  await page.locator('[data-key="equals"]').click();

  const lcd = page.getByTestId("lcd");
  await expect(lcd).toHaveAttribute("aria-busy", "true");
  await page.locator('[data-key="9"]').click();
  await expect(lcd).toHaveAttribute("aria-busy", "true");
  await page.locator('[data-key="ac"]').click();
  await expect(lcd).toHaveAttribute("aria-busy", "false");
  await expect(page.getByTestId("lcd-expr")).toHaveText("");

  await page.waitForTimeout(500);
  await expect(page.getByTestId("lcd-result")).toHaveText("");
  await expect(page.getByTestId("lcd-expr")).toHaveText("");
});

import { test, expect } from "@playwright/test";

async function pressKeys(page: import("@playwright/test").Page, keys: string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

function values(values: string[]) {
  return values.flatMap((value) => [...value, "equals"]);
}

test.describe("STAT mode", () => {
  test("MODE 3 then 1-VAR data then mean", async ({ page }) => {
    await page.goto("./");
    await page.locator('[data-key="mode"]').click();
    await page.locator('[data-key="3"]').click();
    await expect(page.getByTestId("ind-mode")).toHaveText("STAT");
    await expect(page.getByTestId("lcd-result")).toContainText("1-VAR");
    await page.locator('[data-key="1"]').click();
    const statGrid = page.getByTestId("lcd-grid");
    await expect(statGrid).toHaveAttribute("data-grid-kind", "stat");
    await expect(statGrid.locator(".lcd-grid-header")).toContainText("X");
    await expect(statGrid.locator('[data-grid-row="0"]')).toContainText("1");
    await page.locator('[data-key="1"]').click();
    await page.locator('[data-key="equals"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="equals"]').click();
    await page.locator('[data-key="3"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(statGrid.locator('[data-grid-row="3"] [data-selected="true"]')).toBeVisible();
    await page.locator('[data-key="up"]').click();
    await expect(statGrid.locator('[data-grid-row="2"] [data-selected="true"]')).toHaveText("3");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("3");
    await page.locator('[data-key="ac"]').click();
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="1"]').click();
    await expect(page.getByTestId("lcd-result")).toContainText("Var");
    await page.locator('[data-key="4"]').click();
    await page.locator('[data-key="2"]').click();
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("2");
  });

  test("E-23 paired DOWN, RIGHT enters three X/Y rows", async ({ page }) => {
    await page.goto("./");
    await pressKeys(page, ["mode", "3", "2", ...values(["170", "173", "179"]), "down", "right", ...values(["66", "68", "75"])]);
    const grid = page.getByTestId("lcd-grid");
    await expect(grid).toHaveAttribute("data-grid-kind", "stat");
    await expect(grid.locator("[data-grid-row]")).toHaveCount(3);
    await page.locator('[data-key="up"]').click();
    await page.locator('[data-key="up"]').click();
    for (const [row, x, y] of [[0, "170", "66"], [1, "173", "68"], [2, "179", "75"]] as const) {
      const cells = grid.locator(`[data-grid-row="${row}"]`);
      await expect(cells.locator('[data-grid-column="0"]')).toContainText(x);
      await expect(cells.locator('[data-grid-column="1"]')).toContainText(y);
    }
    await expect(page.getByTestId("grid-selected-value")).toHaveText("68");
  });

  test("E-24 FREQ cells stay beside their X values and return the printed SD", async ({ page }) => {
    await page.goto("./");
    await pressKeys(page, [
      "shift", "mode", "down", "4", "1", "mode", "3", "1",
      ...values(["1", "2", "3", "4", "5"]), "down", "right",
      ...values(["1", "2", "3", "2"]),
    ]);
    const grid = page.getByTestId("lcd-grid");
    await expect(grid.locator("[data-grid-row]")).toHaveCount(3);
    for (let index = 0; index < 4; index += 1) {
      await page.locator('[data-key="up"]').click();
    }
    for (const [row, x, freq] of [[0, "1", "1"], [1, "2", "2"], [2, "3", "3"]] as const) {
      const cells = grid.locator(`[data-grid-row="${row}"]`);
      await expect(cells.locator('[data-grid-column="0"]')).toContainText(x);
      await expect(cells.locator('[data-grid-column="1"]')).toContainText(freq);
    }
    await expect(page.getByTestId("grid-selected-value")).toHaveText("1");
    for (let index = 0; index < 4; index += 1) {
      await page.locator('[data-key="down"]').click();
    }
    await page.locator('[data-key="left"]').click();
    for (const [row, x, freq] of [[2, "3", "3"], [3, "4", "2"], [4, "5", ""]] as const) {
      const cells = grid.locator(`[data-grid-row="${row}"]`);
      await expect(cells.locator('[data-grid-column="0"]')).toContainText(x);
      if (freq) await expect(cells.locator('[data-grid-column="1"]')).toContainText(freq);
    }
    await expect(grid.locator("[data-grid-row]")).toHaveCount(3);
    await expect(page.getByTestId("grid-selected-value")).toHaveText("5");
    await pressKeys(page, ["ac", "shift", "1", "4", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("1.154700538");
  });

  test("E-24 linear/log regression and E-25 estimate examples", async ({ page }) => {
    await page.goto("./");
    await pressKeys(page, [
      "shift", "mode", "6", "3", "mode", "3", "2",
      ...values(["20", "110", "200", "290"]), "down", "right",
      ...values(["3150", "7310", "8800", "9310"]), "ac",
      "shift", "1", "5", "3", "equals",
    ]);
    await expect(page.getByTestId("lcd-result")).toHaveText("0.923");
    await pressKeys(page, ["ac", "shift", "1", "1", "4", "ac", "shift", "1", "5", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("0.998");
    await pressKeys(page, ["ac", "shift", "1", "5", "1", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("-3857.984");
    await pressKeys(page, ["ac", "shift", "1", "5", "2", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("2357.532");
    await pressKeys(page, ["ac", "1", "6", "0", "shift", "1", "5", "5", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("8106.898");
  });

  test("E-25 distribution returns t and P(Ans)", async ({ page }) => {
    await page.goto("./");
    await pressKeys(page, [
      "shift", "mode", "down", "4", "1", "shift", "mode", "6", "3",
      "mode", "3", "1",
      ...values(["0", "1", "2", "3", "4", "5", "6", "7", "9", "10"]),
      "down", "right",
      ...values(["1", "2", "1", "2", "2", "2", "3", "4", "2", "1"]),
      "ac", "3", "shift", "1", "5", "4", "equals",
    ]);
    await expect(page.getByTestId("lcd-result")).toHaveText("-0.762");
    await pressKeys(page, ["shift", "1", "5", "1", "ans", "rparen", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("0.223");
  });
});

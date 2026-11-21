import { test, expect, type Page, type TestInfo } from "@playwright/test";

async function tap(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

async function captureLcd(page: Page, testInfo: TestInfo, name: string) {
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath(name) });
  }
}

test.describe("source-backed mode grids", () => {
  test("TABLE shows three numbered E-33 rows, cell selection and inverse colors", async ({ page }, testInfo) => {
    await page.goto("./");
    await tap(page, [
      "mode", "7", "alpha", "rparen", "square", "add", "1", "frac", "2", "equals",
      "neg", "1", "equals", "1", "equals", "0", "dot", "5", "equals",
    ]);

    const grid = page.getByTestId("lcd-grid");
    await expect(grid).toHaveAttribute("data-grid-kind", "table");
    await expect(grid.locator(".lcd-grid-header")).toContainText("X");
    await expect(grid.locator(".lcd-grid-header")).toContainText("F(X)");
    await expect(page.getByTestId("ind-mode")).toHaveCount(0);
    await expect(page.getByTestId("ind-math")).toBeVisible();
    await expect(grid.locator(".lcd-grid-body > .lcd-grid-row")).toHaveCount(3);
    await expect(grid.locator('[data-grid-row="0"]')).toContainText("1-11.5");
    await expect(grid.locator('[data-grid-row="1"]')).toContainText("2-0.50.75");
    await expect(grid.locator('[data-grid-row="2"]')).toContainText("300.5");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("-1");

    const selectedCell = grid.locator('[data-grid-row="0"] [data-selected="true"]');
    const visual = await selectedCell.evaluate((element) => {
      const style = getComputedStyle(element);
      const value = element.querySelector<HTMLElement>(".lcd-grid-cell-value");
      return {
        background: style.backgroundColor,
        color: style.color,
        clipped: Boolean(value && value.scrollWidth > value.clientWidth + 1),
      };
    });
    expect(visual.background).toBe("rgb(26, 34, 28)");
    expect(visual.color).toBe("rgb(195, 209, 196)");
    expect(visual.clipped).toBe(false);
    const tableRules = await grid.locator('[data-grid-row="0"] [data-grid-column]').evaluateAll((cells) =>
      cells.map((cell) => {
        const style = getComputedStyle(cell);
        return [style.borderLeftWidth, style.borderRightWidth];
      }),
    );
    expect(tableRules).toEqual([["1px", "0px"], ["1px", "1px"]]);
    expect(await grid.locator(".lcd-grid-header").evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe("0px");
    await captureLcd(page, testInfo, "selected-e33-table.png");

    await page.locator('[data-key="right"]').click();
    await expect(grid.locator('[data-grid-row="0"] [data-selected="true"]')).toHaveText("1.5");
    await page.locator('[data-key="down"]').click();
    await expect(grid.locator('[data-grid-row="1"] [data-selected="true"]')).toHaveText("0.75");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("0.75");
  });

  test("MATRIX shows the selected E-30 MatAns cell and full value below", async ({ page }, testInfo) => {
    await page.goto("./");
    await tap(page, [
      "mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals",
      "shift", "4", "2", "2", "5", "2", "equals", "neg", "1", "equals", "neg", "1", "equals", "2", "equals", "ac",
      "shift", "4", "3", "mul", "shift", "4", "4", "equals",
    ]);

    const grid = page.getByTestId("lcd-grid");
    await expect(grid).toHaveAttribute("data-grid-kind", "matrix");
    await expect(page.getByTestId("ind-mode")).toHaveText("MAT");
    await expect(page.getByTestId("ind-math")).toHaveCount(0);
    await expect(grid.locator(".lcd-grid-title")).toHaveText("Ans");
    await expect(grid.locator(".lcd-grid-row")).toHaveCount(2);
    await expect(grid.locator('[data-grid-row="0"]')).toContainText("30");
    await expect(grid.locator('[data-grid-row="1"]')).toContainText("11");
    await expect(grid.locator('[data-grid-row="0"] [data-selected="true"]')).toHaveText("3");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("3");
    const matrixGeometry = await grid.locator(".lcd-grid-body").evaluate((body) => {
      const bounds = body.getBoundingClientRect();
      const panel = body.closest("[data-testid='lcd']")?.getBoundingClientRect();
      return {
        width: bounds.width,
        panelWidth: panel?.width ?? 0,
        top: bounds.top,
        panelTop: panel?.top ?? 0,
        panelHeight: panel?.height ?? 0,
        bracketHeight: Number.parseFloat(getComputedStyle(body, "::before").height),
      };
    });
    expect(matrixGeometry.width).toBeLessThan(matrixGeometry.panelWidth * 0.65);
    expect(matrixGeometry.top).toBeLessThan(matrixGeometry.panelTop + matrixGeometry.panelHeight * 0.55);
    expect(matrixGeometry.bracketHeight).toBeGreaterThan(20);
    await captureLcd(page, testInfo, "selected-e30-matans.png");
  });

  test("VECTOR shows E-33 VctAns as a horizontal bracketed row", async ({ page }, testInfo) => {
    await page.goto("./");
    await tap(page, [
      "mode", "8", "1", "2", "1", "equals", "2", "equals",
      "shift", "5", "2", "2", "2", "3", "equals", "4", "equals", "ac",
      "shift", "5", "3", "add", "shift", "5", "4", "equals",
    ]);

    const grid = page.getByTestId("lcd-grid");
    await expect(grid).toHaveAttribute("data-grid-kind", "vector");
    await expect(page.getByTestId("ind-mode")).toHaveText("VCT");
    await expect(page.getByTestId("ind-math")).toHaveCount(0);
    await expect(grid.locator(".lcd-grid-title")).toHaveText("Ans");
    await expect(grid.locator(".lcd-grid-row")).toContainText("46");
    await expect(page.getByTestId("grid-selected-value")).toHaveText("4");
    await captureLcd(page, testInfo, "selected-e33-vctans.png");
  });

  test("a matrix cell Math ERROR replaces the grid with E-40 recovery instructions", async ({ page }) => {
    await page.goto("./");
    await tap(page, ["mode", "6", "1", "1", "1", "div", "0", "equals"]);

    const lcd = page.getByTestId("lcd");
    await expect(lcd.getByTestId("lcd-error-title")).toHaveText("Math ERROR");
    await expect(lcd.getByText("[AC] :Cancel")).toBeVisible();
    await expect(lcd.getByText("[◀][▶]:Goto")).toBeVisible();
    await expect(lcd.getByTestId("lcd-grid")).toHaveCount(0);
    await expect(lcd.getByTestId("lcd-expr")).toHaveCount(0);
  });
});

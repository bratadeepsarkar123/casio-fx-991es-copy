import { expect, test, type Page } from "@playwright/test";

async function press(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

async function resultLines(page: Page): Promise<string[]> {
  return page.locator(".lcd-line-result-row").evaluateAll((rows) =>
    rows.map((row) => Array.from(row.children).map((child) => child.textContent ?? "").join("")),
  );
}

test.describe("selected-manual numerical display flows", () => {
  test("E-10 keeps the exact radical and follows forced-decimal S⇔D rules", async ({ page }) => {
    await page.goto("./");
    await press(page, ["lparen", "sqrt", "2", "right", "add", "2", "rparen", "mul", "sqrt", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("√6+2√3");
    await press(page, ["shift", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("5.913591358");
    await page.locator('[data-key="sd"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("5.913591358");
  });

  test("E-10 switches an existing 7/6 immediately to mixed form and keeps LineIO 1÷5 decimal first", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "2", "2", "frac", "3", "right", "add", "1", "frac", "2", "right", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("7┘6");
    await press(page, ["shift", "sd"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("1 1┘6");

    await press(page, ["ac", "2", "frac", "3", "right", "add", "0", "dot", "5", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("1.166666667");

    await press(page, ["ac", "1", "div", "5", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("0.2");
    await page.locator('[data-key="sd"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("1┘5");
  });

  test("E-10 LineIO mixed-fraction keys use the corner separator and toggle", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "2", "4", "sub", "3", "frac", "1", "frac", "2"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("4-3┘1┘2");
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("1┘2");
    await page.locator('[data-key="sd"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("0.5");
  });

  test("Fix 3 keeps internal precision through Ans, STO/RCL and M", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "2", "shift", "mode", "6", "3", "1", "0", "div", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("3.333");
    await press(page, ["mul", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("10.000");

    await press(page, ["ac", "1", "0", "div", "3", "equals", "shift", "rcl", "neg"]);
    await press(page, ["ac", "alpha", "neg", "mul", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("10.000");

    await press(page, ["ac", "1", "0", "div", "3", "equals", "mplus", "ac", "alpha", "mplus", "mul", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("10.000");

    await press(page, ["ac", "shift", "0", "1", "0", "div", "3", "rparen", "mul", "3", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("9.999");
  });

  test("E-39 accepts ten mixed-fraction characters and errors on an evaluated eleven", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "down", "1"]);
    await press(page, ["1", "2", "3", "4", "5", "6", "shift", "frac", "7", "down", "8", "equals"]);
    const resultFraction = page.getByTestId("nat-result-frac");
    await expect(resultFraction.locator(":scope > span").first()).toHaveText("123456");
    await expect(resultFraction.locator(".nat-frac-num")).toHaveText("7");
    await expect(resultFraction.locator(".nat-frac-den")).toHaveText("8");
    await press(page, ["ac", "1", "2", "3", "4", "5", "6", "7", "shift", "frac", "8", "down", "9", "equals"]);
    await expect(page.getByTestId("lcd-error-title")).toHaveText("Math ERROR");
  });

  test("E-39 rejects 160C80 from its bounded intermediate product", async ({ page }) => {
    await page.goto("./");
    await press(page, ["1", "6", "0", "shift", "div", "8", "0", "equals"]);
    await expect(page.getByTestId("lcd-error-title")).toHaveText("Math ERROR");
  });

  test("E-11 shows initial sexagesimal results and preserves subsecond display precision", async ({ page }) => {
    await page.goto("./");
    await press(page, ["2", "dms", "2", "0", "dms", "3", "0", "dms", "add", "0", "dms", "3", "9", "dms", "3", "0", "dms", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("3°0′0″");

    await press(page, ["ac", "2", "dms", "1", "5", "dms", "1", "8", "dms", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("2°15′18″");
    await page.locator('[data-key="dms"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("2.255");
    await page.locator('[data-key="dms"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("2°15′18″");

    await press(page, ["ac", "0", "dms", "0", "dms", "1", "dot", "2", "3", "4", "dms", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("0°0′1.23″");
  });

  test("E-6 Comma applies to E-11 engineering mantissas while Ans stays numeric", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "down", "5", "2", "1", "2", "3", "4", "equals", "eng"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("1,234×10³");

    await press(page, ["shift", "eng"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("0,001234×10⁶");
  });

  test("E-17 Pol/Rec and E-18 complex results show both LineIO component rows", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "2", "shift", "add", "sqrt", "2", "rparen", "shift", "rparen", "sqrt", "2", "rparen", "rparen", "equals"]);
    expect(await resultLines(page)).toEqual(["r=2", "θ=45"]);
    const label0 = await page.getByTestId("lcd-line-result-label-0").boundingBox();
    const label1 = await page.getByTestId("lcd-line-result-label-1").boundingBox();
    const value0 = await page.getByTestId("lcd-line-result-value-0").boundingBox();
    const value1 = await page.getByTestId("lcd-line-result-value-1").boundingBox();
    const lcd = await page.getByTestId("lcd").boundingBox();
    expect(label0).not.toBeNull();
    expect(label1).not.toBeNull();
    expect(value0).not.toBeNull();
    expect(value1).not.toBeNull();
    expect(lcd).not.toBeNull();
    expect(Math.abs(label0!.x - label1!.x)).toBeLessThan(1);
    expect(Math.abs(value0!.x + value0!.width - (value1!.x + value1!.width))).toBeLessThan(1);
    expect(label0!.x).toBeGreaterThanOrEqual(lcd!.x);
    expect(value0!.x + value0!.width).toBeLessThanOrEqual(lcd!.x + lcd!.width);
    for (const rect of [label0!, label1!, value0!, value1!]) {
      expect(rect.y).toBeGreaterThanOrEqual(lcd!.y);
      expect(rect.y + rect.height).toBeLessThanOrEqual(lcd!.y + lcd!.height);
    }

    await press(page, ["ac", "shift", "sub", "sqrt", "2", "rparen", "shift", "rparen", "4", "5", "rparen", "equals"]);
    expect(await resultLines(page)).toEqual(["X=1", "Y=1"]);

    await press(page, [
      "mode", "2", "lparen", "2", "add", "6", "eng", "rparen", "div", "lparen", "2", "eng", "rparen", "equals",
    ]);
    expect(await resultLines(page)).toEqual(["3", "-i"]);

    await press(page, ["shift", "mode", "1", "mode", "1", "shift", "add", "sqrt", "2", "right", "shift", "rparen", "sqrt", "2", "right", "rparen", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("r=2,θ=45");
    await press(page, ["ac", "shift", "sub", "sqrt", "2", "right", "shift", "rparen", "4", "5", "rparen", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("X=1, Y=1");
  });

  test("E-16 Sci 3 retains all three mantissa digits and uses the printed exponent glyph", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "mode", "7", "3", "ln", "9", "0", "rparen", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("4.50×10⁰");
    await press(page, ["ac", "shift", "ln", "5", "rparen", "mul", "2", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("2.97×10²");
  });
});

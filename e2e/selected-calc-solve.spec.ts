import { test, expect } from "@playwright/test";

async function press(page: import("@playwright/test").Page, keys: string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

test.describe("selected CALC and SOLVE sessions", () => {
  test("E-19 CALC prompts, shows the result and repeats with current defaults", async ({ page }) => {
    await page.goto("./");
    await press(page, ["3", "alpha", "neg", "add", "alpha", "dms", "calc"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("A?");
    await expect(page.getByTestId("lcd-result")).toHaveText("0");
    await expect(page.getByTestId("lcd-caret")).toHaveCount(1);

    await press(page, ["5", "equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("B?");
    await expect(page.getByTestId("lcd-result")).toHaveText("0");
    await press(page, ["1", "0", "equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("3A+B");
    await expect(page.getByTestId("lcd-result")).toHaveText("25");

    await press(page, ["equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("A?");
    await expect(page.getByTestId("lcd-result")).toHaveText("5");
    await press(page, ["7", "equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("B?");
    await expect(page.getByTestId("lcd-result")).toHaveText("10");
    await press(page, ["2", "0", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("41");
  });

  test("E-20 CALC keeps physical CMPLX keys and displays both polar substitutions", async ({ page }) => {
    await page.goto("./");
    await press(page, ["mode", "2", "alpha", "neg", "add", "alpha", "dms", "eng", "shift", "2", "3", "calc"]);
    await press(page, ["sqrt", "3", "rparen", "equals", "1", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("2∠30");

    await press(page, ["calc", "1", "equals", "sqrt", "3", "rparen", "equals"]);
    await expect(page.getByTestId("lcd-result")).toHaveText("2∠60");
  });

  test("E-21 SOLVE shows the entered defaults, solution and left-minus-right residual", async ({ page }, testInfo) => {
    await page.goto("./");
    await press(page, [
      "alpha", "sd", "alpha", "calc", "alpha", "neg", "alpha", "rparen", "square", "add", "alpha", "dms", "shift", "calc",
    ]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("Y?");
    await expect(page.getByTestId("lcd-result")).toHaveText("0");
    await press(page, ["0", "equals", "1", "equals", "neg", "2", "equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("Solve for X");
    await expect(page.getByTestId("lcd-result")).toHaveText("0");
    await press(page, ["1", "equals"]);

    await expect(page.getByTestId("lcd-expr")).toContainText("Y=AX²+B");
    await expect(page.getByTestId("solve-result")).toBeVisible();
    await expect(page.getByTestId("solve-value")).toHaveText("X=1.414213562");
    await expect(page.getByTestId("solve-residual")).toHaveText("L−R=0");
    if (testInfo.project.name === "chromium") {
      await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("selected-e21-solve-result.png") });
    }
  });

  test("scaled SOLVE keeps a small nonzero left-minus-right residual", async ({ page }) => {
    await page.goto("./");
    await press(page, [
      "1", "exp10", "neg", "1", "2", "rparen", "mul", "lparen",
      "3", "mul", "alpha", "rparen", "sub", "1", "0", "rparen", "shift", "calc", "equals",
    ]);
    await expect(page.getByTestId("solve-result")).toBeVisible();
    await expect(page.getByTestId("solve-value-number")).toHaveText("3.333333333");
    await expect(page.getByTestId("solve-residual-number")).not.toHaveText("0");
    await expect(page.getByTestId("solve-residual-number")).toHaveText(/×10/);
  });

  test("E-22 repeats SOLVE for 3, 7 and 13 with an initial-value confirmation", async ({ page }) => {
    await page.goto("./");
    await press(page, [
      "alpha", "sd", "alpha", "calc", "alpha", "rparen", "square", "sub", "alpha", "rparen", "add", "1", "shift", "calc",
      "3", "equals", "1", "equals",
    ]);
    await expect(page.getByTestId("solve-value")).toHaveText("X=2");
    await expect(page.getByTestId("solve-residual-number")).toHaveText("0");

    await press(page, ["equals", "7", "equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("Solve for X");
    await expect(page.getByTestId("lcd-result")).toHaveText("2");
    await press(page, ["equals"]);
    await expect(page.getByTestId("solve-value")).toHaveText("X=3");
    await expect(page.getByTestId("solve-residual-number")).toHaveText("0");

    await press(page, ["equals", "1", "3", "equals", "equals"]);
    await expect(page.getByTestId("solve-value")).toHaveText("X=4");
    await expect(page.getByTestId("solve-residual-number")).toHaveText("0");
  });
});

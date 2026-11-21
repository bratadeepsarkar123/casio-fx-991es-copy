import { expect, test, type Page } from "@playwright/test";

async function press(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

test("scientific command entry uses the source two-line prompt and visible lower-right slot", async ({ page }) => {
  await page.goto("./");
  await press(page, ["shift", "7"]);
  await expect(page.locator(".lcd-menu-prompt")).toHaveText("CONSTANT\nNumber 01~40?");
  await expect(page.getByTestId("lcd-menu-entry")).toHaveText("[__]");
  await page.locator('[data-key="1"]').click();
  await expect(page.getByTestId("lcd-menu-entry")).toHaveText("[1_]");
  await page.locator('[data-key="6"]').click();
  await expect(page.getByTestId("lcd-expr")).toHaveText("R∞");
  await page.goto("./");
  await page.locator('[data-key="ac"]').click();
  await press(page, ["1", "0", "0"]);
  await press(page, ["shift", "8"]);
  await expect(page.locator(".lcd-menu-prompt")).toHaveText("CONVERSION\nNumber 01~40?");
  await expect(page.getByTestId("lcd-menu-entry")).toHaveText("[__]");
  await page.locator('[data-key="2"]').click();
  await expect(page.getByTestId("lcd-menu-entry")).toHaveText("[2_]");
  await page.locator('[data-key="2"]').click();
  await expect(page.getByTestId("lcd-expr")).toHaveText("100g►oz");
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result")).toHaveText("3.527396584");
});

test.describe("selected manual E-36–E-38 scientific commands", () => {
  test("CONST and postfix CONV produce the printed display values", async ({ page }) => {
    await page.goto("./");
    await press(page, ["shift", "7", "2", "8"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("C0");
    await page.locator('[data-key="equals"]').click();
    await expect(page.getByTestId("lcd-result")).toHaveText("299792458");

    await page.locator('[data-key="ac"]').click();
    await press(page, ["2", "add", "5", "shift", "8", "0", "2", "equals"]);
    await expect(page.getByTestId("lcd-expr")).toHaveText("2+5cm►in");
    await expect(page.getByTestId("lcd-result")).toHaveText("3.968503937");
  });

  test("CONST and CONV remain available from the cached offline app", async ({ page, context }) => {
    await page.goto("./");
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await page.waitForFunction(async () => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        if ((await cache.keys()).some((request) => new URL(request.url).pathname.endsWith("/casio-fx-991es-copy/index.html"))) {
          return true;
        }
      }
      return false;
    });
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByTestId("lcd")).toBeVisible();
      await press(page, ["shift", "7", "2", "8", "equals"]);
      await expect(page.getByTestId("lcd-result")).toHaveText("299792458");
      await press(page, ["ac", "2", "add", "5", "shift", "8", "0", "2", "equals"]);
      await expect(page.getByTestId("lcd-result")).toHaveText("3.968503937");
    } finally {
      await context.setOffline(false);
    }
  });
});

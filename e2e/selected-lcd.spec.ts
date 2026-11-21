import { test, expect } from "@playwright/test";

test.describe("selected LCD behavior", () => {
  test("keeps the natural-display caret in view while typing and moving left and right", async ({ page }, testInfo) => {
    await page.goto("./");
    const expression = page.getByTestId("lcd-expr");
    const caret = page.getByTestId("lcd-caret");

    for (const key of "1234567890".repeat(6)) {
      await page.locator(`[data-key="${key}"]`).click();
    }

    await expect(caret).toHaveCount(1);
    const endState = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>("[data-testid='lcd-expr']");
      const activeCaret = document.querySelector<HTMLElement>("[data-testid='lcd-caret']");
      if (!viewport || !activeCaret) return null;
      const view = viewport.getBoundingClientRect();
      const cursor = activeCaret.getBoundingClientRect();
      return {
        scrollLeft: viewport.scrollLeft,
        scrollWidth: viewport.scrollWidth,
        clientWidth: viewport.clientWidth,
        viewLeft: view.left,
        viewRight: view.right,
        caretLeft: cursor.left,
        caretRight: cursor.right,
        caretWidth: cursor.width,
        overflowX: getComputedStyle(viewport).overflowX,
      };
    });
    expect(endState).not.toBeNull();
    if (testInfo.project.name === "chromium") {
      await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("lcd-caret-at-entry-end.png") });
    }
    expect(endState!.scrollLeft).toBeGreaterThan(0);
    expect(endState!.caretLeft).toBeGreaterThanOrEqual(endState!.viewLeft - 1);
    expect(endState!.caretRight).toBeLessThanOrEqual(endState!.viewRight + 1);
    await expect(page.getByTestId("ind-scroll-expr-left")).toBeVisible();
    await expect(page.getByTestId("ind-scroll-expr-right")).toHaveCount(0);

    for (let i = 0; i < 60; i += 1) {
      await page.locator('[data-key="left"]').click();
    }
    const leftState = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>("[data-testid='lcd-expr']");
      const activeCaret = document.querySelector<HTMLElement>("[data-testid='lcd-caret']");
      if (!viewport || !activeCaret) return null;
      const view = viewport.getBoundingClientRect();
      const cursor = activeCaret.getBoundingClientRect();
      return { scrollLeft: viewport.scrollLeft, viewLeft: view.left, viewRight: view.right, caretLeft: cursor.left, caretRight: cursor.right };
    });
    expect(leftState).not.toBeNull();
    expect(leftState!.scrollLeft).toBeLessThan(endState!.scrollLeft);
    expect(leftState!.caretLeft).toBeGreaterThanOrEqual(leftState!.viewLeft - 1);
    expect(leftState!.caretRight).toBeLessThanOrEqual(leftState!.viewRight + 1);
    await expect(page.getByTestId("ind-scroll-expr-left")).toHaveCount(0);
    await expect(page.getByTestId("ind-scroll-expr-right")).toBeVisible();

    if (testInfo.project.name === "chromium") {
      await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("lcd-caret-after-left-navigation.png") });
    }

    for (let i = 0; i < 30; i += 1) {
      await page.locator('[data-key="right"]').click();
    }
    const rightState = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>("[data-testid='lcd-expr']");
      const activeCaret = document.querySelector<HTMLElement>("[data-testid='lcd-caret']");
      if (!viewport || !activeCaret) return null;
      const view = viewport.getBoundingClientRect();
      const cursor = activeCaret.getBoundingClientRect();
      return { scrollLeft: viewport.scrollLeft, viewLeft: view.left, viewRight: view.right, caretLeft: cursor.left, caretRight: cursor.right };
    });
    expect(rightState).not.toBeNull();
    expect(rightState!.scrollLeft).toBeGreaterThan(leftState!.scrollLeft);
    expect(rightState!.caretLeft).toBeGreaterThanOrEqual(rightState!.viewLeft - 1);
    expect(rightState!.caretRight).toBeLessThanOrEqual(rightState!.viewRight + 1);
    await expect(page.getByTestId("ind-scroll-expr-left")).toBeVisible();
    await expect(page.getByTestId("ind-scroll-expr-right")).toBeVisible();

    if (testInfo.project.name === "chromium") {
      await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("lcd-caret-after-right-navigation.png") });
    }
    await expect(expression).toBeVisible();
  });

  test("shows a blank LCD while powered off", async ({ page }, testInfo) => {
    await page.goto("./");
    await page.locator('[data-key="shift"]').click();
    await page.locator('[data-key="ac"]').click();

    const lcd = page.getByTestId("lcd");
    await expect(lcd).toHaveAttribute("data-power", "off");
    await expect(lcd).toBeEmpty();
    await expect(lcd.locator("[data-testid^='ind-']")).toHaveCount(0);
    await expect(lcd.getByTestId("lcd-caret")).toHaveCount(0);

    if (testInfo.project.name === "chromium") {
      await lcd.screenshot({ path: testInfo.outputPath("lcd-powered-off.png") });
    }
  });

  test("reloads under service-worker control and calculates offline", async ({ page, context }) => {
    await page.goto("./");
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await page.waitForFunction(
      async () => {
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          if ((await cache.keys()).some((request) => new URL(request.url).pathname.endsWith("/casio-fx-991es-copy/index.html"))) {
            return true;
          }
        }
        return false;
      },
      undefined,
      { timeout: 15_000 },
    );
    const workerState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const appShellCached = (await caches.keys()).some((name) => name.startsWith("workbox-precache"));
      return {
        scope: registration.scope,
        state: registration.active?.state,
        controlled: Boolean(navigator.serviceWorker.controller),
        appShellCached,
      };
    });
    expect(workerState.state).toBe("activated");
    expect(workerState.controlled).toBe(true);
    expect(workerState.appShellCached).toBe(true);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByTestId("lcd")).toBeVisible();
      for (const key of [
        "integral", "ln", "alpha", "rparen", "rparen", "right", "1", "right", "alpha", "exp10", "equals",
      ] as const) {
        await page.locator(`[data-key="${key}"]`).click();
      }
      await expect(page.getByTestId("lcd-result")).toHaveText("1", { timeout: 15_000 });
    } finally {
      await context.setOffline(false);
    }
  });
});

import { expect, test, type Page } from "@playwright/test";
import { byteCount, insertFraction, MAX_BYTES } from "../src/calc/editor.ts";
import {
  LCD_MIN_GLYPH_DOTS,
  LCD_SCREEN_DOTS,
  naturalFormulaHeightScreens,
} from "../src/calc/naturalHeight.ts";
import { deserializeState } from "../src/calc/persist.ts";
import type { Atom } from "../src/calc/types.ts";

async function pressButtons(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    await page.locator(`[data-key="${key}"]`).click();
  }
}

function numberKeys(value: string): string[] {
  return value.split("").map((char) => char === "." ? "dot" : char);
}

async function enterPol(page: Page, left: string, right: string) {
  await pressButtons(page, ["shift", "add", ...numberKeys(left), "shift", "rparen", ...numberKeys(right), "rparen", "equals"]);
}

test("ordinary short-result AC clears before the next example", async ({ page }) => {
  await page.goto("./");
  await pressButtons(page, ["1", "add", "1", "equals"]);
  const acWouldRestoreInput = await page.evaluate(({ screenDots, glyphDots }) => {
    const viewport = document.querySelector<HTMLElement>("[data-testid='lcd-expr']")!;
    const panel = document.querySelector<HTMLElement>("[data-testid='lcd']")!;
    const event = new CustomEvent("calculator-ac-context", { cancelable: true });
    window.dispatchEvent(event);
    return {
      restore: event.defaultPrevented,
      scrollHeight: viewport.scrollHeight,
      clientHeight: viewport.clientHeight,
      scrollWidth: viewport.scrollWidth,
      clientWidth: viewport.clientWidth,
      minimumVisibleGlyph: panel.getBoundingClientRect().height / screenDots * glyphDots,
      innerHeight: viewport.querySelector<HTMLElement>(".lcd-expr-inner")!.getBoundingClientRect().height,
      viewportHeight: viewport.getBoundingClientRect().height,
    };
  }, { screenDots: LCD_SCREEN_DOTS, glyphDots: LCD_MIN_GLYPH_DOTS });
  expect(acWouldRestoreInput.restore, JSON.stringify(acWouldRestoreInput)).toBe(false);
  expect(acWouldRestoreInput.scrollHeight - acWouldRestoreInput.clientHeight)
    .toBeLessThan(acWouldRestoreInput.minimumVisibleGlyph);
  await page.locator('[data-key="ac"]').click();
  await expect(page.locator(".lcd-expr-inner")).toBeEmpty();
  await page.locator('[data-key="2"]').click();
  await expect(page.locator(".lcd-expr-inner")).toHaveText("2");
});

function balancedFraction(depth: number): Atom {
  if (depth === 0) {
    return { t: "num", s: "1" };
  }
  return { t: "frac", num: [balancedFraction(depth - 1)], den: [balancedFraction(depth - 1)] };
}

function fractionEntryKeys(depth: number): string[] {
  if (depth === 0) {
    return ["1"];
  }
  return ["frac", ...fractionEntryKeys(depth - 1), "right", ...fractionEntryKeys(depth - 1), "right"];
}

async function readRowGeometry(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("[data-testid='lcd']")!;
    const expression = document.querySelector<HTMLElement>("[data-testid='lcd-expr']")!;
    const expressionContent = expression.querySelector<HTMLElement>(".lcd-expr-inner")!;
    const expressionFrame = document.querySelector<HTMLElement>(".lcd-expr-row")!;
    const result = document.querySelector<HTMLElement>("[data-testid='lcd-result']")!;
    const resultContent = document.querySelector<HTMLElement>("[data-testid='lcd-result-content']")!;
    const resultFrame = document.querySelector<HTMLElement>(".lcd-result-frame")!;
    const bounds = (selector: string) => {
      const rect = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    const textRangeBounds = (root: HTMLElement, startOffset: number, endOffset: number) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Node[] = [];
      let current = walker.nextNode();
      while (current) {
        nodes.push(current);
        current = walker.nextNode();
      }
      const locate = (offset: number) => {
        let remaining = offset;
        for (const node of nodes) {
          const length = node.textContent?.length ?? 0;
          if (remaining <= length) return { node, offset: remaining };
          remaining -= length;
        }
        const last = nodes.at(-1);
        return last ? { node: last, offset: last.textContent?.length ?? 0 } : null;
      };
      const start = locate(startOffset);
      const end = locate(endOffset);
      if (!start || !end) return null;
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const rect = range.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    };
    return {
      panel: { height: panel.getBoundingClientRect().height, top: panel.getBoundingClientRect().top, bottom: panel.getBoundingClientRect().bottom },
      expression: {
        frameLeft: expressionFrame.getBoundingClientRect().left,
        frameRight: expressionFrame.getBoundingClientRect().right,
        scrollLeft: expression.scrollLeft,
        scrollWidth: expression.scrollWidth,
        clientWidth: expression.clientWidth,
        left: expression.getBoundingClientRect().left,
        right: expression.getBoundingClientRect().right,
        top: expression.getBoundingClientRect().top,
        bottom: expression.getBoundingClientRect().bottom,
        contentLeft: expressionContent.getBoundingClientRect().left,
        contentRight: expressionContent.getBoundingClientRect().right,
        rightMarker: bounds("[data-testid='ind-scroll-expr-right']"),
        leftMarker: bounds("[data-testid='ind-scroll-expr-left']"),
        prefix: textRangeBounds(expressionContent, 0, "Pol(1.414213562".length),
        nextComma: textRangeBounds(expressionContent, "Pol(1.414213562".length, "Pol(1.414213562".length + 1),
      },
      result: {
        frameLeft: resultFrame.getBoundingClientRect().left,
        frameRight: resultFrame.getBoundingClientRect().right,
        scrollLeft: result.scrollLeft,
        scrollWidth: result.scrollWidth,
        clientWidth: result.clientWidth,
        left: result.getBoundingClientRect().left,
        right: result.getBoundingClientRect().right,
        fontSize: getComputedStyle(result).fontSize,
        top: result.getBoundingClientRect().top,
        bottom: result.getBoundingClientRect().bottom,
        contentLeft: resultContent.getBoundingClientRect().left,
        contentRight: resultContent.getBoundingClientRect().right,
        contentWidth: resultContent.getBoundingClientRect().width,
        textWidth: resultContent.querySelector<HTMLElement>(".lcd-result-text")?.getBoundingClientRect().width ?? null,
        prefix: textRangeBounds(resultContent, 0, "r=2,\u03b8=0.7853981".length),
        nextDigit: textRangeBounds(resultContent, "r=2,\u03b8=0.7853981".length, "r=2,\u03b8=0.7853981".length + 1),
        rightMarker: bounds("[data-testid='ind-scroll-result-right']"),
        leftMarker: bounds("[data-testid='ind-scroll-result-left']"),
      },
      resultText: resultContent.innerText,
    };
  });
}

async function expectCaretWithinExpression(page: Page) {
  const bounds = await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>("[data-testid='lcd-expr']")?.getBoundingClientRect();
    const viewportNode = document.querySelector<HTMLElement>("[data-testid='lcd-expr']");
    const caret = document.querySelector<HTMLElement>("[data-testid='lcd-caret']")?.getBoundingClientRect();
    return viewport && caret
      ? {
          viewport: { top: viewport.top, bottom: viewport.bottom, left: viewport.left, right: viewport.right },
          caret: { top: caret.top, bottom: caret.bottom, left: caret.left, right: caret.right },
          scrollTop: viewportNode?.scrollTop,
          scrollHeight: viewportNode?.scrollHeight,
          clientHeight: viewportNode?.clientHeight,
        }
      : null;
  });
  expect(bounds).not.toBeNull();
  expect(bounds!.caret.top).toBeGreaterThanOrEqual(bounds!.viewport.top - 1);
  expect(bounds!.caret.bottom).toBeLessThanOrEqual(bounds!.viewport.bottom + 1);
  expect(bounds!.caret.left).toBeGreaterThanOrEqual(bounds!.viewport.left - 1);
  expect(bounds!.caret.right).toBeLessThanOrEqual(bounds!.viewport.right + 1);
}

test("E-4 Rad and Deg Pol show row-local continuation and scroll through pointer and keyboard", async ({ page }, testInfo) => {
  await page.goto("./");
  await pressButtons(page, ["shift", "add", "sqrt", "2", "right", "shift", "rparen", "sqrt", "2", "right", "rparen", "equals"]);

  const short = await readRowGeometry(page);
  expect(short.resultText.replace(/\s+/g, "")).toContain(`r=2,${"\u03b8"}=45`);
  await expect(page.getByTestId("ind-replay")).toBeVisible();
  await expect(page.getByTestId("ind-replay-down")).toHaveCount(0);
  await expect(page.getByTestId("ind-scroll-expr-left")).toHaveCount(0);
  await expect(page.getByTestId("ind-scroll-expr-right")).toHaveCount(0);
  await expect(page.getByTestId("ind-scroll-result-left")).toHaveCount(0);
  await expect(page.getByTestId("ind-scroll-result-right")).toHaveCount(0);
  expect(short.result.contentRight).toBeGreaterThanOrEqual(short.result.clientWidth + short.result.contentLeft - 1);
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-005-E4-pol-deg-short-control.png") });
  }

  await pressButtons(page, ["ac", "ac", "shift", "mode", "4"]);
  await enterPol(page, "1.4142135623731", "1.4142135623731");
  const long = await readRowGeometry(page);
  console.info("E-4 Rad result geometry", testInfo.project.name, JSON.stringify(long));
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-005-E4-pol-rad-dual-before.png") });
  }
  expect(long.result.scrollLeft).toBe(0);
  expect(long.result.scrollWidth).toBeGreaterThan(long.result.clientWidth + 1);
  expect(long.expression.scrollWidth).toBeGreaterThan(long.expression.clientWidth + 1);
  expect(long.result.contentLeft).toBeGreaterThanOrEqual(long.result.left - 1);
  expect(long.result.contentRight).toBeGreaterThan(long.result.right);
  expect(long.resultText).toContain("r=2");
  await expect(page.getByTestId("ind-replay")).toBeVisible();
  await expect(page.getByTestId("ind-replay-down")).toHaveCount(0);
  expect(long.expression.rightMarker).not.toBeNull();
  expect(long.expression.rightMarker!.left).toBeGreaterThanOrEqual(long.expression.right - 0.5);
  expect(long.expression.rightMarker!.right).toBeLessThanOrEqual(long.expression.frameRight + 1);
  expect(long.result.rightMarker).not.toBeNull();
  expect(long.result.rightMarker!.left).toBeGreaterThanOrEqual(long.result.right - 0.5);
  expect(long.result.rightMarker!.right).toBeLessThanOrEqual(long.result.frameRight + 1);
  expect(long.result.rightMarker!.top).toBeGreaterThanOrEqual(long.result.top - 1);
  expect(long.result.rightMarker!.bottom).toBeLessThanOrEqual(long.result.bottom + 1);
  expect(long.result.prefix).not.toBeNull();
  expect(long.result.nextDigit).not.toBeNull();
  expect(long.result.prefix!.right).toBeLessThanOrEqual(long.result.right + 0.5);
  expect(long.result.nextDigit!.left).toBeGreaterThanOrEqual(long.result.right - 0.5);
  expect(long.expression.prefix).not.toBeNull();
  expect(long.expression.nextComma).not.toBeNull();
  expect(long.expression.prefix!.right).toBeLessThanOrEqual(long.expression.right + 0.5);
  expect(long.expression.nextComma!.left).toBeGreaterThanOrEqual(long.expression.right - 0.5);
  await expect(page.getByTestId("ind-scroll-expr-right")).toBeVisible();
  await expect(page.getByTestId("ind-scroll-result-right")).toBeVisible();
  await expect(page.getByTestId("ind-scroll-result-left")).toHaveCount(0);

  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-005-E4-pol-rad-dual-before.png") });
  }

  // RIGHT scrolls the result without entering history or moving the input caret.
  await page.locator('[data-key="right"]').click();
  const afterPointerScroll = await readRowGeometry(page);
  expect(afterPointerScroll.result.scrollLeft).toBeGreaterThan(0);
  expect(afterPointerScroll.result.scrollLeft).toBeLessThan(afterPointerScroll.result.clientWidth);
  await expect(page.getByTestId("ind-scroll-result-left")).toBeVisible();
  await expect(page.getByTestId("lcd-caret")).toHaveCount(0);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("ArrowLeft");
  const returnedResult = await readRowGeometry(page);
  expect(returnedResult.result.scrollLeft).toBe(0);
  await expect(page.getByTestId("ind-scroll-result-left")).toHaveCount(0);
  await expect(page.getByTestId("ind-scroll-result-right")).toBeVisible();
  await expect(page.getByTestId("lcd-caret")).toHaveCount(0);
  await page.locator('[data-key="left"]').click();
  await expect(page.getByTestId("ind-scroll-result-right")).toBeVisible();
  await expect(page.getByTestId("lcd-caret")).toHaveCount(0);

  for (let i = 0; i < 50; i += 1) {
    await page.keyboard.press("ArrowRight");
  }
  const atResultEnd = await readRowGeometry(page);
  expect(atResultEnd.result.scrollLeft).toBeGreaterThan(0);
  await expect(page.getByTestId("ind-scroll-result-left")).toBeVisible();
  await expect(page.getByTestId("ind-scroll-result-right")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  expect((await readRowGeometry(page)).result.scrollLeft).toBe(atResultEnd.result.scrollLeft);
  await expect(page.getByTestId("lcd-caret")).toHaveCount(0);

  // AC reveals the original expression. Its arrows then navigate the input row.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("lcd-caret")).toHaveCount(1);
  await expect(page.getByTestId("ind-scroll-result-right")).toHaveCount(0);
  const originalInput = await page.locator(".lcd-expr-inner").innerText();
  expect(originalInput).toContain("1.4142135623731");
  const expressionAtEnd = await readRowGeometry(page);
  expect(expressionAtEnd.expression.scrollLeft).toBeGreaterThan(0);
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-005-E4-pol-rad-restored-input.png") });
  }

  await page.locator('[data-key="left"]').click();
  for (let i = 0; i < 24; i += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  const scrolledInput = await readRowGeometry(page);
  expect(scrolledInput.expression.scrollLeft).toBeLessThan(expressionAtEnd.expression.scrollLeft);
  await expect(page.getByTestId("ind-scroll-expr-right")).toBeVisible();
  expect(await page.locator(".lcd-expr-inner").innerText()).toContain("Pol");
  await page.keyboard.press("Backspace");
  expect(await page.locator(".lcd-expr-inner").innerText()).not.toBe(originalInput);
  await page.locator('[data-key="ac"]').click();
  await expect(page.locator(".lcd-expr-inner")).toBeEmpty();

});

test("retains the clipped E-7 byte-warning LCD crop", async ({ page }, testInfo) => {
  await page.goto("./");
  await pressButtons(page, Array.from({ length: 89 }, () => "1"));
  await expect(page.getByTestId("lcd")).toHaveClass(/is-byte-warning/);
  await expectCaretWithinExpression(page);
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-008-E7-warning.png") });
  }
});

test("E-5 page and E-12 replay indicators follow the visible menu/history position", async ({ page }) => {
  await page.goto("./");
  await pressButtons(page, ["1", "add", "1", "equals", "shift", "mode"]);
  await expect(page.getByTestId("ind-menu-down")).toBeVisible();
  await expect(page.getByTestId("ind-menu-up")).toHaveCount(0);
  await expect(page.getByTestId("ind-replay")).toHaveCount(0);
  await expect(page.getByTestId("ind-replay-down")).toHaveCount(0);
  await page.locator('[data-key="down"]').click();
  await expect(page.getByTestId("ind-menu-up")).toBeVisible();
  await expect(page.getByTestId("ind-menu-down")).toHaveCount(0);
  await expect(page.getByTestId("ind-replay")).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await pressButtons(page, [
    "1", "add", "1", "equals",
    "2", "add", "2", "equals",
    "3", "add", "3", "equals",
  ]);
  await expect(page.getByTestId("ind-replay")).toBeVisible();
  await expect(page.getByTestId("ind-replay-down")).toHaveCount(0);
  await page.locator('[data-key="up"]').click();
  await expect(page.getByTestId("ind-replay")).toBeVisible();
  await expect(page.getByTestId("ind-replay-down")).toBeVisible();
  await page.locator('[data-key="up"]').click();
  await expect(page.getByTestId("ind-replay")).toHaveCount(0);
  await expect(page.getByTestId("ind-replay-down")).toBeVisible();
  await page.locator('[data-key="down"]').click();
  await expect(page.getByTestId("ind-replay")).toBeVisible();
  await expect(page.getByTestId("ind-replay-down")).toBeVisible();
  await page.locator('[data-key="down"]').click();
  await expect(page.getByTestId("ind-replay")).toBeVisible();
  await expect(page.getByTestId("ind-replay-down")).toHaveCount(0);
});

test("E-8 rejects Natural formula input when the measured candidate exceeds two LCD screens", async ({ page }, testInfo) => {
  await page.goto("./");
  await pressButtons(page, ["2", "add", "2", "equals"]);
  await pressButtons(page, [...fractionEntryKeys(2), "equals"]);
  await expect(page.getByTestId("lcd-result-content")).toContainText("1");

  // History can be traversed and returned from without losing the large input.
  await page.locator('[data-key="up"]').click();
  await expect(page.getByTestId("lcd-result-content")).toContainText("4");
  await page.locator('[data-key="down"]').click();
  await expect(page.getByTestId("lcd-result-content")).toContainText("1");
  await page.locator('[data-key="right"]').click();
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result-content")).toContainText("1");
  await page.locator('[data-key="ac"]').click();
  expect(await page.locator(".nat-frac").count()).toBe(3);
  await page.locator('[data-key="right"]').click();
  await expectCaretWithinExpression(page);
  await page.keyboard.press("ArrowLeft");
  await expectCaretWithinExpression(page);
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-009-E8-natural-input-restored.png") });
  }
  await page.locator('[data-key="ac"]').click();

  const requested = fractionEntryKeys(3);
  const entry = await page.evaluate(async (keys) => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const button = (key: string) => document.querySelector<HTMLButtonElement>(`[data-key="${key}"]`);
    let acceptedKeys = 0;
    let refusedKey: string | null = null;
    let lastAccepted: { formulaPx: number; screenPx: number; panelPx: number; expressionViewportPx: number } | null = null;
    let refusedCandidate: { formulaPx: number; screenPx: number; panelPx: number; expressionViewportPx: number } | null = null;
    let formulaModelLines = "";
    let formulaModelScreens = "";
    const acceptedTrace: Array<{ key: string; fractions: number; formulaPx: number; modelScreens: string }> = [];
    const panel = () => document.querySelector<HTMLElement>("[data-testid='lcd']")!;
    const expression = () => document.querySelector<HTMLElement>("[data-testid='lcd-expr']")!;
    const inner = () => expression().querySelector<HTMLElement>(".lcd-expr-inner")!;
    const measure = (node: HTMLElement) => ({
      formulaPx: node.getBoundingClientRect().height,
      screenPx: panel().getBoundingClientRect().height,
      panelPx: panel().getBoundingClientRect().height,
      expressionViewportPx: expression().getBoundingClientRect().height,
    });
    const probeFraction = () => {
      const clone = inner().cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-10000px";
      clone.style.top = "0";
      clone.style.width = "max-content";
      clone.style.minWidth = "0";
      clone.style.visibility = "hidden";
      expression().append(clone);
      const caret = clone.querySelector<HTMLElement>("[data-testid='lcd-caret']");
      if (caret) {
        const fraction = document.createElement("span");
        fraction.className = "nat-frac";
        const numerator = document.createElement("span");
        numerator.className = "nat-frac-num";
        const denominator = document.createElement("span");
        denominator.className = "nat-frac-den";
        const activeCaret = document.createElement("span");
        activeCaret.className = "lcd-caret";
        activeCaret.dataset.testid = "lcd-caret";
        const placeholderBottom = document.createElement("span");
        placeholderBottom.className = "nat-ph";
        const bar = document.createElement("span");
        bar.className = "nat-frac-bar";
        numerator.append(activeCaret);
        denominator.append(placeholderBottom);
        fraction.append(numerator, bar, denominator);
        caret.replaceWith(fraction);
      }
      const measured = measure(clone);
      clone.remove();
      return measured;
    };

    for (const key of keys) {
      const before = key === "frac" ? inner().querySelectorAll(".nat-frac").length : inner().textContent?.length ?? 0;
      const target = button(key);
      if (!target) throw new Error(`Missing calculator key ${key}`);
      target.click();
      await frame();
      const after = key === "frac" ? inner().querySelectorAll(".nat-frac").length : inner().textContent?.length ?? 0;
      if ((key === "frac" && after === before) || (key === "1" && after === before)) {
        refusedKey = key;
        lastAccepted = measure(inner());
        formulaModelLines = expression().dataset.naturalFormulaHeightLines ?? "";
        formulaModelScreens = expression().dataset.naturalFormulaHeightScreens ?? "";
        refusedCandidate = key === "frac" ? probeFraction() : (() => {
          const clone = inner().cloneNode(true) as HTMLElement;
          clone.style.position = "absolute";
          clone.style.left = "-10000px";
          clone.style.top = "0";
          clone.style.width = "max-content";
          clone.style.minWidth = "0";
          clone.style.visibility = "hidden";
          expression().append(clone);
          clone.querySelector("[data-testid='lcd-caret']")?.replaceWith(document.createTextNode("1"));
          const measured = measure(clone);
          clone.remove();
          return measured;
        })();
        break;
      }
      acceptedKeys += 1;
      acceptedTrace.push({
        key,
        fractions: inner().querySelectorAll(".nat-frac").length,
        formulaPx: inner().getBoundingClientRect().height,
        modelScreens: expression().dataset.naturalFormulaHeightScreens ?? "",
      });
    }
    const stored = localStorage.getItem("fx991es-plus2/v1");
    const persisted = stored ? JSON.parse(stored) : null;
    return {
      acceptedKeys,
      refusedKey,
      lastAccepted,
      refusedCandidate,
      formulaModelLines,
      formulaModelScreens,
      acceptedTrace,
      persisted,
      acceptedRoot: persisted?.state?.editor?.root ?? persisted?.editor?.root ?? null,
    };
  }, requested);

  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-009-E8-natural-height-refusal-state.png") });
  }

  const manualModel = {
    lastAcceptedFormulaScreens: naturalFormulaHeightScreens([balancedFraction(2)]),
    refusedBalancedCandidateScreens: naturalFormulaHeightScreens([balancedFraction(3)]),
    refusedBalancedCandidateBytes: byteCount([balancedFraction(3)]),
  };
  expect(manualModel.refusedBalancedCandidateBytes).toBeLessThanOrEqual(MAX_BYTES);
  const fractionRects = await page.locator(".nat-frac").evaluateAll((nodes) => nodes.map((node) => ({
    height: node.getBoundingClientRect().height,
    width: node.getBoundingClientRect().width,
    fontSize: getComputedStyle(node).fontSize,
  })));
  console.info("E-8 admission geometry", JSON.stringify({ ...entry, manualModel, fractionRects }));
  expect(entry.refusedKey).toBeTruthy();
  expect(entry.acceptedKeys).toBeGreaterThan(15);
  expect(entry.refusedKey).toBe("frac");
  expect(entry.lastAccepted).not.toBeNull();
  expect(entry.refusedCandidate).not.toBeNull();
  expect(entry.lastAccepted!.formulaPx).toBeLessThanOrEqual(entry.lastAccepted!.panelPx * 2);
  expect(entry.refusedCandidate!.formulaPx).toBeGreaterThan(entry.refusedCandidate!.panelPx * 2);
  const persistedState = deserializeState(entry.persisted, 0);
  expect(persistedState).not.toBeNull();
  const refusedEditor = insertFraction(persistedState!.editor, false);
  const refusedCandidateBytes = byteCount(refusedEditor.root);
  expect(refusedCandidateBytes).toBeLessThanOrEqual(MAX_BYTES);
  console.info("E-8 refused candidate bytes", refusedCandidateBytes);
  expect(naturalFormulaHeightScreens(refusedEditor.root, refusedEditor.cursor)).toBeGreaterThan(2);
  expect(await page.locator(".nat-frac").count()).toBeGreaterThan(2);
  await expect(page.getByTestId("lcd-caret")).toHaveCount(1);
  await expectCaretWithinExpression(page);

  const persistedText = await page.locator(".lcd-expr-inner").innerText();
  const persistedFractions = await page.locator(".nat-frac").count();
  await page.reload();
  await expect(page.getByTestId("lcd-caret")).toHaveCount(1);
  expect(await page.locator(".lcd-expr-inner").innerText()).toBe(persistedText);
  expect(await page.locator(".nat-frac").count()).toBe(persistedFractions);

  const beforeDeleteText = await page.locator(".lcd-expr-inner").innerText();
  const beforeDeleteFractions = await page.locator(".nat-frac").count();
  let shrank = false;
  for (let i = 0; i < 12 && !shrank; i += 1) {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    const currentText = await page.locator(".lcd-expr-inner").innerText();
    const currentFractions = await page.locator(".nat-frac").count();
    shrank = currentText !== beforeDeleteText || currentFractions < beforeDeleteFractions;
  }
  expect(shrank).toBe(true);
  await expect(page.getByTestId("lcd-caret")).toHaveCount(1);
  await expectCaretWithinExpression(page);
  expect(manualModel.lastAcceptedFormulaScreens).toBeLessThan(2);
  expect(manualModel.refusedBalancedCandidateScreens).toBeGreaterThan(2);

});

test("retains corrected E-17 bound crops and the E-37 conversion prompt", async ({ page }, testInfo) => {
  await page.goto("./");
  const expectFullyInsideExpressionViewport = async (selectors: string[]) => {
    const geometry = await page.evaluate((items) => {
      const viewport = document.querySelector<HTMLElement>("[data-testid='lcd-expr']");
      if (!viewport) return null;
      const clip = viewport.getBoundingClientRect();
      return items.map((selector) => {
        const node = document.querySelector<HTMLElement>(selector);
        const rect = node?.getBoundingClientRect();
        return rect ? {
          selector,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          clipLeft: clip.left,
          clipTop: clip.top,
          clipRight: clip.right,
          clipBottom: clip.bottom,
        } : null;
      });
    }, selectors);
    expect(geometry).not.toBeNull();
    for (const rect of geometry!) {
      expect(rect, `${rect?.selector} must be present`).not.toBeNull();
      expect(rect!.left).toBeGreaterThanOrEqual(rect!.clipLeft - 0.5);
      expect(rect!.top).toBeGreaterThanOrEqual(rect!.clipTop - 0.5);
      expect(rect!.right).toBeLessThanOrEqual(rect!.clipRight + 0.5);
      expect(rect!.bottom).toBeLessThanOrEqual(rect!.clipBottom + 0.5);
    }
    return geometry;
  };
  await pressButtons(page, ["integral", "ln", "alpha", "rparen", "rparen", "right", "1", "right", "alpha", "exp10"]);
  await expect(page.locator(".nat-int-upper")).toHaveText("e");
  await expect(page.locator(".nat-int-lower")).toHaveText("1");
  const integralBoundsGeometry = await expectFullyInsideExpressionViewport([
    ".nat-int-symbol", ".nat-int-upper", ".nat-int-lower", ".nat-int-function",
  ]);
  console.info("E-17 integral viewport geometry", JSON.stringify(integralBoundsGeometry));
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-018-E17-integral-bounds.png") });
  }
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result-content")).toHaveText("1");
  await page.locator('[data-key="ac"]').click();

  await pressButtons(page, ["shift", "logab", "alpha", "rparen", "add", "1", "right", "1", "right", "5"]);
  await expect(page.locator(".nat-sigma-upper")).toHaveText("5");
  await expect(page.locator(".nat-sigma-lower")).toHaveText("x=1");
  const sigmaBoundsGeometry = await expectFullyInsideExpressionViewport([
    ".nat-sigma-symbol", ".nat-sigma-upper", ".nat-sigma-lower", ".nat-sigma-function",
  ]);
  console.info("E-17 sigma viewport geometry", JSON.stringify(sigmaBoundsGeometry));
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-018-E17-sum-bounds.png") });
  }
  await page.locator('[data-key="equals"]').click();
  await expect(page.getByTestId("lcd-result-content")).toHaveText("20");

  await page.locator('[data-key="ac"]').click();
  await pressButtons(page, ["1", "0", "0", "shift", "8"]);
  await expect(page.locator(".lcd-menu-prompt")).toHaveText("CONVERSION\nNumber 01~40?");
  await expect(page.getByTestId("lcd-menu-entry")).toHaveText("[__]");
  if (testInfo.project.name === "chromium") {
    await page.getByTestId("lcd").screenshot({ path: testInfo.outputPath("pdf-038-E37-conversion-prompt.png") });
  }
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import type { KeyId } from "../calc/keys.ts";
import { lcdExpression, lcdIndicators, lcdResult, lcdShowsNatural } from "./lcdModel.ts";
import { NaturalExpression } from "./naturalView.tsx";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

function html(keys: KeyId[]): string {
  const s = run(keys);
  return renderToStaticMarkup(
    <NaturalExpression atoms={s.editor.root} format={s.setup.displayFormat} cursor={s.editor.cursor} showCaret={false} />,
  );
}

function htmlWithCaret(keys: KeyId[]): string {
  const s = run(keys);
  return renderToStaticMarkup(
    <NaturalExpression atoms={s.editor.root} format={s.setup.displayFormat} cursor={s.editor.cursor} showCaret={true} />,
  );
}

describe("Natural Display HTML (D-024; lcdExpression stays linear)", () => {
  it("stacks a fraction while lcdExpression remains (1/2)", () => {
    const s = run(["1", "frac", "2"]);
    expect(lcdExpression(s)).toBe("(1/2)");
    expect(lcdShowsNatural(s)).toBe(true);
    const markup = html(["1", "frac", "2"]);
    expect(markup).toContain("nat-frac");
    expect(markup).toContain("1");
    expect(markup).toContain("2");
    expect(markup).not.toContain("(1/2)");
  });

  it("draws a radical with vinculum for √", () => {
    const s = run(["sqrt", "2"]);
    expect(lcdExpression(s)).toMatch(/√\(2/);
    expect(html(["sqrt", "2"])).toContain("nat-sqrt");
  });

  it("raises the exponent for x^y", () => {
    const s = run(["2", "power", "3"]);
    expect(lcdExpression(s)).toMatch(/\^/);
    expect(html(["2", "power", "3"])).toContain("nat-pow");
  });

  it("renders the Natural calculus templates with visible bounds and function slots", () => {
    const integral = html(["integral"]);
    const derivative = html(["shift", "integral"]);
    const summation = html(["shift", "logab"]);
    expect(integral).toContain("nat-int");
    expect(integral).toContain("∫");
    expect(derivative).toContain("nat-diff");
    expect(derivative).toContain("dx");
    expect(summation).toContain("nat-sigma");
    expect(summation).toContain("Σ");
    expect((integral.match(/nat-ph/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("moves vertically between Natural lower and upper limits", () => {
    let state = run(["integral"]);
    expect(state.editor.cursor.path).toEqual([0, 8]);
    state = dispatchKeys(state, ["down"], 0);
    expect(state.editor.cursor.path).toEqual([0, 9]);
    state = dispatchKeys(state, ["down"], 0);
    expect(state.editor.cursor.path).toEqual([0, 10]);
    state = dispatchKeys(state, ["up"], 0);
    expect(state.editor.cursor.path).toEqual([0, 9]);
  });

  it("uses MAT / VCT indicator labels, not MATRIX / VECTOR", () => {
    expect(lcdIndicators(run(["mode", "6"])).mode).toBe("MAT");
    expect(lcdExpression(run(["mode", "6"]))).toBe("MATRIX");
    expect(lcdIndicators(run(["mode", "8"])).mode).toBe("VCT");
    expect(lcdExpression(run(["mode", "8"]))).toBe("VECTOR");
  });

  it("shows expression overflow when the linear string exceeds the clone budget", () => {
    const s = run(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "1", "2", "3", "4", "5", "6", "7"]);
    expect(lcdIndicators(s).exprOverflow).toBe(true);
    expect(lcdExpression(s).includes(">")).toBe(false);
  });

  it("shows Disp only while a multi-statement intermediate result is displayed", () => {
    let s = run(["3", "add", "3", "alpha", "integral", "3", "mul", "3"]);
    expect(lcdIndicators(s).disp).toBe(false);
    s = dispatchKeys(s, ["equals"], 0);
    expect(lcdResult(s)).toBe("6");
    expect(lcdIndicators(s).disp).toBe(true);
    s = dispatchKeys(s, ["equals"], 0);
    expect(lcdResult(s)).toBe("9");
    expect(lcdIndicators(s).disp).toBe(false);
  });

  it("keeps LineIO on the linear string (no stacked frac)", () => {
    const s = dispatchKeys(createInitialState(0), ["shift", "mode", "2", "1", "frac", "2"], 0);
    expect(s.setup.displayFormat).toBe("LineIO");
    expect(lcdShowsNatural(s)).toBe(false);
    expect(lcdExpression(s)).toContain("┘");
  });
  it("renders one caret at the end of a multi-digit number", () => {
    const markup = htmlWithCaret(["1", "2", "3"]);
    expect(markup.match(/data-testid="lcd-caret"/g)).toHaveLength(1);
  });

  it("renders one caret inside a number before its trailing operator", () => {
    const markup = htmlWithCaret(["1", "2", "3", "add", "left"]);
    expect(markup.match(/data-testid="lcd-caret"/g)).toHaveLength(1);
  });

});

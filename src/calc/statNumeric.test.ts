import { describe, expect, it } from "vitest";
import { CalcArgumentError, CalcMathError, D } from "./numeric.ts";
import {
  accumulateSums,
  evalStatCommand,
  expandStatRows,
  fitRegression,
  popSdFromSums,
  predictX,
  sampleSdFromSums,
  statP,
  type StatPoint,
} from "./statNumeric.ts";
import type { StatRow } from "./types.ts";

function rows1Var(pairs: Array<[string, string]>): StatRow[] {
  return pairs.map(([x, freq]) => ({ x, y: null, freq }));
}

function rowsXY(pairs: Array<[string, string]>): StatRow[] {
  return pairs.map(([x, y]) => ({ x, y, freq: null }));
}

describe("STAT numeric (decimal.js; official examples)", () => {
  it("Ex2 FREQ ON 1-VAR mean=3 σx=1.154700538 TARGET-OFFICIAL-DOC", () => {
    const rows = rows1Var([
      ["1", "1"],
      ["2", "2"],
      ["3", "3"],
      ["4", "2"],
      ["5", "1"],
    ]);
    const mean = evalStatCommand("stat-meanX", null, "1-VAR", rows, true);
    const sd = evalStatCommand("stat-popSdX", null, "1-VAR", rows, true);
    const n = evalStatCommand("stat-n", null, "1-VAR", rows, true);
    expect(n.toString()).toBe("9");
    expect(mean.toString()).toBe("3");
    expect(sd.toSignificantDigits(10).toString()).toBe("1.154700538");
    const pts = expandStatRows("1-VAR", rows, true);
    const sums = accumulateSums(pts);
    expect(popSdFromSums(sums.n, sums.sumX, sums.sumX2).toSignificantDigits(10).toString()).toBe("1.154700538");
  });

  it("empty FREQ defaults to 1 (official Ex2 omitted last 1)", () => {
    const rows: StatRow[] = [
      { x: "1", y: null, freq: "1" },
      { x: "2", y: null, freq: "2" },
      { x: "3", y: null, freq: "3" },
      { x: "4", y: null, freq: "2" },
      { x: "5", y: null, freq: null },
    ];
    expect(evalStatCommand("stat-meanX", null, "1-VAR", rows, true).toString()).toBe("3");
  });

  it("Ex3 linear r=0.923 and ln X r/A/B Fix-3 TARGET-OFFICIAL-DOC", () => {
    const rows = rowsXY([
      ["20", "3150"],
      ["110", "7310"],
      ["200", "8800"],
      ["290", "9310"],
    ]);
    const rLin = evalStatCommand("stat-r", null, "A+BX", rows, false);
    expect(rLin.toFixed(3)).toBe("0.923");
    const rLog = evalStatCommand("stat-r", null, "ln X", rows, false);
    const a = evalStatCommand("stat-A", null, "ln X", rows, false);
    const b = evalStatCommand("stat-B", null, "ln X", rows, false);
    expect(rLog.toFixed(3)).toBe("0.998");
    expect(a.toFixed(3)).toBe("-3857.984");
    expect(b.toFixed(3)).toBe("2357.532");
  });

  it("Ex4 ln X x̂(-130)=4.861 Fix-3 TARGET-OFFICIAL-DOC", () => {
    const rows = rowsXY([
      ["20", "3150"],
      ["110", "7310"],
      ["200", "8800"],
      ["290", "9310"],
    ]);
    const model = fitRegression("ln X", expandStatRows("ln X", rows, false));
    const xhat = predictX("ln X", model, D(-130));
    expect(xhat.toFixed(3)).toBe("4.861");
    const viaCmd = evalStatCommand("stat-xhat", D(-130), "ln X", rows, false);
    expect(viaCmd.toFixed(3)).toBe("4.861");
  });

  it("Ex5 t(3)=-0.762 and P(t)=0.223 Fix-3 TARGET-OFFICIAL-DOC", () => {
    const rows = rows1Var([
      ["0", "1"],
      ["1", "2"],
      ["2", "1"],
      ["3", "2"],
      ["4", "2"],
      ["5", "2"],
      ["6", "3"],
      ["7", "4"],
      ["9", "2"],
      ["10", "1"],
    ]);
    const t = evalStatCommand("stat-t", D(3), "1-VAR", rows, true);
    expect(t.toFixed(3)).toBe("-0.762");
    const p = statP(t);
    expect(p.toFixed(3)).toBe("0.223");
    expect(evalStatCommand("stat-P", t, "1-VAR", rows, true).toFixed(3)).toBe("0.223");
  });

  it("FREQ ≤0 or non-integer is Argument ERROR (INFERRED)", () => {
    expect(() =>
      expandStatRows("1-VAR", [{ x: "1", y: null, freq: "0" }], true),
    ).toThrow(CalcArgumentError);
    expect(() =>
      expandStatRows("1-VAR", [{ x: "1", y: null, freq: "1.5" }], true),
    ).toThrow(CalcArgumentError);
    expect(() =>
      expandStatRows("1-VAR", [{ x: "1", y: null, freq: "-2" }], true),
    ).toThrow(CalcArgumentError);
  });

  it("n<2 sample sd is Math ERROR; n=0 mean is Math ERROR (INFERRED)", () => {
    expect(() => evalStatCommand("stat-meanX", null, "1-VAR", [], false)).toThrow(CalcMathError);
    expect(() =>
      evalStatCommand("stat-sampleSdX", null, "1-VAR", [{ x: "4", y: null, freq: null }], false),
    ).toThrow(CalcMathError);
    const one: StatPoint[] = [{ x: D(4), y: null, freq: D(1) }];
    const s = accumulateSums(one);
    expect(() => sampleSdFromSums(s.n, s.sumX, s.sumX2)).toThrow(CalcMathError);
  });

  it("quadratic through three points interpolates (A+Bx+Cx²)", () => {
    const rows = rowsXY([
      ["0", "1"],
      ["1", "2"],
      ["2", "5"],
    ]);
    const y0 = evalStatCommand("stat-yhat", D(0), "_+CX2", rows, false);
    const y1 = evalStatCommand("stat-yhat", D(1), "_+CX2", rows, false);
    const y2 = evalStatCommand("stat-yhat", D(2), "_+CX2", rows, false);
    expect(y0.toSignificantDigits(10).toString()).toBe("1");
    expect(y1.toSignificantDigits(10).toString()).toBe("2");
    expect(y2.toSignificantDigits(10).toString()).toBe("5");
  });

  it("ln X rejects x≤0 (INFERRED Math ERROR)", () => {
    expect(() =>
      evalStatCommand(
        "stat-A",
        null,
        "ln X",
        rowsXY([
          ["0", "1"],
          ["1", "2"],
          ["2", "3"],
        ]),
        false,
      ),
    ).toThrow(CalcMathError);
  });
});

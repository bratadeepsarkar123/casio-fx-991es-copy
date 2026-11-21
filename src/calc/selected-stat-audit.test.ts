import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState, StatType } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

function numKeys(value: string): KeyId[] {
  const result: KeyId[] = [];
  let rest = value;
  if (rest.startsWith("-")) {
    result.push("neg");
    rest = rest.slice(1);
  }
  for (const char of rest) {
    result.push((char === "." ? "dot" : char) as KeyId);
  }
  return result;
}

function enterValues(values: string[]): KeyId[] {
  return values.flatMap((value) => [...numKeys(value), "equals"]);
}

function statType(type: number, xs: string[], ys: string[]): CalcState {
  const typeKey = String(type) as KeyId;
  let state = run(["mode", "3", ...(type > 4 ? ["down" as KeyId] : []), typeKey]);
  state = run([...enterValues(xs), "down", "right", ...enterValues(ys), "ac"], state);
  return state;
}

function statResult(state: CalcState, menuDigit: KeyId): number {
  const result = run(["shift", "1", "5", menuDigit, "equals"], state).result;
  return Number(result?.approx);
}

function statEstimate(state: CalcState, x: string, selector: "5" | "6"): number {
  const result = run(["ac", ...numKeys(x), "shift", "1", "5", selector, "equals"], state).result;
  return Number(result?.approx);
}

function statInverseEstimate(state: CalcState, y: string, selector: "4" | "5"): number {
  const result = run(["ac", ...numKeys(y), "shift", "1", "5", selector, "equals"], state).result;
  return Number(result?.approx);
}

function statMenuValue(state: CalcState, category: "3" | "4" | "6", selector: string, secondPage = false): number {
  const keys: KeyId[] = ["shift", "1", category];
  if (secondPage) keys.push("down");
  keys.push(selector as KeyId, "equals");
  return Number(run(keys, state).result?.approx);
}

describe("selected manual E-22 through E-26 STAT type and result audit", () => {
  it("selects all seven paired regression formulas through the documented type keys", () => {
    const cases: Array<{ key: number; type: StatType; xs: string[]; ys: string[]; a: number; b: number; c?: number }> = [
      { key: 2, type: "A+BX", xs: ["1", "2", "4"], ys: ["3", "5", "9"], a: 1, b: 2 },
      { key: 3, type: "_+CX2", xs: ["0", "1", "2"], ys: ["2", "9", "24"], a: 2, b: 3, c: 4 },
      { key: 4, type: "ln X", xs: ["1", "2.71828182845905", "7.38905609893065"], ys: ["2", "5", "8"], a: 2, b: 3 },
      { key: 5, type: "e^X", xs: ["0", "1", "2"], ys: ["2", "4", "8"], a: 2, b: Math.LN2 },
      { key: 6, type: "A•B^X", xs: ["0", "1", "2"], ys: ["2", "6", "18"], a: 2, b: 3 },
      { key: 7, type: "A•X^B", xs: ["1", "2", "4"], ys: ["5", "20", "80"], a: 5, b: 2 },
      { key: 8, type: "1/X", xs: ["1", "2", "4"], ys: ["3", "2", "1.5"], a: 1, b: 2 },
    ];

    for (const example of cases) {
      const state = statType(example.key, example.xs, example.ys);
      expect(state.stat?.type, `type key ${example.key}`).toBe(example.type);
      expect(statResult(state, "1"), `${example.type} A`).toBeCloseTo(example.a, 5);
      expect(statResult(state, "2"), `${example.type} B`).toBeCloseTo(example.b, 5);
      if (example.c !== undefined) {
        expect(statResult(state, "3"), `${example.type} C`).toBeCloseTo(example.c, 5);
      }
      const yhatKey = example.type === "_+CX2" ? "6" : "5";
      expect(statEstimate(state, example.xs[0]!, yhatKey), `${example.type} y-hat`).toBeCloseTo(Number(example.ys[0]), 5);
      if (example.type === "_+CX2") {
        expect(statInverseEstimate(state, "9", "4"), "quadratic x-hat 1").toBeCloseTo(-1.75, 5);
        expect(statInverseEstimate(state, "9", "5"), "quadratic x-hat 2").toBeCloseTo(1, 5);
      } else {
        expect(statInverseEstimate(state, example.ys[1]!, "4"), `${example.type} x-hat`).toBeCloseTo(Number(example.xs[1]), 5);
      }
    }
  });

  it("matches the E-8 STAT estimated-value priority: 2 + yhat(160), not yhat(2 + 160)", () => {
    const state = statType(2, ["1", "2", "4"], ["3", "5", "9"]);
    const result = run(["ac", "2", "add", "1", "6", "0", "shift", "1", "5", "5", "equals"], state);
    expect(Number(result.result?.approx)).toBeCloseTo(323, 10);
  });

  it("matches the eight E-22 type keys' input shapes and documents each type as a distinct reducer case", () => {
    const single = run(["mode", "3", "1", ...enterValues(["1", "2", "3"])]);
    expect(single.stat?.type).toBe("1-VAR");
    expect(single.stat?.rows.slice(0, 3).map((row) => row.x)).toEqual(["1", "2", "3"]);
    for (const type of [2, 3, 4, 5, 6, 7, 8]) {
      const state = statType(type, ["1", "2", "3"], ["2", "4", "6"]);
      expect(state.stat?.phase, `paired type ${type}`).toBe("calc");
      expect(state.stat?.rows.slice(0, 3).map((row) => [row.x, row.y])).toEqual([
        ["1", "2"], ["2", "4"], ["3", "6"],
      ]);
    }
  });

  it("executes each E-23 Sum, Var and MinMax command through the STAT keys", () => {
    const paired = statType(2, ["1", "2", "3"], ["2", "4", "8"]);
    const sumCases: Array<[string, boolean, number]> = [
      ["1", false, 14], ["2", false, 6], ["3", false, 84], ["4", false, 14],
      ["5", true, 34], ["6", true, 36], ["7", true, 90], ["8", true, 98],
    ];
    for (const [selector, secondPage, expected] of sumCases) {
      expect(statMenuValue(paired, "3", selector, secondPage), `paired sum menu ${selector}`).toBe(expected);
    }

    const varCases: Array<[string, boolean, number]> = [
      ["1", false, 3], ["2", false, 2], ["3", false, Math.sqrt(2 / 3)], ["4", false, 1],
      ["5", true, 14 / 3], ["6", true, Math.sqrt(56 / 9)], ["7", true, Math.sqrt(28 / 3)],
    ];
    for (const [selector, secondPage, expected] of varCases) {
      expect(statMenuValue(paired, "4", selector, secondPage), `paired variance menu ${selector}`).toBeCloseTo(expected, 7);
    }
    expect(statMenuValue(paired, "6", "1")).toBe(1);
    expect(statMenuValue(paired, "6", "2")).toBe(3);
    expect(statMenuValue(paired, "6", "3")).toBe(2);
    expect(statMenuValue(paired, "6", "4")).toBe(8);

    const oneVar = run(["mode", "3", "1", ...enterValues(["1", "2", "3"]), "ac"]);
    expect(statMenuValue(oneVar, "3", "1")).toBe(14);
    expect(statMenuValue(oneVar, "3", "2")).toBe(6);
    expect(statMenuValue(oneVar, "4", "1")).toBe(3);
    expect(statMenuValue(oneVar, "4", "2")).toBe(2);
    expect(statMenuValue(oneVar, "4", "3")).toBeCloseTo(Math.sqrt(2 / 3), 7);
    expect(statMenuValue(oneVar, "4", "4")).toBe(1);
    expect(statMenuValue(oneVar, "6", "1")).toBe(1);
    expect(statMenuValue(oneVar, "6", "2")).toBe(3);
  });

  it("uses the E-25 P/Q/R areas and executes their public STAT menu paths", () => {
    const oneVar = run(["mode", "3", "1", ...enterValues(["1", "2", "3"]), "ac"]);
    const valueAtZero = (selector: "1" | "2" | "3") => Number(run([
      "shift", "1", "5", selector, "0", "rparen", "equals",
    ], oneVar).result?.approx);
    expect(valueAtZero("1")).toBeCloseTo(0.5, 10); // cumulative area to t=0
    expect(valueAtZero("2")).toBeCloseTo(0, 10); // area between 0 and t
    expect(valueAtZero("3")).toBeCloseTo(0.5, 10); // upper tail from t=0
  });

  it("matches the independently known positive-t distribution values through the printed keys", () => {
    const oneVar = run(["mode", "3", "1", ...enterValues(["0"]), "ac"]);
    const valueAtOne = (selector: "1" | "2" | "3") => Number(run([
      "shift", "1", "5", selector, "1", "rparen", "equals",
    ], oneVar).result?.approx);
    expect(valueAtOne("1")).toBeCloseTo(0.841344746, 9); // P(1) = Î¦(1)
    expect(valueAtOne("2")).toBeCloseTo(0.341344746, 9); // Q(1), area 0..1
    expect(valueAtOne("3")).toBeCloseTo(0.158655254, 9); // R(1), upper tail
  });

  it("covers STAT row insertion/deletion, setup retention, and the documented capacity guard", () => {
    let state = run(["mode", "3", "2", ...enterValues(["1", "2", "3"])]);
    // STAT > Edit > Ins at the second X row inserts a blank paired row.
    state = run(["up", "up", "shift", "1", "3", "1"], state);
    expect(state.stat?.rows.slice(0, 5).map((row) => [row.x, row.y])).toEqual([
      ["1", null], [null, null], ["2", null], ["3", null], [null, null],
    ]);
    // DEL removes the selected editor line; the remaining data shifts up.
    state = run(["del"], state);
    expect(state.stat?.rows.slice(0, 4).map((row) => row.x)).toEqual(["1", "2", "3", null]);
    // An unrelated setup change retains the STAT data; changing FREQ intentionally wipes it.
    state = run(["shift", "mode", "3"], state);
    expect(state.setup.angleUnit).toBe("Deg");
    expect(state.stat?.rows.slice(0, 3).map((row) => row.x)).toEqual(["1", "2", "3"]);
    state = run(["shift", "mode", "down", "4", "1"], state);
    expect(state.setup.statFreq).toBe(true);
    expect(state.stat?.rows).toEqual([{ x: null, y: null, freq: null }]);

    const fill = Array.from({ length: 26 }, (_, index) => [...numKeys(String(index + 1)), "equals"] as KeyId[]).flat();
    state = run(["shift", "mode", "down", "4", "1", "mode", "3", "2", ...fill]);
    state = run(["shift", "1", "3", "1"], state);
    expect(state.screen.kind).toBe("error");
    expect(state.screen.kind === "error" ? state.screen.code : "").toBe("Insufficient MEM Error");
  });

  it("keeps prohibited editor operations out of the dataset while allowing numeric expressions", () => {
    const state = run([
      "mode", "3", "2", "mplus", "shift", "mplus", "shift", "rcl",
      "shift", "add", "shift", "sub", "alpha", "integral", "sin", "2", "equals",
    ]);
    expect(state.stat?.rows[0]?.x).toBe("2");
    expect(state.stat?.rows[0]?.y).toBeNull();
    expect(state.editor.root).toEqual([]);
    expect(state.variables.A).toBe("0");
  });
});

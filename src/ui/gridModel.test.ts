import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import type { KeyId } from "../calc/keys.ts";
import type { CalcState } from "../calc/types.ts";
import { effectiveDisplayFormat } from "../calc/format.ts";
import { lcdExpression, lcdIndicators } from "./lcdModel.ts";
import { lcdGridModel } from "./gridModel.ts";

function run(keys: KeyId[], state: CalcState = createInitialState(0)): CalcState {
  return dispatchKeys(state, keys, 0);
}

const ENTER_MATA_22: KeyId[] = [
  "mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac",
];
const ENTER_MATB_22: KeyId[] = [
  "shift", "4", "2", "2", "5", "2", "equals", "neg", "1", "equals", "neg", "1", "equals", "2", "equals", "ac",
];
const ENTER_VCTA_2D: KeyId[] = ["mode", "8", "1", "2", "1", "equals", "1", "equals", "2", "equals", "ac"];
const ENTER_VCTB_2D: KeyId[] = ["shift", "5", "2", "2", "2", "3", "equals", "4", "equals", "ac"];

describe("LCD mode grids", () => {
  it("uses effective Linear in STAT/BASE-N/MATRIX/VECTOR while EQN/TABLE keep the preference", () => {
    for (const mode of ["STAT", "BASE-N", "MATRIX", "VECTOR"] as const) {
      expect(effectiveDisplayFormat(mode, "MthIO-MathO")).toBe("LineIO");
    }
    expect(effectiveDisplayFormat("EQN", "MthIO-MathO")).toBe("MthIO-MathO");
    expect(effectiveDisplayFormat("TABLE", "MthIO-MathO")).toBe("MthIO-MathO");

    const matrix = run(["mode", "6"]);
    expect(lcdIndicators(matrix).math).toBe(false);
    expect(lcdIndicators(matrix).mode).toBe("MAT");
    expect(lcdIndicators(run(["mode", "3"])).math).toBe(false);
    expect(lcdIndicators(run(["mode", "8"])).math).toBe(false);
    const table = run(["mode", "7"]);
    expect(lcdIndicators(table).math).toBe(true);
    expect(lcdIndicators(table).mode).toBeNull();
    const equation = run(["mode", "5"]);
    expect(lcdIndicators(equation).mode).toBeNull();
    const baseN = run(["mode", "4"]);
    expect(lcdIndicators(baseN).mode).toBeNull();
    expect(lcdIndicators(baseN).baseN).toBe("DEC");
  });

  it("shows STAT row labels, FREQ, and the active typed value", () => {
    const initial = createInitialState(0);
    const withFreq = { ...initial, setup: { ...initial.setup, statFreq: true } };
    const state = run(["mode", "3", "1", "7"], withFreq);
    const grid = lcdGridModel(state);

    expect(grid?.kind).toBe("stat");
    expect(grid?.headers).toEqual(["X", "FREQ"]);
    expect(grid?.rows[0]?.label).toBe("1");
    expect(grid?.rows[0]?.cells[0]).toMatchObject({ value: "7", selected: true });
    expect(grid?.selectedValue).toBe("7");
  });

  it("shows shared EQN coefficient headers, equation row numbers, and the active three-column window", () => {
    const state = run(["mode", "5", "4", "equals", "equals", "equals"]);
    const grid = lcdGridModel(state);

    expect(grid?.kind).toBe("eqn");
    expect(grid?.headers).toEqual(["b", "c", "d"]);
    expect(grid?.rows).toHaveLength(1);
    expect(grid?.rows[0]?.label).toBe("1");
    expect(grid?.rows[0]?.cells.map((cell) => cell.selected)).toEqual([false, false, true]);
    expect(grid?.bracketed).toBe(true);
  });

  it("shows bracketed MatAns cells with the selected value below", () => {
    const state = run([
      ...ENTER_MATA_22.slice(0, -1),
      ...ENTER_MATB_22,
      "shift", "4", "3", "mul", "shift", "4", "4", "equals",
    ]);
    const grid = lcdGridModel(state);

    expect(grid?.kind).toBe("matrix");
    expect(grid?.title).toBe("Ans");
    expect(grid?.rows.map((row) => row.cells.map((cell) => cell.value))).toEqual([
      ["3", "0"],
      ["1", "1"],
    ]);
    expect(grid?.selectedValue).toBe("3");
    expect(grid?.rows[0]?.cells[0]?.selected).toBe(true);
    expect(grid?.bracketed).toBe(true);
  });

  it("shows VctAns horizontally with the selected value repeated below", () => {
    const state = run([
      ...ENTER_VCTA_2D.slice(0, -1),
      ...ENTER_VCTB_2D,
      "shift", "5", "3", "add", "shift", "5", "4", "equals",
    ]);
    const grid = lcdGridModel(state);

    expect(grid?.kind).toBe("vector");
    expect(grid?.title).toBe("Ans");
    expect(grid?.rows[0]?.cells.map((cell) => cell.value)).toEqual(["4", "6"]);
    expect(grid?.selectedValue).toBe("4");
    expect(grid?.bracketed).toBe(true);
  });

  it("shows the E-33 table rows and moves selection across cells and rows", () => {
    let state = run([
      "mode", "7", "alpha", "rparen", "square", "add", "1", "frac", "2", "equals",
      "neg", "1", "equals", "1", "equals", "0", "dot", "5", "equals",
    ]);
    let grid = lcdGridModel(state);

    expect(state.table?.rows.map((row) => [row.xDisplay, row.fxDisplay])).toEqual([
      ["-1", "1.5"],
      ["-0.5", "0.75"],
      ["0", "0.5"],
      ["0.5", "0.75"],
      ["1", "1.5"],
    ]);
    expect(grid?.kind).toBe("table");
    expect(grid?.headers).toEqual(["X", "F(X)"]);
    expect(grid?.rows.map((row) => row.label)).toEqual(["1", "2", "3"]);
    expect(grid?.rows[0]?.cells.map((cell) => cell.selected)).toEqual([true, false]);
    expect(grid?.selectedValue).toBe("-1");

    state = run(["right", "down"], state);
    grid = lcdGridModel(state, state.table?.col ?? "x");
    expect(state.table?.rowIndex).toBe(1);
    expect(state.table?.col).toBe("fx");
    expect(grid?.rows[1]?.cells.map((cell) => cell.selected)).toEqual([false, true]);
    expect(grid?.selectedValue).toBe("0.75");
  });

  it("shows the suggested TABLE start and replaces it with first typed input", () => {
    let state = run(["mode", "7", "alpha", "rparen", "square", "equals"]);
    expect(state.table?.phase).toBe("start");
    expect(lcdExpression(state)).toBe("1");

    state = run(["3", "equals"], state);
    expect(state.table?.startAtoms).toMatchObject([{ t: "num", s: "3" }]);
    expect(state.table?.phase).toBe("end");
    expect(lcdExpression(state)).toBe("5");
  });
});

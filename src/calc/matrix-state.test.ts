import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import { matrixToDecGrid } from "./matrixNumeric.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState, MatrixValue } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

function grid(m: MatrixValue | null | undefined): string[][] | null {
  return m ? matrixToDecGrid(m) : null;
}

const ENTER_MATA_22: KeyId[] = [
  "mode",
  "6",
  "1",
  "5",
  "2",
  "equals",
  "1",
  "equals",
  "1",
  "equals",
  "1",
  "equals",
  "ac",
];

const ENTER_MATB_22: KeyId[] = [
  "shift",
  "4",
  "1",
  "2",
  "5",
  "2",
  "equals",
  "1",
  "equals",
  "1",
  "equals",
  "2",
  "equals",
  "ac",
];

describe("MATRIX reducer / session", () => {
  it("MODE 6 enters MATRIX dim-reg without changing Ans", () => {
    const prior = run(["9", "equals"]);
    const s = run(["mode", "6"], prior);
    expect(s.mode).toBe("MATRIX");
    expect(s.matrix?.phase).toBe("dim-reg");
    expect(lcdExpression(s)).toBe("MATRIX");
    expect(lcdResult(s)).toContain("MatA");
    expect(s.ans).toMatch(/^9/);
    expect(s.variables.X).toBe(prior.variables.X);
  });

  it("Dim MatA 2×2 then cells store [[2,1],[1,1]] TARGET-OFFICIAL-DOC Ex1", () => {
    const s = run(ENTER_MATA_22);
    expect(s.matrix?.phase).toBe("calc");
    expect(grid(s.matrix?.registers.A)).toEqual([
      ["2", "1"],
      ["1", "1"],
    ]);
  });

  it("Ex1 MatA×MatB MatAns [[5,4],[3,3]] TARGET-OFFICIAL-DOC", () => {
    const s = run([
      ...ENTER_MATA_22,
      ...ENTER_MATB_22,
      "shift",
      "4",
      "3",
      "mul",
      "shift",
      "4",
      "4",
      "equals",
    ]);
    expect(s.matrix?.phase).toBe("matans");
    expect(grid(s.matrix?.registers.Ans)).toEqual([
      ["5", "4"],
      ["3", "3"],
    ]);
    expect(lcdExpression(s)).toBe("Ans11=");
    expect(lcdResult(s)).toBe("5");
    const right = dispatchKeys(s, ["right"], 0);
    expect(lcdExpression(right)).toBe("Ans12=");
    expect(lcdResult(right)).toBe("4");
  });

  it("Ex1 MatA+MatB TARGET-OFFICIAL-DOC", () => {
    const s = run([
      ...ENTER_MATA_22,
      ...ENTER_MATB_22,
      "shift",
      "4",
      "3",
      "add",
      "shift",
      "4",
      "4",
      "equals",
    ]);
    expect(grid(s.matrix?.registers.Ans)).toEqual([
      ["4", "2"],
      ["2", "3"],
    ]);
  });

  it("Ex3 3×MatA TARGET-OFFICIAL-DOC", () => {
    const s = run([...ENTER_MATA_22, "3", "mul", "shift", "4", "3", "equals"]);
    expect(grid(s.matrix?.registers.Ans)).toEqual([
      ["6", "3"],
      ["3", "3"],
    ]);
  });

  it("Ex4 det(MatA)=1 scalar TARGET-OFFICIAL-DOC", () => {
    const s = run([...ENTER_MATA_22, "shift", "4", "7", "shift", "4", "3", "equals"]);
    expect(s.matrix?.phase).toBe("calc");
    expect(s.screen.kind).toBe("result");
    expect(lcdResult(s)).toBe("1");
    expect(s.ans).toMatch(/^1/);
  });

  it("Ex5 Trn(MatC) TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "6",
      "3",
      "6",
      "1",
      "equals",
      "0",
      "equals",
      "1",
      "equals",
      "0",
      "equals",
      "1",
      "equals",
      "1",
      "equals",
      "ac",
      "shift",
      "4",
      "8",
      "shift",
      "4",
      "5",
      "equals",
    ]);
    expect(grid(s.matrix?.registers.C)).toEqual([
      ["1", "0", "1"],
      ["0", "1", "1"],
    ]);
    expect(grid(s.matrix?.registers.Ans)).toEqual([
      ["1", "0"],
      ["0", "1"],
      ["1", "1"],
    ]);
  });

  it("Ex6 MatA inverse TARGET-OFFICIAL-DOC", () => {
    const s = run([...ENTER_MATA_22, "shift", "4", "3", "xinv", "equals"]);
    expect(grid(s.matrix?.registers.Ans)).toEqual([
      ["1", "-1"],
      ["-1", "2"],
    ]);
  });

  it("Ex8 MatA square and cube TARGET-OFFICIAL-DOC", () => {
    const sq = run([...ENTER_MATA_22, "shift", "4", "3", "square", "equals"]);
    expect(grid(sq.matrix?.registers.Ans)).toEqual([
      ["5", "3"],
      ["3", "2"],
    ]);
    const cu = run([...ENTER_MATA_22, "shift", "4", "3", "shift", "square", "equals"]);
    expect(grid(cu.matrix?.registers.Ans)).toEqual([
      ["13", "8"],
      ["8", "5"],
    ]);
  });

  it("using MatA before Dim is Dimension ERROR TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "6", "ac", "shift", "4", "3", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Dimension ERROR");
    }
  });

  it("incompatible multiply is Dimension ERROR TARGET-OFFICIAL-DOC", () => {
    const s = run([
      ...ENTER_MATA_22,
      "shift",
      "4",
      "1",
      "3",
      "6",
      "1",
      "equals",
      "0",
      "equals",
      "1",
      "equals",
      "0",
      "equals",
      "1",
      "equals",
      "1",
      "equals",
      "ac",
      "shift",
      "4",
      "5",
      "mul",
      "shift",
      "4",
      "3",
      "equals",
    ]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Dimension ERROR");
    }
  });

  it("singular inverse is Math ERROR INFERRED", () => {
    const s = run([
      "mode",
      "6",
      "1",
      "5",
      "1",
      "equals",
      "2",
      "equals",
      "2",
      "equals",
      "4",
      "equals",
      "ac",
      "shift",
      "4",
      "3",
      "xinv",
      "equals",
    ]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Math ERROR");
    }
  });

  it("AC keeps registers; CLR Memory wipes them INFERRED", () => {
    let s = run(ENTER_MATA_22);
    expect(grid(s.matrix?.registers.A)).not.toBeNull();
    s = dispatchKeys(s, ["ac"], 0);
    expect(grid(s.matrix?.registers.A)).toEqual([
      ["2", "1"],
      ["1", "1"],
    ]);
    s = dispatchKeys(s, ["shift", "9", "2", "equals"], 0);
    expect(s.matrix?.registers.A).toBeNull();
    expect(s.matrix?.phase).toBe("dim-reg");
  });

  it("leaving MATRIX for COMP wipes the session and does not rewrite COMP arithmetic", () => {
    const s = run([...ENTER_MATA_22, "mode", "1", "2", "add", "3", "equals"]);
    expect(s.mode).toBe("COMP");
    expect(s.matrix).toBeNull();
    expect(lcdResult(s)).toBe("5");
  });

  it("does not contaminate TABLE / BASE-N / CMPLX / STAT / EQN entry", () => {
    expect(run(["mode", "7"]).mode).toBe("TABLE");
    expect(run(["mode", "4"]).mode).toBe("BASE-N");
    expect(run(["mode", "2"]).mode).toBe("CMPLX");
    expect(run(["mode", "3"]).mode).toBe("STAT");
    expect(run(["mode", "5"]).mode).toBe("EQN");
    const after = run([...ENTER_MATA_22, "mode", "5"]);
    expect(after.mode).toBe("EQN");
    expect(after.matrix).toBeNull();
    expect(after.eqn?.phase).toBe("type");
  });

  it("1×1 through 3×3 dim keys are accepted; 4×4 is not offered", () => {
    const one = run(["mode", "6", "1", "1"]);
    expect(one.matrix?.registers.A?.rows).toBe(1);
    expect(one.matrix?.registers.A?.cols).toBe(1);
    const max = run(["mode", "6", "1", "9"]);
    expect(max.matrix?.registers.A?.rows).toBe(3);
    expect(max.matrix?.registers.A?.cols).toBe(3);
  });

  it("copy MatAns to MatC via STO INFERRED/TARGET-OFFICIAL-DOC copy", () => {
    let s = run([...ENTER_MATA_22, "3", "mul", "shift", "4", "3", "equals"]);
    expect(s.matrix?.phase).toBe("matans");
    s = dispatchKeys(s, ["shift", "rcl", "3"], 0);
    expect(grid(s.matrix?.registers.C)).toEqual([
      ["6", "3"],
      ["3", "3"],
    ]);
    expect(s.matrix?.phase).toBe("calc");
  });
});

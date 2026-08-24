import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import { vectorToDecCells } from "./vectorNumeric.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState, VectorValue } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

function cells(v: VectorValue | null | undefined): string[] | null {
  return v ? vectorToDecCells(v) : null;
}

const ENTER_VCTA_2D: KeyId[] = ["mode", "8", "1", "2", "1", "equals", "2", "equals", "ac"];

const ENTER_VCTB_2D: KeyId[] = ["shift", "5", "1", "2", "2", "3", "equals", "4", "equals", "ac"];

const ENTER_VCTC_3D: KeyId[] = [
  "shift",
  "5",
  "1",
  "3",
  "3",
  "2",
  "equals",
  "neg",
  "1",
  "equals",
  "2",
  "equals",
  "ac",
];

describe("VECTOR reducer / session", () => {
  it("MODE 8 enters VECTOR dim-reg without changing Ans", () => {
    const prior = run(["9", "equals"]);
    const s = run(["mode", "8"], prior);
    expect(s.mode).toBe("VECTOR");
    expect(s.vector?.phase).toBe("dim-reg");
    expect(lcdExpression(s)).toBe("VECTOR");
    expect(lcdResult(s)).toContain("VctA");
    expect(s.ans).toMatch(/^9/);
    expect(s.variables.X).toBe(prior.variables.X);
    expect(s.matrix).toBeNull();
  });

  it("Dim VctA 2D then cells store (1, 2) TARGET-OFFICIAL-DOC Ex1", () => {
    const s = run(ENTER_VCTA_2D);
    expect(s.vector?.phase).toBe("calc");
    expect(cells(s.vector?.registers.A)).toEqual(["1", "2"]);
  });

  it("key 1 is not a 2D shortcut TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "8", "1", "1"]);
    expect(s.vector?.phase).toBe("dim-size");
    expect(s.vector?.registers.A).toBeNull();
  });

  it("Ex1 VctA+VctB VctAns (4, 6) TARGET-OFFICIAL-DOC", () => {
    const s = run([
      ...ENTER_VCTA_2D,
      ...ENTER_VCTB_2D,
      "shift",
      "5",
      "3",
      "add",
      "shift",
      "5",
      "4",
      "equals",
    ]);
    expect(s.vector?.phase).toBe("vctans");
    expect(cells(s.vector?.registers.Ans)).toEqual(["4", "6"]);
    expect(lcdExpression(s)).toBe("Ans1=");
    expect(lcdResult(s)).toBe("4");
    const right = dispatchKeys(s, ["right"], 0);
    expect(lcdExpression(right)).toBe("Ans2=");
    expect(lcdResult(right)).toBe("6");
  });

  it("Ex3 3×VctA then VctAns−VctB TARGET-OFFICIAL-DOC", () => {
    const scaled = run([...ENTER_VCTA_2D, ...ENTER_VCTB_2D, "3", "mul", "shift", "5", "3", "equals"]);
    expect(cells(scaled.vector?.registers.Ans)).toEqual(["3", "6"]);
    const next = dispatchKeys(scaled, ["sub", "shift", "5", "4", "equals"], 0);
    expect(cells(next.vector?.registers.Ans)).toEqual(["0", "2"]);
  });

  it("Ex4 VctA Dot VctB = 11 scalar TARGET-OFFICIAL-DOC", () => {
    const s = run([
      ...ENTER_VCTA_2D,
      ...ENTER_VCTB_2D,
      "shift",
      "5",
      "3",
      "shift",
      "5",
      "7",
      "shift",
      "5",
      "4",
      "equals",
    ]);
    expect(s.vector?.phase).toBe("calc");
    expect(s.screen.kind).toBe("result");
    expect(lcdResult(s)).toBe("11");
    expect(s.ans).toMatch(/^11/);
  });

  it("Ex5 2D cross INFERRED (0, 0, -2) NHR vs hardware", () => {
    const s = run([
      ...ENTER_VCTA_2D,
      ...ENTER_VCTB_2D,
      "shift",
      "5",
      "3",
      "mul",
      "shift",
      "5",
      "4",
      "equals",
    ]);
    expect(cells(s.vector?.registers.Ans)).toEqual(["0", "0", "-2"]);
    expect(lcdExpression(s)).toBe("Ans1=");
    expect(lcdResult(s)).toBe("0");
  });

  it("Ex6 Abs(VctC)=3 TARGET-OFFICIAL-DOC", () => {
    const s = run([...ENTER_VCTA_2D, ...ENTER_VCTC_3D, "shift", "hyp", "shift", "5", "5", "equals"]);
    expect(lcdResult(s)).toBe("3");
    expect(s.vector?.phase).toBe("calc");
  });

  it("Ex7 angle formula Fix 3 Deg ≈ 10.305 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "shift",
      "mode",
      "6",
      "3",
      ...ENTER_VCTA_2D,
      ...ENTER_VCTB_2D,
      "shift",
      "cos",
      "shift",
      "5",
      "3",
      "shift",
      "5",
      "7",
      "shift",
      "5",
      "4",
      "div",
      "lparen",
      "shift",
      "hyp",
      "shift",
      "5",
      "3",
      "rparen",
      "mul",
      "shift",
      "hyp",
      "shift",
      "5",
      "4",
      "rparen",
      "rparen",
      "equals",
    ]);
    expect(s.setup.numberFormat).toEqual({ kind: "Fix", n: 3 });
    expect(lcdResult(s)).toBe("10.305");
  });

  it("using VctA before Dim is Dimension ERROR TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "8", "ac", "shift", "5", "3", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Dimension ERROR");
    }
  });

  it("2D+3D is Dimension ERROR TARGET-OFFICIAL-DOC", () => {
    const s = run([
      ...ENTER_VCTA_2D,
      ...ENTER_VCTC_3D,
      "shift",
      "5",
      "3",
      "add",
      "shift",
      "5",
      "5",
      "equals",
    ]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Dimension ERROR");
    }
  });

  it("complex component is Math ERROR INFERRED", () => {
    const s = run(["mode", "8", "1", "2", "alpha", "eng", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Math ERROR");
    }
  });

  it("AC keeps registers; CLR Memory wipes them INFERRED", () => {
    let s = run(ENTER_VCTA_2D);
    expect(cells(s.vector?.registers.A)).not.toBeNull();
    s = dispatchKeys(s, ["ac"], 0);
    expect(cells(s.vector?.registers.A)).toEqual(["1", "2"]);
    s = dispatchKeys(s, ["shift", "9", "2", "equals"], 0);
    expect(s.vector?.registers.A).toBeNull();
    expect(s.vector?.phase).toBe("dim-reg");
  });

  it("leaving VECTOR for COMP wipes the session and does not rewrite COMP arithmetic", () => {
    const s = run([...ENTER_VCTA_2D, "mode", "1", "2", "add", "3", "equals"]);
    expect(s.mode).toBe("COMP");
    expect(s.vector).toBeNull();
    expect(lcdResult(s)).toBe("5");
  });

  it("does not contaminate TABLE / BASE-N / CMPLX / STAT / EQN / MATRIX entry", () => {
    expect(run(["mode", "7"]).mode).toBe("TABLE");
    expect(run(["mode", "4"]).mode).toBe("BASE-N");
    expect(run(["mode", "2"]).mode).toBe("CMPLX");
    expect(run(["mode", "3"]).mode).toBe("STAT");
    expect(run(["mode", "5"]).mode).toBe("EQN");
    expect(run(["mode", "6"]).mode).toBe("MATRIX");
    const after = run([...ENTER_VCTA_2D, "mode", "6"]);
    expect(after.mode).toBe("MATRIX");
    expect(after.vector).toBeNull();
    expect(after.matrix?.phase).toBe("dim-reg");
  });

  it("copy VctAns to VctC via STO TARGET-OFFICIAL-DOC copy", () => {
    let s = run([...ENTER_VCTA_2D, "3", "mul", "shift", "5", "3", "equals"]);
    expect(s.vector?.phase).toBe("vctans");
    s = dispatchKeys(s, ["shift", "rcl", "3"], 0);
    expect(cells(s.vector?.registers.C)).toEqual(["3", "6"]);
    expect(s.vector?.phase).toBe("calc");
  });
});

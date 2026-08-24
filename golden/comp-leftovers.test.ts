import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdExpression, lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";
import type { CalcState } from "../src/calc/types.ts";

function run(keys: KeyId[], setup?: (s: CalcState) => CalcState): CalcState {
  let s = createInitialState(0);
  if (setup) {
    s = setup(s);
  }
  return dispatchKeys(s, keys, 0);
}

function lineIo(s: CalcState): CalcState {
  return { ...s, setup: { ...s.setup, displayFormat: "LineIO" } };
}

describe("COMP leftovers (CROSS-MODEL-SOURCE)", () => {
  it("GT-P25-POL Pol(√2,√2) Deg stores r=2 θ=45 in X,Y SRC-P43–44", () => {
    const s = run(["shift", "add", "sqrt", "2", "shift", "rparen", "sqrt", "2", "equals"]);
    expect(lcdResult(s)).toMatch(/r=2/);
    expect(lcdResult(s)).toMatch(/θ=45/);
    expect(s.variables.X).toMatch(/^2/);
    expect(s.variables.Y).toMatch(/^45/);
    expect(s.ans).toMatch(/^2/);
  });

  it("GT-P25-REC Rec(√2,45°) Deg stores X=1 Y=1 SRC-P43–44", () => {
    const s = run(["shift", "sub", "sqrt", "2", "shift", "rparen", "4", "5", "equals"]);
    expect(s.variables.X).toMatch(/^1/);
    expect(s.variables.Y).toMatch(/^1/);
    expect(lcdResult(s)).toMatch(/X=1/);
  });

  it("GT-P25-DIVR 5 ÷R 2 = 2 R 1; Ans is the quotient SRC-P25", () => {
    const s = run(["5", "alpha", "div", "2", "equals"]);
    expect(lcdExpression(s)).toContain("÷R");
    expect(lcdResult(s)).toBe("2 R 1");
    expect(s.ans).toBe("2");
    expect(s.result?.remainder).toEqual({ quot: "2", rem: "1" });
  });

  it("GT-P25-DIVR S⇔D is disabled on a remainder result SRC-P25", () => {
    const s = run(["5", "alpha", "div", "2", "equals", "sd"]);
    expect(lcdResult(s)).toBe("2 R 1");
  });

  it("GT-P24-ENG 1234 ENG then ENG again SRC-P24–25", () => {
    const first = run(["1", "2", "3", "4", "equals", "eng"]);
    expect(lcdResult(first)).toMatch(/1\.234×10\+03/);
    expect(first.ans).toBe("1234");
    const second = dispatchKeys(first, ["eng"], 0);
    expect(lcdResult(second)).toMatch(/1234×10\+00/);
  });

  it("GT-P24-ENG SHIFT ENG on 123 shifts the decimal left SRC-P24–25", () => {
    const s = run(["1", "2", "3", "equals", "shift", "eng"]);
    expect(lcdResult(s)).toMatch(/0\.123×10\+03/);
    expect(s.ans).toBe("123");
  });

  it("GT-P23-DMS 2°15′18″ toggles to 2.255 SRC-P23–24", () => {
    const s = run(["2", "dms", "1", "5", "dms", "1", "8", "equals"]);
    expect(lcdExpression(s)).toMatch(/2°15′18″/);
    expect(lcdResult(s)).toMatch(/^2\.255/);
    const sex = dispatchKeys(s, ["dms"], 0);
    expect(lcdResult(sex)).toBe("2°15′18″");
    const back = dispatchKeys(sex, ["dms"], 0);
    expect(lcdResult(back)).toMatch(/^2\.255/);
  });

  it("GT-P23-DMS 2°20′30″ + 0°39′30″ = 3 SRC-P23–24", () => {
    const s = run([
      "2",
      "dms",
      "2",
      "0",
      "dms",
      "3",
      "0",
      "add",
      "0",
      "dms",
      "3",
      "9",
      "dms",
      "3",
      "0",
      "equals",
    ]);
    expect(lcdResult(s)).toMatch(/^3/);
  });

  it("GT-P48-GCD GCD(28,35)=7 SRC-P46–47 INFERRED menu ALPHA 0", () => {
    const s = run(["alpha", "0", "1", "2", "8", "shift", "rparen", "3", "5", "equals"]);
    expect(lcdResult(s)).toBe("7");
  });

  it("GT-P48-LCM LCM(9,15)=45 SRC-P46–47", () => {
    const s = run(["alpha", "0", "2", "9", "shift", "rparen", "1", "5", "equals"]);
    expect(lcdResult(s)).toBe("45");
  });

  it("GT-P48-INT Int(-3.5)=-3 SRC-P46–47", () => {
    const s = run(["alpha", "0", "3", "neg", "3", "dot", "5", "equals"]);
    expect(lcdResult(s)).toBe("-3");
  });

  it("GT-P48-INTG Intg(-3.5)=-4 SRC-P46–47", () => {
    const s = run(["alpha", "0", "4", "neg", "3", "dot", "5", "equals"]);
    expect(lcdResult(s)).toBe("-4");
  });

  it("÷R / Pol paths still work in LineIO", () => {
    const s = run(["5", "alpha", "div", "2", "equals"], lineIo);
    expect(lcdResult(s)).toBe("2 R 1");
  });
});

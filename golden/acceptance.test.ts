import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdExpression, lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";
import type { CalcState } from "../src/calc/types.ts";

// SRC-P* citations are CROSS-MODEL-SOURCE (fx-115ES PLUS / fx-991ES PLUS C PDF).
// A passing golden does not promote that behavior to TARGET-MANUAL.

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

describe("canonical acceptance (manual-derived)", () => {
  it("GT-P18-EX1 basic arithmetic with sin and implied grouping SRC-P18", () => {
    const s = run(
      ["4", "mul", "sin", "3", "0", "rparen", "mul", "lparen", "3", "0", "add", "1", "0", "mul", "3", "rparen", "equals"],
      lineIo,
    );
    expect(lcdResult(s)).toBe("120");
  });

  it("GT-P21-EX1 pi/6 fraction and S⇔D SRC-P21", () => {
    const s = run(["shift", "exp10", "div", "6", "equals"]);
    expect(s.result?.naturalKind === "pi" || lcdResult(s).includes("π")).toBe(true);
    const toggled = dispatchKeys(s, ["sd"], 0);
    expect(toggled.result?.display.replace(/×10.*/, "")).toMatch(/0\.5235987756|0\.523598775/);
  });

  it("GT-P22-EX1 fraction 2/3+1/2=7/6 SRC-P22", () => {
    const s = run(["2", "frac", "3", "right", "add", "1", "frac", "2", "equals"]);
    expect(lcdResult(s).replace(/\s/g, "")).toMatch(/7\/6/);
  });

  it("GT-P21-EX3 LineIO 1÷5 = 0.2 SRC-P21", () => {
    const s = run(["1", "div", "5", "equals"], lineIo);
    expect(lcdResult(s)).toBe("0.2");
    const frac = dispatchKeys(s, ["sd"], 0);
    expect(lcdResult(frac)).toMatch(/1\/5/);
  });

  it("GT-P23-EX1 percent 150×20% = 30 SRC-P23", () => {
    const s = run(["1", "5", "0", "mul", "2", "0", "shift", "lparen", "equals"], lineIo);
    expect(lcdResult(s)).toBe("30");
  });

  it("GT-P36-EX1 sin 30° = 0.5 SRC-P36", () => {
    const s = run(["sin", "3", "0", "equals"], lineIo);
    expect(lcdResult(s)).toMatch(/^0\.5/);
  });

  it("GT-P36-EX2 sin⁻¹ 0.5 = 30 SRC-P36", () => {
    const s = run(["shift", "sin", "0", "dot", "5", "equals"], lineIo);
    expect(lcdResult(s)).toMatch(/^30/);
  });

  it("GT-P37-EX1 log 1000 = 3 SRC-P37", () => {
    const s = run(["log", "1", "0", "0", "0", "equals"]);
    expect(lcdResult(s)).toBe("3");
  });

  it("GT-P38-EX1 1.2×10^3 = 1200 SRC-P38", () => {
    const s = run(["1", "dot", "2", "mul", "1", "0", "power", "3", "equals"]);
    expect(lcdResult(s)).toBe("1200");
  });

  it("GT-P38-EX2 (1+1)^(2+2) = 16 SRC-P38", () => {
    const s = run(["lparen", "1", "add", "1", "rparen", "power", "2", "add", "2", "equals"]);
    expect(lcdResult(s)).toBe("16");
  });

  it("GT-P38-EX3 (5²)³ = 15625 SRC-P38", () => {
    const s = run(["5", "square", "shift", "square", "equals"]);
    expect(lcdResult(s)).toBe("15625");
  });

  it("GT-P32 replay 4×3+2 then edit to -7 SRC-P32", () => {
    const s = run(["4", "mul", "3", "add", "2", "equals"]);
    expect(lcdResult(s)).toBe("14");
    const edited = dispatchKeys(s, ["left", "del", "del", "sub", "7", "equals"], 0);
    expect(lcdResult(edited)).toBe("5");
  });

  it("GT-P32 Ans 3×4 then ÷30 SRC-P32", () => {
    const s = run(["3", "mul", "4", "equals"], lineIo);
    expect(lcdResult(s)).toBe("12");
    const next = dispatchKeys(s, ["div", "3", "0", "equals"], 0);
    expect(lcdResult(next)).toMatch(/^0\.4/);
  });

  it("GT-P33 PreAns Fibonacci via ALPHA Ans (clone entry; target key unverified)", () => {
    let s = run(["1", "equals"]);
    s = dispatchKeys(s, ["1", "equals"], 0);
    expect(s.ans).toMatch(/^1/);
    expect(s.preAns).toMatch(/^1/);
    s = dispatchKeys(s, ["ans", "add", "alpha", "ans", "equals"], 0);
    expect(lcdResult(s)).toBe("2");
    s = dispatchKeys(s, ["equals"], 0);
    expect(lcdResult(s)).toBe("3");
    s = dispatchKeys(s, ["equals"], 0);
    expect(lcdResult(s)).toBe("5");
  });

  it("GT-P96 negative square priority SRC-P96", () => {
    const s = run(["neg", "2", "square", "equals"], lineIo);
    expect(lcdResult(s)).toBe("-4");
    const t = run(["lparen", "neg", "2", "rparen", "square", "equals"], lineIo);
    expect(lcdResult(t)).toBe("4");
  });

  it("GT-P13 Fix 3 100÷7 SRC-P13", () => {
    const s = run(["shift", "mode", "6", "3", "1", "0", "0", "div", "7", "equals"], lineIo);
    expect(lcdResult(s)).toBe("14.286");
  });

  it("SHIFT is consumed by the next key", () => {
    const s = run(["shift", "sin"]);
    expect(s.shift).toBe(false);
    expect(lcdExpression(s)).toMatch(/asin|sin⁻¹|sin/);
  });

  it("ALPHA variable store and recall SRC-P34", () => {
    const s = run(["7", "equals", "shift", "rcl", "neg"]);
    expect(s.variables.A).toMatch(/^7/);
    const t = dispatchKeys(s, ["ac", "alpha", "neg", "equals"], 0);
    expect(lcdResult(t)).toMatch(/^7/);
  });

  it("AC clears expression but not Ans SRC-P35", () => {
    const s = run(["9", "equals", "ac"]);
    expect(lcdExpression(s)).toBe("");
    expect(s.ans).toMatch(/^9/);
  });

  it("mode transition COMP→STAT→COMP SRC-P10", () => {
    const s = run(["mode", "3"]);
    expect(s.mode).toBe("STAT");
    const back = dispatchKeys(s, ["mode", "1"], 0);
    expect(back.mode).toBe("COMP");
  });

  it("angle unit Rad sin(π/2) SRC-P12", () => {
    const s = run(["shift", "mode", "4", "sin", "shift", "exp10", "div", "2", "equals"]);
    expect(lcdResult(s)).toBe("1");
  });

  it("GT-P38-EX4 ⁵√32 = 2 SRC-P38", () => {
    const s = run(["shift", "power", "5", "right", "3", "2", "equals"]);
    expect(lcdResult(s)).toBe("2");
  });

  it("cube root of 8 is 2", () => {
    const s = run(["shift", "sqrt", "8", "equals"]);
    expect(lcdResult(s)).toBe("2");
  });

  it("GT-P36 sinh 1 = 1.175201194 SRC-P36", () => {
    const s = run(["hyp", "sin", "1", "equals"], lineIo);
    expect(lcdResult(s)).toMatch(/^1\.175201194/);
  });

  it("GT-P24 multi-statement 3+3:3×3 last result 9 SRC-P24", () => {
    const s = run(["3", "add", "3", "alpha", "integral", "3", "mul", "3", "equals"], lineIo);
    expect(lcdExpression(s)).toMatch(/:/);
    expect(lcdResult(s)).toBe("9");
  });

  it("M+ evaluates 10×5 and accumulates independent memory SRC-P35", () => {
    const s = run(["1", "0", "mul", "5", "mplus"], lineIo);
    expect(lcdResult(s)).toBe("50");
    expect(s.memoryM).toMatch(/^50/);
    const t = dispatchKeys(s, ["1", "0", "add", "5", "shift", "mplus"], 0);
    expect(lcdResult(t)).toBe("15");
    expect(t.memoryM).toMatch(/^35/);
  });

  it("GT-P92 left/right recover at the zero; AC clears SRC-P92", () => {
    const s = run(["1", "4", "div", "0", "mul", "2", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Math ERROR");
      expect(s.screen.errorIndex).toBeGreaterThan(0);
    }
    const recovered = dispatchKeys(s, ["left"], 0);
    expect(recovered.screen.kind).toBe("input");
    expect(lcdExpression(recovered)).toMatch(/14/);
    const fixed = dispatchKeys(recovered, ["del", "2", "equals"], 0);
    expect(lcdResult(fixed)).toBe("14");
    const cleared = dispatchKeys(s, ["ac"], 0);
    expect(lcdExpression(cleared)).toBe("");
  });

  it("range: 10^100 is Math ERROR and 10^(-100) underflows to 0", () => {
    const overflow = run(["exp10", "1", "0", "0", "equals"]);
    expect(overflow.screen.kind).toBe("error");
    const under = run(["exp10", "neg", "1", "0", "0", "equals"], lineIo);
    expect(lcdResult(under)).toBe("0");
  });

  it("FLOW A 7÷6 = is Natural Display 7/6 (architecture audit; SRC-P21/P22 overlap)", () => {
    const s = run(["7", "div", "6", "equals"]);
    expect(s.editor.root).toEqual([
      { t: "num", s: "7" },
      { t: "op", op: "÷" },
      { t: "num", s: "6" },
    ]);
    expect(s.screen.kind).toBe("result");
    expect(s.result?.naturalKind).toBe("fraction");
    expect(lcdResult(s).replace(/\s/g, "")).toBe("7/6");
    // 10-digit Norm-1 approx, ROUND_HALF_UP — not a hardware-tie claim.
    expect(s.ans).toBe("1.166666667");
    expect(s.result?.approx).toBe("1.166666667");
  });

  it("FLOW B SHIFT SIN 30 = is asin(30) Math ERROR, not sin(30) (architecture audit)", () => {
    const inverse = run(["shift", "sin", "3", "0", "equals"]);
    expect(inverse.screen.kind).toBe("error");
    if (inverse.screen.kind === "error") {
      expect(inverse.screen.code).toBe("Math ERROR");
    }
    const forward = run(["sin", "3", "0", "equals"]);
    expect(forward.screen.kind).toBe("result");
    expect(lcdResult(forward).replace(/\s/g, "")).toMatch(/1\/2/);
  });
});

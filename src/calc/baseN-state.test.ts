import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdIndicators, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

describe("BASE-N reducer / evaluation", () => {
  it("MODE 4 enters BASE-N in DEC without changing Ans", () => {
    const prior = run(["9", "equals"]);
    const s = run(["mode", "4"], prior);
    expect(s.mode).toBe("BASE-N");
    expect(s.baseN.radix).toBe(10);
    expect(lcdIndicators(s).baseN).toBe("DEC");
    expect(lcdIndicators(s).mode).toBe("BASE-N");
    expect(lcdIndicators(s).math).toBe(false);
    expect(s.ans).toMatch(/^9/);
    expect(s.variables.X).toBe(prior.variables.X);
  });

  it("BIN 11+1 = 0000000000001100 TARGET-OFFICIAL-DOC example 1", () => {
    const s = run(["mode", "4", "log", "1", "1", "add", "1", "equals"]);
    expect(s.baseN.radix).toBe(2);
    expect(s.baseN.value).toBe("4");
    expect(lcdResult(s)).toBe("0000000000000100");
    expect(lcdExpression(s)).toBe("11+1");
  });

  it("HEX 1F+1 = 00000020 TARGET-OFFICIAL-DOC example 2", () => {
    const s = run(["mode", "4", "power", "1", "tan", "add", "1", "equals"]);
    expect(s.baseN.radix).toBe(16);
    expect(s.baseN.value).toBe("32");
    expect(lcdResult(s)).toBe("00000020");
    expect(lcdExpression(s)).toBe("1F+1");
  });

  it("OCT 7+1 = 00000000010 TARGET-OFFICIAL-DOC example 3", () => {
    const s = run(["mode", "4", "ln", "7", "add", "1", "equals"]);
    expect(s.baseN.radix).toBe(8);
    expect(s.baseN.value).toBe("8");
    expect(lcdResult(s)).toBe("00000000010");
  });

  it("converts 15×37 from DEC through HEX/BIN/OCT TARGET-OFFICIAL-DOC", () => {
    let s = run(["mode", "4", "1", "5", "mul", "3", "7", "equals"]);
    expect(lcdResult(s)).toBe("555");
    expect(s.baseN.value).toBe("555");
    s = dispatchKeys(s, ["power"], 0);
    expect(lcdResult(s)).toBe("0000022B");
    expect(s.baseN.radix).toBe(16);
    s = dispatchKeys(s, ["log"], 0);
    expect(lcdResult(s)).toBe("0000001000101011");
    s = dispatchKeys(s, ["ln"], 0);
    expect(lcdResult(s)).toBe("00000001053");
    expect(s.baseN.value).toBe("555");
  });

  it("BIN 1010 and 1100 = 0000000000001000 TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "4", "log", "1", "0", "1", "0", "shift", "3", "1", "1", "1", "0", "0", "equals"]);
    expect(lcdResult(s)).toBe("0000000000001000");
    expect(s.baseN.value).toBe("8");
  });

  it("Not(1010) and Neg(101101) in BIN", () => {
    const not = run(["mode", "4", "log", "shift", "3", "5", "1", "0", "1", "0", "equals"]);
    expect(lcdResult(not)).toBe("1111111111110101");
    const neg = run(["mode", "4", "log", "shift", "3", "6", "1", "0", "1", "1", "0", "1", "equals"]);
    expect(lcdResult(neg)).toBe("1111111111010011");
  });

  it("mixed 10d+10h+10b+10o = 36 in DEC TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "4",
      "1",
      "0",
      "shift",
      "3",
      "down",
      "1",
      "add",
      "1",
      "0",
      "shift",
      "3",
      "down",
      "2",
      "add",
      "1",
      "0",
      "shift",
      "3",
      "down",
      "3",
      "add",
      "1",
      "0",
      "shift",
      "3",
      "down",
      "4",
      "equals",
    ]);
    expect(lcdResult(s)).toBe("36");
    expect(s.baseN.value).toBe("36");
  });

  it("invalid BIN digit is Syntax ERROR at equals", () => {
    const s = run(["mode", "4", "log", "2", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Syntax ERROR");
    }
  });

  it("does not fall through into COMP x² when switching to DEC", () => {
    const s = run(["mode", "4", "log", "1", "1", "equals", "square"]);
    expect(s.mode).toBe("BASE-N");
    expect(s.baseN.radix).toBe(10);
    expect(lcdResult(s)).toBe("3");
    expect(lcdExpression(s)).not.toMatch(/²/);
  });

  it("MODE 1 leaves BASE-N and keeps Ans as the signed decimal", () => {
    const s = run(["mode", "4", "log", "1", "1", "add", "1", "equals", "mode", "1"]);
    expect(s.mode).toBe("COMP");
    expect(s.ans).toBe("4");
    expect(s.baseN.tokens).toEqual([]);
  });

  it("COMP trig keys do not insert sin() in HEX (they are F/E/D)", () => {
    const s = run(["mode", "4", "power", "sin", "equals"]);
    expect(lcdExpression(s)).toBe("D");
    expect(lcdResult(s)).toBe("0000000D");
  });

  it("AC after error restores BASE-N input without wiping COMP variables", () => {
    const prior = run(["5", "equals", "shift", "rcl", "neg"]);
    let s = run(["mode", "4", "log", "2", "equals"], prior);
    expect(s.screen.kind).toBe("error");
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.mode).toBe("BASE-N");
    expect(s.screen.kind).toBe("input");
    expect(s.variables.A).toMatch(/^5/);
  });

  it("÷0 is Math ERROR; AC recovers", () => {
    let s = run(["mode", "4", "1", "div", "0", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Math ERROR");
    }
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.screen.kind).toBe("input");
  });
});

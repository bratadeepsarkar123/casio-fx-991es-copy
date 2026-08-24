import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdExpression, lcdResult } from "../src/ui/lcdModel.ts";
import { vectorToDecCells } from "../src/calc/vectorNumeric.ts";
import type { KeyId } from "../src/calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("VECTOR goldens", () => {
  it("GT-VC-OFFICIAL-EX1 VctA+VctB Ans1=4 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "8",
      "1",
      "2",
      "1",
      "equals",
      "2",
      "equals",
      "ac",
      "shift",
      "5",
      "1",
      "2",
      "2",
      "3",
      "equals",
      "4",
      "equals",
      "ac",
      "shift",
      "5",
      "3",
      "add",
      "shift",
      "5",
      "4",
      "equals",
    ]);
    expect(s.mode).toBe("VECTOR");
    expect(s.vector?.phase).toBe("vctans");
    expect(s.vector?.registers.A && vectorToDecCells(s.vector.registers.A)).toEqual(["1", "2"]);
    expect(s.vector?.registers.B && vectorToDecCells(s.vector.registers.B)).toEqual(["3", "4"]);
    expect(s.vector?.registers.Ans && vectorToDecCells(s.vector.registers.Ans)).toEqual(["4", "6"]);
    expect(lcdExpression(s)).toBe("Ans1=");
    expect(lcdResult(s)).toBe("4");
  });

  it("GT-VC-OFFICIAL-EX4 Dot=11 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "8",
      "1",
      "2",
      "1",
      "equals",
      "2",
      "equals",
      "ac",
      "shift",
      "5",
      "1",
      "2",
      "2",
      "3",
      "equals",
      "4",
      "equals",
      "ac",
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
    expect(lcdResult(s)).toBe("11");
  });

  it("GT-VC-OFFICIAL-EX6 Abs(VctC)=3 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "8",
      "1",
      "2",
      "1",
      "equals",
      "2",
      "equals",
      "ac",
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
      "shift",
      "hyp",
      "shift",
      "5",
      "5",
      "equals",
    ]);
    expect(s.vector?.registers.C && vectorToDecCells(s.vector.registers.C)).toEqual(["2", "-1", "2"]);
    expect(lcdResult(s)).toBe("3");
  });
});

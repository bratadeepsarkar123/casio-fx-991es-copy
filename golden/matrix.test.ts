import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdExpression, lcdResult } from "../src/ui/lcdModel.ts";
import { matrixToDecGrid } from "../src/calc/matrixNumeric.ts";
import type { KeyId } from "../src/calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("MATRIX goldens", () => {
  it("GT-MX-OFFICIAL-EX1 MatA×MatB Ans11=5 TARGET-OFFICIAL-DOC", () => {
    const s = run([
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
      "shift",
      "4",
      "3",
      "mul",
      "shift",
      "4",
      "4",
      "equals",
    ]);
    expect(s.mode).toBe("MATRIX");
    expect(s.matrix?.phase).toBe("matans");
    expect(s.matrix?.registers.A && matrixToDecGrid(s.matrix.registers.A)).toEqual([
      ["2", "1"],
      ["1", "1"],
    ]);
    expect(s.matrix?.registers.B && matrixToDecGrid(s.matrix.registers.B)).toEqual([
      ["2", "1"],
      ["1", "2"],
    ]);
    expect(s.matrix?.registers.Ans && matrixToDecGrid(s.matrix.registers.Ans)).toEqual([
      ["5", "4"],
      ["3", "3"],
    ]);
    expect(lcdExpression(s)).toBe("Ans11=");
    expect(lcdResult(s)).toBe("5");
  });

  it("GT-MX-OFFICIAL-EX4 det(MatA)=1 TARGET-OFFICIAL-DOC", () => {
    const s = run([
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
      "shift",
      "4",
      "7",
      "shift",
      "4",
      "3",
      "equals",
    ]);
    expect(s.matrix?.phase).toBe("calc");
    expect(lcdResult(s)).toBe("1");
  });

  it("GT-MX-OFFICIAL-EX6 inverse TARGET-OFFICIAL-DOC", () => {
    const s = run([
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
      "shift",
      "4",
      "3",
      "xinv",
      "equals",
    ]);
    expect(s.matrix?.registers.Ans && matrixToDecGrid(s.matrix.registers.Ans)).toEqual([
      ["1", "-1"],
      ["-1", "2"],
    ]);
    expect(lcdResult(s)).toBe("1");
  });
});

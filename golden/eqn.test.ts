import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdExpression, lcdResult } from "../src/ui/lcdModel.ts";
import { toDec } from "../src/calc/symbolic.ts";
import type { KeyId } from "../src/calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("EQN goldens", () => {
  it("GT-EQ-OFFICIAL-EX1 2-UNK X=-1 Y=2 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "5",
      "1",
      "1",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "4",
      "equals",
      "equals",
    ]);
    expect(s.mode).toBe("EQN");
    expect(s.eqn?.type).toBe("lin2");
    expect(s.eqn?.phase).toBe("solutions");
    expect(s.eqn?.solutions.map((x) => x.label)).toEqual(["X", "Y"]);
    expect(s.eqn?.solutions.map((x) => toDec(x.sym).toString())).toEqual(["-1", "2"]);
    expect(lcdExpression(s)).toBe("X=");
    expect(lcdResult(s)).toBe("-1");
  });

  it("GT-EQ-OFFICIAL-EX2 3-UNK X=1 Y=2 Z=3 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "5",
      "2",
      "1",
      "equals",
      "neg",
      "1",
      "equals",
      "1",
      "equals",
      "2",
      "equals",
      "1",
      "equals",
      "1",
      "equals",
      "neg",
      "1",
      "equals",
      "0",
      "equals",
      "neg",
      "1",
      "equals",
      "1",
      "equals",
      "1",
      "equals",
      "4",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.type).toBe("lin3");
    expect(s.eqn?.solutions.map((x) => toDec(x.sym).toString())).toEqual(["1", "2", "3"]);
    expect(lcdResult(s)).toBe("1");
  });

  it("GT-EQ-OFFICIAL-EX3 quadratic complex pair TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "5", "3", "1", "equals", "1", "equals", "3", "frac", "4", "equals", "equals"]);
    expect(s.eqn?.type).toBe("quad");
    expect(s.eqn?.solutions.map((x) => x.label)).toEqual(["X1", "X2"]);
    expect(s.result?.naturalKind).toBe("complex");
    expect(lcdExpression(s)).toBe("X1=");
    expect(lcdResult(s).replace(/\s/g, "")).toMatch(/-1\/2/);
    expect(lcdResult(s)).toMatch(/i/);
  });

  it("GT-EQ-OFFICIAL-EX4 repeated root X=√2 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "5",
      "3",
      "1",
      "equals",
      "neg",
      "2",
      "mul",
      "sqrt",
      "2",
      "equals",
      "2",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.solutions.map((x) => x.label)).toEqual(["X"]);
    expect(lcdExpression(s)).toBe("X=");
    expect(lcdResult(s)).toBe("√2");
  });

  it("GT-EQ-OFFICIAL-EX5 cubic X1=-1 X2=2 X3=1 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "5",
      "4",
      "1",
      "equals",
      "neg",
      "2",
      "equals",
      "neg",
      "1",
      "equals",
      "2",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.type).toBe("cubic");
    expect(s.eqn?.solutions.map((x) => x.label)).toEqual(["X1", "X2", "X3"]);
    expect(s.eqn?.solutions.map((x) => toDec(x.sym).toString())).toEqual(["-1", "2", "1"]);
    expect(lcdResult(s)).toBe("-1");
  });
});

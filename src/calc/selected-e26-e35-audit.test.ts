import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import { matrixToDecGrid } from "./matrixNumeric.ts";
import { formatBaseNResult, interpretMagnitude, parseUnsignedDigits, signedMax, signedMin } from "./baseNNumeric.ts";
import { toDec } from "./symbolic.ts";
import { vectorToDecCells } from "./vectorNumeric.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState, MatrixValue, VectorValue } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

function grid(m: MatrixValue | null | undefined): string[][] | null {
  return m ? matrixToDecGrid(m) : null;
}

function cells(v: VectorValue | null | undefined): string[] | null {
  return v ? vectorToDecCells(v) : null;
}

describe("selected manual E-26 through E-35 mode audit", () => {
  it("E-26/E-27 covers the printed radix continuations, conversions and signed widths", () => {
    const bin = run(["mode", "4", "log", "1", "1", "add", "1", "equals"]);
    expect(lcdResult(bin)).toBe("0000000000000100");
    const hex = run(["mode", "4", "power", "1", "tan", "add", "1", "equals"]);
    expect(lcdResult(hex)).toBe("00000020");
    const oct = run(["mode", "4", "ln", "7", "add", "1", "equals"]);
    expect(lcdResult(oct)).toBe("00000000010");

    let converted = run(["mode", "4", "1", "5", "mul", "3", "7", "equals"]);
    expect(lcdResult(converted)).toBe("555");
    converted = dispatchKeys(converted, ["power"], 0);
    expect(lcdResult(converted)).toBe("0000022B");
    converted = dispatchKeys(converted, ["log"], 0);
    expect(lcdResult(converted)).toBe("0000001000101011");
    converted = dispatchKeys(converted, ["ln"], 0);
    expect(lcdResult(converted)).toBe("00000001053");

    expect(formatBaseNResult(signedMin(16), 2)).toBe("1000000000000000");
    expect(formatBaseNResult(signedMax(16), 2)).toBe("0111111111111111");
    expect(formatBaseNResult(signedMin(32), 10)).toBe("-2147483648");
    expect(formatBaseNResult(signedMax(32), 10)).toBe("2147483647");
    expect(interpretMagnitude(parseUnsignedDigits("80000000", 16), 16)).toBe(signedMin(32));
    expect(interpretMagnitude(parseUnsignedDigits("7FFFFFFF", 16), 16)).toBe(signedMax(32));

    const max = run(["mode", "4", "2", "1", "4", "7", "4", "8", "3", "6", "4", "7", "equals"]);
    expect(lcdResult(max)).toBe("2147483647");
    const min = run(["mode", "4", "neg", "2", "1", "4", "7", "4", "8", "3", "6", "4", "8", "equals"]);
    expect(lcdResult(min)).toBe("-2147483648");
  });

  it("E-27 performs every printed logical BASE-N operation", () => {
    const and = run(["mode", "4", "log", "1", "0", "1", "0", "shift", "3", "1", "1", "1", "0", "0", "equals"]);
    const or = run(["mode", "4", "log", "1", "0", "1", "1", "shift", "3", "2", "1", "1", "0", "1", "0", "equals"]);
    const xor = run(["mode", "4", "log", "1", "0", "1", "0", "shift", "3", "3", "1", "1", "0", "0", "equals"]);
    const xnor = run(["mode", "4", "log", "1", "1", "1", "1", "shift", "3", "4", "1", "0", "1", "equals"]);
    const not = run(["mode", "4", "log", "shift", "3", "5", "1", "0", "1", "0", "equals"]);
    const neg = run(["mode", "4", "log", "shift", "3", "6", "1", "0", "1", "1", "0", "1", "equals"]);
    expect([lcdResult(and), lcdResult(or), lcdResult(xor), lcdResult(xnor), lcdResult(not), lcdResult(neg)]).toEqual([
      "0000000000001000",
      "0000000000011011",
      "0000000000000110",
      "1111111111110101",
      "1111111111110101",
      "1111111111010011",
    ]);
  });

  it("keeps square root as a prefix for adjacency, nesting, and the E-29 signed product", () => {
    const adjacent = run(["2", "sqrt", "3"]);
    expect(adjacent.editor.root).toEqual([
      { t: "num", s: "2" },
      { t: "sqrt", inner: [{ t: "num", s: "3" }] },
    ]);
    expect(lcdResult(run(["equals"], adjacent))).toBe("2√3");

    const nested = run(["sqrt", "sqrt", "2"]);
    expect(nested.editor.root).toEqual([{ t: "sqrt", inner: [{ t: "sqrt", inner: [{ t: "num", s: "2" }] }] }]);

    const signed = run(["neg", "2", "sqrt", "2", "rparen"]);
    expect(signed.editor.root).toEqual([
      { t: "neg", inner: [{ t: "num", s: "2" }, { t: "sqrt", inner: [{ t: "num", s: "2" }] }] },
    ]);
  });

  it("E-29 preserves all five equation examples, exact roots, and printed solution order", () => {
    const lin2 = run(["mode", "5", "1", "1", "equals", "2", "equals", "3", "equals", "2", "equals", "3", "equals", "4", "equals", "equals"]);
    expect(lcdExpression(lin2)).toBe("X=");
    expect(lcdResult(lin2)).toBe("-1");
    const lin2Y = dispatchKeys(lin2, ["down"], 0);
    expect(lcdExpression(lin2Y)).toBe("Y=");
    expect(lcdResult(lin2Y)).toBe("2");

    const lin3 = run([
      "mode", "5", "2",
      "1", "equals", "neg", "1", "equals", "1", "equals", "2", "equals",
      "1", "equals", "1", "equals", "neg", "1", "equals", "0", "equals",
      "neg", "1", "equals", "1", "equals", "1", "equals", "4", "equals", "equals",
    ]);
    expect(lin3.eqn?.solutions.map((s) => `${s.label}:${toDec(s.sym).toString()}`)).toEqual(["X:1", "Y:2", "Z:3"]);
    expect(lcdExpression(lin3)).toBe("X=");
    expect(lcdResult(lin3)).toBe("1");
    const lin3Y = dispatchKeys(lin3, ["down"], 0);
    expect(lcdExpression(lin3Y)).toBe("Y=");
    expect(lcdResult(lin3Y)).toBe("2");
    const lin3Z = dispatchKeys(lin3Y, ["down"], 0);
    expect(lcdExpression(lin3Z)).toBe("Z=");
    expect(lcdResult(lin3Z)).toBe("3");

    const complexPair = run(["mode", "5", "3", "1", "equals", "1", "equals", "3", "frac", "4", "equals", "equals"]);
    expect(complexPair.eqn?.solutions.map((s) => s.label)).toEqual(["X1", "X2"]);
    expect(lcdResult(complexPair)).toBe("-1/2+√2/2i");
    const complexPairX2 = dispatchKeys(complexPair, ["down"], 0);
    expect(lcdExpression(complexPairX2)).toBe("X2=");
    expect(lcdResult(complexPairX2)).toBe("-1/2-√2/2i");

    const repeated = run(["mode", "5", "3", "1", "equals", "neg", "2", "sqrt", "2", "rparen", "equals", "2", "equals", "equals"]);
    expect(repeated.eqn?.solutions.map((s) => s.label)).toEqual(["X"]);
    expect(lcdExpression(repeated)).toBe("X=");
    expect(lcdResult(repeated)).toBe("√2");

    const cubic = run(["mode", "5", "4", "1", "equals", "neg", "2", "equals", "neg", "1", "equals", "2", "equals", "equals"]);
    expect(cubic.eqn?.solutions.map((s) => `${s.label}:${toDec(s.sym).toString()}`)).toEqual(["X1:-1", "X2:2", "X3:1"]);
    expect(lcdExpression(cubic)).toBe("X1=");
    expect(lcdResult(cubic)).toBe("-1");
    const cubicX2 = dispatchKeys(cubic, ["down"], 0);
    expect(lcdExpression(cubicX2)).toBe("X2=");
    expect(lcdResult(cubicX2)).toBe("2");
    const cubicX3 = dispatchKeys(cubicX2, ["down"], 0);
    expect(lcdExpression(cubicX3)).toBe("X3=");
    expect(lcdResult(cubicX3)).toBe("1");
  });

  it("E-31/E-32 covers MatC data, copy, Abs, Trn, inverse, square and cube", () => {
    const matC = run(["mode", "6", "3", "6", "1", "equals", "0", "equals", "neg", "1", "equals", "0", "equals", "neg", "1", "equals", "1", "equals", "ac"]);
    expect(grid(matC.matrix?.registers.C)).toEqual([["1", "0", "-1"], ["0", "-1", "1"]]);

    const abs = run(["mode", "6", "shift", "4", "2", "2", "5", "2", "equals", "neg", "1", "equals", "neg", "1", "equals", "2", "equals", "ac", "shift", "hyp", "shift", "4", "4", "equals"]);
    expect(grid(abs.matrix?.registers.B)).toEqual([["2", "-1"], ["-1", "2"]]);
    expect(grid(abs.matrix?.registers.Ans)).toEqual([["2", "1"], ["1", "2"]]);

    const scalar = run(["mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac", "3", "mul", "shift", "4", "3", "equals"]);
    expect(grid(scalar.matrix?.registers.Ans)).toEqual([["6", "3"], ["3", "3"]]);
    const det = run(["mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac", "shift", "4", "7", "shift", "4", "3", "equals"]);
    expect(lcdResult(det)).toBe("1");

    const transpose = run(["mode", "6", "3", "6", "1", "equals", "0", "equals", "neg", "1", "equals", "0", "equals", "neg", "1", "equals", "1", "equals", "ac", "shift", "4", "8", "shift", "4", "5", "equals"]);
    expect(grid(transpose.matrix?.registers.Ans)).toEqual([["1", "0"], ["0", "-1"], ["-1", "1"]]);

    const inverse = run(["mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac", "shift", "4", "3", "xinv", "equals"]);
    expect(grid(inverse.matrix?.registers.Ans)).toEqual([["1", "-1"], ["-1", "2"]]);

    const square = run(["mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac", "shift", "4", "3", "square", "equals"]);
    expect(grid(square.matrix?.registers.Ans)).toEqual([["5", "3"], ["3", "2"]]);
    const cube = run(["mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "ac", "shift", "4", "3", "shift", "square", "equals"]);
    expect(grid(cube.matrix?.registers.Ans)).toEqual([["13", "8"], ["8", "5"]]);

    const source = run(["mode", "6", "1", "5", "2", "equals", "1", "equals", "1", "equals", "1", "equals", "shift", "rcl", "dms"]);
    expect(grid(source.matrix?.registers.B)).toEqual([["2", "1"], ["1", "1"]]);
    expect(source.matrix?.phase).toBe("editor");
    expect(source.matrix?.editorReg).toBe("B");
    expect(lcdExpression(source)).toBe("B11=");
    expect(lcdResult(source)).toBe("2");
    const editedCopy = dispatchKeys(source, ["9", "equals"], 0);
    expect(grid(editedCopy.matrix?.registers.A)).toEqual([["2", "1"], ["1", "1"]]);
    expect(grid(editedCopy.matrix?.registers.B)?.[0]?.[0]).toBe("9");
  });

  it("E-33 generates the printed TABLE fraction rows and changes X", () => {
    let s = run(["mode", "7", "alpha", "rparen", "square", "add", "1", "frac", "2", "equals", "neg", "1", "equals", "1", "equals", "0", "dot", "5", "equals"]);
    expect(s.table?.rows.map((r) => [r.xApprox, r.fxApprox])).toEqual([
      ["-1", "1.5"],
      ["-0.5", "0.75"],
      ["0", "0.5"],
      ["0.5", "0.75"],
      ["1", "1.5"],
    ]);
    expect(lcdResult(s)).toBe("1.5");
    for (const [rowIndex, readout] of [[1, "0.75"], [2, "0.5"], [3, "0.75"], [4, "1.5"]] as const) {
      s = dispatchKeys(s, ["down"], 0);
      expect(s.table?.rowIndex).toBe(rowIndex);
      expect(lcdResult(s)).toBe(readout);
    }
    expect(s.variables.X).toBe("1");
  });

  it("E-34/E-35 evaluates vector answer memory, dot/cross, Abs and angle inputs", () => {
    const a = ["mode", "8", "1", "2", "1", "equals", "2", "equals", "ac"] as KeyId[];
    const b = ["shift", "5", "2", "2", "2", "3", "equals", "4", "equals", "ac"] as KeyId[];
    const sum = run([...a.slice(0, -1), ...b, "shift", "5", "3", "add", "shift", "5", "4", "equals"]);
    expect(cells(sum.vector?.registers.Ans)).toEqual(["4", "6"]);

    const copied = run([...a, "shift", "5", "2", "1", "shift", "rcl", "dms"]);
    expect(cells(copied.vector?.registers.B)).toEqual(["1", "2"]);
    expect(copied.vector?.phase).toBe("editor");
    expect(copied.vector?.editorReg).toBe("B");
    expect(lcdExpression(copied)).toBe("B1=");
    expect(lcdResult(copied)).toBe("1");
    const editedVectorCopy = dispatchKeys(copied, ["9", "equals"], 0);
    expect(cells(editedVectorCopy.vector?.registers.A)).toEqual(["1", "2"]);
    expect(editedVectorCopy.vector?.registers.B?.cells.map((cell) => toDec(cell).toString())).toEqual(["9", "2"]);

    const dot = run([...a, ...b, "shift", "5", "3", "shift", "5", "7", "shift", "5", "4", "equals"]);
    expect(lcdResult(dot)).toBe("11");

    const cross = run([...a, ...b, "shift", "5", "3", "mul", "shift", "5", "4", "equals"]);
    expect(cells(cross.vector?.registers.Ans)).toEqual(["0", "0", "-2"]);
    const crossDown = dispatchKeys(cross, ["down", "down"], 0);
    expect(lcdResult(crossDown)).toBe("-2");

    const scaled = run([...a, ...b, "3", "mul", "shift", "5", "3", "equals"]);
    expect(cells(scaled.vector?.registers.Ans)).toEqual(["3", "6"]);
    const scaledThenSubtracted = run([...a, ...b, "3", "mul", "shift", "5", "3", "equals", "sub", "shift", "5", "4", "equals"]);
    expect(cells(scaledThenSubtracted.vector?.registers.Ans)).toEqual(["0", "2"]);

    const c = ["shift", "5", "1", "3", "3", "2", "equals", "neg", "1", "equals", "2", "equals", "ac"] as KeyId[];
    const abs = run([...a, ...c, "shift", "hyp", "shift", "5", "5", "equals"]);
    expect(lcdResult(abs)).toBe("3");

    const angleRatio = run([
      "shift", "mode", "6", "3",
      ...a, ...b,
      "shift", "5", "3", "shift", "5", "7", "shift", "5", "4", "div",
      "lparen", "shift", "hyp", "shift", "5", "3", "rparen", "mul", "shift", "hyp", "shift", "5", "4", "rparen", "rparen", "equals",
    ]);
    expect(lcdResult(angleRatio)).toBe("11√5/25");
    const angle = dispatchKeys(angleRatio, ["shift", "cos", "ans", "rparen", "equals"], 0);
    expect(angle.setup.numberFormat).toEqual({ kind: "Fix", n: 3 });
    expect(lcdResult(angle)).toBe("10.305");
  });
});

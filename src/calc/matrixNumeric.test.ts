import { describe, expect, it } from "vitest";
import { CalcMathError } from "./numeric.ts";
import {
  CalcDimensionError,
  matrixAbs,
  matrixAdd,
  matrixDet,
  matrixFromInts,
  matrixInverse,
  matrixMul,
  matrixPowInt,
  matrixScale,
  matrixSub,
  matrixToDecGrid,
  matrixTranspose,
} from "./matrixNumeric.ts";
import { symRat } from "./symbolic.ts";

const A = () => matrixFromInts(2, 2, [2n, 1n, 1n, 1n]);
const B = () => matrixFromInts(2, 2, [2n, 1n, 1n, 2n]);
const C = () => matrixFromInts(2, 3, [1n, 0n, 1n, 0n, 1n, 1n]);

describe("MATRIX numeric (Sym cells; official Ex1–Ex8)", () => {
  it("Ex1 MatA×MatB = [[5,4],[3,3]] TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(matrixMul(A(), B()))).toEqual([
      ["5", "4"],
      ["3", "3"],
    ]);
  });

  it("Ex1 MatA+MatB = [[4,2],[2,3]] TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(matrixAdd(A(), B()))).toEqual([
      ["4", "2"],
      ["2", "3"],
    ]);
  });

  it("Ex1 subtraction is defined for equal shape", () => {
    expect(matrixToDecGrid(matrixSub(B(), A()))).toEqual([
      ["0", "0"],
      ["0", "1"],
    ]);
  });

  it("Ex2 MatC 2×3 TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(C())).toEqual([
      ["1", "0", "1"],
      ["0", "1", "1"],
    ]);
  });

  it("Ex3 3×MatA = [[6,3],[3,3]] TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(matrixScale(A(), symRat(3n)))).toEqual([
      ["6", "3"],
      ["3", "3"],
    ]);
  });

  it("Ex4 det(MatA)=1 TARGET-OFFICIAL-DOC", () => {
    expect(matrixDet(A())).toEqual(symRat(1n));
  });

  it("Ex5 Trn(MatC) is 3×2 TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(matrixTranspose(C()))).toEqual([
      ["1", "0"],
      ["0", "1"],
      ["1", "1"],
    ]);
  });

  it("Ex6 MatA inverse [[1,-1],[-1,2]] TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(matrixInverse(A()))).toEqual([
      ["1", "-1"],
      ["-1", "2"],
    ]);
  });

  it("Ex7 Abs(MatB) element-wise TARGET-OFFICIAL-DOC", () => {
    const neg = matrixFromInts(2, 2, [2n, -1n, -1n, 2n]);
    expect(matrixToDecGrid(matrixAbs(neg))).toEqual([
      ["2", "1"],
      ["1", "2"],
    ]);
    expect(matrixToDecGrid(matrixAbs(B()))).toEqual([
      ["2", "1"],
      ["1", "2"],
    ]);
  });

  it("Ex8 MatA² and MatA³ TARGET-OFFICIAL-DOC", () => {
    expect(matrixToDecGrid(matrixPowInt(A(), 2))).toEqual([
      ["5", "3"],
      ["3", "2"],
    ]);
    expect(matrixToDecGrid(matrixPowInt(A(), 3))).toEqual([
      ["13", "8"],
      ["8", "5"],
    ]);
  });

  it("1×1 det and inverse", () => {
    const m = matrixFromInts(1, 1, [4n]);
    expect(matrixDet(m)).toEqual(symRat(4n));
    expect(matrixInverse(m).cells[0]?.[0]).toEqual(symRat(1n, 4n));
  });

  it("3×3 det of [[1,2,3],[0,1,4],[5,6,0]] is 1", () => {
    const m = matrixFromInts(3, 3, [1n, 2n, 3n, 0n, 1n, 4n, 5n, 6n, 0n]);
    expect(matrixDet(m)).toEqual(symRat(1n));
  });

  it("dimension mismatch add/mul throw Dimension ERROR", () => {
    expect(() => matrixAdd(A(), C())).toThrow(CalcDimensionError);
    expect(() => matrixMul(C(), A())).toThrow(CalcDimensionError);
    expect(matrixToDecGrid(matrixMul(A(), C()))).toEqual([
      ["2", "1", "3"],
      ["1", "1", "2"],
    ]);
  });

  it("non-square det/inverse/power throw Dimension ERROR", () => {
    expect(() => matrixDet(C())).toThrow(CalcDimensionError);
    expect(() => matrixInverse(C())).toThrow(CalcDimensionError);
    expect(() => matrixPowInt(C(), 2)).toThrow(CalcDimensionError);
  });

  it("singular inverse is Math ERROR INFERRED", () => {
    const singular = matrixFromInts(2, 2, [1n, 2n, 2n, 4n]);
    expect(matrixDet(singular)).toEqual(symRat(0n));
    expect(() => matrixInverse(singular)).toThrow(CalcMathError);
  });

  it("zero determinant of 1×1", () => {
    expect(() => matrixInverse(matrixFromInts(1, 1, [0n]))).toThrow(CalcMathError);
  });

  it("does not use native Number cells; product stays exact rationals", () => {
    const left = matrixFromInts(2, 2, [1n, 1n, 0n, 1n]);
    const right = matrixFromInts(2, 2, [1n, 2n, 3n, 4n]);
    const p = matrixMul(left, right);
    expect(p.cells[0]?.[0]?.k).toBe("rat");
    expect(p.cells[0]?.[1]?.k).toBe("rat");
  });
});

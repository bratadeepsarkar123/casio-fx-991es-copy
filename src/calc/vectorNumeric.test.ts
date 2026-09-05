import { describe, expect, it } from "vitest";
import { CalcMathError } from "./numeric.ts";
import { CalcDimensionError } from "./numeric.ts";
import { isNonReal, packCplx, symRat, toDec } from "./symbolic.ts";
import {
  emptyVector,
  vectorAbs,
  vectorAdd,
  vectorCross,
  vectorDot,
  vectorFromInts,
  vectorScale,
  vectorSub,
  vectorToDecCells,
} from "./vectorNumeric.ts";

const A = () => vectorFromInts(2, [1n, 2n]);
const B = () => vectorFromInts(2, [3n, 4n]);
const C = () => vectorFromInts(3, [2n, -1n, 2n]);

describe("VECTOR numeric (Sym cells; official Ex1–Ex7)", () => {
  it("Ex1 VctA+VctB = (4, 6) TARGET-OFFICIAL-DOC reconstructed", () => {
    expect(vectorToDecCells(vectorAdd(A(), B()))).toEqual(["4", "6"]);
  });

  it("Ex1 subtraction is defined for equal dimension", () => {
    expect(vectorToDecCells(vectorSub(B(), A()))).toEqual(["2", "2"]);
  });

  it("Ex2 VctC is 3D TARGET-OFFICIAL-DOC", () => {
    expect(vectorToDecCells(C())).toEqual(["2", "-1", "2"]);
  });

  it("Ex3 3×VctA = (3, 6) TARGET-OFFICIAL-DOC", () => {
    expect(vectorToDecCells(vectorScale(A(), symRat(3n)))).toEqual(["3", "6"]);
  });

  it("Ex3 3×VctA − VctB = (0, 2) TARGET-OFFICIAL-DOC", () => {
    expect(vectorToDecCells(vectorSub(vectorScale(A(), symRat(3n)), B()))).toEqual(["0", "2"]);
  });

  it("Ex4 VctA · VctB = 11 TARGET-OFFICIAL-DOC", () => {
    expect(toDec(vectorDot(A(), B())).toString()).toBe("11");
  });

  it("Ex5 2D×2D cross = (0, 0, -2) INFERRED / NHR", () => {
    expect(vectorToDecCells(vectorCross(A(), B()))).toEqual(["0", "0", "-2"]);
  });

  it("3D×3D cross is the standard product", () => {
    const u = vectorFromInts(3, [2n, -1n, 2n]);
    const v = vectorFromInts(3, [1n, 2n, 3n]);
    expect(vectorToDecCells(vectorCross(u, v))).toEqual(["-7", "-4", "5"]);
  });

  it("Ex6 Abs(VctC) = 3 TARGET-OFFICIAL-DOC", () => {
    expect(toDec(vectorAbs(C())).toString()).toBe("3");
  });

  it("zero vector magnitude is 0", () => {
    expect(toDec(vectorAbs(emptyVector(2))).toString()).toBe("0");
  });

  it("dimension mismatch add/dot is Dimension ERROR TARGET-OFFICIAL-DOC", () => {
    expect(() => vectorAdd(A(), C())).toThrow(CalcDimensionError);
    expect(() => vectorDot(A(), C())).toThrow(CalcDimensionError);
  });

  it("mixed 2D×3D cross is Dimension ERROR INFERRED", () => {
    expect(() => vectorCross(A(), C())).toThrow(CalcDimensionError);
  });

  it("parallel 2D cross is the zero 3-vector", () => {
    const p = vectorFromInts(2, [2n, 4n]);
    expect(vectorToDecCells(vectorCross(A(), p))).toEqual(["0", "0", "0"]);
  });

  it("rejects complex components Math ERROR INFERRED", () => {
    expect(() => vectorScale(A(), packCplx(symRat(1n), symRat(1n)))).toThrow(CalcMathError);
    expect(isNonReal(packCplx(symRat(1n), symRat(1n)))).toBe(true);
  });

  it("enforces 2D/3D only — not 1D", () => {
    expect(() => vectorFromInts(2, [1n])).toThrow(CalcDimensionError);
  });
});

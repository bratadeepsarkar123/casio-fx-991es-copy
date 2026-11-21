import { describe, expect, it } from "vitest";
import { resultFromSym } from "./format.ts";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { symAdd, symDiv, symMul, symRat, symSqrt, toDec } from "./symbolic.ts";
import { lcdResult } from "../ui/lcdModel.ts";

const setup = createInitialState(0).setup;

describe("exact square-root algebra", () => {
  it("retains unpaired factors in sqrt(6) and returns zero for sqrt(0)", () => {
    expect(resultFromSym(symSqrt(symRat(6n)), setup).display).toBe("√6");
    expect(toDec(symSqrt(symRat(0n))).toString()).toBe("0");
  });

  it("extracts rational denominator factors correctly", () => {
    const value = symSqrt(symDiv(symRat(4n), symRat(3n)));
    expect(resultFromSym(value, setup).display).toBe("2√3/3");
  });

  it("uses the conjugate for one-radical reciprocal forms", () => {
    expect(resultFromSym(symDiv(symRat(1n), symSqrt(symRat(6n))), setup).display).toBe("√6/6");
    const conjugate = symDiv(symRat(1n), symAdd(symRat(1n), symSqrt(symRat(2n))));
    expect(resultFromSym(conjugate, setup).display).toBe("-1+√2");
  });

  it("rationalizes a two-radical denominator by flipping one term", () => {
    const value = symDiv(symRat(1n), symAdd(symSqrt(symRat(2n)), symSqrt(symRat(3n))));
    expect(resultFromSym(value, setup).display).toBe("-√2+√3");
    expect(toDec(value).toFixed(10)).toBe("0.3178372452");
  });

  it("keeps rational contributions when radicands normalize to one", () => {
    const value = symAdd(symSqrt(symRat(2n)), symRat(1n));
    const square = symMul(value, value);
    expect(resultFromSym(square, setup).display).toBe("3+2√2");
  });

  it("bounds factor work for a large prime radicand", () => {
    const prime = 170141183460469231731687303715884105727n;
    const value = symSqrt(symRat(prime));
    expect(toDec(value).isFinite()).toBe(true);
  }, 1000);

  it("reproduces the selected E-10 worked radical by physical keys", () => {
    const result = dispatchKeys(
      createInitialState(0),
      ["lparen", "sqrt", "2", "right", "add", "2", "rparen", "mul", "sqrt", "3", "equals"],
      0,
    );
    expect(result.result?.display).toBe("√6+2√3");

    const forced = dispatchKeys(result, ["shift", "equals"], 0);
    expect(forced.result?.naturalKind).toBe("decimal");
    expect(lcdResult(forced)).toBe("5.913591358");
    const toggled = dispatchKeys(forced, ["sd"], 0);
    expect(lcdResult(toggled)).toBe("5.913591358");
  });

  it("multiplies multi-term quadratic surds without losing either term", () => {
    const value = symMul(symAdd(symSqrt(symRat(2n)), symRat(2n)), symSqrt(symRat(3n)));
    expect(resultFromSym(value, setup).display).toBe("√6+2√3");
  });
});

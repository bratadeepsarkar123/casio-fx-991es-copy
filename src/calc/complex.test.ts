import { describe, expect, it } from "vitest";
import { complexAbs, complexArg, complexConj, polarToRect } from "./complex.ts";
import { resultFromSym } from "./format.ts";
import { defaultSetup } from "./machine.ts";
import {
  cplxI,
  isZeroReal,
  packCplx,
  symAdd,
  symDiv,
  symMul,
  symNeg,
  symPow,
  symRat,
  toDec,
  type Sym,
} from "./symbolic.ts";

function z(re: bigint, im: bigint): Sym {
  return packCplx(symRat(re), symRat(im));
}

describe("CMPLX numeric domain (rectangular Sym)", () => {
  it("packs zero imaginary part back to a real", () => {
    const s = packCplx(symRat(5n), symRat(0n));
    expect(s.k).toBe("rat");
    expect(isZeroReal(cplxI()) && isZeroReal(z(0n, 0n))).toBe(false);
    expect(isZeroReal(z(0n, 0n))).toBe(true);
  });

  it("adds and subtracts rectangular values", () => {
    expect(symAdd(z(2n, 3n), z(4n, 5n))).toEqual(z(6n, 8n));
    expect(symAdd(z(2n, 0n), z(0n, 3n))).toEqual(z(2n, 3n));
    expect(symAdd(symRat(2n), cplxI())).toEqual(z(2n, 1n));
    expect(symAdd(z(2n, 3n), symNeg(z(4n, 5n)))).toEqual(z(-2n, -2n));
  });

  it("multiplies (2+3i)(4+5i) = -7+22i", () => {
    expect(symMul(z(2n, 3n), z(4n, 5n))).toEqual(z(-7n, 22n));
  });

  it("divides (2+6i)/(2i) = 3-i TARGET-OFFICIAL-DOC", () => {
    expect(symDiv(z(2n, 6n), z(0n, 2n))).toEqual(z(3n, -1n));
  });

  it("divides (2+3i)/(4+5i) = 23/41 + 2/41 i", () => {
    expect(symDiv(z(2n, 3n), z(4n, 5n))).toEqual(packCplx(symRat(23n, 41n), symRat(2n, 41n)));
  });

  it("throws on divide by zero including 0+0i", () => {
    expect(() => symDiv(z(1n, 1n), z(0n, 0n))).toThrow("div0");
    expect(() => symDiv(z(1n, 0n), packCplx(symRat(0n), symRat(0n)))).toThrow("div0");
  });

  it("conjugates 2+3i → 2-3i TARGET-OFFICIAL-DOC", () => {
    expect(complexConj(z(2n, 3n))).toEqual(z(2n, -3n));
  });

  it("Abs(1+i) is √2 TARGET-OFFICIAL-DOC", () => {
    const a = complexAbs(z(1n, 1n));
    expect(a.k).toBe("quad");
    expect(resultFromSym(a, defaultSetup()).display).toBe("√2");
  });

  it("arg(1+i)=45 in Deg TARGET-OFFICIAL-DOC", () => {
    const th = complexArg(z(1n, 1n), "Deg");
    expect(th).toEqual(symRat(45n));
  });

  it("arg of 0 is Math ERROR", () => {
    expect(() => complexArg(symRat(0n), "Deg")).toThrow("math");
  });

  it("2∠45 = √2+√2i in Deg TARGET-OFFICIAL-DOC", () => {
    const s = polarToRect(symRat(2n), symRat(45n), "Deg");
    expect(resultFromSym(s, defaultSetup()).display).toBe("√2+√2i");
  });

  it("(1-i)^-1 = 1/2+1/2i TARGET-OFFICIAL-DOC", () => {
    const s = symPow(z(1n, -1n), symRat(-1n));
    expect(resultFromSym(s, defaultSetup()).display).toBe("1/2+1/2i");
  });

  it("(1+i)^2+(1-i)^2 packs to real 0 TARGET-OFFICIAL-DOC", () => {
    const s = symAdd(symPow(z(1n, 1n), symRat(2n)), symPow(z(1n, -1n), symRat(2n)));
    expect(s.k).not.toBe("cplx");
    expect(toDec(s).isZero()).toBe(true);
  });

  it("does not coerce a non-real through toDec", () => {
    expect(() => toDec(z(1n, 1n))).toThrow("math");
  });
});

import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { formatBySetup } from "./format.ts";
import {
  CalcMathError,
  D,
  ZERO,
  assertRange,
  createUint32Rng,
  factorial,
  nCr,
  nPr,
  ranHash,
  ranInt,
  roundInternal,
} from "./numeric.ts";
import { defaultSetup } from "./machine.ts";

describe("numeric policy", () => {
  it("underflow below 1e-99 becomes 0", () => {
    expect(assertRange(D("1e-100")).eq(ZERO)).toBe(true);
    expect(assertRange(D("1e-99")).eq(D("1e-99"))).toBe(true);
  });

  it("overflow above 9.999999999e99 is Math ERROR", () => {
    expect(() => assertRange(D("1e100"))).toThrow(CalcMathError);
    expect(assertRange(D("9.999999999e99")).eq(D("9.999999999e99"))).toBe(true);
  });

  it("normalizes signed zero to +0", () => {
    const negZero = D(-1).times(0);
    expect(assertRange(negZero).isZero()).toBe(true);
    expect(assertRange(negZero).isNeg()).toBe(false);
  });

  it("factorial uses Decimal products and rejects 70", () => {
    expect(factorial(D(5)).eq(120)).toBe(true);
    expect(factorial(D(0)).eq(1)).toBe(true);
    expect(() => factorial(D(70))).toThrow(CalcMathError);
    expect(() => factorial(D("3.5"))).toThrow(CalcMathError);
  });

  it("nPr/nCr stay on Decimal (no native loop subtraction)", () => {
    expect(nPr(D(5), D(2)).eq(20)).toBe(true);
    expect(nCr(D(10), D(3)).eq(120)).toBe(true);
    expect(() => nPr(D("1e10"), D(1))).toThrow(CalcMathError);
  });

  it("Ran# is thousandths from uint32 remainder, not Math.floor", () => {
    const rng = createUint32Rng(1);
    const a = ranHash(rng());
    expect(a.gte(0) && a.lt(1)).toBe(true);
    expect(a.mod("0.001").isZero()).toBe(true);
  });

  it("RanInt stays on Decimal for the span", () => {
    const n = ranInt(D(1), D(3), 7);
    expect(n.isInteger()).toBe(true);
    expect(n.gte(1) && n.lte(3)).toBe(true);
    expect(() => ranInt(D("1.5"), D(3), 1)).toThrow(CalcMathError);
  });

  it("ROUND_HALF_UP is the clone policy, not a hardware-tie claim", () => {
    const setup = { ...defaultSetup(), numberFormat: { kind: "Fix" as const, n: 0 } };
    expect(formatBySetup(D("1.5"), setup)).toBe("2");
    expect(formatBySetup(D("2.5"), setup)).toBe("3");
    expect(roundInternal(D("1.234567890123456")).toSignificantDigits(15).eq(roundInternal(D("1.234567890123456")))).toBe(
      true,
    );
    expect(Decimal.rounding).toBe(Decimal.ROUND_HALF_UP);
  });
});

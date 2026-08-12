import { Decimal } from "decimal.js";

/** SRC-P97: internal calculation uses 15 digits. */
export const INTERNAL_DIGITS = 15;
/** Display mantissa width (10 + 2 exponent). Official spec: 10+2 digits. */
export const DISPLAY_DIGITS = 10;
/** SRC-P97: ±1×10^-99 to ±9.999999999×10^99 or 0 */
export const EXP_MIN = -99;
export const EXP_MAX = 99;

/**
 * SRC-P36: π is displayed as 3.141592654, but
 * π = 3.14159265358980 is used for internal calculations.
 */
export const PI_INTERNAL = "3.14159265358980";
/**
 * SRC-P36: e is displayed as 2.718281828, but
 * e = 2.71828182845904 is used for internal calculations.
 */
export const E_INTERNAL = "2.71828182845904";

Decimal.set({
  precision: INTERNAL_DIGITS + 5,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -(INTERNAL_DIGITS + 5),
  toExpPos: INTERNAL_DIGITS + 5,
});

export type Dec = Decimal;

export function D(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export const PI = D(PI_INTERNAL);
export const E = D(E_INTERNAL);
export const ZERO = D(0);
export const ONE = D(1);
export const TEN = D(10);

export class CalcMathError extends Error {
  readonly code = "Math ERROR" as const;
  constructor(message = "Math ERROR") {
    super(message);
    this.name = "CalcMathError";
  }
}

export class CalcSyntaxError extends Error {
  readonly code = "Syntax ERROR" as const;
  constructor(message = "Syntax ERROR") {
    super(message);
    this.name = "CalcSyntaxError";
  }
}

export class CalcArgumentError extends Error {
  readonly code = "Argument ERROR" as const;
  constructor(message = "Argument ERROR") {
    super(message);
    this.name = "CalcArgumentError";
  }
}

export class CalcStackError extends Error {
  readonly code = "Stack ERROR" as const;
  constructor(message = "Stack ERROR") {
    super(message);
    this.name = "CalcStackError";
  }
}

export function isZero(x: Decimal): boolean {
  return x.isZero();
}

export function toRad(x: Decimal, unit: "Deg" | "Rad" | "Gra"): Decimal {
  switch (unit) {
    case "Deg":
      return x.times(PI).div(180);
    case "Rad":
      return x;
    case "Gra":
      return x.times(PI).div(200);
    default: {
      const _never: never = unit;
      return _never;
    }
  }
}

export function fromRad(x: Decimal, unit: "Deg" | "Rad" | "Gra"): Decimal {
  switch (unit) {
    case "Deg":
      return x.times(180).div(PI);
    case "Rad":
      return x;
    case "Gra":
      return x.times(200).div(PI);
    default: {
      const _never: never = unit;
      return _never;
    }
  }
}

/** SRC-P97 range check. */
export function assertRange(x: Decimal): Decimal {
  if (x.isNaN() || !x.isFinite()) {
    throw new CalcMathError();
  }
  if (x.isZero()) {
    return ZERO;
  }
  const mag = x.abs();
  const min = D("1e-99");
  const max = D("9.999999999e99");
  if (mag.lt(min) && !mag.isZero()) {
    return ZERO;
  }
  if (mag.gt(max)) {
    throw new CalcMathError();
  }
  return x;
}

export function roundInternal(x: Decimal): Decimal {
  const y = x.toSignificantDigits(INTERNAL_DIGITS, Decimal.ROUND_HALF_UP);
  return assertRange(y);
}

export function gcdBig(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

export function factorial(n: Decimal): Decimal {
  if (!n.isInteger() || n.lt(0) || n.gt(69)) {
    throw new CalcMathError();
  }
  let acc = ONE;
  const ni = n.toNumber();
  for (let i = 2; i <= ni; i += 1) {
    acc = acc.times(i);
  }
  return roundInternal(acc);
}

export function nPr(n: Decimal, r: Decimal): Decimal {
  if (!n.isInteger() || !r.isInteger() || n.lt(0) || r.lt(0) || r.gt(n) || n.gte("1e10")) {
    throw new CalcMathError();
  }
  let acc = ONE;
  const nn = n.toNumber();
  const rr = r.toNumber();
  for (let i = 0; i < rr; i += 1) {
    acc = acc.times(nn - i);
  }
  return roundInternal(acc);
}

export function nCr(n: Decimal, r: Decimal): Decimal {
  if (!n.isInteger() || !r.isInteger() || n.lt(0) || r.lt(0) || r.gt(n) || n.gte("1e10")) {
    throw new CalcMathError();
  }
  const k = Decimal.min(r, n.minus(r));
  let acc = ONE;
  const kk = k.toNumber();
  const nn = n.toNumber();
  for (let i = 1; i <= kk; i += 1) {
    acc = acc.times(nn - kk + i).div(i);
  }
  return roundInternal(acc);
}

export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function ranHash(rng: () => number): Decimal {
  const n = Math.floor(rng() * 1000);
  return D(n).div(1000);
}

export function ranInt(a: Decimal, b: Decimal, rng: () => number): Decimal {
  if (a.gte(b) || a.abs().gte("1e10") || b.abs().gte("1e10") || b.minus(a).gte("1e10")) {
    throw new CalcMathError();
  }
  const aa = a.toNumber();
  const bb = b.toNumber();
  const span = bb - aa + 1;
  const n = aa + Math.floor(rng() * span);
  return D(n);
}

import { D, fromRad, PI, roundInternal, toRad, type Dec } from "./numeric.ts";
import { specialTrigFromSym } from "./specialTrig.ts";
import {
  asCplx,
  fromDec,
  isNonReal,
  packCplx,
  symAdd,
  symMul,
  symNeg,
  symRat,
  symSqrt,
  toDec,
  type Sym,
} from "./symbolic.ts";
import type { AngleUnit } from "./types.ts";

export function complexConj(s: Sym): Sym {
  const { re, im } = asCplx(s);
  return packCplx(re, symNeg(im));
}

/** |z| = √(a²+b²). TARGET-OFFICIAL-DOC Abs(1+i)=√2. */
export function complexAbs(s: Sym): Sym {
  const { re, im } = asCplx(s);
  return symSqrt(symAdd(symMul(re, re), symMul(im, im)));
}

function atan2Dec(y: Dec, x: Dec): Dec {
  if (x.gt(0)) {
    return y.div(x).atan();
  }
  if (x.lt(0) && !y.isNeg()) {
    return y.div(x).atan().plus(PI);
  }
  if (x.lt(0) && y.isNeg()) {
    return y.div(x).atan().minus(PI);
  }
  if (x.isZero() && y.gt(0)) {
    return PI.div(2);
  }
  if (x.isZero() && y.lt(0)) {
    return PI.neg().div(2);
  }
  throw new Error("math");
}

function wrapHalfTurnDeg(deg: Dec): Dec {
  let d = deg;
  while (d.lte(-180)) {
    d = d.plus(360);
  }
  while (d.gt(180)) {
    d = d.minus(360);
  }
  return d;
}

function exactArgDegrees(x: Dec, y: Dec): Dec | null {
  if (y.isZero() && x.gt(0)) {
    return D(0);
  }
  if (y.isZero() && x.lt(0)) {
    return D(180);
  }
  if (x.isZero() && y.gt(0)) {
    return D(90);
  }
  if (x.isZero() && y.lt(0)) {
    return D(-90);
  }
  if (x.eq(y) && x.gt(0)) {
    return D(45);
  }
  if (x.eq(y.neg()) && x.gt(0)) {
    return D(-45);
  }
  if (x.eq(y) && x.lt(0)) {
    return D(-135);
  }
  if (x.eq(y.neg()) && x.lt(0)) {
    return D(135);
  }
  return null;
}

/**
 * arg(z) in the current angle unit.
 * Exact quadrants/diagonals stay integers when the unit is Deg.
 * Range: −180° < θ ≦ 180° (TARGET-OFFICIAL-DOC).
 */
export function complexArg(s: Sym, angle: AngleUnit): Sym {
  const { re, im } = asCplx(s);
  const x = toDec(re);
  const y = toDec(im);
  if (x.isZero() && y.isZero()) {
    throw new Error("math");
  }
  const exact = exactArgDegrees(x, y);
  if (exact) {
    const wrapped = wrapHalfTurnDeg(exact);
    if (angle === "Deg" && wrapped.isInteger()) {
      return symRat(BigInt(wrapped.toFixed(0)));
    }
    return fromDec(fromRad(toRad(wrapped, "Deg"), angle));
  }
  const out = wrapHalfTurnDeg(fromRad(atan2Dec(y, x), "Deg"));
  if (angle === "Deg") {
    return fromDec(out);
  }
  return fromDec(fromRad(toRad(out, "Deg"), angle));
}

/** r∠θ → r(cosθ + i sinθ). TARGET-OFFICIAL-DOC 2∠45 = √2+√2i (Deg). */
export function polarToRect(r: Sym, theta: Sym, angle: AngleUnit): Sym {
  if (isNonReal(r) || isNonReal(theta)) {
    throw new Error("math");
  }
  const cosExact = specialTrigFromSym("cos", theta, angle);
  const sinExact = specialTrigFromSym("sin", theta, angle);
  const cosV = cosExact ?? fromDec(roundInternal(toRad(toDec(theta), angle).cos()));
  const sinV = sinExact ?? fromDec(roundInternal(toRad(toDec(theta), angle).sin()));
  return packCplx(symMul(r, cosV), symMul(r, sinV));
}

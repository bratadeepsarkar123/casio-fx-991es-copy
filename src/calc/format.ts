import { Decimal } from "decimal.js";
import { D, DISPLAY_DIGITS, PI, parseCalcNumber } from "./numeric.ts";
import type { ResultValue, SetupState } from "./types.ts";
import {
  asCplx,
  isZeroReal,
  ratAbs,
  ratToDec,
  symNeg,
  toDec,
  type Rat,
  type Sym,
} from "./symbolic.ts";
import { complexAbs, complexArg } from "./complex.ts";

function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) {
    return s;
  }
  return s.replace(/\.?0+$/, "");
}

export function formatSci(x: Decimal, digits: number): string {
  const n = digits === 0 ? DISPLAY_DIGITS : digits;
  const sci = x.toExponential(n - 1, Decimal.ROUND_HALF_UP);
  const [mantRaw, expRaw] = sci.split("e");
  const mant = stripTrailingZeros(mantRaw ?? "0");
  const exp = D(expRaw ?? "0");
  const mag = exp.abs().toFixed(0).padStart(2, "0");
  const expStr = exp.isNeg() ? `-${mag}` : `+${mag}`;
  return `${mant}×10${expStr}`;
}

function formatExpDigits(exp: Decimal): string {
  const mag = exp.abs().toFixed(0).padStart(2, "0");
  return exp.isNeg() ? `-${mag}` : `+${mag}`;
}

/** Engineering notation; `offsetTriples` shifts the exponent by 3 each unit. SRC-P24–25. */
export function formatEngineering(x: Decimal, offsetTriples: Decimal): string {
  if (x.isZero()) {
    return `0×10${formatExpDigits(offsetTriples.times(3))}`;
  }
  const sign = x.isNeg() ? "-" : "";
  const abs = x.abs();
  const sciExp = abs.log(10).floor();
  let rem = sciExp.mod(3);
  if (rem.isNeg()) {
    rem = rem.plus(3);
  }
  const engExp = sciExp.minus(rem).plus(offsetTriples.times(3));
  const mant = abs.div(D(10).pow(engExp));
  const mantStr = stripTrailingZeros(mant.toSignificantDigits(DISPLAY_DIGITS, Decimal.ROUND_HALF_UP).toFixed());
  return `${sign}${mantStr}×10${formatExpDigits(engExp)}`;
}

/** Degree–minute–second display. SRC-P23–24. */
export function formatSexagesimal(x: Decimal): string {
  const sign = x.isNeg() ? "-" : "";
  const abs = x.abs();
  let deg = abs.trunc();
  let minFrac = abs.minus(deg).times(60);
  let min = minFrac.trunc();
  let sec = minFrac.minus(min).times(60).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (sec.gte(60)) {
    sec = sec.minus(60);
    min = min.plus(1);
  }
  if (min.gte(60)) {
    min = min.minus(60);
    deg = deg.plus(1);
  }
  return `${sign}${deg.toFixed(0)}°${min.toFixed(0)}′${sec.toFixed(0)}″`;
}

export function formatNorm(x: Decimal, which: 1 | 2): string {
  if (x.isZero()) {
    return "0";
  }
  const mag = x.abs();
  const expThresholdLow = which === 1 ? D("1e-2") : D("1e-9");
  const expThresholdHigh = D("1e10");
  if (mag.lt(expThresholdLow) || mag.gte(expThresholdHigh)) {
    return formatSci(x, DISPLAY_DIGITS);
  }
  const s = x.toSignificantDigits(DISPLAY_DIGITS, Decimal.ROUND_HALF_UP).toFixed();
  return stripTrailingZeros(s);
}

export function formatBySetup(x: Decimal, setup: SetupState): string {
  switch (setup.numberFormat.kind) {
    case "Fix": {
      const n = setup.numberFormat.n;
      return x.toFixed(n, Decimal.ROUND_HALF_UP);
    }
    case "Sci":
      return formatSci(x, setup.numberFormat.n);
    case "Norm":
      return formatNorm(x, setup.numberFormat.n);
    default: {
      const _never: never = setup.numberFormat;
      return _never;
    }
  }
}

/** Same rounding as `formatBySetup`, but always decimal.js-parseable (no `×10`). */
export function formatNumeric(x: Decimal, setup: SetupState): string {
  switch (setup.numberFormat.kind) {
    case "Fix": {
      const n = setup.numberFormat.n;
      return x.toFixed(n, Decimal.ROUND_HALF_UP);
    }
    case "Sci": {
      const n = setup.numberFormat.n === 0 ? DISPLAY_DIGITS : setup.numberFormat.n;
      return x.toExponential(n - 1, Decimal.ROUND_HALF_UP);
    }
    case "Norm": {
      if (x.isZero()) {
        return "0";
      }
      const mag = x.abs();
      const expThresholdLow = setup.numberFormat.n === 1 ? D("1e-2") : D("1e-9");
      const expThresholdHigh = D("1e10");
      if (mag.lt(expThresholdLow) || mag.gte(expThresholdHigh)) {
        return x.toExponential(DISPLAY_DIGITS - 1, Decimal.ROUND_HALF_UP);
      }
      const s = x.toSignificantDigits(DISPLAY_DIGITS, Decimal.ROUND_HALF_UP).toFixed();
      return stripTrailingZeros(s);
    }
    default: {
      const _never: never = setup.numberFormat;
      return _never;
    }
  }
}

function ratDigits(r: Rat, mixed: boolean): number {
  const abs = ratAbs(r);
  if (!mixed || abs.n < abs.d) {
    return abs.n.toString().length + abs.d.toString().length;
  }
  const whole = abs.n / abs.d;
  const num = abs.n % abs.d;
  return whole.toString().length + num.toString().length + abs.d.toString().length;
}

function fractionDisplay(r: Rat, setup: SetupState): ResultValue | null {
  const approx = formatNumeric(ratToDec(r), setup);
  const abs = ratAbs(r);
  const sign = r.n < 0n ? "-" : "";
  if (abs.d === 1n) {
    return {
      approx,
      display: `${sign}${abs.n.toString()}`,
      naturalKind: "decimal",
    };
  }
  const asMixed = setup.fractionFormat === "ab/c";
  if (ratDigits(r, asMixed) > 10) {
    return null;
  }
  if (asMixed && abs.n > abs.d) {
    const whole = abs.n / abs.d;
    const num = abs.n % abs.d;
    if (num === 0n) {
      return {
        approx,
        display: `${sign}${whole.toString()}`,
        naturalKind: "decimal",
      };
    }
    return {
      approx,
      display: `${sign}${whole.toString()} ${num.toString()}/${abs.d.toString()}`,
      naturalKind: "mixed",
      fraction: {
        mixed: `${sign}${whole.toString()}`,
        num: num.toString(),
        den: abs.d.toString(),
      },
    };
  }
  return {
    approx,
    display: `${sign}${abs.n.toString()}/${abs.d.toString()}`,
    naturalKind: "fraction",
    fraction: { num: `${sign}${abs.n.toString()}`, den: abs.d.toString() },
  };
}

function formatQuad(s: Extract<Sym, { k: "quad" }>): string | null {
  const parts: string[] = [];
  const entries = [...s.q.entries()].sort((a, b) => {
    if (a[0] === 1n) {
      return -1;
    }
    if (b[0] === 1n) {
      return 1;
    }
    return a[0] > b[0] ? 1 : -1;
  });
  if (entries.length > 2) {
    return null;
  }
  for (const [rad, coef] of entries) {
    const sign = coef.n < 0n ? "-" : parts.length ? "+" : "";
    const abs = ratAbs(coef);
    let body: string;
    if (rad === 1n) {
      body = abs.d === 1n ? abs.n.toString() : `${abs.n}/${abs.d}`;
    } else {
      const radStr = `√${rad.toString()}`;
      if (abs.n === 1n && abs.d === 1n) {
        body = radStr;
      } else if (abs.d === 1n) {
        body = `${abs.n.toString()}${radStr}`;
      } else if (abs.n === 1n) {
        body = `${radStr}/${abs.d.toString()}`;
      } else {
        body = `${abs.n.toString()}${radStr}/${abs.d.toString()}`;
      }
    }
    parts.push(sign === "" ? body : `${sign}${body}`);
  }
  const joined = parts.join("");
  if (joined.length > 24) {
    return null;
  }
  return joined;
}

function formatSignedImag(im: Sym, setup: SetupState): { sign: "+" | "-"; body: string } {
  const neg = toDec(im).isNeg();
  const absSym = neg ? symNeg(im) : im;
  const coeff = resultFromSym(absSym, setup).display;
  const body = coeff === "1" ? "i" : `${coeff}i`;
  return { sign: neg ? "-" : "+", body };
}

function formatRectangular(re: Sym, im: Sym, setup: SetupState): string {
  if (isZeroReal(im)) {
    return resultFromSym(re, setup).display;
  }
  const { sign, body } = formatSignedImag(im, setup);
  if (isZeroReal(re)) {
    return sign === "-" ? `-${body}` : body;
  }
  const reDisp = resultFromSym(re, setup).display;
  return sign === "-" ? `${reDisp}-${body}` : `${reDisp}+${body}`;
}

function formatPolar(re: Sym, im: Sym, setup: SetupState): string {
  const z = { k: "cplx" as const, re, im };
  const r = complexAbs(z);
  const th = complexArg(z, setup.angleUnit);
  const rDisp = resultFromSym(r, setup).display;
  const thDisp = resultFromSym(th, setup).display;
  return `${rDisp}∠${thDisp}`;
}

export function resultFromSym(s: Sym, setup: SetupState, complexFormat = setup.complexFormat): ResultValue {
  if (s.k === "cplx") {
    const { re, im } = asCplx(s);
    const reApprox = formatNumeric(toDec(re), setup);
    const imApprox = formatNumeric(toDec(im), setup);
    const form = complexFormat;
    const display = form === "r∠θ" ? formatPolar(re, im, setup) : formatRectangular(re, im, setup);
    return {
      approx: reApprox,
      display,
      naturalKind: form === "r∠θ" ? "polar" : "complex",
      complex: { re: reApprox, im: imApprox },
    };
  }
  const approxDec = toDec(s);
  const approx = formatNumeric(approxDec, setup);
  const shown = formatBySetup(approxDec, setup);
  const matho = setup.displayFormat === "MthIO-MathO";
  const exact = exactRealResult(s, setup, approx, shown, approxDec);

  if (!matho) {
    if (exact.fraction || exact.pi || exact.sqrt) {
      return { ...exact, display: shown, naturalKind: "decimal" };
    }
    return { approx, display: shown, naturalKind: "decimal" };
  }
  return exact;
}

function exactRealResult(s: Sym, setup: SetupState, approx: string, shown: string, approxDec: Decimal): ResultValue {
  switch (s.k) {
    case "rat": {
      const frac = fractionDisplay(s.r, setup);
      return frac ?? { approx, display: shown, naturalKind: "decimal" };
    }
    case "pi": {
      if (approxDec.abs().gte("1e6")) {
        return { approx, display: shown, naturalKind: "decimal" };
      }
      const abs = ratAbs(s.r);
      const sign = s.r.n < 0n ? "-" : "";
      let display: string;
      if (abs.n === 1n && abs.d === 1n) {
        display = `${sign}π`;
      } else if (abs.d === 1n) {
        display = `${sign}${abs.n.toString()}π`;
      } else if (abs.n === 1n) {
        display = `${sign}π/${abs.d.toString()}`;
      } else {
        display = `${sign}${abs.n.toString()}π/${abs.d.toString()}`;
      }
      return {
        approx,
        display,
        naturalKind: "pi",
        pi: { num: `${sign}${abs.n.toString()}`, den: abs.d.toString() },
      };
    }
    case "quad": {
      const text = formatQuad(s);
      if (!text) {
        return { approx, display: shown, naturalKind: "decimal" };
      }
      return { approx, display: text, naturalKind: "sqrt", sqrt: text };
    }
    case "real":
      return { approx, display: shown, naturalKind: "decimal" };
    case "cplx":
      return { approx, display: shown, naturalKind: "decimal" };
    default: {
      const _never: never = s;
      return _never;
    }
  }
}

export function toggleSexagesimal(result: ResultValue, setup: SetupState): ResultValue {
  if (!result.sexagesimal) {
    return result;
  }
  if (result.display === result.sexagesimal) {
    return { ...result, display: formatBySetup(parseCalcNumber(result.approx), setup), naturalKind: "decimal" };
  }
  return { ...result, display: result.sexagesimal, naturalKind: "decimal" };
}

export function toggleDecimal(result: ResultValue, setup: SetupState): ResultValue {
  if (result.naturalKind === "complex" || result.naturalKind === "polar") {
    return result;
  }
  if (result.naturalKind === "decimal") {
    if (result.fraction) {
      const mixed = result.fraction.mixed
        ? `${result.fraction.mixed} ${result.fraction.num}/${result.fraction.den}`
        : `${result.fraction.num}/${result.fraction.den}`;
      return {
        ...result,
        display: mixed,
        naturalKind: result.fraction.mixed ? "mixed" : "fraction",
      };
    }
    if (result.pi) {
      const { num, den } = result.pi;
      const display = den === "1" ? `${num}π` : `${num}π/${den}`;
      return { ...result, display, naturalKind: "pi" };
    }
    if (result.sqrt) {
      return { ...result, display: result.sqrt, naturalKind: "sqrt" };
    }
    return result;
  }
  return { ...result, display: formatBySetup(parseCalcNumber(result.approx), setup), naturalKind: "decimal" };
}

export function tryPiForm(x: Decimal, setup: SetupState): ResultValue | null {
  if (x.abs().gte("1e6")) {
    return null;
  }
  const ratio = x.div(PI);
  const maxDen = 1000n;
  let bestN = 0n;
  let bestD = 1n;
  let bestErr = D(1);
  for (let d = 1n; d <= maxDen; d += 1n) {
    const n = BigInt(ratio.times(D(d.toString())).round().toFixed(0));
    const err = ratio.minus(D(n.toString()).div(D(d.toString()))).abs();
    if (err.lt(bestErr)) {
      bestErr = err;
      bestN = n;
      bestD = d;
    }
    if (err.lt("1e-12")) {
      break;
    }
  }
  if (bestErr.gt("1e-10")) {
    return null;
  }
  return resultFromSym({ k: "pi", r: { n: bestN, d: bestD } }, setup);
}

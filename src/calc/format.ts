import { Decimal } from "decimal.js";
import { CalcMathError, D, DISPLAY_DIGITS, PI, parseCalcNumber, roundInternal } from "./numeric.ts";
import type { CalcMode, DisplayFormat, ResultValue, SetupState } from "./types.ts";
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

/** Modes whose LCD uses Linear independently of the stored COMP/CMPLX preference. */
export function effectiveDisplayFormat(mode: CalcMode, preferred: DisplayFormat): DisplayFormat {
  switch (mode) {
    case "STAT":
    case "BASE-N":
    case "MATRIX":
    case "VECTOR":
      return "LineIO";
    default:
      return preferred;
  }
}

function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) {
    return s;
  }
  return s.replace(/\.?0+$/, "");
}

export function formatSci(x: Decimal, digits: number, preserveTrailingZeros = true): string {
  const n = digits === 0 ? DISPLAY_DIGITS : digits;
  const sci = x.toExponential(n - 1, Decimal.ROUND_HALF_UP);
  const [mantRaw, expRaw] = sci.split("e");
  const mant = preserveTrailingZeros ? mantRaw ?? "0" : stripTrailingZeros(mantRaw ?? "0");
  const exp = D(expRaw ?? "0");
  return `${mant}×10${formatSuperscriptExponent(exp)}`;
}

function formatSuperscriptExponent(exp: Decimal): string {
  const glyphs: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return [...exp.toFixed(0)].map((digit) => glyphs[digit] ?? digit).join("");
}

/** Engineering notation; `offsetTriples` shifts the exponent by 3 each unit. SRC-P24–25. */
export function formatEngineering(x: Decimal, offsetTriples: Decimal): string {
  if (x.isZero()) {
    return `0×10${formatSuperscriptExponent(offsetTriples.times(3))}`;
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
  return `${sign}${mantStr}×10${formatSuperscriptExponent(engExp)}`;
}

/** Degree–minute–second display. SRC-P23–24. */
export function formatSexagesimal(x: Decimal): string {
  const sign = x.isNeg() ? "-" : "";
  const abs = x.abs();
  let deg = abs.trunc();
  let minFrac = abs.minus(deg).times(60);
  let min = minFrac.trunc();
  let sec = minFrac.minus(min).times(60).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (sec.gte(60)) {
    sec = sec.minus(60);
    min = min.plus(1);
  }
  if (min.gte(60)) {
    min = min.minus(60);
    deg = deg.plus(1);
  }
  return `${sign}${deg.toFixed(0)}°${min.toFixed(0)}′${stripTrailingZeros(sec.toFixed(2))}″`;
}

export function formatNorm(x: Decimal, which: 1 | 2): string {
  if (x.isZero()) {
    return "0";
  }
  const mag = x.abs();
  const expThresholdLow = which === 1 ? D("1e-2") : D("1e-9");
  const expThresholdHigh = D("1e10");
  if (mag.lt(expThresholdLow) || mag.gte(expThresholdHigh)) {
    return formatSci(x, DISPLAY_DIGITS, false);
  }
  const s = x.toSignificantDigits(DISPLAY_DIGITS, Decimal.ROUND_HALF_UP).toFixed();
  return stripTrailingZeros(s);
}

/** Apply the selected displayed decimal separator without changing numeric storage. */
export function applyDecimalMark(display: string, decimalMark: SetupState["decimalMark"]): string {
  return decimalMark === "Comma" ? display.replace(/(\d)\.(?=\d)/g, "$1,") : display;
}

export function formatBySetup(x: Decimal, setup: SetupState): string {
  let display: string;
  switch (setup.numberFormat.kind) {
    case "Fix": {
      const n = setup.numberFormat.n;
      display = x.toFixed(n, Decimal.ROUND_HALF_UP);
      break;
    }
    case "Sci":
      display = formatSci(x, setup.numberFormat.n);
      break;
    case "Norm":
      display = formatNorm(x, setup.numberFormat.n);
      break;
    default: {
      const _never: never = setup.numberFormat;
      return _never;
    }
  }
  return applyDecimalMark(display, setup.decimalMark);
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

function mixedFractionTextLength(improper: string, denominator: string): number {
  const negative = improper.startsWith("-");
  const numerator = negative ? improper.slice(1) : improper;
  const absNumerator = BigInt(numerator);
  const den = BigInt(denominator);
  const whole = absNumerator / den;
  if (whole === 0n) {
    return numerator.length + denominator.length + 1;
  }
  const remainder = (absNumerator % den).toString();
  // E-10's limit includes the whole, numerator, denominator, space, and slash.
  return whole.toString().length + remainder.length + denominator.length + 2;
}

function fractionRepresentations(r: Rat): NonNullable<ResultValue["fraction"]> {
  const sign = r.n < 0n ? "-" : "";
  const abs = ratAbs(r);
  const whole = abs.n / abs.d;
  const remainder = abs.n % abs.d;
  return {
    ...(whole > 0n && remainder > 0n ? { mixed: `${sign}${whole.toString()}` } : {}),
    num: `${whole > 0n ? "" : sign}${(whole > 0n ? remainder : abs.n).toString()}`,
    den: abs.d.toString(),
    improper: `${sign}${abs.n.toString()}`,
  };
}

/** Apply the selected improper/mixed setting to a retained exact fraction. */
export function fractionResultForSetup(result: ResultValue, setup: SetupState): ResultValue {
  const fraction = result.fraction;
  if (!fraction) {
    return result;
  }
  const sign = fraction.improper?.startsWith("-") ?? fraction.num.startsWith("-") ? "-" : "";
  const improper = fraction.improper ?? (fraction.mixed
    ? `${sign}${(BigInt(fraction.mixed.replace(/^-/, "")) * BigInt(fraction.den) + BigInt(fraction.num))}`
    : fraction.num);
  if (setup.fractionFormat === "ab/c") {
    if (fraction.mixed) {
      const chars = mixedFractionTextLength(improper, fraction.den);
      if (chars <= 10) {
        return {
          ...result,
          display: `${fraction.mixed} ${fraction.num}${fractionSeparator(setup)}${fraction.den}`,
          naturalKind: "mixed",
          fraction,
        };
      }
    }
    if (!fraction.mixed && BigInt(improper.replace(/^-/, "")) < BigInt(fraction.den)) {
      return {
        ...result,
        display: `${improper}${fractionSeparator(setup)}${fraction.den}`,
        naturalKind: "fraction",
        fraction,
      };
    }
    return {
      ...result,
      display: formatBySetup(parseCalcNumber(result.approx), setup),
      naturalKind: "decimal",
      fraction,
    };
  }
  return {
    ...result,
    display: `${improper}${fractionSeparator(setup)}${fraction.den}`,
    naturalKind: "fraction",
    fraction,
  };
}

function fractionSeparator(setup: SetupState): string {
  return setup.displayFormat === "LineIO" ? "┘" : "/";
}

/** Numerator as displayed for this result form, including legacy v1 metadata. */
export function fractionNumeratorForResult(result: ResultValue): string {
  const fraction = result.fraction;
  if (!fraction || result.naturalKind === "mixed") {
    return fraction?.num ?? "";
  }
  if (fraction.improper) {
    return fraction.improper;
  }
  if (fraction.mixed) {
    const whole = BigInt(fraction.mixed.replace(/^-/, ""));
    const sign = fraction.mixed.startsWith("-") ? "-" : "";
    return `${sign}${whole * BigInt(fraction.den) + BigInt(fraction.num)}`;
  }
  return fraction.num;
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
  const representations = fractionRepresentations(r);
  if (asMixed && abs.n > abs.d) {
    const whole = abs.n / abs.d;
    const num = abs.n % abs.d;
    const improper = `${sign}${abs.n.toString()}`;
    if (mixedFractionTextLength(improper, abs.d.toString()) > 10) {
      return null;
    }
    if (num === 0n) {
      return {
        approx,
        display: `${sign}${whole.toString()}`,
        naturalKind: "decimal",
      };
    }
    return {
      approx,
      display: `${sign}${whole.toString()} ${num.toString()}${setup.displayFormat === "LineIO" ? "┘" : "/"}${abs.d.toString()}`,
      naturalKind: "mixed",
      fraction: representations,
    };
  }
  if (!asMixed && ratDigits(r, false) > 10) {
    return null;
  }
  return {
    approx,
    display: `${sign}${abs.n.toString()}${setup.displayFormat === "LineIO" ? "┘" : "/"}${abs.d.toString()}`,
    naturalKind: "fraction",
    fraction: representations,
  };
}

function formatQuad(s: Extract<Sym, { k: "quad" }>): string | null {
  const parts: string[] = [];
  const entries = [...s.q.entries()].sort((a, b) => (a[0] === 1n ? -1 : b[0] === 1n ? 1 : 0));
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
    const lineDisplay = setup.displayFormat !== "MthIO-MathO";
    const z = { k: "cplx" as const, re, im };
    const lineImag = formatSignedImag(im, setup);
    const display = lineDisplay
      ? form === "r∠θ"
        ? `r=${resultFromSym(complexAbs(z), setup).display}\nθ=${resultFromSym(complexArg(z, setup.angleUnit), setup).display}`
        : `${formatBySetup(toDec(re), setup)}\n${lineImag.sign}${lineImag.body}`
      : form === "r∠θ"
        ? formatPolar(re, im, setup)
        : formatRectangular(re, im, setup);
    return {
      approx: reApprox,
      display,
      naturalKind: form === "r∠θ" ? "polar" : "complex",
      complex: { re: reApprox, im: imApprox },
      internal: { re: roundInternal(toDec(re)).toString(), im: roundInternal(toDec(im)).toString() },
    };
  }
  const approxDec = toDec(s);
  const approx = formatNumeric(approxDec, setup);
  const shown = formatBySetup(approxDec, setup);
  const matho = setup.displayFormat === "MthIO-MathO";
  const exact = exactRealResult(s, setup, approx, shown, approxDec);
  const internal = { re: roundInternal(approxDec).toString(), im: "0" };

  if (!matho) {
    if (exact.fraction || exact.pi || exact.sqrt) {
      return { ...exact, display: shown, naturalKind: "decimal", internal };
    }
    return { approx, display: shown, naturalKind: "decimal", internal };
  }
  return { ...exact, internal };
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
    return { ...result, display: formatBySetup(parseCalcNumber(result.internal?.re ?? result.approx), setup), naturalKind: "decimal" };
  }
  const value = parseCalcNumber(result.internal?.re ?? result.approx);
  const maxDegrees = D(9999999).plus(D(59).div(60)).plus(D(59).div(3600));
  if (value.abs().gt(maxDegrees)) {
    throw new CalcMathError();
  }
  return { ...result, display: result.sexagesimal, naturalKind: "decimal" };
}

export function toggleDecimal(result: ResultValue, setup: SetupState): ResultValue {
  if (result.naturalKind === "complex" || result.naturalKind === "polar") {
    return result;
  }
  if (result.naturalKind === "decimal") {
    if (result.fraction) {
      return fractionResultForSetup(result, setup);
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

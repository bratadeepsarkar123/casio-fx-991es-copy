import { Decimal } from "decimal.js";
import { D, DISPLAY_DIGITS, PI } from "./numeric.ts";
import type { ResultValue, SetupState } from "./types.ts";
import {
  ratAbs,
  ratToDec,
  toDec,
  type Rat,
  type Sym,
} from "./symbolic.ts";

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
  const approx = formatBySetup(ratToDec(r), setup);
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

export function resultFromSym(s: Sym, setup: SetupState): ResultValue {
  const approxDec = toDec(s);
  const approx = formatBySetup(approxDec, setup);
  const matho = setup.displayFormat === "MthIO-MathO";

  if (!matho) {
    if (s.k === "rat") {
      const frac = fractionDisplay(s.r, setup);
    if (frac && setup.displayFormat === "LineIO") {
      return { ...frac, approx, display: approx, naturalKind: "decimal" };
    }
    }
    return { approx, display: approx, naturalKind: "decimal" };
  }

  switch (s.k) {
    case "rat": {
      const frac = fractionDisplay(s.r, setup);
      return frac ?? { approx, display: approx, naturalKind: "decimal" };
    }
    case "pi": {
      if (approxDec.abs().gte("1e6")) {
        return { approx, display: approx, naturalKind: "decimal" };
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
        return { approx, display: approx, naturalKind: "decimal" };
      }
      return { approx, display: text, naturalKind: "sqrt", sqrt: text };
    }
    case "real":
      return { approx, display: approx, naturalKind: "decimal" };
    default: {
      const _never: never = s;
      return _never;
    }
  }
}

export function toggleDecimal(result: ResultValue): ResultValue {
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
  return { ...result, display: result.approx, naturalKind: "decimal" };
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

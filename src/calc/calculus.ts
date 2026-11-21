import { CalcArgumentError, CalcMathError, CalcSyntaxError, CalcTimeoutError, D, type Dec } from "./numeric.ts";
import type { Atom } from "./types.ts";

export const MAX_QUADRATURE_INTERVALS = 4_096;
export const MAX_DIFFERENCE_REFINEMENTS = 24;

export type NumericalCall = "int" | "diff" | "Σ";

export function containsNumericalCall(atoms: Atom[]): boolean {
  let found = false;
  function visitSlot(slot: Atom[]): void {
    slot.forEach(visitAtom);
  }
  function visitAtom(atom: Atom): void {
    switch (atom.t) {
      case "call":
        if (atom.name === "int" || atom.name === "diff" || atom.name === "Σ") {
          found = true;
          return;
        }
        atom.args.forEach(visitSlot);
        break;
      case "frac":
        visitSlot(atom.num);
        visitSlot(atom.den);
        break;
      case "mixed":
        visitSlot(atom.whole);
        visitSlot(atom.num);
        visitSlot(atom.den);
        break;
      case "sexagesimal":
        visitSlot(atom.deg);
        visitSlot(atom.min);
        visitSlot(atom.sec);
        break;
      case "sqrt":
      case "cbrt":
      case "neg":
      case "abs":
      case "group":
      case "post":
      case "angle":
        visitSlot(atom.inner);
        break;
      case "nthrt":
        visitSlot(atom.n);
        visitSlot(atom.inner);
        break;
      case "pow":
        visitSlot(atom.base);
        visitSlot(atom.exp);
        break;
      case "logb":
        visitSlot(atom.base);
        visitSlot(atom.arg);
        break;
      default:
        break;
    }
  }
  visitSlot(atoms);
  return found;
}

const GK_NODES = [
  "0.991455371120812639206854697526329",
  "0.949107912342758524526189684047851",
  "0.864864423359769072789712788640926",
  "0.741531185599394439863864773280788",
  "0.586087235467691130294144838258730",
  "0.405845151377397166906606412076961",
  "0.207784955007898467600689403773245",
  "0",
].map(D);
const GK_WEIGHTS = [
  "0.022935322010529224963732008058970",
  "0.063092092629978553290700663189204",
  "0.104790010322250183839876322541518",
  "0.140653259715525918745189590510238",
  "0.169004726639267902826583426598550",
  "0.190350578064785409913256402421014",
  "0.204432940075298892414161999234649",
  "0.209482141084727828012999174891714",
].map(D);
const G_WEIGHTS: Partial<Record<number, Dec>> = {
  1: D("0.129484966168869693270611432679082"),
  3: D("0.279705391489276667901467771423780"),
  5: D("0.381830050505118944950369775488975"),
  7: D("0.417959183673469387755102040816327"),
};

function finite(value: Dec): Dec {
  if (!value.isFinite()) {
    throw new CalcMathError();
  }
  return value;
}

function pairEstimate(sample: (x: Dec) => Dec, lower: Dec, upper: Dec): { value: Dec; error: Dec } {
  const center = lower.plus(upper).div(2);
  const half = upper.minus(lower).div(2);
  let kronrod = D(0);
  let gauss = D(0);
  for (let i = 0; i < GK_NODES.length; i += 1) {
    const node = GK_NODES[i];
    const weight = GK_WEIGHTS[i];
    if (!node || !weight) {
      continue;
    }
    const offset = half.times(node);
    const sum = i === 7
      ? sample(center)
      : sample(center.minus(offset)).plus(sample(center.plus(offset)));
    kronrod = kronrod.plus(weight.times(sum));
    const gaussWeight = G_WEIGHTS[i];
    if (gaussWeight) {
      gauss = gauss.plus(gaussWeight.times(sum));
    }
  }
  const kValue = finite(kronrod.times(half));
  const gValue = finite(gauss.times(half));
  return { value: kValue, error: kValue.minus(gValue).abs() };
}

export function integrateAdaptive(
  sample: (x: Dec) => Dec,
  start: Dec,
  end: Dec,
  tolerance = D("1e-5"),
): Dec {
  if (tolerance.lt("1e-14")) {
    throw new CalcArgumentError();
  }
  if (start.eq(end)) {
    return D(0);
  }
  const reverse = start.gt(end);
  const lower = reverse ? end : start;
  const upper = reverse ? start : end;
  const stack: { lower: Dec; upper: Dec; tolerance: Dec }[] = [{ lower, upper, tolerance }];
  let intervals = 0;
  let total = D(0);
  while (stack.length > 0) {
    const part = stack.pop();
    if (!part) {
      break;
    }
    intervals += 1;
    if (intervals > MAX_QUADRATURE_INTERVALS) {
      throw new CalcTimeoutError();
    }
    const estimate = pairEstimate(sample, part.lower, part.upper);
    if (estimate.error.lte(part.tolerance.times(D(1).plus(estimate.value.abs()))) || part.lower.plus(part.upper).div(2).eq(part.lower) || part.lower.plus(part.upper).div(2).eq(part.upper)) {
      total = total.plus(estimate.value);
      continue;
    }
    const middle = part.lower.plus(part.upper).div(2);
    const partWidth = part.upper.minus(part.lower);
    const leftWidth = middle.minus(part.lower);
    const rightWidth = part.upper.minus(middle);
    stack.push({ lower: middle, upper: part.upper, tolerance: part.tolerance.times(rightWidth.div(partWidth)) });
    stack.push({ lower: part.lower, upper: middle, tolerance: part.tolerance.times(leftWidth.div(partWidth)) });
  }
  return finite(reverse ? total.negated() : total);
}

export function differentiateCentral(
  sample: (x: Dec) => Dec,
  at: Dec,
  tolerance = D("1e-10"),
  explicitTolerance = false,
): Dec {
  if (tolerance.lt("1e-14")) {
    throw new CalcArgumentError();
  }
  let step = at.abs().gte(1) ? at.abs().times("1e-4") : D("1e-4");
  let previous: Dec | null = null;
  let best: Dec | null = null;
  let bestError: Dec | null = null;
  for (let i = 0; i < MAX_DIFFERENCE_REFINEMENTS; i += 1) {
    const slope = finite(sample(at.plus(step)).minus(sample(at.minus(step))).div(step.times(2)));
    if (previous) {
      const extrapolated = finite(slope.plus(slope.minus(previous).div(3)));
      const error = extrapolated.minus(slope).abs();
      if (!bestError || error.lt(bestError)) {
        best = extrapolated;
        bestError = error;
      }
      if (error.lte(tolerance.times(D(1).plus(extrapolated.abs())))) {
        return extrapolated;
      }
      if (bestError && error.gt(bestError.times(4))) {
        break;
      }
    }
    previous = slope;
    step = step.div(2);
  }
  if (!best || !bestError) {
    throw new CalcMathError();
  }
  if (!explicitTolerance && bestError.lte("1e-7")) {
    return best;
  }
  throw new CalcTimeoutError();
}

export function sumIntegerRange(sample: (x: Dec) => Dec, start: Dec, end: Dec): Dec {
  if (!start.isInteger() || !end.isInteger() || start.abs().gte("1e10") || end.abs().gte("1e10") || start.gt(end)) {
    throw new CalcArgumentError();
  }
  const first = start.toNumber();
  const last = end.toNumber();
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) {
    throw new CalcArgumentError();
  }
  let total = D(0);
  for (let x = first; x <= last; x += 1) {
    total = total.plus(finite(sample(D(x))));
    if (!total.isFinite()) {
      throw new CalcMathError();
    }
  }
  return total;
}

export function assertAllowedCalculusTree(call: NumericalCall, args: Atom[][]): void {
  const forbidden = new Set(["Pol", "Rec", "int", "diff", "Σ"]);
  function visitSlot(slot: Atom[]): void {
    slot.forEach(visitAtom);
  }
  function visitAtom(atom: Atom): void {
    switch (atom.t) {
      case "call":
        if (forbidden.has(atom.name)) {
          throw new CalcSyntaxError();
        }
        atom.args.forEach(visitSlot);
        break;
      case "frac":
        visitSlot(atom.num);
        visitSlot(atom.den);
        break;
      case "mixed":
        visitSlot(atom.whole);
        visitSlot(atom.num);
        visitSlot(atom.den);
        break;
      case "sexagesimal":
        visitSlot(atom.deg);
        visitSlot(atom.min);
        visitSlot(atom.sec);
        break;
      case "sqrt":
      case "cbrt":
      case "neg":
      case "abs":
      case "group":
      case "post":
      case "angle":
        visitSlot(atom.inner);
        break;
      case "nthrt":
        visitSlot(atom.n);
        visitSlot(atom.inner);
        break;
      case "pow":
        visitSlot(atom.base);
        visitSlot(atom.exp);
        break;
      case "logb":
        visitSlot(atom.base);
        visitSlot(atom.arg);
        break;
      default:
        break;
    }
  }
  if (!forbidden.has(call)) {
    throw new CalcSyntaxError();
  }
  args.forEach(visitSlot);
}

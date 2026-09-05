import {
  CalcArgumentError,
  CalcMathError,
  CalcSyntaxError,
  D,
  PI,
  type Dec,
} from "./numeric.ts";
import type { StatRow, StatType } from "./types.ts";

/** TARGET-OFFICIAL-DOC row caps. Do not copy 115/C 40/20/26. */
export function statMaxRows(type: StatType, freqOn: boolean): number {
  const paired = type !== "1-VAR";
  if (!paired && !freqOn) {
    return 80;
  }
  if (paired && freqOn) {
    return 26;
  }
  return 40;
}

export function isPairedStatType(type: StatType): boolean {
  return type !== "1-VAR";
}

export interface StatPoint {
  x: Dec;
  y: Dec | null;
  freq: Dec;
}

export interface StatSums {
  n: Dec;
  sumX: Dec;
  sumX2: Dec;
  sumX3: Dec;
  sumX4: Dec;
  sumY: Dec;
  sumY2: Dec;
  sumXY: Dec;
  sumX2Y: Dec;
  minX: Dec;
  maxX: Dec;
  minY: Dec | null;
  maxY: Dec | null;
}

function requirePositiveIntFreq(raw: string | null): Dec {
  const s = raw == null || raw === "" ? "1" : raw;
  let f: Dec;
  try {
    f = D(s);
  } catch {
    throw new CalcArgumentError();
  }
  if (!f.isFinite() || f.lte(0) || !f.isInteger()) {
    throw new CalcArgumentError();
  }
  return f;
}

function parseCell(raw: string | null, required: boolean): Dec | null {
  if (raw == null || raw === "") {
    if (required) {
      return null;
    }
    return null;
  }
  try {
    const v = D(raw);
    if (!v.isFinite()) {
      throw new CalcArgumentError();
    }
    return v;
  } catch (err) {
    if (err instanceof CalcArgumentError) {
      throw err;
    }
    throw new CalcArgumentError();
  }
}

/**
 * Expand editor rows into weighted sample points.
 * Blank/incomplete rows are skipped (INFERRED). Empty FREQ defaults to 1 (official Ex2).
 */
export function expandStatRows(type: StatType, rows: StatRow[], freqOn: boolean): StatPoint[] {
  const paired = isPairedStatType(type);
  const out: StatPoint[] = [];
  for (const row of rows) {
    const x = parseCell(row.x, true);
    if (x === null) {
      continue;
    }
    let y: Dec | null = null;
    if (paired) {
      y = parseCell(row.y, true);
      if (y === null) {
        continue;
      }
    }
    const freq = freqOn ? requirePositiveIntFreq(row.freq) : D(1);
    out.push({ x, y, freq });
  }
  return out;
}

export function accumulateSums(points: StatPoint[]): StatSums {
  if (points.length === 0) {
    throw new CalcMathError();
  }
  let n = D(0);
  let sumX = D(0);
  let sumX2 = D(0);
  let sumX3 = D(0);
  let sumX4 = D(0);
  let sumY = D(0);
  let sumY2 = D(0);
  let sumXY = D(0);
  let sumX2Y = D(0);
  let minX = points[0]!.x;
  let maxX = points[0]!.x;
  let minY: Dec | null = points[0]!.y;
  let maxY: Dec | null = points[0]!.y;
  for (const p of points) {
    const f = p.freq;
    const x = p.x;
    n = n.plus(f);
    sumX = sumX.plus(f.times(x));
    const x2 = x.times(x);
    sumX2 = sumX2.plus(f.times(x2));
    sumX3 = sumX3.plus(f.times(x2).times(x));
    sumX4 = sumX4.plus(f.times(x2).times(x2));
    if (x.lt(minX)) {
      minX = x;
    }
    if (x.gt(maxX)) {
      maxX = x;
    }
    if (p.y !== null) {
      const y = p.y;
      sumY = sumY.plus(f.times(y));
      sumY2 = sumY2.plus(f.times(y).times(y));
      sumXY = sumXY.plus(f.times(x).times(y));
      sumX2Y = sumX2Y.plus(f.times(x2).times(y));
      if (minY === null || y.lt(minY)) {
        minY = y;
      }
      if (maxY === null || y.gt(maxY)) {
        maxY = y;
      }
    }
  }
  if (n.lte(0)) {
    throw new CalcMathError();
  }
  return { n, sumX, sumX2, sumX3, sumX4, sumY, sumY2, sumXY, sumX2Y, minX, maxX, minY, maxY };
}

function varianceNumerator(n: Dec, sumX: Dec, sumX2: Dec): Dec {
  return n.times(sumX2).minus(sumX.times(sumX));
}

export function meanFromSums(sum: Dec, n: Dec): Dec {
  if (n.lte(0)) {
    throw new CalcMathError();
  }
  return sum.div(n);
}

/** Casio population σ: √((n Σx² − (Σx)²) / n²). Ex2: √(4/3). */
export function popSdFromSums(n: Dec, sumX: Dec, sumX2: Dec): Dec {
  if (n.lte(0)) {
    throw new CalcMathError();
  }
  const num = varianceNumerator(n, sumX, sumX2);
  if (num.lt(0)) {
    throw new CalcMathError();
  }
  return num.div(n.times(n)).sqrt();
}

/** Sample s: √((n Σx² − (Σx)²) / (n(n−1))). n<2 → Math ERROR (INFERRED). */
export function sampleSdFromSums(n: Dec, sumX: Dec, sumX2: Dec): Dec {
  if (n.lt(2)) {
    throw new CalcMathError();
  }
  const num = varianceNumerator(n, sumX, sumX2);
  if (num.lt(0)) {
    throw new CalcMathError();
  }
  return num.div(n.times(n.minus(1))).sqrt();
}

export interface LinearFit {
  A: Dec;
  B: Dec;
  r: Dec;
}

/** Ordinary least squares y = A + B u, weighted by frequency. */
export function linearFitUV(points: Array<{ u: Dec; v: Dec; freq: Dec }>): LinearFit {
  if (points.length === 0) {
    throw new CalcMathError();
  }
  let n = D(0);
  let sumU = D(0);
  let sumV = D(0);
  let sumU2 = D(0);
  let sumV2 = D(0);
  let sumUV = D(0);
  for (const p of points) {
    const f = p.freq;
    n = n.plus(f);
    sumU = sumU.plus(f.times(p.u));
    sumV = sumV.plus(f.times(p.v));
    sumU2 = sumU2.plus(f.times(p.u).times(p.u));
    sumV2 = sumV2.plus(f.times(p.v).times(p.v));
    sumUV = sumUV.plus(f.times(p.u).times(p.v));
  }
  if (n.lt(2)) {
    throw new CalcMathError();
  }
  const denU = n.times(sumU2).minus(sumU.times(sumU));
  const denV = n.times(sumV2).minus(sumV.times(sumV));
  if (denU.isZero()) {
    throw new CalcMathError();
  }
  const B = n.times(sumUV).minus(sumU.times(sumV)).div(denU);
  const A = sumV.minus(B.times(sumU)).div(n);
  if (denU.lte(0) || denV.lte(0)) {
    throw new CalcMathError();
  }
  const rNum = n.times(sumUV).minus(sumU.times(sumV));
  const r = rNum.div(denU.times(denV).sqrt());
  return { A, B, r };
}

function requirePaired(points: StatPoint[]): Array<{ x: Dec; y: Dec; freq: Dec }> {
  const out: Array<{ x: Dec; y: Dec; freq: Dec }> = [];
  for (const p of points) {
    if (p.y === null) {
      throw new CalcMathError();
    }
    out.push({ x: p.x, y: p.y, freq: p.freq });
  }
  return out;
}

function mapLinear(
  paired: Array<{ x: Dec; y: Dec; freq: Dec }>,
  toUV: (x: Dec, y: Dec) => { u: Dec; v: Dec },
): LinearFit {
  const pts = paired.map((p) => {
    const { u, v } = toUV(p.x, p.y);
    return { u, v, freq: p.freq };
  });
  return linearFitUV(pts);
}

export interface QuadFit {
  A: Dec;
  B: Dec;
  C: Dec;
}

function solve3(m: Dec[][], b: Dec[]): Dec[] {
  const a = m.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < 3; r += 1) {
      if (a[r]![col]!.abs().gt(a[pivot]![col]!.abs())) {
        pivot = r;
      }
    }
    const swap = a[col];
    a[col] = a[pivot]!;
    a[pivot] = swap!;
    const diag = a[col]![col]!;
    if (diag.abs().eq(0)) {
      throw new CalcMathError();
    }
    for (let c = col; c < 4; c += 1) {
      a[col]![c] = a[col]![c]!.div(diag);
    }
    for (let r = 0; r < 3; r += 1) {
      if (r === col) {
        continue;
      }
      const f = a[r]![col]!;
      for (let c = col; c < 4; c += 1) {
        a[r]![c] = a[r]![c]!.minus(f.times(a[col]![c]!));
      }
    }
  }
  return [a[0]![3]!, a[1]![3]!, a[2]![3]!];
}

export function quadraticFit(points: StatPoint[]): QuadFit {
  const paired = requirePaired(points);
  if (paired.length < 3) {
    throw new CalcMathError();
  }
  const s = accumulateSums(points);
  if (s.n.lt(3)) {
    throw new CalcMathError();
  }
  const m = [
    [s.n, s.sumX, s.sumX2],
    [s.sumX, s.sumX2, s.sumX3],
    [s.sumX2, s.sumX3, s.sumX4],
  ];
  const rhs = [s.sumY, s.sumXY, s.sumX2Y];
  const [A, B, C] = solve3(m, rhs);
  return { A: A!, B: B!, C: C! };
}

export interface RegressionModel {
  A: Dec;
  B: Dec;
  C: Dec | null;
  r: Dec | null;
}

export function fitRegression(type: StatType, points: StatPoint[]): RegressionModel {
  switch (type) {
    case "1-VAR":
      throw new CalcSyntaxError();
    case "A+BX": {
      const fit = mapLinear(requirePaired(points), (x, y) => ({ u: x, v: y }));
      return { A: fit.A, B: fit.B, C: null, r: fit.r };
    }
    case "_+CX2": {
      const q = quadraticFit(points);
      return { A: q.A, B: q.B, C: q.C, r: null };
    }
    case "ln X": {
      const paired = requirePaired(points);
      for (const p of paired) {
        if (p.x.lte(0)) {
          throw new CalcMathError();
        }
      }
      const fit = mapLinear(paired, (x, y) => ({ u: x.ln(), v: y }));
      return { A: fit.A, B: fit.B, C: null, r: fit.r };
    }
    case "e^X": {
      const paired = requirePaired(points);
      for (const p of paired) {
        if (p.y.lte(0)) {
          throw new CalcMathError();
        }
      }
      const fit = mapLinear(paired, (x, y) => ({ u: x, v: y.ln() }));
      return { A: fit.A.exp(), B: fit.B, C: null, r: fit.r };
    }
    case "A•B^X": {
      const paired = requirePaired(points);
      for (const p of paired) {
        if (p.y.lte(0)) {
          throw new CalcMathError();
        }
      }
      const fit = mapLinear(paired, (x, y) => ({ u: x, v: y.ln() }));
      return { A: fit.A.exp(), B: fit.B.exp(), C: null, r: fit.r };
    }
    case "A•X^B": {
      const paired = requirePaired(points);
      for (const p of paired) {
        if (p.x.lte(0) || p.y.lte(0)) {
          throw new CalcMathError();
        }
      }
      const fit = mapLinear(paired, (x, y) => ({ u: x.ln(), v: y.ln() }));
      return { A: fit.A.exp(), B: fit.B, C: null, r: fit.r };
    }
    case "1/X": {
      const paired = requirePaired(points);
      for (const p of paired) {
        if (p.x.isZero()) {
          throw new CalcMathError();
        }
      }
      const fit = mapLinear(paired, (x, y) => ({ u: D(1).div(x), v: y }));
      return { A: fit.A, B: fit.B, C: null, r: fit.r };
    }
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

export function predictY(type: StatType, model: RegressionModel, x: Dec): Dec {
  switch (type) {
    case "1-VAR":
      throw new CalcSyntaxError();
    case "A+BX":
      return model.A.plus(model.B.times(x));
    case "_+CX2":
      if (model.C === null) {
        throw new CalcMathError();
      }
      return model.A.plus(model.B.times(x)).plus(model.C.times(x).times(x));
    case "ln X":
      if (x.lte(0)) {
        throw new CalcMathError();
      }
      return model.A.plus(model.B.times(x.ln()));
    case "e^X":
      return model.A.times(model.B.times(x).exp());
    case "A•B^X":
      if (model.B.lte(0)) {
        throw new CalcMathError();
      }
      return model.A.times(model.B.pow(x));
    case "A•X^B":
      if (x.lte(0)) {
        throw new CalcMathError();
      }
      return model.A.times(x.pow(model.B));
    case "1/X":
      if (x.isZero()) {
        throw new CalcMathError();
      }
      return model.A.plus(model.B.div(x));
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

export function predictX(type: StatType, model: RegressionModel, y: Dec): Dec {
  switch (type) {
    case "1-VAR":
    case "_+CX2":
      throw new CalcSyntaxError();
    case "A+BX":
      if (model.B.isZero()) {
        throw new CalcMathError();
      }
      return y.minus(model.A).div(model.B);
    case "ln X": {
      if (model.B.isZero()) {
        throw new CalcMathError();
      }
      return y.minus(model.A).div(model.B).exp();
    }
    case "e^X": {
      if (model.A.isZero() || model.B.isZero()) {
        throw new CalcMathError();
      }
      const ratio = y.div(model.A);
      if (ratio.lte(0)) {
        throw new CalcMathError();
      }
      return ratio.ln().div(model.B);
    }
    case "A•B^X": {
      if (model.A.isZero() || model.B.lte(0) || model.B.eq(1)) {
        throw new CalcMathError();
      }
      const ratio = y.div(model.A);
      if (ratio.lte(0)) {
        throw new CalcMathError();
      }
      return ratio.ln().div(model.B.ln());
    }
    case "A•X^B": {
      if (model.A.isZero() || model.B.isZero()) {
        throw new CalcMathError();
      }
      const ratio = y.div(model.A);
      if (ratio.lte(0)) {
        throw new CalcMathError();
      }
      return ratio.ln().div(model.B).exp();
    }
    case "1/X": {
      const den = y.minus(model.A);
      if (den.isZero()) {
        throw new CalcMathError();
      }
      return model.B.div(den);
    }
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

export function predictXQuadratic(model: RegressionModel, y: Dec): { x1: Dec; x2: Dec } {
  const C = model.C;
  if (C === null || C.isZero()) {
    throw new CalcMathError();
  }
  const disc = model.B.times(model.B).minus(D(4).times(C).times(model.A.minus(y)));
  if (disc.lt(0)) {
    throw new CalcMathError();
  }
  const root = disc.sqrt();
  const twoC = C.times(2);
  const xa = model.B.neg().plus(root).div(twoC);
  const xb = model.B.neg().minus(root).div(twoC);
  if (xa.lte(xb)) {
    return { x1: xa, x2: xb };
  }
  return { x1: xb, x2: xa };
}

/**
 * erf via Maclaurin series (decimal.js). |x|≥6 → ±1.
 * Used only for STAT Distr P/Q/R (official Ex5: P(t)=Φ(t)).
 */
export function erfDec(x: Dec): Dec {
  if (x.isZero()) {
    return D(0);
  }
  const sign = x.isNeg() ? D(-1) : D(1);
  const ax = x.abs();
  if (ax.gte(6)) {
    return sign;
  }
  let term = ax;
  let sum = ax;
  let n = 1;
  while (n < 80) {
    term = term.times(ax).times(ax).neg().times(D(2 * n - 1)).div(D(n).times(D(2 * n + 1)));
    sum = sum.plus(term);
    if (term.abs().lt("1e-18")) {
      break;
    }
    n += 1;
  }
  return sign.times(sum.times(2).div(PI.sqrt()));
}

/** Standard normal CDF Φ(t) = 1/2 (1 + erf(t/√2)). Official Ex5: P(t)=Φ(t). */
export function stdNormCdf(t: Dec): Dec {
  return D(0.5).times(D(1).plus(erfDec(t.div(D(2).sqrt()))));
}

export function statP(t: Dec): Dec {
  return stdNormCdf(t);
}

/** 115/C diagram: area from 0 to t. INFERRED as Φ(t)−1/2. */
export function statQ(t: Dec): Dec {
  return stdNormCdf(t).minus(D(0.5));
}

/** 115/C diagram: upper tail. INFERRED as 1−Φ(t). */
export function statR(t: Dec): Dec {
  return D(1).minus(stdNormCdf(t));
}

export function normalizedT(x: Dec, mean: Dec, popSd: Dec): Dec {
  if (popSd.isZero()) {
    throw new CalcMathError();
  }
  return x.minus(mean).div(popSd);
}

export const STAT_CALL_LABELS: Record<string, string> = {
  "stat-sumX2": "Σx²",
  "stat-sumX": "Σx",
  "stat-sumY2": "Σy²",
  "stat-sumY": "Σy",
  "stat-sumXY": "Σxy",
  "stat-sumX3": "Σx³",
  "stat-sumX2Y": "Σx²y",
  "stat-sumX4": "Σx⁴",
  "stat-n": "n",
  "stat-meanX": "x̄",
  "stat-popSdX": "σx",
  "stat-sampleSdX": "sx",
  "stat-meanY": "ȳ",
  "stat-popSdY": "σy",
  "stat-sampleSdY": "sy",
  "stat-minX": "minX",
  "stat-maxX": "maxX",
  "stat-minY": "minY",
  "stat-maxY": "maxY",
  "stat-A": "A",
  "stat-B": "B",
  "stat-C": "C",
  "stat-r": "r",
  "stat-xhat": "x̂",
  "stat-yhat": "ŷ",
  "stat-xhat1": "x̂1",
  "stat-xhat2": "x̂2",
  "stat-P": "P",
  "stat-Q": "Q",
  "stat-R": "R",
  "stat-t": "t",
};

export function isStatCallName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(STAT_CALL_LABELS, name);
}

export function evalStatCommand(
  name: string,
  arg: Dec | null,
  type: StatType,
  rows: StatRow[],
  freqOn: boolean,
): Dec {
  const points = expandStatRows(type, rows, freqOn);
  if (points.length === 0 && name !== "stat-n") {
    throw new CalcMathError();
  }
  const sums = points.length === 0 ? null : accumulateSums(points);
  const paired = isPairedStatType(type);
  switch (name) {
    case "stat-n":
      return sums ? sums.n : D(0);
    case "stat-sumX":
      return sums!.sumX;
    case "stat-sumX2":
      return sums!.sumX2;
    case "stat-sumY":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sums!.sumY;
    case "stat-sumY2":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sums!.sumY2;
    case "stat-sumXY":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sums!.sumXY;
    case "stat-sumX3":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sums!.sumX3;
    case "stat-sumX2Y":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sums!.sumX2Y;
    case "stat-sumX4":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sums!.sumX4;
    case "stat-meanX":
      return meanFromSums(sums!.sumX, sums!.n);
    case "stat-popSdX":
      return popSdFromSums(sums!.n, sums!.sumX, sums!.sumX2);
    case "stat-sampleSdX":
      return sampleSdFromSums(sums!.n, sums!.sumX, sums!.sumX2);
    case "stat-meanY":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return meanFromSums(sums!.sumY, sums!.n);
    case "stat-popSdY":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return popSdFromSums(sums!.n, sums!.sumY, sums!.sumY2);
    case "stat-sampleSdY":
      if (!paired) {
        throw new CalcSyntaxError();
      }
      return sampleSdFromSums(sums!.n, sums!.sumY, sums!.sumY2);
    case "stat-minX":
      return sums!.minX;
    case "stat-maxX":
      return sums!.maxX;
    case "stat-minY":
      if (!paired || sums!.minY === null) {
        throw new CalcSyntaxError();
      }
      return sums!.minY;
    case "stat-maxY":
      if (!paired || sums!.maxY === null) {
        throw new CalcSyntaxError();
      }
      return sums!.maxY;
    case "stat-A":
    case "stat-B":
    case "stat-C":
    case "stat-r":
    case "stat-xhat":
    case "stat-yhat":
    case "stat-xhat1":
    case "stat-xhat2": {
      if (!paired) {
        throw new CalcSyntaxError();
      }
      const model = fitRegression(type, points);
      if (name === "stat-A") {
        return model.A;
      }
      if (name === "stat-B") {
        return model.B;
      }
      if (name === "stat-C") {
        if (type !== "_+CX2" || model.C === null) {
          throw new CalcSyntaxError();
        }
        return model.C;
      }
      if (name === "stat-r") {
        if (type === "_+CX2" || model.r === null) {
          throw new CalcSyntaxError();
        }
        return model.r;
      }
      if (arg === null) {
        throw new CalcSyntaxError();
      }
      if (name === "stat-yhat") {
        return predictY(type, model, arg);
      }
      if (name === "stat-xhat") {
        return predictX(type, model, arg);
      }
      const xs = predictXQuadratic(model, arg);
      return name === "stat-xhat1" ? xs.x1 : xs.x2;
    }
    case "stat-t": {
      if (paired) {
        throw new CalcSyntaxError();
      }
      if (arg === null) {
        throw new CalcSyntaxError();
      }
      const mean = meanFromSums(sums!.sumX, sums!.n);
      const sd = popSdFromSums(sums!.n, sums!.sumX, sums!.sumX2);
      return normalizedT(arg, mean, sd);
    }
    case "stat-P":
    case "stat-Q":
    case "stat-R": {
      if (paired) {
        throw new CalcSyntaxError();
      }
      if (arg === null) {
        throw new CalcSyntaxError();
      }
      if (name === "stat-P") {
        return statP(arg);
      }
      if (name === "stat-Q") {
        return statQ(arg);
      }
      return statR(arg);
    }
    default:
      throw new CalcSyntaxError();
  }
}

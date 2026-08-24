import { resultFromSym } from "./format.ts";
import { assertRange, CalcMathError, D, type Dec } from "./numeric.ts";
import {
  fromDec,
  isZeroReal,
  packCplx,
  symAdd,
  symDiv,
  symMul,
  symNeg,
  symRat,
  symSqrt,
  symSub,
  toDec,
  type Sym,
} from "./symbolic.ts";
import type { EqnType, ResultValue, SetupState } from "./types.ts";

export type EqnSolveKind = "solutions" | "no-solution" | "infinite" | "math-error";

export interface EqnSolvedRoot {
  label: string;
  sym: Sym;
}

export type EqnSolveResult =
  | { kind: "solutions"; solutions: EqnSolvedRoot[] }
  | { kind: "no-solution" }
  | { kind: "infinite" }
  | { kind: "math-error" };

const ZERO = symRat(0n);
const TWO = symRat(2n);
const FOUR = symRat(4n);

function rangeSym(s: Sym): Sym {
  if (s.k === "cplx") {
    assertRange(toDec(s.re));
    assertRange(toDec(s.im));
    return s;
  }
  const raw = toDec(s);
  const dec = assertRange(raw);
  if (raw.isZero() || (dec.isZero() && !raw.isZero())) {
    return ZERO;
  }
  return s;
}

function polyAt(coeffs: Sym[], x: Sym): Sym {
  let acc = ZERO;
  for (const c of coeffs) {
    acc = symAdd(symMul(acc, x), c);
  }
  return acc;
}

function discSign(d: Sym): -1 | 0 | 1 {
  if (isZeroReal(d)) {
    return 0;
  }
  return toDec(d).isNeg() ? -1 : 1;
}

function sqrtDisc(d: Sym): Sym {
  const sign = discSign(d);
  if (sign === 0) {
    return ZERO;
  }
  if (sign > 0) {
    return symSqrt(d);
  }
  return packCplx(ZERO, symSqrt(symNeg(d)));
}

function sameRoot(a: Sym, b: Sym): boolean {
  return isZeroReal(symSub(a, b));
}

function solveQuadraticPair(a: Sym, b: Sym, c: Sym, labels: [string, string, string]): EqnSolveResult {
  if (isZeroReal(a)) {
    return { kind: "math-error" };
  }
  const twoA = symMul(TWO, a);
  const disc = symSub(symMul(b, b), symMul(symMul(FOUR, a), c));
  const root = sqrtDisc(disc);
  const x1 = rangeSym(symDiv(symSub(root, b), twoA));
  const x2 = rangeSym(symDiv(symSub(symNeg(root), b), twoA));
  if (discSign(disc) === 0 || sameRoot(x1, x2)) {
    return { kind: "solutions", solutions: [{ label: labels[0], sym: x1 }] };
  }
  return {
    kind: "solutions",
    solutions: [
      { label: labels[1], sym: x1 },
      { label: labels[2], sym: x2 },
    ],
  };
}

function asInteger(s: Sym): bigint | null {
  if (s.k === "rat" && s.r.d === 1n) {
    return s.r.n;
  }
  if (s.k === "real" && s.v.isInteger()) {
    return BigInt(s.v.toFixed(0));
  }
  return null;
}

function factors(n: bigint): bigint[] {
  const mag = n < 0n ? -n : n;
  if (mag === 0n) {
    return [0n];
  }
  const out: bigint[] = [];
  for (let i = 1n; i * i <= mag; i += 1n) {
    if (mag % i === 0n) {
      out.push(i);
      const other = mag / i;
      if (other !== i) {
        out.push(other);
      }
    }
  }
  out.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  return out;
}

/** Magnitude ascending, negative first at each magnitude. Reproduces official Ex5. */
function rationalRootCandidates(a: Sym, d: Sym): Sym[] {
  const ai = asInteger(a);
  const di = asInteger(d);
  if (ai === null || di === null || ai === 0n) {
    return [];
  }
  const qs = factors(ai);
  const ps = factors(di);
  const seen = new Set<string>();
  const raw: Sym[] = [];
  for (const p of ps) {
    for (const q of qs) {
      if (q === 0n) {
        continue;
      }
      const pos = symRat(p, q);
      const neg = symRat(-p, q);
      for (const cand of [neg, pos]) {
        if (cand.k !== "rat") {
          continue;
        }
        const key = `${cand.r.n}/${cand.r.d}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        raw.push(cand);
      }
    }
  }
  raw.sort((x, y) => {
    const dx = toDec(x);
    const dy = toDec(y);
    const ax = dx.abs();
    const ay = dy.abs();
    if (!ax.eq(ay)) {
      return ax.lt(ay) ? -1 : 1;
    }
    if (dx.isNeg() && !dy.isNeg()) {
      return -1;
    }
    if (!dx.isNeg() && dy.isNeg()) {
      return 1;
    }
    return 0;
  });
  return raw;
}

function deflateCubic(a: Sym, b: Sym, c: Sym, d: Sym, root: Sym): { a2: Sym; b2: Sym; c2: Sym } | null {
  const a2 = a;
  const b2 = symAdd(b, symMul(a2, root));
  const c2 = symAdd(c, symMul(b2, root));
  const rem = symAdd(d, symMul(c2, root));
  if (!isZeroReal(rem)) {
    return null;
  }
  return { a2, b2, c2 };
}

function newtonCubicRoot(a: Dec, b: Dec, c: Dec, d: Dec): Dec | null {
  let x = D(0);
  for (let i = 0; i < 48; i += 1) {
    const f = a.times(x).plus(b).times(x).plus(c).times(x).plus(d);
    const fp = a.times(3).times(x).times(x).plus(b.times(2).times(x)).plus(c);
    if (fp.isZero()) {
      x = x.plus(1);
      continue;
    }
    const next = x.minus(f.div(fp));
    if (next.minus(x).abs().lte("1e-14")) {
      return next;
    }
    x = next;
  }
  return null;
}

function solveCubic(a: Sym, b: Sym, c: Sym, d: Sym): EqnSolveResult {
  if (isZeroReal(a)) {
    return { kind: "math-error" };
  }
  let root: Sym | null = null;
  for (const cand of rationalRootCandidates(a, d)) {
    if (isZeroReal(polyAt([a, b, c, d], cand))) {
      root = cand;
      break;
    }
  }
  if (!root) {
    const found = newtonCubicRoot(toDec(a), toDec(b), toDec(c), toDec(d));
    if (!found) {
      return { kind: "math-error" };
    }
    root = fromDec(found);
  }
  const deflated = deflateCubic(a, b, c, d, root);
  if (!deflated) {
    return { kind: "math-error" };
  }
  const quad = solveQuadraticPair(deflated.a2, deflated.b2, deflated.c2, ["X", "X2", "X3"]);
  if (quad.kind !== "solutions") {
    return quad;
  }
  const rest = quad.solutions;
  if (rest.length === 1 && sameRoot(root, rest[0]!.sym)) {
    return { kind: "solutions", solutions: [{ label: "X", sym: rangeSym(root) }] };
  }
  if (rest.length === 1) {
    return {
      kind: "solutions",
      solutions: [
        { label: "X1", sym: rangeSym(root) },
        { label: "X2", sym: rest[0]!.sym },
      ],
    };
  }
  return {
    kind: "solutions",
    solutions: [{ label: "X1", sym: rangeSym(root) }, ...rest],
  };
}

function findPivot(rows: Sym[][], startRow: number, col: number): number | null {
  for (let r = startRow; r < rows.length; r += 1) {
    const cell = rows[r]?.[col];
    if (cell && !isZeroReal(cell)) {
      return r;
    }
  }
  return null;
}

function gaussSolve(matrix: Sym[][], rhs: Sym[], labels: string[]): EqnSolveResult {
  const n = rhs.length;
  const rows: Sym[][] = matrix.map((row, i) => [...row, rhs[i] ?? ZERO]);
  let row = 0;
  for (let col = 0; col < n && row < n; col += 1) {
    const pivotRow = findPivot(rows, row, col);
    if (pivotRow === null) {
      continue;
    }
    if (pivotRow !== row) {
      const tmp = rows[row]!;
      rows[row] = rows[pivotRow]!;
      rows[pivotRow] = tmp;
    }
    const pv = rows[row]![col]!;
    for (let r = row + 1; r < n; r += 1) {
      const lead = rows[r]![col]!;
      if (isZeroReal(lead)) {
        continue;
      }
      const f = symDiv(lead, pv);
      for (let c = col; c <= n; c += 1) {
        rows[r]![c] = symSub(rows[r]![c]!, symMul(f, rows[row]![c]!));
      }
    }
    row += 1;
  }
  let pivots = 0;
  for (let r = 0; r < n; r += 1) {
    let allZero = true;
    for (let c = 0; c < n; c += 1) {
      if (!isZeroReal(rows[r]![c]!)) {
        allZero = false;
        break;
      }
    }
    if (allZero) {
      if (!isZeroReal(rows[r]![n]!)) {
        return { kind: "no-solution" };
      }
      continue;
    }
    pivots += 1;
  }
  if (pivots < n) {
    return { kind: "infinite" };
  }
  const x: Sym[] = Array.from({ length: n }, () => ZERO);
  for (let r = n - 1; r >= 0; r -= 1) {
    let pivotCol = -1;
    for (let c = 0; c < n; c += 1) {
      if (!isZeroReal(rows[r]![c]!)) {
        pivotCol = c;
        break;
      }
    }
    if (pivotCol < 0) {
      return { kind: "infinite" };
    }
    let acc = rows[r]![n]!;
    for (let c = pivotCol + 1; c < n; c += 1) {
      acc = symSub(acc, symMul(rows[r]![c]!, x[c]!));
    }
    x[pivotCol] = rangeSym(symDiv(acc, rows[r]![pivotCol]!));
  }
  return {
    kind: "solutions",
    solutions: labels.map((label, i) => ({ label, sym: x[i]! })),
  };
}

export function solveEqn(type: EqnType, coeffs: Sym[]): EqnSolveResult {
  try {
    switch (type) {
      case "lin2": {
        if (coeffs.length !== 6) {
          return { kind: "math-error" };
        }
        const [a1, b1, c1, a2, b2, c2] = coeffs as [Sym, Sym, Sym, Sym, Sym, Sym];
        return gaussSolve(
          [
            [a1, b1],
            [a2, b2],
          ],
          [c1, c2],
          ["X", "Y"],
        );
      }
      case "lin3": {
        if (coeffs.length !== 12) {
          return { kind: "math-error" };
        }
        const [a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3] = coeffs as [
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
          Sym,
        ];
        return gaussSolve(
          [
            [a1, b1, c1],
            [a2, b2, c2],
            [a3, b3, c3],
          ],
          [d1, d2, d3],
          ["X", "Y", "Z"],
        );
      }
      case "quad": {
        if (coeffs.length !== 3) {
          return { kind: "math-error" };
        }
        return solveQuadraticPair(coeffs[0]!, coeffs[1]!, coeffs[2]!, ["X", "X1", "X2"]);
      }
      case "cubic": {
        if (coeffs.length !== 4) {
          return { kind: "math-error" };
        }
        return solveCubic(coeffs[0]!, coeffs[1]!, coeffs[2]!, coeffs[3]!);
      }
      default: {
        const _never: never = type;
        return _never;
      }
    }
  } catch (err) {
    if (err instanceof CalcMathError || (err instanceof Error && (err.message === "div0" || err.message === "math"))) {
      return { kind: "math-error" };
    }
    return { kind: "math-error" };
  }
}

/** Linear solutions never use √ form, even in MathO (`TARGET-OFFICIAL-DOC`). */
export function formatEqnValue(sym: Sym, setup: SetupState, allowSqrt: boolean): ResultValue {
  const result = resultFromSym(sym, setup);
  if (!allowSqrt && result.naturalKind === "sqrt") {
    return { ...result, display: result.approx, naturalKind: "decimal" };
  }
  return result;
}

export function eqnAllowsSqrt(type: EqnType): boolean {
  switch (type) {
    case "lin2":
    case "lin3":
      return false;
    case "quad":
    case "cubic":
      return true;
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

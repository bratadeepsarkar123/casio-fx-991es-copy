import { assertRange, CalcDimensionError, CalcMathError } from "./numeric.ts";
import { isNonReal, isZeroReal, symAdd, symMul, symNeg, symRat, symSqrt, toDec, type Sym } from "./symbolic.ts";
import type { VectorDim, VectorValue } from "./types.ts";

export { CalcDimensionError };

const ZERO: Sym = symRat(0n);

export function isVectorDim(n: number): n is VectorDim {
  return n === 2 || n === 3;
}

export function emptyVector(dim: VectorDim): VectorValue {
  const cells: Sym[] = [];
  for (let i = 0; i < dim; i += 1) {
    cells.push(ZERO);
  }
  return { dim, cells };
}

export function cloneVector(v: VectorValue): VectorValue {
  return { dim: v.dim, cells: [...v.cells] };
}

export function vectorToDecCells(v: VectorValue): string[] {
  return v.cells.map((cell) => toDec(cell).toString());
}

function requireCell(v: VectorValue, i: number): Sym {
  const cell = v.cells[i];
  if (cell === undefined || i < 0 || i >= v.dim) {
    throw new CalcDimensionError();
  }
  return cell;
}

function checkScalar(s: Sym): Sym {
  if (isNonReal(s)) {
    throw new CalcMathError();
  }
  assertRange(toDec(s));
  return s;
}

function buildVector(dim: VectorDim, cells: Sym[]): VectorValue {
  if (!isVectorDim(dim) || cells.length !== dim) {
    throw new CalcDimensionError();
  }
  return { dim, cells: cells.map(checkScalar) };
}

function requireSameDim(a: VectorValue, b: VectorValue): VectorDim {
  if (a.dim !== b.dim) {
    throw new CalcDimensionError();
  }
  if (!isVectorDim(a.dim)) {
    throw new CalcDimensionError();
  }
  return a.dim;
}

export function vectorAdd(a: VectorValue, b: VectorValue): VectorValue {
  const dim = requireSameDim(a, b);
  const cells: Sym[] = [];
  for (let i = 0; i < dim; i += 1) {
    cells.push(symAdd(requireCell(a, i), requireCell(b, i)));
  }
  return buildVector(dim, cells);
}

export function vectorSub(a: VectorValue, b: VectorValue): VectorValue {
  const dim = requireSameDim(a, b);
  const cells: Sym[] = [];
  for (let i = 0; i < dim; i += 1) {
    cells.push(symAdd(requireCell(a, i), symNeg(requireCell(b, i))));
  }
  return buildVector(dim, cells);
}

export function vectorNeg(v: VectorValue): VectorValue {
  return buildVector(v.dim, v.cells.map((cell) => checkScalar(symNeg(cell))));
}

export function vectorScale(v: VectorValue, s: Sym): VectorValue {
  checkScalar(s);
  return buildVector(
    v.dim,
    v.cells.map((cell) => checkScalar(symMul(cell, s))),
  );
}

export function vectorDot(a: VectorValue, b: VectorValue): Sym {
  const dim = requireSameDim(a, b);
  let acc: Sym = ZERO;
  for (let i = 0; i < dim; i += 1) {
    acc = symAdd(acc, symMul(requireCell(a, i), requireCell(b, i)));
  }
  return checkScalar(acc);
}

function as3(v: VectorValue): [Sym, Sym, Sym] {
  if (v.dim === 3) {
    return [requireCell(v, 0), requireCell(v, 1), requireCell(v, 2)];
  }
  if (v.dim === 2) {
    return [requireCell(v, 0), requireCell(v, 1), ZERO];
  }
  throw new CalcDimensionError();
}

/**
 * Cross product. 3D×3D is the standard product (`TARGET-OFFICIAL-DOC` intent).
 * 2D×2D embeds as (x,y,0) and returns a 3D vector (`INFERRED` / `NEEDS-HUMAN-REVIEW`;
 * official Ex5 printed result is dropped from HTML). Mixed 2D×3D is Dimension ERROR.
 */
export function vectorCross(a: VectorValue, b: VectorValue): VectorValue {
  if (a.dim !== b.dim) {
    throw new CalcDimensionError();
  }
  if (a.dim !== 2 && a.dim !== 3) {
    throw new CalcDimensionError();
  }
  const [a1, a2, a3] = as3(a);
  const [b1, b2, b3] = as3(b);
  return buildVector(3, [
    checkScalar(symAdd(symMul(a2, b3), symNeg(symMul(a3, b2)))),
    checkScalar(symAdd(symMul(a3, b1), symNeg(symMul(a1, b3)))),
    checkScalar(symAdd(symMul(a1, b2), symNeg(symMul(a2, b1)))),
  ]);
}

/** Euclidean magnitude. Official Abs(vector) is not element-wise. */
export function vectorAbs(v: VectorValue): Sym {
  let acc: Sym = ZERO;
  for (let i = 0; i < v.dim; i += 1) {
    const c = checkScalar(requireCell(v, i));
    acc = symAdd(acc, symMul(c, c));
  }
  if (isZeroReal(acc)) {
    return ZERO;
  }
  return checkScalar(symSqrt(acc));
}

export function vectorFromInts(dim: VectorDim, flat: Array<number | bigint | string>): VectorValue {
  if (flat.length !== dim) {
    throw new CalcDimensionError();
  }
  const cells: Sym[] = [];
  for (const raw of flat) {
    if (typeof raw === "bigint") {
      cells.push(symRat(raw));
    } else if (typeof raw === "number") {
      if (!Number.isInteger(raw)) {
        throw new CalcMathError();
      }
      cells.push(symRat(BigInt(raw)));
    } else {
      cells.push(symRat(BigInt(raw)));
    }
  }
  return buildVector(dim, cells);
}

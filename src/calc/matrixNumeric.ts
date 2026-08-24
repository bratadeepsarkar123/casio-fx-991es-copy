import { assertRange, CalcMathError, CalcSyntaxError } from "./numeric.ts";
import { isNonReal, isZeroReal, symAdd, symDiv, symMul, symNeg, symRat, toDec, type Sym } from "./symbolic.ts";
import type { MatrixDim, MatrixValue } from "./types.ts";

export const MATRIX_MAX_DIM = 3 as const;

const ZERO: Sym = symRat(0n);
const ONE: Sym = symRat(1n);

export class CalcDimensionError extends Error {
  readonly code = "Dimension ERROR" as const;
  constructor(message = "Dimension ERROR") {
    super(message);
    this.name = "CalcDimensionError";
  }
}

export function isMatrixDim(n: number): n is MatrixDim {
  return n === 1 || n === 2 || n === 3;
}

export function emptyMatrix(rows: MatrixDim, cols: MatrixDim): MatrixValue {
  const cells: Sym[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < cols; c += 1) {
      row.push(ZERO);
    }
    cells.push(row);
  }
  return { rows, cols, cells };
}

export function cloneMatrix(m: MatrixValue): MatrixValue {
  return {
    rows: m.rows,
    cols: m.cols,
    cells: m.cells.map((row) => [...row]),
  };
}

export function matrixToDecGrid(m: MatrixValue): string[][] {
  return m.cells.map((row) => row.map((cell) => toDec(cell).toString()));
}

function requireCell(m: MatrixValue, r: number, c: number): Sym {
  const row = m.cells[r];
  const cell = row?.[c];
  if (!row || cell === undefined) {
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

function buildMatrix(rows: MatrixDim, cols: MatrixDim, cells: Sym[][]): MatrixValue {
  if (!isMatrixDim(rows) || !isMatrixDim(cols)) {
    throw new CalcDimensionError();
  }
  if (cells.length !== rows) {
    throw new CalcDimensionError();
  }
  const next: Sym[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row = cells[r];
    if (!row || row.length !== cols) {
      throw new CalcDimensionError();
    }
    next.push(row.map(checkScalar));
  }
  return { rows, cols, cells: next };
}

export function matrixAdd(a: MatrixValue, b: MatrixValue): MatrixValue {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new CalcDimensionError();
  }
  const cells: Sym[][] = [];
  for (let r = 0; r < a.rows; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < a.cols; c += 1) {
      row.push(symAdd(requireCell(a, r, c), requireCell(b, r, c)));
    }
    cells.push(row);
  }
  return buildMatrix(a.rows, a.cols, cells);
}

export function matrixSub(a: MatrixValue, b: MatrixValue): MatrixValue {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new CalcDimensionError();
  }
  const cells: Sym[][] = [];
  for (let r = 0; r < a.rows; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < a.cols; c += 1) {
      row.push(symAdd(requireCell(a, r, c), symNeg(requireCell(b, r, c))));
    }
    cells.push(row);
  }
  return buildMatrix(a.rows, a.cols, cells);
}

export function matrixNeg(m: MatrixValue): MatrixValue {
  const cells = m.cells.map((row) => row.map((cell) => checkScalar(symNeg(cell))));
  return { rows: m.rows, cols: m.cols, cells };
}

export function matrixScale(m: MatrixValue, s: Sym): MatrixValue {
  checkScalar(s);
  const cells = m.cells.map((row) => row.map((cell) => checkScalar(symMul(cell, s))));
  return { rows: m.rows, cols: m.cols, cells };
}

export function matrixMul(a: MatrixValue, b: MatrixValue): MatrixValue {
  if (a.cols !== b.rows) {
    throw new CalcDimensionError();
  }
  if (!isMatrixDim(a.rows) || !isMatrixDim(b.cols)) {
    throw new CalcDimensionError();
  }
  const cells: Sym[][] = [];
  for (let r = 0; r < a.rows; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < b.cols; c += 1) {
      let acc: Sym = ZERO;
      for (let k = 0; k < a.cols; k += 1) {
        acc = symAdd(acc, symMul(requireCell(a, r, k), requireCell(b, k, c)));
      }
      row.push(acc);
    }
    cells.push(row);
  }
  return buildMatrix(a.rows, b.cols, cells);
}

export function matrixTranspose(m: MatrixValue): MatrixValue {
  if (!isMatrixDim(m.cols) || !isMatrixDim(m.rows)) {
    throw new CalcDimensionError();
  }
  const cells: Sym[][] = [];
  for (let r = 0; r < m.cols; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < m.rows; c += 1) {
      row.push(requireCell(m, c, r));
    }
    cells.push(row);
  }
  return { rows: m.cols, cols: m.rows, cells };
}

export function matrixAbs(m: MatrixValue): MatrixValue {
  const cells = m.cells.map((row) =>
    row.map((cell) => {
      checkScalar(cell);
      return toDec(cell).isNeg() ? checkScalar(symNeg(cell)) : cell;
    }),
  );
  return { rows: m.rows, cols: m.cols, cells };
}

function det2(a: Sym, b: Sym, c: Sym, d: Sym): Sym {
  return symAdd(symMul(a, d), symNeg(symMul(b, c)));
}

export function matrixDet(m: MatrixValue): Sym {
  if (m.rows !== m.cols) {
    throw new CalcDimensionError();
  }
  if (m.rows === 1) {
    return checkScalar(requireCell(m, 0, 0));
  }
  if (m.rows === 2) {
    return checkScalar(
      det2(requireCell(m, 0, 0), requireCell(m, 0, 1), requireCell(m, 1, 0), requireCell(m, 1, 1)),
    );
  }
  const a = requireCell(m, 0, 0);
  const b = requireCell(m, 0, 1);
  const c = requireCell(m, 0, 2);
  const d = requireCell(m, 1, 0);
  const e = requireCell(m, 1, 1);
  const f = requireCell(m, 1, 2);
  const g = requireCell(m, 2, 0);
  const h = requireCell(m, 2, 1);
  const i = requireCell(m, 2, 2);
  const term1 = symMul(a, det2(e, f, h, i));
  const term2 = symMul(b, det2(d, f, g, i));
  const term3 = symMul(c, det2(d, e, g, h));
  return checkScalar(symAdd(symAdd(term1, symNeg(term2)), term3));
}

function cofactor3(m: MatrixValue, i: number, j: number): Sym {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < 3; r += 1) {
    if (r !== i) {
      rows.push(r);
    }
  }
  for (let c = 0; c < 3; c += 1) {
    if (c !== j) {
      cols.push(c);
    }
  }
  const r0 = rows[0];
  const r1 = rows[1];
  const c0 = cols[0];
  const c1 = cols[1];
  if (r0 === undefined || r1 === undefined || c0 === undefined || c1 === undefined) {
    throw new CalcDimensionError();
  }
  const minor = det2(requireCell(m, r0, c0), requireCell(m, r0, c1), requireCell(m, r1, c0), requireCell(m, r1, c1));
  return (i + j) % 2 === 0 ? minor : symNeg(minor);
}

export function matrixInverse(m: MatrixValue): MatrixValue {
  if (m.rows !== m.cols) {
    throw new CalcDimensionError();
  }
  const det = matrixDet(m);
  if (isZeroReal(det)) {
    throw new CalcMathError();
  }
  if (m.rows === 1) {
    return buildMatrix(1, 1, [[symDiv(ONE, requireCell(m, 0, 0))]]);
  }
  if (m.rows === 2) {
    const a = requireCell(m, 0, 0);
    const b = requireCell(m, 0, 1);
    const c = requireCell(m, 1, 0);
    const d = requireCell(m, 1, 1);
    return buildMatrix(2, 2, [
      [symDiv(d, det), symDiv(symNeg(b), det)],
      [symDiv(symNeg(c), det), symDiv(a, det)],
    ]);
  }
  const cof: Sym[][] = [];
  for (let r = 0; r < 3; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < 3; c += 1) {
      row.push(cofactor3(m, r, c));
    }
    cof.push(row);
  }
  const adj = matrixTranspose({ rows: 3, cols: 3, cells: cof });
  return matrixScale(adj, symDiv(ONE, det));
}

export function matrixPowInt(m: MatrixValue, n: 2 | 3): MatrixValue {
  if (m.rows !== m.cols) {
    throw new CalcDimensionError();
  }
  if (n === 2) {
    return matrixMul(m, m);
  }
  if (n === 3) {
    return matrixMul(matrixMul(m, m), m);
  }
  const _never: never = n;
  throw new CalcSyntaxError(_never);
}

export function matrixFromInts(rows: MatrixDim, cols: MatrixDim, flat: Array<number | bigint | string>): MatrixValue {
  if (flat.length !== rows * cols) {
    throw new CalcDimensionError();
  }
  const cells: Sym[][] = [];
  let k = 0;
  for (let r = 0; r < rows; r += 1) {
    const row: Sym[] = [];
    for (let c = 0; c < cols; c += 1) {
      const raw = flat[k];
      k += 1;
      if (raw === undefined) {
        throw new CalcDimensionError();
      }
      if (typeof raw === "bigint") {
        row.push(symRat(raw));
      } else if (typeof raw === "number") {
        if (!Number.isInteger(raw)) {
          throw new CalcMathError();
        }
        row.push(symRat(BigInt(raw)));
      } else {
        row.push(symRat(BigInt(raw)));
      }
    }
    cells.push(row);
  }
  return buildMatrix(rows, cols, cells);
}

import { evaluateToSym } from "./evaluate.ts";
import { CalcMathError, CalcSyntaxError } from "./numeric.ts";
import type { Atom, CalcState, MatReg, MatrixValue } from "./types.ts";
import {
  CalcDimensionError,
  matrixAbs,
  matrixAdd,
  matrixDet,
  matrixInverse,
  matrixMul,
  matrixNeg,
  matrixPowInt,
  matrixScale,
  matrixSub,
  matrixTranspose,
} from "./matrixNumeric.ts";
import { isNonReal, isZeroReal, symAdd, symDiv, symMul, symNeg, symRat, type Sym } from "./symbolic.ts";
import { createUint32Rng } from "./numeric.ts";

export const MATRIX_CALL_LABELS: Record<string, string> = {
  "mat-A": "MatA",
  "mat-B": "MatB",
  "mat-C": "MatC",
  "mat-Ans": "MatAns",
  "mat-det": "det",
  "mat-trn": "Trn",
};

export function isMatrixCallName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(MATRIX_CALL_LABELS, name);
}

export function matrixRegFromCall(name: string): MatReg | null {
  switch (name) {
    case "mat-A":
      return "A";
    case "mat-B":
      return "B";
    case "mat-C":
      return "C";
    case "mat-Ans":
      return "Ans";
    default:
      return null;
  }
}

type Mx = { k: "s"; v: Sym } | { k: "m"; v: MatrixValue };

type Item =
  | { k: "val"; v: Mx }
  | { k: "op"; op: "+" | "-" | "×" | "÷" | "implied" };

function lookupReg(state: CalcState, name: string): MatrixValue {
  const session = state.matrix;
  if (!session) {
    throw new CalcDimensionError();
  }
  const reg = matrixRegFromCall(name);
  if (!reg) {
    throw new CalcSyntaxError();
  }
  const m = session.registers[reg];
  if (!m) {
    throw new CalcDimensionError();
  }
  return m;
}

function evalScalarAtoms(atoms: Atom[], state: CalcState): Sym {
  if (atoms.length === 0) {
    throw new CalcSyntaxError();
  }
  const rng = createUint32Rng(state.rngSeed);
  const sym = evaluateToSym(atoms, state, rng);
  if (isNonReal(sym)) {
    throw new CalcMathError();
  }
  return sym;
}

function evalAtom(atom: Atom, state: CalcState): Mx {
  switch (atom.t) {
    case "op":
    case "colon":
    case "comma":
    case "placeholder":
    case "cplxfmt":
    case "angle":
    case "var":
      throw new CalcSyntaxError();
    case "num":
    case "frac":
    case "mixed":
    case "sexagesimal":
    case "sqrt":
    case "cbrt":
    case "nthrt":
    case "pow":
    case "logb":
      return { k: "s", v: evalScalarAtoms([atom], state) };
    case "group":
      return evalSlot(atom.inner, state);
    case "neg": {
      const inner = evalSlot(atom.inner.length ? atom.inner : [{ t: "num", s: "0" }], state);
      return inner.k === "m" ? { k: "m", v: matrixNeg(inner.v) } : { k: "s", v: symNeg(inner.v) };
    }
    case "abs": {
      const inner = evalSlot(atom.inner, state);
      if (inner.k === "m") {
        return { k: "m", v: matrixAbs(inner.v) };
      }
      return { k: "s", v: evalScalarAtoms([atom], state) };
    }
    case "sym": {
      if (atom.name === "i") {
        throw new CalcMathError();
      }
      return { k: "s", v: evalScalarAtoms([atom], state) };
    }
    case "call": {
      const reg = matrixRegFromCall(atom.name);
      if (reg) {
        return { k: "m", v: lookupReg(state, atom.name) };
      }
      if (atom.name === "mat-det") {
        const arg = evalSlot(atom.args[0] ?? [], state);
        if (arg.k !== "m") {
          throw new CalcDimensionError();
        }
        return { k: "s", v: matrixDet(arg.v) };
      }
      if (atom.name === "mat-trn") {
        const arg = evalSlot(atom.args[0] ?? [], state);
        if (arg.k !== "m") {
          throw new CalcDimensionError();
        }
        return { k: "m", v: matrixTranspose(arg.v) };
      }
      if (atom.name === "abs") {
        const arg = evalSlot(atom.args[0] ?? [], state);
        if (arg.k === "m") {
          return { k: "m", v: matrixAbs(arg.v) };
        }
        return { k: "s", v: evalScalarAtoms(atom.args[0] ?? [], state) };
      }
      throw new CalcSyntaxError();
    }
    case "post": {
      const inner = evalSlot(atom.inner, state);
      switch (atom.op) {
        case "sq":
          if (inner.k === "m") {
            return { k: "m", v: matrixPowInt(inner.v, 2) };
          }
          return { k: "s", v: evalScalarAtoms([atom], state) };
        case "cube":
          if (inner.k === "m") {
            return { k: "m", v: matrixPowInt(inner.v, 3) };
          }
          return { k: "s", v: evalScalarAtoms([atom], state) };
        case "inv":
          if (inner.k === "m") {
            return { k: "m", v: matrixInverse(inner.v) };
          }
          return { k: "s", v: evalScalarAtoms([atom], state) };
        case "fact":
        case "pct":
        case "dms":
          if (inner.k === "m") {
            throw new CalcSyntaxError();
          }
          return { k: "s", v: evalScalarAtoms([atom], state) };
      }
    }
    default: {
      const _never: never = atom;
      return _never;
    }
  }
}

function applyOp(op: "+" | "-" | "×" | "÷" | "implied", a: Mx, b: Mx): Mx {
  switch (op) {
    case "+":
      if (a.k === "m" && b.k === "m") {
        return { k: "m", v: matrixAdd(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symAdd(a.v, b.v) };
      }
      throw new CalcDimensionError();
    case "-":
      if (a.k === "m" && b.k === "m") {
        return { k: "m", v: matrixSub(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symAdd(a.v, symNeg(b.v)) };
      }
      throw new CalcDimensionError();
    case "×":
    case "implied":
      if (a.k === "m" && b.k === "m") {
        return { k: "m", v: matrixMul(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "m") {
        return { k: "m", v: matrixScale(b.v, a.v) };
      }
      if (a.k === "m" && b.k === "s") {
        return { k: "m", v: matrixScale(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symMul(a.v, b.v) };
      }
      throw new CalcDimensionError();
    case "÷":
      if (a.k === "m" && b.k === "s") {
        if (isZeroReal(b.v)) {
          throw new CalcMathError();
        }
        return { k: "m", v: matrixScale(a.v, symDiv(symRat(1n), b.v)) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symDiv(a.v, b.v) };
      }
      throw new CalcDimensionError();
    default: {
      const _never: never = op;
      throw new CalcSyntaxError(_never);
    }
  }
}

function reduceItems(items: Item[]): Mx {
  if (items.length === 0) {
    throw new CalcSyntaxError();
  }
  const prec: Record<string, number> = { implied: 7, "×": 10, "÷": 10, "+": 11, "-": 11 };
  const output: Item[] = [];
  const ops: Array<Extract<Item, { k: "op" }>> = [];
  const take = () => {
    const op = ops.pop();
    const b = output.pop();
    const a = output.pop();
    if (!op || !a || !b || a.k !== "val" || b.k !== "val") {
      throw new CalcSyntaxError();
    }
    output.push({ k: "val", v: applyOp(op.op, a.v, b.v) });
  };
  for (const it of items) {
    if (it.k === "val") {
      output.push(it);
      continue;
    }
    while (ops.length) {
      const top = ops[ops.length - 1];
      if (!top) {
        break;
      }
      if ((prec[top.op] ?? 99) <= (prec[it.op] ?? 99)) {
        take();
      } else {
        break;
      }
    }
    ops.push(it);
  }
  while (ops.length) {
    take();
  }
  const last = output[0];
  if (!last || last.k !== "val" || output.length !== 1) {
    throw new CalcSyntaxError();
  }
  return last.v;
}

function evalExpr(atoms: Atom[], state: CalcState): Mx {
  const items: Item[] = [];
  for (const a of atoms) {
    if (a.t === "op") {
      if (a.op === "+" || a.op === "-" || a.op === "×" || a.op === "÷") {
        items.push({ k: "op", op: a.op });
        continue;
      }
      throw new CalcSyntaxError();
    }
    if (a.t === "comma") {
      continue;
    }
    const val = evalAtom(a, state);
    const prev = items[items.length - 1];
    if (prev && prev.k === "val") {
      items.push({ k: "op", op: "implied" });
    }
    items.push({ k: "val", v: val });
  }
  return reduceItems(items);
}

function evalSlot(atoms: Atom[], state: CalcState): Mx {
  if (atoms.length === 0) {
    throw new CalcSyntaxError();
  }
  for (const a of atoms) {
    if (a.t === "colon") {
      throw new CalcSyntaxError();
    }
  }
  return evalExpr(atoms, state);
}

export type MatrixEvalResult = { kind: "matrix"; matrix: MatrixValue } | { kind: "scalar"; sym: Sym };

export function evaluateMatrixExpr(atoms: Atom[], state: CalcState): MatrixEvalResult {
  try {
    const out = evalSlot(atoms, state);
    if (out.k === "m") {
      return { kind: "matrix", matrix: out.v };
    }
    if (isNonReal(out.v)) {
      throw new CalcMathError();
    }
    return { kind: "scalar", sym: out.v };
  } catch (err) {
    if (err instanceof CalcDimensionError || err instanceof CalcMathError || err instanceof CalcSyntaxError) {
      throw err;
    }
    if (err instanceof Error && (err.message === "div0" || err.message === "math")) {
      throw new CalcMathError();
    }
    throw new CalcMathError();
  }
}

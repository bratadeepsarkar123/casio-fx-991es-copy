import { evaluateToSym } from "./evaluate.ts";
import { CalcMathError, CalcSyntaxError, createUint32Rng } from "./numeric.ts";
import type { Atom, CalcState, VctReg, VectorValue } from "./types.ts";
import {
  CalcDimensionError,
  vectorAbs,
  vectorAdd,
  vectorCross,
  vectorDot,
  vectorNeg,
  vectorScale,
  vectorSub,
} from "./vectorNumeric.ts";
import { isNonReal, isZeroReal, symAdd, symDiv, symMul, symNeg, symRat, toDec, type Sym } from "./symbolic.ts";

export const VECTOR_CALL_LABELS: Record<string, string> = {
  "vct-A": "VctA",
  "vct-B": "VctB",
  "vct-C": "VctC",
  "vct-Ans": "VctAns",
  "vct-dot": "Dot",
};

export function isVectorCallName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(VECTOR_CALL_LABELS, name);
}

export function vectorRegFromCall(name: string): VctReg | null {
  switch (name) {
    case "vct-A":
      return "A";
    case "vct-B":
      return "B";
    case "vct-C":
      return "C";
    case "vct-Ans":
      return "Ans";
    default:
      return null;
  }
}

type Vx = { k: "s"; v: Sym } | { k: "v"; v: VectorValue };

type Item =
  | { k: "val"; v: Vx }
  | { k: "op"; op: "+" | "-" | "×" | "÷" | "dot" | "implied" };

function lookupReg(state: CalcState, name: string): VectorValue {
  const session = state.vector;
  if (!session) {
    throw new CalcDimensionError();
  }
  const reg = vectorRegFromCall(name);
  if (!reg) {
    throw new CalcSyntaxError();
  }
  const v = session.registers[reg];
  if (!v) {
    throw new CalcDimensionError();
  }
  return v;
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

function applyScalarCall(name: string, args: Sym[], state: CalcState): Sym {
  const callArgs: Atom[][] = args.map((s) => [{ t: "num", s: toDec(s).toString() }]);
  const atom: Atom = { t: "call", name, args: callArgs.length ? callArgs : [[{ t: "num", s: "0" }]], closed: true };
  return evalScalarAtoms([atom], state);
}

function evalAtom(atom: Atom, state: CalcState): Vx {
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
      return inner.k === "v" ? { k: "v", v: vectorNeg(inner.v) } : { k: "s", v: symNeg(inner.v) };
    }
    case "abs": {
      const inner = evalSlot(atom.inner, state);
      if (inner.k === "v") {
        return { k: "s", v: vectorAbs(inner.v) };
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
      const reg = vectorRegFromCall(atom.name);
      if (reg) {
        return { k: "v", v: lookupReg(state, atom.name) };
      }
      if (atom.name === "vct-dot") {
        throw new CalcSyntaxError();
      }
      if (atom.name === "abs") {
        const arg = evalSlot(atom.args[0] ?? [], state);
        if (arg.k === "v") {
          return { k: "s", v: vectorAbs(arg.v) };
        }
        return { k: "s", v: arg.v };
      }
      const args: Sym[] = [];
      for (const slot of atom.args) {
        const arg = slot.length === 0 ? { k: "s" as const, v: symRat(0n) } : evalSlot(slot, state);
        if (arg.k === "v") {
          throw new CalcDimensionError();
        }
        args.push(arg.v);
      }
      return { k: "s", v: applyScalarCall(atom.name, args, state) };
    }
    case "post": {
      const inner = evalSlot(atom.inner, state);
      switch (atom.op) {
        case "sq":
        case "cube":
        case "inv":
          if (inner.k === "v") {
            throw new CalcSyntaxError();
          }
          return { k: "s", v: evalScalarAtoms([atom], state) };
        case "fact":
        case "pct":
        case "dms":
          if (inner.k === "v") {
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

function applyOp(op: "+" | "-" | "×" | "÷" | "dot" | "implied", a: Vx, b: Vx): Vx {
  switch (op) {
    case "+":
      if (a.k === "v" && b.k === "v") {
        return { k: "v", v: vectorAdd(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symAdd(a.v, b.v) };
      }
      throw new CalcDimensionError();
    case "-":
      if (a.k === "v" && b.k === "v") {
        return { k: "v", v: vectorSub(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symAdd(a.v, symNeg(b.v)) };
      }
      throw new CalcDimensionError();
    case "×":
    case "implied":
      if (a.k === "v" && b.k === "v") {
        return { k: "v", v: vectorCross(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "v") {
        return { k: "v", v: vectorScale(b.v, a.v) };
      }
      if (a.k === "v" && b.k === "s") {
        return { k: "v", v: vectorScale(a.v, b.v) };
      }
      if (a.k === "s" && b.k === "s") {
        return { k: "s", v: symMul(a.v, b.v) };
      }
      throw new CalcDimensionError();
    case "dot":
      if (a.k === "v" && b.k === "v") {
        return { k: "s", v: vectorDot(a.v, b.v) };
      }
      throw new CalcDimensionError();
    case "÷":
      if (a.k === "v" && b.k === "s") {
        if (isZeroReal(b.v)) {
          throw new CalcMathError();
        }
        return { k: "v", v: vectorScale(a.v, symDiv(symRat(1n), b.v)) };
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

function reduceItems(items: Item[]): Vx {
  if (items.length === 0) {
    throw new CalcSyntaxError();
  }
  const prec: Record<string, number> = { implied: 7, "×": 10, "÷": 10, dot: 10, "+": 11, "-": 11 };
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

function evalExpr(atoms: Atom[], state: CalcState): Vx {
  const items: Item[] = [];
  for (const a of atoms) {
    if (a.t === "call" && a.name === "vct-dot") {
      items.push({ k: "op", op: "dot" });
      continue;
    }
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

function evalSlot(atoms: Atom[], state: CalcState): Vx {
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

export type VectorEvalResult = { kind: "vector"; vector: VectorValue } | { kind: "scalar"; sym: Sym };

export function evaluateVectorExpr(atoms: Atom[], state: CalcState): VectorEvalResult {
  try {
    const out = evalSlot(atoms, state);
    if (out.k === "v") {
      return { kind: "vector", vector: out.v };
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

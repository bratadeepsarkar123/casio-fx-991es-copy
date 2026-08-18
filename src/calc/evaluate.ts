import {
  CalcArgumentError,
  CalcMathError,
  CalcSyntaxError,
  D,
  E,
  PI,
  assertRange,
  factorial,
  nCr,
  nPr,
  ranHash,
  ranInt,
  roundInternal,
  toRad,
  type Dec,
} from "./numeric.ts";
import { resultFromSym } from "./format.ts";
import { specialTrigFromSym } from "./specialTrig.ts";
import {
  fromDec,
  symAdd,
  symDiv,
  symMul,
  symNeg,
  symPow,
  symRat,
  symSqrt,
  symSub,
  toDec,
  type Sym,
} from "./symbolic.ts";
import type { AngleUnit, Atom, CalcState, ResultValue, VarName } from "./types.ts";

export interface EvalContext {
  angle: AngleUnit;
  ans: Dec;
  preAns: Dec;
  variables: Record<VarName, Dec>;
  memoryM: Dec;
  nextUint32: () => number;
}

function ctxFromState(state: CalcState, nextUint32: () => number): EvalContext {
  const vars = {} as Record<VarName, Dec>;
  for (const k of Object.keys(state.variables) as VarName[]) {
    vars[k] = D(state.variables[k] ?? "0");
  }
  return {
    angle: state.setup.angleUnit,
    ans: D(state.ans),
    preAns: D(state.preAns),
    variables: vars,
    memoryM: D(state.memoryM),
    nextUint32,
  };
}

function evalSlot(atoms: Atom[], ctx: EvalContext): Sym {
  if (atoms.length === 0) {
    throw new CalcSyntaxError();
  }
  const statements: Atom[][] = [[]];
  for (const a of atoms) {
    if (a.t === "colon") {
      statements.push([]);
    } else {
      statements[statements.length - 1]?.push(a);
    }
  }
  let last: Sym = symRat(0n);
  for (const stmt of statements) {
    if (!stmt || stmt.length === 0) {
      throw new CalcSyntaxError();
    }
    last = evalExpr(stmt, ctx);
  }
  return last;
}

type Item =
  | { k: "val"; v: Sym }
  | { k: "op"; op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "implied" };

function evalAtom(atom: Atom, ctx: EvalContext): Sym {
  switch (atom.t) {
    case "num":
      return fromDec(D(atom.s || "0"));
    case "op":
    case "colon":
    case "comma":
    case "placeholder":
      throw new CalcSyntaxError();
    case "frac": {
      const n = evalSlot(atom.num, ctx);
      const d = evalSlot(atom.den, ctx);
      return symDiv(n, d);
    }
    case "mixed": {
      const w = atom.whole.length ? evalSlot(atom.whole, ctx) : symRat(0n);
      const n = evalSlot(atom.num, ctx);
      const d = evalSlot(atom.den, ctx);
      return symAdd(w, symDiv(n, d));
    }
    case "sqrt":
      return symSqrt(evalSlot(atom.inner, ctx));
    case "cbrt": {
      const inner = evalSlot(atom.inner, ctx);
      return symPow(inner, symRat(1n, 3n));
    }
    case "nthrt": {
      const n = evalSlot(atom.n, ctx);
      const inner = evalSlot(atom.inner, ctx);
      return symPow(inner, symDiv(symRat(1n), n));
    }
    case "pow":
      return symPow(evalSlot(atom.base, ctx), evalSlot(atom.exp, ctx));
    case "logb": {
      const base = evalSlot(atom.base, ctx);
      const arg = evalSlot(atom.arg, ctx);
      const a = toDec(arg);
      const b = toDec(base);
      if (a.lte(0) || b.lte(0) || b.eq(1)) {
        throw new CalcMathError();
      }
      return fromDec(roundInternal(a.ln().div(b.ln())));
    }
    case "call":
      return evalCall(atom.name, atom.args, ctx);
    case "group":
      return evalSlot(atom.inner, ctx);
    case "var":
      return fromDec(ctx.variables[atom.name] ?? D(0));
    case "sym": {
      switch (atom.name) {
        case "pi":
          return { k: "pi", r: { n: 1n, d: 1n } };
        case "e":
          return fromDec(E);
        case "ans":
          return fromDec(ctx.ans);
        case "preAns":
          return fromDec(ctx.preAns);
        case "i":
          throw new CalcMathError();
        default: {
          const _never: never = atom;
          throw new CalcSyntaxError();
          return _never;
        }
      }
    }
    case "post": {
      const inner = evalSlot(atom.inner, ctx);
      switch (atom.op) {
        case "sq":
          return symPow(inner, symRat(2n));
        case "cube":
          return symPow(inner, symRat(3n));
        case "inv":
          return symDiv(symRat(1n), inner);
        case "fact":
          return fromDec(factorial(toDec(inner)));
        case "pct":
          return symDiv(inner, symRat(100n));
        case "dms":
          return fromDec(fromDms(toDec(inner)));
        default: {
          const _never: never = atom;
          throw new CalcSyntaxError();
          return _never;
        }
      }
    }
    case "neg":
      return symNeg(evalSlot(atom.inner.length ? atom.inner : [{ t: "num", s: "0" }], ctx));
    case "abs": {
      const v = evalSlot(atom.inner, ctx);
      const d = toDec(v);
      return d.isNeg() ? symNeg(v) : v;
    }
    case "angle": {
      const v = toDec(evalSlot(atom.inner, ctx));
      const rad = toRad(v, atom.unit === "°" ? "Deg" : atom.unit === "r" ? "Rad" : "Gra");
      return fromDec(fromRadToCurrent(rad, ctx.angle));
    }
    default: {
      const _never: never = atom;
      return _never;
    }
  }
}

function fromDms(x: Dec): Dec {
  return x;
}

function fromRadToCurrent(rad: Dec, unit: AngleUnit): Dec {
  switch (unit) {
    case "Deg":
      return rad.times(180).div(PI);
    case "Rad":
      return rad;
    case "Gra":
      return rad.times(200).div(PI);
    default: {
      const _never: never = unit;
      return _never;
    }
  }
}

function evalCall(name: string, args: Atom[][], ctx: EvalContext): Sym {
  const vals = args.map((a) => evalSlot(a, ctx));
  const x = vals[0] ? toDec(vals[0]) : D(0);
  switch (name) {
    case "sin":
    case "cos":
    case "tan":
    case "asin":
    case "acos":
    case "atan":
    case "sinh":
    case "cosh":
    case "tanh":
    case "asinh":
    case "acosh":
    case "atanh": {
      const arg = vals[0] ?? symRat(0n);
      const special = specialTrigFromSym(name, arg, ctx.angle);
      if (special) {
        return special;
      }
      return fromDec(evalTrig(name, toDec(arg), ctx.angle));
    }
    case "log": {
      if (vals.length >= 2 && vals[0] && vals[1]) {
        const b = toDec(vals[0]);
        const a = toDec(vals[1]);
        if (a.lte(0) || b.lte(0) || b.eq(1)) {
          throw new CalcMathError();
        }
        return fromDec(roundInternal(a.ln().div(b.ln())));
      }
      if (x.lte(0)) {
        throw new CalcMathError();
      }
      return fromDec(roundInternal(x.log(10)));
    }
    case "ln":
      if (x.lte(0)) {
        throw new CalcMathError();
      }
      return fromDec(roundInternal(x.ln()));
    case "exp10":
      return fromDec(roundInternal(D(10).pow(x)));
    case "exp":
      return fromDec(roundInternal(x.exp()));
    case "abs":
      return fromDec(x.abs());
    case "Ran#":
      return fromDec(ranHash(ctx.nextUint32()));
    case "RanInt": {
      const a = vals[0];
      const b = vals[1];
      if (!a || !b) {
        throw new CalcArgumentError();
      }
      return fromDec(ranInt(toDec(a), toDec(b), ctx.nextUint32()));
    }
    case "Rnd":
      return fromDec(x.toSignificantDigits(10, 4));
    default:
      throw new CalcSyntaxError();
  }
}

function evalTrig(name: string, x: Dec, angle: AngleUnit): Dec {
  switch (name) {
    case "sin":
      return roundInternal(toRad(x, angle).sin());
    case "cos":
      return roundInternal(toRad(x, angle).cos());
    case "tan": {
      const r = toRad(x, angle);
      const c = r.cos();
      if (c.abs().lt("1e-15")) {
        throw new CalcMathError();
      }
      return roundInternal(r.sin().div(c));
    }
    case "asin":
      if (x.abs().gt(1)) {
        throw new CalcMathError();
      }
      return roundInternal(fromRadToCurrent(x.asin(), angle));
    case "acos":
      if (x.abs().gt(1)) {
        throw new CalcMathError();
      }
      return roundInternal(fromRadToCurrent(x.acos(), angle));
    case "atan":
      return roundInternal(fromRadToCurrent(x.atan(), angle));
    case "sinh":
      return roundInternal(x.sinh());
    case "cosh":
      return roundInternal(x.cosh());
    case "tanh":
      return roundInternal(x.tanh());
    case "asinh":
      return roundInternal(x.asinh());
    case "acosh":
      if (x.lt(1)) {
        throw new CalcMathError();
      }
      return roundInternal(x.acosh());
    case "atanh":
      if (x.abs().gte(1)) {
        throw new CalcMathError();
      }
      return roundInternal(x.atanh());
    default:
      throw new CalcSyntaxError();
  }
}

function evalExpr(atoms: Atom[], ctx: EvalContext): Sym {
  const items: Item[] = [];
  for (let i = 0; i < atoms.length; i += 1) {
    const a = atoms[i];
    if (!a) {
      continue;
    }
    if (a.t === "op") {
      items.push({ k: "op", op: a.op });
      continue;
    }
    if (a.t === "comma") {
      continue;
    }
    const val = evalAtom(a, ctx);
    const prev = items[items.length - 1];
    if (prev && prev.k === "val") {
      items.push({ k: "op", op: "implied" });
    }
    items.push({ k: "val", v: val });
  }
  return reduceItems(items);
}

function reduceItems(items: Item[]): Sym {
  if (items.length === 0) {
    throw new CalcSyntaxError();
  }
  const prec: Record<string, number> = {
    implied: 7,
    nPr: 8,
    nCr: 8,
    "×": 10,
    "÷": 10,
    "÷R": 10,
    "+": 11,
    "-": 11,
  };
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

function applyOp(op: string, a: Sym, b: Sym): Sym {
  switch (op) {
    case "+":
      return symAdd(a, b);
    case "-":
      return symSub(a, b);
    case "×":
    case "implied":
      return symMul(a, b);
    case "÷":
      return symDiv(a, b);
    case "÷R": {
      const x = toDec(a);
      const y = toDec(b);
      if (y.isZero()) {
        throw new CalcMathError();
      }
      const q = x.div(y).trunc();
      return fromDec(q);
    }
    case "nPr":
      return fromDec(nPr(toDec(a), toDec(b)));
    case "nCr":
      return fromDec(nCr(toDec(a), toDec(b)));
    default:
      throw new CalcSyntaxError();
  }
}

export function evaluateAtoms(atoms: Atom[], state: CalcState, nextUint32: () => number): ResultValue {
  try {
    const ctx = ctxFromState(state, nextUint32);
    const sym = evalSlot(atoms, ctx);
    const raw = toDec(sym);
    const dec = assertRange(raw);
    if (raw.isZero() || (dec.isZero() && !raw.isZero())) {
      return resultFromSym(symRat(0n), state.setup);
    }
    return resultFromSym(sym, state.setup);
  } catch (err) {
    if (err instanceof CalcMathError || err instanceof CalcSyntaxError || err instanceof CalcArgumentError) {
      throw err;
    }
    if (err instanceof Error && (err.message === "div0" || err.message === "math")) {
      throw new CalcMathError();
    }
    throw new CalcMathError();
  }
}

export function evaluateEquals(state: CalcState, nextUint32: () => number): ResultValue {
  return evaluateAtoms(state.editor.root, state, nextUint32);
}

export { ctxFromState };

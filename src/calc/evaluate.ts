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
  parseCalcNumber,
  ranHash,
  ranInt,
  roundInternal,
  toRad,
  gcdBig,
  lcmBig,
  toBigIntExact,
  type Dec,
} from "./numeric.ts";
import { resultFromSym, formatBySetup, formatNumeric, formatSexagesimal } from "./format.ts";
import { specialTrigFromSym } from "./specialTrig.ts";
import {
  asCplx,
  cplxI,
  fromDec,
  isNonReal,
  packCplx,
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
import { complexAbs, complexArg, complexConj, polarToRect } from "./complex.ts";
import { evalStatCommand, isStatCallName } from "./statNumeric.ts";
import type { AngleUnit, Atom, CalcState, ComplexFormat, ResultValue, StatRow, StatType, VarName } from "./types.ts";

export interface EvalContext {
  angle: AngleUnit;
  ans: Dec;
  ansIm: Dec;
  preAns: Dec;
  preAnsIm: Dec;
  variables: Record<VarName, Dec>;
  memoryM: Dec;
  nextUint32: () => number;
  complexOk: boolean;
  complexFormatOverride: ComplexFormat | null;
  statType: StatType | null;
  statFreq: boolean;
  statRows: StatRow[] | null;
  divR: { quot: Dec; rem: Dec } | null;
  polRec: { x: Dec; y: Dec; kind: "pol" | "rec" } | null;
}

function ctxFromState(state: CalcState, nextUint32: () => number): EvalContext {
  const vars = {} as Record<VarName, Dec>;
  for (const k of Object.keys(state.variables) as VarName[]) {
    vars[k] = parseCalcNumber(state.variables[k] ?? "0");
  }
  return {
    angle: state.setup.angleUnit,
    ans: parseCalcNumber(state.ans),
    ansIm: parseCalcNumber(state.ansIm ?? "0"),
    preAns: parseCalcNumber(state.preAns),
    preAnsIm: parseCalcNumber(state.preAnsIm ?? "0"),
    variables: vars,
    memoryM: parseCalcNumber(state.memoryM),
    nextUint32,
    complexOk: state.mode === "CMPLX",
    complexFormatOverride: null,
    statType: state.mode === "STAT" ? (state.stat?.type ?? null) : null,
    statFreq: state.setup.statFreq,
    statRows: state.mode === "STAT" && state.stat ? state.stat.rows : null,
    divR: null,
    polRec: null,
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
  | { k: "op"; op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "implied" | "∠" };

function recallPair(re: Dec, im: Dec, ctx: EvalContext): Sym {
  const real = fromDec(re);
  if (im.isZero()) {
    return real;
  }
  if (!ctx.complexOk) {
    throw new CalcMathError();
  }
  return packCplx(real, fromDec(im));
}

function requireReal(s: Sym): Dec {
  if (isNonReal(s)) {
    throw new CalcMathError();
  }
  return toDec(s.k === "cplx" ? s.re : s);
}

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
    case "sexagesimal": {
      const deg = atom.deg.length ? requireReal(evalSlot(atom.deg, ctx)) : D(0);
      const min = atom.min.length ? requireReal(evalSlot(atom.min, ctx)) : D(0);
      const sec = atom.sec.length ? requireReal(evalSlot(atom.sec, ctx)) : D(0);
      return fromDec(deg.plus(min.div(60)).plus(sec.div(3600)));
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
      const a = requireReal(evalSlot(atom.arg, ctx));
      const b = requireReal(evalSlot(atom.base, ctx));
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
          return recallPair(ctx.ans, ctx.ansIm, ctx);
        case "preAns":
          return recallPair(ctx.preAns, ctx.preAnsIm, ctx);
        case "i":
          if (!ctx.complexOk) {
            throw new CalcMathError();
          }
          return cplxI();
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
          return fromDec(factorial(requireReal(inner)));
        case "pct":
          if (isNonReal(inner)) {
            throw new CalcMathError();
          }
          return symDiv(inner, symRat(100n));
        case "dms":
          return inner;
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
      if (isNonReal(v)) {
        return complexAbs(v);
      }
      const d = toDec(v);
      return d.isNeg() ? symNeg(v) : v;
    }
    case "angle": {
      const v = requireReal(evalSlot(atom.inner, ctx));
      const rad = toRad(v, atom.unit === "°" ? "Deg" : atom.unit === "r" ? "Rad" : "Gra");
      return fromDec(fromRadToCurrent(rad, ctx.angle));
    }
    case "cplxfmt":
      throw new CalcSyntaxError();
    default: {
      const _never: never = atom;
      return _never;
    }
  }
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
  if (isStatCallName(name)) {
    if (!ctx.statType || !ctx.statRows) {
      throw new CalcSyntaxError();
    }
    let arg: ReturnType<typeof requireReal> | null = null;
    if (args[0] && args[0].length > 0) {
      arg = requireReal(evalSlot(args[0], ctx));
    }
    const dec = evalStatCommand(name, arg, ctx.statType, ctx.statRows, ctx.statFreq);
    return fromDec(dec);
  }
  const vals = args.map((a) => evalSlot(a, ctx));
  switch (name) {
    case "conjg":
      return complexConj(vals[0] ?? symRat(0n));
    case "arg":
      return complexArg(vals[0] ?? symRat(0n), ctx.angle);
    case "abs": {
      const z = vals[0] ?? symRat(0n);
      if (isNonReal(z)) {
        return complexAbs(z);
      }
      return fromDec(toDec(z).abs());
    }
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
      if (isNonReal(arg)) {
        throw new CalcMathError();
      }
      const special = specialTrigFromSym(name, arg, ctx.angle);
      if (special) {
        return special;
      }
      return fromDec(evalTrig(name, toDec(arg), ctx.angle));
    }
    case "log": {
      if (vals.length >= 2 && vals[0] && vals[1]) {
        const b = requireReal(vals[0]);
        const a = requireReal(vals[1]);
        if (a.lte(0) || b.lte(0) || b.eq(1)) {
          throw new CalcMathError();
        }
        return fromDec(roundInternal(a.ln().div(b.ln())));
      }
      {
        const x = vals[0] ? requireReal(vals[0]) : D(0);
        if (x.lte(0)) {
          throw new CalcMathError();
        }
        return fromDec(roundInternal(x.log(10)));
      }
    }
    case "ln": {
      const x = vals[0] ? requireReal(vals[0]) : D(0);
      if (x.lte(0)) {
        throw new CalcMathError();
      }
      return fromDec(roundInternal(x.ln()));
    }
    case "sci10":
    case "exp10":
      return fromDec(roundInternal(D(10).pow(vals[0] ? requireReal(vals[0]) : D(0))));
    case "exp":
      return fromDec(roundInternal((vals[0] ? requireReal(vals[0]) : D(0)).exp()));
    case "Ran#":
      return fromDec(ranHash(ctx.nextUint32()));
    case "RanInt": {
      const a = vals[0];
      const b = vals[1];
      if (!a || !b) {
        throw new CalcArgumentError();
      }
      return fromDec(ranInt(requireReal(a), requireReal(b), ctx.nextUint32()));
    }
    case "Rnd":
      return fromDec((vals[0] ? requireReal(vals[0]) : D(0)).toSignificantDigits(10, 4));
    case "Pol": {
      if (!vals[0] || !vals[1]) {
        throw new CalcArgumentError();
      }
      const x = requireReal(vals[0]);
      const y = requireReal(vals[1]);
      const z = packCplx(fromDec(x), fromDec(y));
      const r = toDec(complexAbs(z));
      const th = toDec(complexArg(z, ctx.angle));
      ctx.polRec = { x: r, y: th, kind: "pol" };
      return fromDec(r);
    }
    case "Rec": {
      if (!vals[0] || !vals[1]) {
        throw new CalcArgumentError();
      }
      const r = requireReal(vals[0]);
      const th = requireReal(vals[1]);
      const z = polarToRect(fromDec(r), fromDec(th), ctx.angle);
      const { re, im } = asCplx(z);
      ctx.polRec = { x: toDec(re), y: toDec(im), kind: "rec" };
      return re;
    }
    case "GCD": {
      if (!vals[0] || !vals[1]) {
        throw new CalcArgumentError();
      }
      const a = toBigIntExact(requireReal(vals[0]));
      const b = toBigIntExact(requireReal(vals[1]));
      return symRat(gcdBig(a, b));
    }
    case "LCM": {
      if (!vals[0] || !vals[1]) {
        throw new CalcArgumentError();
      }
      const a = toBigIntExact(requireReal(vals[0]));
      const b = toBigIntExact(requireReal(vals[1]));
      return symRat(lcmBig(a, b));
    }
    case "Int":
      return fromDec((vals[0] ? requireReal(vals[0]) : D(0)).trunc());
    case "Intg":
      return fromDec((vals[0] ? requireReal(vals[0]) : D(0)).floor());
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
    if (a.t === "cplxfmt") {
      ctx.complexFormatOverride = a.fmt;
      continue;
    }
    const val = evalAtom(a, ctx);
    const prev = items[items.length - 1];
    if (prev && prev.k === "val") {
      items.push({ k: "op", op: "implied" });
    }
    items.push({ k: "val", v: val });
  }
  return reduceItems(items, ctx);
}

function reduceItems(items: Item[], ctx: EvalContext): Sym {
  if (items.length === 0) {
    throw new CalcSyntaxError();
  }
  const prec: Record<string, number> = {
    implied: 7,
    nPr: 8,
    nCr: 8,
    "∠": 8,
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
    output.push({ k: "val", v: applyOp(op.op, a.v, b.v, ctx) });
    if (op.op !== "÷R") {
      ctx.divR = null;
    }
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

function applyOp(op: string, a: Sym, b: Sym, ctx: EvalContext): Sym {
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
      const huge = x.abs().gte("1e10") || y.abs().gte("1e10");
      const q = x.div(y).trunc();
      const rem = x.minus(q.times(y));
      if (huge || !q.isInteger() || q.lte(0) || rem.lt(0)) {
        ctx.divR = null;
        return symDiv(a, b);
      }
      ctx.divR = { quot: q, rem };
      return fromDec(q);
    }
    case "nPr":
      return fromDec(nPr(requireReal(a), requireReal(b)));
    case "nCr":
      return fromDec(nCr(requireReal(a), requireReal(b)));
    case "∠":
      if (!ctx.complexOk) {
        throw new CalcMathError();
      }
      return polarToRect(a, b, ctx.angle);
    default:
      throw new CalcSyntaxError();
  }
}

/** Evaluate an expression to `Sym` without formatting. EQN coefficients use this. */
export function evaluateToSym(
  atoms: Atom[],
  state: CalcState,
  nextUint32: () => number,
): Sym {
  const ctx = ctxFromState(state, nextUint32);
  const sym = evalSlot(atoms, ctx);
  if (sym.k === "cplx") {
    if (!ctx.complexOk) {
      throw new CalcMathError();
    }
    const { re, im } = asCplx(sym);
    assertRange(toDec(re));
    assertRange(toDec(im));
    return packCplx(re, im);
  }
  const raw = toDec(sym);
  const dec = assertRange(raw);
  if (raw.isZero() || (dec.isZero() && !raw.isZero())) {
    return symRat(0n);
  }
  return sym;
}

function decorateCompResult(result: ResultValue, ctx: EvalContext, state: CalcState): ResultValue {
  const mathO = state.setup.displayFormat === "MthIO-MathO";
  let next: ResultValue = result.complex
    ? result
    : { ...result, sexagesimal: formatSexagesimal(parseCalcNumber(result.approx)) };
  if (ctx.polRec) {
    const X = formatNumeric(ctx.polRec.x, state.setup);
    const Y = formatNumeric(ctx.polRec.y, state.setup);
    const Xd = formatBySetup(ctx.polRec.x, state.setup);
    const Yd = formatBySetup(ctx.polRec.y, state.setup);
    const display =
      ctx.polRec.kind === "pol"
        ? mathO
          ? `r=${Xd} θ=${Yd}`
          : `r=${Xd}`
        : mathO
          ? `X=${Xd} Y=${Yd}`
          : `X=${Xd}`;
    next = {
      ...next,
      display,
      approx: X,
      polRec: { X, Y, kind: ctx.polRec.kind },
      naturalKind: "decimal",
    };
  }
  if (ctx.divR) {
    const q = formatNumeric(ctx.divR.quot, state.setup);
    const r = formatNumeric(ctx.divR.rem, state.setup);
    const qd = formatBySetup(ctx.divR.quot, state.setup);
    const rd = formatBySetup(ctx.divR.rem, state.setup);
    next = {
      ...next,
      display: `${qd} R ${rd}`,
      approx: q,
      remainder: { quot: q, rem: r },
      naturalKind: "decimal",
    };
  }
  return next;
}

export function evaluateAtoms(
  atoms: Atom[],
  state: CalcState,
  nextUint32: () => number,
  variableOverlay?: Partial<Record<VarName, string>>,
): ResultValue {
  try {
    const bound: CalcState = variableOverlay
      ? { ...state, variables: { ...state.variables, ...variableOverlay } }
      : state;
    const ctx = ctxFromState(bound, nextUint32);
    const sym = evalSlot(atoms, ctx);
    const format = ctx.complexFormatOverride ?? state.setup.complexFormat;
    if (sym.k === "cplx") {
      if (!ctx.complexOk) {
        throw new CalcMathError();
      }
      const { re, im } = asCplx(sym);
      assertRange(toDec(re));
      assertRange(toDec(im));
      return resultFromSym(sym, state.setup, format);
    }
    const raw = toDec(sym);
    const dec = assertRange(raw);
    const base =
      raw.isZero() || (dec.isZero() && !raw.isZero())
        ? resultFromSym(symRat(0n), state.setup)
        : resultFromSym(sym, state.setup, format);
    return decorateCompResult(base, ctx, state);
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

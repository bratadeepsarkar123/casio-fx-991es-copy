import {
  CalcArgumentError,
  CalcMathError,
  CalcSyntaxError,
  CalcTimeoutError,
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
import { effectiveDisplayFormat, resultFromSym, formatBySetup, formatNumeric, formatSexagesimal, fractionResultForSetup } from "./format.ts";
import { specialTrigFromSym } from "./specialTrig.ts";
import {
  asCplx,
  cplxI,
  exactRational,
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
import { assertAllowedCalculusTree, differentiateCentral, integrateAdaptive, sumIntegerRange } from "./calculus.ts";
import {
  convertUnitValue,
  scientificConstantByCallName,
  unitConversionByCallName,
} from "./scientificData.ts";
import type { AngleUnit, Atom, CalcMode, CalcState, ComplexFormat, NumberFormat, ResultValue, StatRow, StatType, VarName } from "./types.ts";

export interface EvalContext {
  mode: CalcMode;
  angle: AngleUnit;
  numberFormat: NumberFormat;
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
    mode: state.mode,
    angle: state.setup.angleUnit,
    numberFormat: state.setup.numberFormat,
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
  | { k: "op"; op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "implied" | "∠" | "=" };

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

function requireMagnitude(x: Dec, max: string, inclusive = false): Dec {
  const magnitude = x.abs();
  if (inclusive ? magnitude.gt(max) : magnitude.gte(max)) {
    throw new CalcMathError();
  }
  return x;
}

function requireFunctionInputRange(
  x: Dec,
  min: string | null,
  max: string,
  minInclusive = true,
  maxInclusive = true,
): Dec {
  if (
    (min !== null && (minInclusive ? x.lt(min) : x.lte(min))) ||
    (maxInclusive ? x.gt(max) : x.gte(max))
  ) {
    throw new CalcMathError();
  }
  return x;
}

function requireTrigInput(name: string, x: Dec, angle: AngleUnit): Dec {
  switch (name) {
    case "sin":
    case "cos":
    case "tan": {
      const max = angle === "Deg" ? "9e9" : angle === "Rad" ? "157079632.7" : "1e10";
      return requireMagnitude(x, max);
    }
    case "asin":
    case "acos":
      return requireMagnitude(x, "1", true);
    case "atan":
      return requireMagnitude(x, "9.999999999e99", true);
    case "sinh":
    case "cosh":
      return requireMagnitude(x, "230.2585092", true);
    case "tanh":
      return requireMagnitude(x, "9.999999999e99", true);
    case "asinh":
      return requireMagnitude(x, "4.999999999e99", true);
    case "acosh":
      return requireFunctionInputRange(x, "1", "4.999999999e99");
    case "atanh":
      return requireMagnitude(x, "0.9999999999", true);
    default:
      throw new CalcSyntaxError();
  }
}

function requirePowerRange(base: Sym, exponent: Sym): void {
  if (base.k === "cplx" || exponent.k === "cplx") {
    return;
  }
  const x = toDec(base);
  const y = toDec(exponent);
  assertRange(x);
  assertRange(y);
  if (x.isZero()) {
    if (y.lte(0)) {
      throw new CalcMathError();
    }
    return;
  }
  const rationalExponent = exactRational(exponent);
  if (x.isNeg() && (!rationalExponent || rationalExponent.d % 2n === 0n)) {
    throw new CalcMathError();
  }
  const logProduct = y.times(x.abs().log(10));
  if (logProduct.lte("-1e100") || logProduct.gte(100)) {
    throw new CalcMathError();
  }
}

function requireExactTanNonSingularity(value: Dec, angle: AngleUnit): void {
  const singularUnit = angle === "Deg" ? D(90) : angle === "Gra" ? D(100) : null;
  if (singularUnit) {
    const multiple = value.abs().div(singularUnit);
    if (multiple.isInteger() && multiple.mod(2).eq(1)) {
      throw new CalcMathError();
    }
  }
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
      const wholeLength = literalIntegerLength(atom.whole);
      const numeratorLength = literalIntegerLength(atom.num);
      const denominatorLength = literalIntegerLength(atom.den);
      if (wholeLength !== null && numeratorLength !== null && denominatorLength !== null && atom.den.length > 0) {
        const separators = (atom.whole.length > 0 ? 1 : 0) + 1;
        if (wholeLength + numeratorLength + denominatorLength + separators > 10) {
          throw new CalcMathError();
        }
      }
      const w = atom.whole.length ? evalSlot(atom.whole, ctx) : symRat(0n);
      const n = evalSlot(atom.num, ctx);
      const d = evalSlot(atom.den, ctx);
      return symAdd(w, symDiv(n, d));
    }
    case "sexagesimal": {
      const deg = atom.deg.length ? requireReal(evalSlot(atom.deg, ctx)) : D(0);
      const min = atom.min.length ? requireReal(evalSlot(atom.min, ctx)) : D(0);
      const sec = atom.sec.length ? requireReal(evalSlot(atom.sec, ctx)) : D(0);
      requireMagnitude(deg, "1e100");
      requireFunctionInputRange(min, "0", "1e100", true, false);
      requireFunctionInputRange(sec, "0", "1e100", true, false);
      return fromDec(deg.plus(min.div(60)).plus(sec.div(3600)));
    }
    case "sqrt": {
      const value = evalSlot(atom.inner, ctx);
      requireFunctionInputRange(requireReal(value), "0", "1e100", true, false);
      return symSqrt(value);
    }
    case "cbrt": {
      const inner = evalSlot(atom.inner, ctx);
      requireMagnitude(requireReal(inner), "1e100");
      return symPow(inner, symRat(1n, 3n));
    }
    case "nthrt": {
      const n = evalSlot(atom.n, ctx);
      const inner = evalSlot(atom.inner, ctx);
      const exactIndex = exactRational(n);
      const exponent = exactIndex ? symRat(exactIndex.d, exactIndex.n) : symDiv(symRat(1n), n);
      requirePowerRange(inner, exponent);
      return symPow(inner, exponent);
    }
    case "pow": {
      const base = evalSlot(atom.base, ctx);
      const exponent = evalSlot(atom.exp, ctx);
      requirePowerRange(base, exponent);
      return symPow(base, exponent);
    }
    case "logb": {
      const a = requireReal(evalSlot(atom.arg, ctx));
      const b = requireReal(evalSlot(atom.base, ctx));
      requireFunctionInputRange(a, "0", "9.999999999e99", false, true);
      requireFunctionInputRange(b, "0", "9.999999999e99", false, true);
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
          if (!isNonReal(inner)) {
            requireMagnitude(requireReal(inner), "1e50");
          }
          return symPow(inner, symRat(2n));
        case "cube":
          return symPow(inner, symRat(3n));
        case "inv": {
          if (!isNonReal(inner)) {
            const value = requireReal(inner);
            requireMagnitude(value, "1e100");
            if (value.isZero()) {
              throw new CalcMathError();
            }
          }
          return symDiv(symRat(1n), inner);
        }
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

function literalIntegerLength(atoms: Atom[]): number | null {
  if (atoms.length === 0) {
    return 0;
  }
  if (atoms.length !== 1 || atoms[0]?.t !== "num" || !/^\d+$/.test(atoms[0].s)) {
    return null;
  }
  return atoms[0].s.length;
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
  const constant = scientificConstantByCallName(name);
  if (constant) {
    return fromDec(D(constant.value));
  }
  const conversion = unitConversionByCallName(name);
  if (conversion) {
    const source = args[0];
    if (!source || source.length === 0) {
      throw new CalcSyntaxError();
    }
    return fromDec(convertUnitValue(conversion.code, requireReal(evalSlot(source, ctx))));
  }
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
  if (name === "int" || name === "diff" || name === "Σ") {
    return evalNumericalCall(name, args, ctx);
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
      const trigValue = requireTrigInput(name, toDec(arg), ctx.angle);
      if (name === "tan") {
        requireExactTanNonSingularity(trigValue, ctx.angle);
      }
      const special = specialTrigFromSym(name, arg, ctx.angle);
      if (special) {
        return special;
      }
      return fromDec(evalTrig(name, trigValue, ctx.angle));
    }
    case "log": {
      if (vals.length >= 2 && vals[0] && vals[1]) {
        const b = requireReal(vals[0]);
        const a = requireReal(vals[1]);
        requireFunctionInputRange(a, "0", "9.999999999e99", false, true);
        requireFunctionInputRange(b, "0", "9.999999999e99", false, true);
        if (a.lte(0) || b.lte(0) || b.eq(1)) {
          throw new CalcMathError();
        }
        return fromDec(roundInternal(a.ln().div(b.ln())));
      }
      {
        const x = vals[0] ? requireReal(vals[0]) : D(0);
        requireFunctionInputRange(x, "0", "9.999999999e99", false, true);
        if (x.lte(0)) {
          throw new CalcMathError();
        }
        return fromDec(roundInternal(x.log(10)));
      }
    }
    case "ln": {
      const x = vals[0] ? requireReal(vals[0]) : D(0);
      requireFunctionInputRange(x, "0", "9.999999999e99", false, true);
      if (x.lte(0)) {
        throw new CalcMathError();
      }
      return fromDec(roundInternal(x.ln()));
    }
    case "sci10":
    case "exp10": {
      const exponent = vals[0] ? requireReal(vals[0]) : D(0);
      requireFunctionInputRange(exponent, "-9.999999999e99", "99.99999999");
      return fromDec(roundInternal(D(10).pow(exponent)));
    }
    case "exp": {
      const exponent = vals[0] ? requireReal(vals[0]) : D(0);
      requireFunctionInputRange(exponent, "-9.999999999e99", "230.2585092");
      return fromDec(roundInternal(exponent.exp()));
    }
    case "Ran#": {
      const value = fromDec(ranHash(ctx.nextUint32()));
      const exact = exactRational(value);
      return exact ? symRat(exact.n, exact.d) : value;
    }
    case "RanInt": {
      const a = vals[0];
      const b = vals[1];
      if (!a || !b) {
        throw new CalcArgumentError();
      }
      return fromDec(ranInt(requireReal(a), requireReal(b), ctx.nextUint32()));
    }
    case "Rnd": {
      const value = vals[0] ? requireReal(vals[0]) : D(0);
      const rounded =
        ctx.numberFormat.kind === "Fix"
          ? value.toDecimalPlaces(ctx.numberFormat.n, 4)
          : value.toSignificantDigits(
              ctx.numberFormat.kind === "Sci" && ctx.numberFormat.n !== 0 ? ctx.numberFormat.n : 10,
              4,
            );
      return fromDec(roundInternal(rounded));
    }
    case "Pol": {
      if (!vals[0] || !vals[1]) {
        throw new CalcArgumentError();
      }
      const x = requireReal(vals[0]);
      const y = requireReal(vals[1]);
      requireMagnitude(x, "9.999999999e99", true);
      requireMagnitude(y, "9.999999999e99", true);
      const z = packCplx(fromDec(x), fromDec(y));
      const r = toDec(complexAbs(z));
      requireFunctionInputRange(r, "0", "9.999999999e99");
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
      requireFunctionInputRange(r, "0", "9.999999999e99");
      requireTrigInput("sin", th, ctx.angle);
      const z = polarToRect(fromDec(r), fromDec(th), ctx.angle);
      const { re, im } = asCplx(z);
      assertRange(toDec(re));
      assertRange(toDec(im));
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

function evalNumericalCall(name: "int" | "diff" | "Σ", args: Atom[][], ctx: EvalContext): Sym {
  if (ctx.mode !== "COMP") {
    throw new CalcSyntaxError();
  }
  const required = name === "int" || name === "Σ" ? 3 : 2;
  if (args.length < required || args.slice(0, required).some((slot) => slot.length === 0)) {
    throw new CalcSyntaxError();
  }
  if (args.length > required + (name === "Σ" ? 0 : 1)) {
    throw new CalcArgumentError();
  }
  if (args.length > required && args[required]?.length === 0) {
    throw new CalcSyntaxError();
  }
  assertAllowedCalculusTree(name, args);
  const fn = args[0];
  const first = args[1];
  const second = args[2];
  if (!fn || !first || (name !== "diff" && !second)) {
    throw new CalcSyntaxError();
  }
  const firstValue = requireReal(evalSlot(first, ctx));
  const secondValue = name !== "diff" && second ? requireReal(evalSlot(second, ctx)) : D(0);
  const toleranceSlot = name === "diff" ? args[2] : name === "int" ? args[3] : undefined;
  const explicitTolerance = Boolean(toleranceSlot?.length);
  const tolerance = explicitTolerance
    ? requireReal(evalSlot(toleranceSlot!, ctx))
    : D(name === "int" ? "1e-5" : "1e-10");
  const originalX = ctx.variables.X;
  const sample = (x: Dec): Dec => {
    ctx.variables.X = x;
    try {
      return requireReal(evalSlot(fn, ctx));
    } finally {
      ctx.variables.X = originalX;
    }
  };
  if (name === "int") {
    return fromDec(integrateAdaptive(sample, firstValue, secondValue, tolerance));
  }
  if (name === "diff") {
    return fromDec(differentiateCentral(sample, firstValue, tolerance, explicitTolerance));
  }
  return fromDec(sumIntegerRange(sample, firstValue, secondValue));
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

function containsSexagesimalInput(atoms: Atom[]): boolean {
  for (const atom of atoms) {
    let nested: Atom[][] = [];
    switch (atom.t) {
      case "sexagesimal":
        return true;
      case "frac":
        nested = [atom.num, atom.den];
        break;
      case "mixed":
        nested = [atom.whole, atom.num, atom.den];
        break;
      case "sqrt":
      case "cbrt":
      case "neg":
      case "abs":
        nested = [atom.inner];
        break;
      case "post":
        if (atom.op === "dms") {
          return true;
        }
        nested = [atom.inner];
        break;
      case "angle":
        nested = [atom.inner];
        break;
      case "nthrt":
        nested = [atom.n, atom.inner];
        break;
      case "pow":
        nested = [atom.base, atom.exp];
        break;
      case "logb":
        nested = [atom.base, atom.arg];
        break;
      case "call":
        nested = atom.args;
        break;
      case "group":
        nested = [atom.inner];
        break;
      default:
        break;
    }
    if (nested.some(containsSexagesimalInput)) {
      return true;
    }
  }
  return false;
}

function containsFractionInput(atoms: Atom[]): boolean {
  return atoms.some((atom) => {
    if (atom.t === "frac" || atom.t === "mixed") {
      return true;
    }
    return nestedAtomLists(atom).some(containsFractionInput);
  });
}

function containsDecimalLiteral(atoms: Atom[]): boolean {
  return atoms.some((atom) => {
    if (atom.t === "num") {
      return atom.s.includes(".");
    }
    return nestedAtomLists(atom).some(containsDecimalLiteral);
  });
}

function nestedAtomLists(atom: Atom): Atom[][] {
  switch (atom.t) {
    case "frac": return [atom.num, atom.den];
    case "mixed": return [atom.whole, atom.num, atom.den];
    case "sqrt":
    case "cbrt":
    case "neg":
    case "abs":
    case "post":
    case "angle": return [atom.inner];
    case "nthrt": return [atom.n, atom.inner];
    case "pow": return [atom.base, atom.exp];
    case "logb": return [atom.base, atom.arg];
    case "sexagesimal": return [atom.deg, atom.min, atom.sec];
    case "call": return atom.args;
    case "group": return [atom.inner];
    default: return [];
  }
}

function decorateCompResult(result: ResultValue, ctx: EvalContext, state: CalcState, source: Atom[]): ResultValue {
  const mathO = effectiveDisplayFormat(state.mode, state.setup.displayFormat) === "MthIO-MathO";
  let next: ResultValue = result.complex
    ? result
    : { ...result, sexagesimal: formatSexagesimal(parseCalcNumber(result.internal?.re ?? result.approx)) };
  if (
    !mathO &&
    !result.complex &&
    result.fraction &&
    containsFractionInput(source) &&
    !containsDecimalLiteral(source)
  ) {
    next = fractionResultForSetup(next, state.setup);
  }
  if (!result.complex && containsSexagesimalInput(source) && next.sexagesimal) {
    next = { ...next, display: next.sexagesimal, naturalKind: "decimal" };
  }
  if (ctx.polRec) {
    const X = formatNumeric(ctx.polRec.x, state.setup);
    const Y = formatNumeric(ctx.polRec.y, state.setup);
    const Xd = formatBySetup(ctx.polRec.x, state.setup);
    const Yd = formatBySetup(ctx.polRec.y, state.setup);
    const separator = state.setup.decimalMark === "Dot" ? "," : ";";
    const display =
      ctx.polRec.kind === "pol"
        ? mathO
          ? `r=${Xd}${separator} θ=${Yd}`
          : `r=${Xd}\nθ=${Yd}`
        : mathO
          ? `X=${Xd}${separator} Y=${Yd}`
          : `X=${Xd}\nY=${Yd}`;
    next = {
      ...next,
      display,
      approx: X,
      polRec: { X, Y, kind: ctx.polRec.kind },
      internal: {
        re: next.internal?.re ?? next.approx,
        ...(next.internal?.im !== undefined ? { im: next.internal.im } : {}),
        x: roundInternal(ctx.polRec.x).toString(),
        y: roundInternal(ctx.polRec.y).toString(),
      },
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
    const effectiveState: CalcState = {
      ...bound,
      setup: { ...bound.setup, displayFormat: effectiveDisplayFormat(bound.mode, bound.setup.displayFormat) },
    };
    const ctx = ctxFromState(effectiveState, nextUint32);
    const sym = evalSlot(atoms, ctx);
    const format = ctx.complexFormatOverride ?? effectiveState.setup.complexFormat;
    if (sym.k === "cplx") {
      if (!ctx.complexOk) {
        throw new CalcMathError();
      }
      const { re, im } = asCplx(sym);
      assertRange(toDec(re));
      assertRange(toDec(im));
      return resultFromSym(sym, effectiveState.setup, format);
    }
    const raw = toDec(sym);
    const dec = assertRange(raw);
    const base =
      raw.isZero() || (dec.isZero() && !raw.isZero())
        ? resultFromSym(symRat(0n), effectiveState.setup)
        : resultFromSym(sym, effectiveState.setup, format);
    return decorateCompResult(base, ctx, effectiveState, atoms);
  } catch (err) {
    if (err instanceof CalcMathError || err instanceof CalcSyntaxError || err instanceof CalcArgumentError || err instanceof CalcTimeoutError) {
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

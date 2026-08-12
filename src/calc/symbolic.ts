import { D, PI, gcdBig, type Dec } from "./numeric.ts";

export interface Rat {
  n: bigint;
  d: bigint;
}

export function rat(n: bigint, d: bigint = 1n): Rat {
  if (d === 0n) {
    throw new Error("div0");
  }
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcdBig(n, d);
  return { n: n / g, d: d / g };
}

export function ratAdd(a: Rat, b: Rat): Rat {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function ratSub(a: Rat, b: Rat): Rat {
  return rat(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function ratMul(a: Rat, b: Rat): Rat {
  return rat(a.n * b.n, a.d * b.d);
}

export function ratDiv(a: Rat, b: Rat): Rat {
  if (b.n === 0n) {
    throw new Error("div0");
  }
  return rat(a.n * b.d, a.d * b.n);
}

export function ratNeg(a: Rat): Rat {
  return { n: -a.n, d: a.d };
}

export function ratEq(a: Rat, b: Rat): boolean {
  return a.n === b.n && a.d === b.d;
}

export function ratAbs(a: Rat): Rat {
  return { n: a.n < 0n ? -a.n : a.n, d: a.d };
}

export function ratToDec(a: Rat): Dec {
  return D(a.n.toString()).div(D(a.d.toString()));
}

function factorSquare(n: bigint): { square: bigint; rest: bigint } {
  let x = n < 0n ? -n : n;
  let square = 1n;
  let p = 2n;
  while (p * p <= x) {
    let count = 0n;
    while (x % p === 0n) {
      x /= p;
      count += 1n;
    }
    const pairs = count / 2n;
    for (let i = 0n; i < pairs; i += 1n) {
      square *= p;
    }
    p += p === 2n ? 1n : 2n;
  }
  return { square, rest: n < 0n ? -x : x };
}

/** Sum of rational coefficients times √radicand. radicand 1 is the rational part. */
export type Quad = Map<bigint, Rat>;

export type Sym =
  | { k: "rat"; r: Rat }
  | { k: "quad"; q: Quad }
  | { k: "pi"; r: Rat }
  | { k: "real"; v: Dec };

export function symRat(n: bigint, d: bigint = 1n): Sym {
  return { k: "rat", r: rat(n, d) };
}

export function fromDec(v: Dec): Sym {
  if (v.isInteger() && v.abs().lt("1e12")) {
    return symRat(BigInt(v.toFixed(0)));
  }
  return { k: "real", v };
}

export function toDec(s: Sym): Dec {
  switch (s.k) {
    case "rat":
      return ratToDec(s.r);
    case "pi":
      return ratToDec(s.r).times(PI);
    case "real":
      return s.v;
    case "quad": {
      let acc = D(0);
      for (const [rad, coef] of s.q) {
        const c = ratToDec(coef);
        acc = acc.plus(rad === 1n ? c : c.times(D(rad.toString()).sqrt()));
      }
      return acc;
    }
    default: {
      const _never: never = s;
      return _never;
    }
  }
}

function quadFromRat(r: Rat): Quad {
  const m: Quad = new Map();
  if (r.n !== 0n) {
    m.set(1n, r);
  }
  return m;
}

function normalizeQuad(q: Quad): Sym {
  const cleaned: Quad = new Map();
  for (const [rad, coef] of q) {
    if (coef.n === 0n) {
      continue;
    }
    if (rad === 1n) {
      cleaned.set(1n, coef);
      continue;
    }
    const { square, rest } = factorSquare(rad);
    const moved = ratMul(coef, rat(square));
    if (rest === 1n) {
      const prev = cleaned.get(1n) ?? rat(0n);
      cleaned.set(1n, ratAdd(prev, moved));
    } else if (rest < 0n) {
      return { k: "real", v: toDec({ k: "quad", q }) };
    } else {
      const prev = cleaned.get(rest) ?? rat(0n);
      cleaned.set(rest, ratAdd(prev, moved));
    }
  }
  if (cleaned.size === 0) {
    return symRat(0n);
  }
  if (cleaned.size === 1 && cleaned.has(1n)) {
    return { k: "rat", r: cleaned.get(1n)! };
  }
  return { k: "quad", q: cleaned };
}

export function symAdd(a: Sym, b: Sym): Sym {
  if (a.k === "real" || b.k === "real") {
    return { k: "real", v: toDec(a).plus(toDec(b)) };
  }
  if (a.k === "pi" && b.k === "pi") {
    return { k: "pi", r: ratAdd(a.r, b.r) };
  }
  if (a.k === "pi" && b.k === "rat" && b.r.n === 0n) {
    return a;
  }
  if (b.k === "pi" && a.k === "rat" && a.r.n === 0n) {
    return b;
  }
  if (a.k === "pi" || b.k === "pi") {
    return { k: "real", v: toDec(a).plus(toDec(b)) };
  }
  const qa = a.k === "rat" ? quadFromRat(a.r) : a.q;
  const qb = b.k === "rat" ? quadFromRat(b.r) : b.q;
  const out: Quad = new Map(qa);
  for (const [rad, coef] of qb) {
    const prev = out.get(rad) ?? rat(0n);
    out.set(rad, ratAdd(prev, coef));
  }
  return normalizeQuad(out);
}

export function symNeg(a: Sym): Sym {
  switch (a.k) {
    case "rat":
      return { k: "rat", r: ratNeg(a.r) };
    case "pi":
      return { k: "pi", r: ratNeg(a.r) };
    case "real":
      return { k: "real", v: a.v.neg() };
    case "quad": {
      const q: Quad = new Map();
      for (const [rad, coef] of a.q) {
        q.set(rad, ratNeg(coef));
      }
      return { k: "quad", q };
    }
    default: {
      const _never: never = a;
      return _never;
    }
  }
}

export function symSub(a: Sym, b: Sym): Sym {
  return symAdd(a, symNeg(b));
}

export function symMul(a: Sym, b: Sym): Sym {
  if (a.k === "real" || b.k === "real") {
    return { k: "real", v: toDec(a).times(toDec(b)) };
  }
  if (a.k === "pi" && b.k === "rat") {
    return { k: "pi", r: ratMul(a.r, b.r) };
  }
  if (b.k === "pi" && a.k === "rat") {
    return { k: "pi", r: ratMul(b.r, a.r) };
  }
  if (a.k === "pi" || b.k === "pi") {
    return { k: "real", v: toDec(a).times(toDec(b)) };
  }
  const qa = a.k === "rat" ? quadFromRat(a.r) : a.q;
  const qb = b.k === "rat" ? quadFromRat(b.r) : b.q;
  const out: Quad = new Map();
  for (const [ra, ca] of qa) {
    for (const [rb, cb] of qb) {
      const coef = ratMul(ca, cb);
      const rad = ra * rb;
      const prev = out.get(rad) ?? rat(0n);
      out.set(rad, ratAdd(prev, coef));
    }
  }
  return normalizeQuad(out);
}

export function symDiv(a: Sym, b: Sym): Sym {
  const bd = toDec(b);
  if (bd.isZero()) {
    throw new Error("div0");
  }
  if (a.k === "rat" && b.k === "rat") {
    return { k: "rat", r: ratDiv(a.r, b.r) };
  }
  if (a.k === "pi" && b.k === "rat") {
    return { k: "pi", r: ratDiv(a.r, b.r) };
  }
  if (a.k === "pi" && b.k === "pi") {
    return { k: "rat", r: ratDiv(a.r, b.r) };
  }
  if (b.k === "rat") {
    const inv = { k: "rat" as const, r: ratDiv(rat(1n), b.r) };
    return symMul(a, inv);
  }
  if (b.k === "quad" && b.q.size <= 2) {
    const conjugate: Quad = new Map();
    for (const [rad, coef] of b.q) {
      conjugate.set(rad, rad === 1n ? coef : ratNeg(coef));
    }
    const num = symMul(a, { k: "quad", q: conjugate });
    let den = rat(0n);
    for (const [rad, coef] of b.q) {
      const sq = ratMul(coef, coef);
      den = rad === 1n ? ratAdd(den, sq) : ratSub(den, ratMul(sq, rat(rad)));
    }
    if (den.n !== 0n) {
      return symDiv(num, { k: "rat", r: den });
    }
  }
  return { k: "real", v: toDec(a).div(bd) };
}

export function symPow(base: Sym, exp: Sym): Sym {
  const ed = toDec(exp);
  if (base.k === "rat" && ed.isInteger() && ed.abs().lte(32)) {
    const e = Number(ed.toFixed(0));
    if (e === 0) {
      return symRat(1n);
    }
    if (e > 0) {
      let acc = rat(1n);
      for (let i = 0; i < e; i += 1) {
        acc = ratMul(acc, base.r);
      }
      return { k: "rat", r: acc };
    }
    let acc = rat(1n);
    for (let i = 0; i < -e; i += 1) {
      acc = ratMul(acc, base.r);
    }
    return { k: "rat", r: ratDiv(rat(1n), acc) };
  }
  if (ed.eq(2) && (base.k === "rat" || base.k === "quad")) {
    return symMul(base, base);
  }
  if (ed.eq(3) && (base.k === "rat" || base.k === "quad")) {
    return symMul(symMul(base, base), base);
  }
  const b = toDec(base);
  if (b.isNeg() && !ed.isInteger()) {
    throw new Error("math");
  }
  if (b.isZero() && ed.lte(0)) {
    throw new Error("math");
  }
  return { k: "real", v: b.pow(ed) };
}

export function symSqrt(a: Sym): Sym {
  if (a.k === "rat") {
    if (a.r.n < 0n) {
      throw new Error("math");
    }
    const num = factorSquare(a.r.n);
    const den = factorSquare(a.r.d);
    if (num.rest === 1n && den.rest === 1n) {
      return { k: "rat", r: rat(num.square, den.square) };
    }
    const q: Quad = new Map();
    const rad = num.rest * den.rest;
    const coef = rat(num.square * den.rest, den.square * den.rest);
    q.set(rad === 0n ? 1n : rad, coef);
    return normalizeQuad(q);
  }
  const v = toDec(a);
  if (v.isNeg()) {
    throw new Error("math");
  }
  return { k: "real", v: v.sqrt() };
}

export function digitCount(s: string): number {
  return s.replace(/[^0-9]/g, "").length;
}

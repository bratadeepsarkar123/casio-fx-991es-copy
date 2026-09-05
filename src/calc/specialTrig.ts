import { CalcMathError } from "./numeric.ts";
import {
  rat,
  ratEq,
  ratMul,
  type Rat,
  type Sym,
  symRat,
} from "./symbolic.ts";
import type { AngleUnit } from "./types.ts";

function halfSqrt(rad: bigint, sign = 1n): Sym {
  const q = new Map<bigint, Rat>();
  q.set(rad, rat(sign, 2n));
  return { k: "quad", q };
}

function thirdSqrt(rad: bigint, sign = 1n): Sym {
  const q = new Map<bigint, Rat>();
  q.set(rad, rat(sign, 3n));
  return { k: "quad", q };
}

function ratMod360(r: Rat): Rat {
  const period = 360n * r.d;
  let n = r.n % period;
  if (n < 0n) {
    n += period;
  }
  return rat(n, r.d);
}

type TrigName = "sin" | "cos" | "tan" | "asin" | "acos" | "atan";

function isTrigName(name: string): name is TrigName {
  return (
    name === "sin" ||
    name === "cos" ||
    name === "tan" ||
    name === "asin" ||
    name === "acos" ||
    name === "atan"
  );
}

/** Exact Natural Display values for canonical degrees in [0, 360). */
function degRow(deg: Rat): [Sym, Sym, Sym | "error"] | null {
  const key = `${deg.n}/${deg.d}`;
  switch (key) {
    case "0/1":
      return [symRat(0n), symRat(1n), symRat(0n)];
    case "30/1":
      return [symRat(1n, 2n), halfSqrt(3n), thirdSqrt(3n)];
    case "45/1":
      return [halfSqrt(2n), halfSqrt(2n), symRat(1n)];
    case "60/1":
      return [halfSqrt(3n), symRat(1n, 2n), { k: "quad", q: new Map([[3n, rat(1n)]]) }];
    case "90/1":
      return [symRat(1n), symRat(0n), "error"];
    case "120/1":
      return [halfSqrt(3n), symRat(-1n, 2n), { k: "quad", q: new Map([[3n, rat(-1n)]]) }];
    case "135/1":
      return [halfSqrt(2n), halfSqrt(2n, -1n), symRat(-1n)];
    case "150/1":
      return [symRat(1n, 2n), halfSqrt(3n, -1n), thirdSqrt(3n, -1n)];
    case "180/1":
      return [symRat(0n), symRat(-1n), symRat(0n)];
    case "210/1":
      return [symRat(-1n, 2n), halfSqrt(3n, -1n), thirdSqrt(3n)];
    case "225/1":
      return [halfSqrt(2n, -1n), halfSqrt(2n, -1n), symRat(1n)];
    case "240/1":
      return [halfSqrt(3n, -1n), symRat(-1n, 2n), { k: "quad", q: new Map([[3n, rat(1n)]]) }];
    case "270/1":
      return [symRat(-1n), symRat(0n), "error"];
    case "300/1":
      return [halfSqrt(3n, -1n), symRat(1n, 2n), { k: "quad", q: new Map([[3n, rat(-1n)]]) }];
    case "315/1":
      return [halfSqrt(2n, -1n), halfSqrt(2n), symRat(-1n)];
    case "330/1":
      return [symRat(-1n, 2n), halfSqrt(3n), thirdSqrt(3n, -1n)];
    default:
      return null;
  }
}

function pickTrig(name: "sin" | "cos" | "tan", row: [Sym, Sym, Sym | "error"]): Sym {
  const cell = name === "sin" ? row[0] : name === "cos" ? row[1] : row[2];
  if (cell === "error") {
    throw new CalcMathError();
  }
  return cell;
}

function degreesFromArg(arg: Sym, angle: AngleUnit): Rat | null {
  switch (angle) {
    case "Deg":
      if (arg.k === "rat") {
        return ratMod360(arg.r);
      }
      return null;
    case "Rad":
      if (arg.k === "pi") {
        return ratMod360(ratMul(arg.r, rat(180n)));
      }
      if (arg.k === "rat" && arg.r.n === 0n) {
        return rat(0n);
      }
      return null;
    case "Gra":
      if (arg.k === "rat") {
        return ratMod360(ratMul(arg.r, rat(9n, 10n)));
      }
      return null;
    default: {
      const _never: never = angle;
      return _never;
    }
  }
}

function inverseExact(name: "asin" | "acos" | "atan", arg: Sym, angle: AngleUnit): Sym | null {
  let deg: Rat | null = null;
  if (name === "asin") {
    if (arg.k === "rat" && ratEq(arg.r, rat(1n, 2n))) {
      deg = rat(30n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(-1n, 2n))) {
      deg = rat(-30n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(1n))) {
      deg = rat(90n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(-1n))) {
      deg = rat(-90n);
    } else if (arg.k === "rat" && arg.r.n === 0n) {
      deg = rat(0n);
    } else if (arg.k === "real" && arg.v.eq("0.5")) {
      deg = rat(30n);
    } else if (arg.k === "real" && arg.v.eq("-0.5")) {
      deg = rat(-30n);
    }
  } else if (name === "acos") {
    if (arg.k === "rat" && ratEq(arg.r, rat(1n, 2n))) {
      deg = rat(60n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(-1n, 2n))) {
      deg = rat(120n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(1n))) {
      deg = rat(0n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(-1n))) {
      deg = rat(180n);
    } else if (arg.k === "rat" && arg.r.n === 0n) {
      deg = rat(90n);
    } else if (arg.k === "real" && arg.v.eq("0.5")) {
      deg = rat(60n);
    }
  } else if (name === "atan") {
    if (arg.k === "rat" && ratEq(arg.r, rat(1n))) {
      deg = rat(45n);
    } else if (arg.k === "rat" && ratEq(arg.r, rat(-1n))) {
      deg = rat(-45n);
    } else if (arg.k === "rat" && arg.r.n === 0n) {
      deg = rat(0n);
    }
  }
  if (!deg) {
    return null;
  }
  switch (angle) {
    case "Deg":
      return { k: "rat", r: deg };
    case "Rad":
      return { k: "pi", r: ratMul(deg, rat(1n, 180n)) };
    case "Gra":
      return { k: "rat", r: ratMul(deg, rat(10n, 9n)) };
    default: {
      const _never: never = angle;
      return _never;
    }
  }
}

/**
 * Exact Natural Display shortcuts. Matches only exact symbolic/rational
 * special angles — not nearby floating values (no 1e-10 epsilon).
 */
export function specialTrigFromSym(name: string, arg: Sym, angle: AngleUnit): Sym | null {
  if (!isTrigName(name)) {
    return null;
  }
  if (name === "asin" || name === "acos" || name === "atan") {
    return inverseExact(name, arg, angle);
  }
  const deg = degreesFromArg(arg, angle);
  if (!deg) {
    return null;
  }
  const row = degRow(deg);
  if (!row) {
    return null;
  }
  return pickTrig(name, row);
}

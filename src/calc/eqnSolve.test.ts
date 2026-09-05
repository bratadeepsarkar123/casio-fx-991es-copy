import { describe, expect, it } from "vitest";
import { formatEqnValue, solveEqn } from "./eqnSolve.ts";
import { createInitialState } from "./machine.ts";
import { packCplx, symMul, symRat, symSqrt, toDec } from "./symbolic.ts";

const setup = createInitialState(0).setup;

function disp(sym: ReturnType<typeof packCplx> | ReturnType<typeof symRat>, allowSqrt = true) {
  return formatEqnValue(sym, setup, allowSqrt).display.replace(/\s/g, "");
}

describe("EQN solver (eqnSolve)", () => {
  it("Ex1 lin2 x+2y=3, 2x+3y=4 → X=-1 Y=2 TARGET-OFFICIAL-DOC", () => {
    const r = solveEqn("lin2", [symRat(1n), symRat(2n), symRat(3n), symRat(2n), symRat(3n), symRat(4n)]);
    expect(r.kind).toBe("solutions");
    if (r.kind !== "solutions") {
      return;
    }
    expect(r.solutions.map((s) => s.label)).toEqual(["X", "Y"]);
    expect(toDec(r.solutions[0]!.sym).toString()).toBe("-1");
    expect(toDec(r.solutions[1]!.sym).toString()).toBe("2");
    expect(disp(r.solutions[0]!.sym, false)).toBe("-1");
    expect(disp(r.solutions[1]!.sym, false)).toBe("2");
  });

  it("Ex2 lin3 x-y+z=2, x+y-z=0, -x+y+z=4 → X=1 Y=2 Z=3 TARGET-OFFICIAL-DOC", () => {
    const r = solveEqn("lin3", [
      symRat(1n),
      symRat(-1n),
      symRat(1n),
      symRat(2n),
      symRat(1n),
      symRat(1n),
      symRat(-1n),
      symRat(0n),
      symRat(-1n),
      symRat(1n),
      symRat(1n),
      symRat(4n),
    ]);
    expect(r.kind).toBe("solutions");
    if (r.kind !== "solutions") {
      return;
    }
    expect(r.solutions.map((s) => s.label)).toEqual(["X", "Y", "Z"]);
    expect(r.solutions.map((s) => toDec(s.sym).toString())).toEqual(["1", "2", "3"]);
  });

  it("Ex3 quadratic x²+x+3/4=0 complex conjugate pair TARGET-OFFICIAL-DOC", () => {
    const r = solveEqn("quad", [symRat(1n), symRat(1n), symRat(3n, 4n)]);
    expect(r.kind).toBe("solutions");
    if (r.kind !== "solutions") {
      return;
    }
    expect(r.solutions.map((s) => s.label)).toEqual(["X1", "X2"]);
    expect(r.solutions[0]!.sym.k).toBe("cplx");
    expect(r.solutions[1]!.sym.k).toBe("cplx");
    const d1 = disp(r.solutions[0]!.sym);
    const d2 = disp(r.solutions[1]!.sym);
    expect(d1).toMatch(/-1\/2/);
    expect(d1).toMatch(/i/);
    expect(d2).toMatch(/-1\/2/);
    expect(d2).toMatch(/-/);
    expect(d1.includes("+") || d1.endsWith("i")).toBe(true);
  });

  it("Ex4 quadratic x²-2√2 x+2=0 repeated X=√2 TARGET-OFFICIAL-DOC", () => {
    const b = symMul(symRat(-2n), symSqrt(symRat(2n)));
    const r = solveEqn("quad", [symRat(1n), b, symRat(2n)]);
    expect(r.kind).toBe("solutions");
    if (r.kind !== "solutions") {
      return;
    }
    expect(r.solutions).toHaveLength(1);
    expect(r.solutions[0]!.label).toBe("X");
    expect(disp(r.solutions[0]!.sym)).toBe("√2");
  });

  it("Ex5 cubic x³-2x²-x+2=0 X1=-1 X2=2 X3=1 TARGET-OFFICIAL-DOC", () => {
    const r = solveEqn("cubic", [symRat(1n), symRat(-2n), symRat(-1n), symRat(2n)]);
    expect(r.kind).toBe("solutions");
    if (r.kind !== "solutions") {
      return;
    }
    expect(r.solutions.map((s) => s.label)).toEqual(["X1", "X2", "X3"]);
    expect(r.solutions.map((s) => toDec(s.sym).toString())).toEqual(["-1", "2", "1"]);
  });

  it("inconsistent 2×2 is no-solution (not Math ERROR / Can't Solve)", () => {
    const r = solveEqn("lin2", [symRat(1n), symRat(1n), symRat(1n), symRat(2n), symRat(2n), symRat(3n)]);
    expect(r.kind).toBe("no-solution");
  });

  it("dependent 2×2 is infinite", () => {
    const r = solveEqn("lin2", [symRat(1n), symRat(1n), symRat(1n), symRat(2n), symRat(2n), symRat(2n)]);
    expect(r.kind).toBe("infinite");
  });

  it("0x+0y=1 is no-solution (not infinite)", () => {
    const r = solveEqn("lin2", [symRat(0n), symRat(0n), symRat(1n), symRat(0n), symRat(0n), symRat(0n)]);
    expect(r.kind).toBe("no-solution");
  });

  it("zero leading quadratic coefficient is math-error INFERRED", () => {
    expect(solveEqn("quad", [symRat(0n), symRat(1n), symRat(1n)]).kind).toBe("math-error");
  });

  it("zero leading cubic coefficient is math-error INFERRED", () => {
    expect(solveEqn("cubic", [symRat(0n), symRat(1n), symRat(1n), symRat(1n)]).kind).toBe("math-error");
  });

  it("x²-1=0 two real roots X1=1 X2=-1 (quadratic +√ first)", () => {
    const r = solveEqn("quad", [symRat(1n), symRat(0n), symRat(-1n)]);
    expect(r.kind).toBe("solutions");
    if (r.kind !== "solutions") {
      return;
    }
    expect(r.solutions.map((s) => s.label)).toEqual(["X1", "X2"]);
    expect(r.solutions.map((s) => toDec(s.sym).toString())).toEqual(["1", "-1"]);
  });
});

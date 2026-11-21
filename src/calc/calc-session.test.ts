import { describe, expect, it } from "vitest";
import { editorFromAtoms } from "./editor.ts";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdIndicators, lcdResult } from "../ui/lcdModel.ts";
import type { Atom, CalcState } from "./types.ts";

function run(keys: Parameters<typeof dispatchKeys>[1], state: CalcState = createInitialState(0)): CalcState {
  return dispatchKeys(state, keys, 0);
}

const num = (s: string): Atom => ({ t: "num", s });
const variable = (name: "A" | "B" | "C" | "X" | "Y"): Atom => ({ t: "var", name });
const op = (symbol: "+" | "-" | "×" | "=" | "∠"): Atom => ({ t: "op", op: symbol });

function solveFrom(source: Atom[], state = createInitialState(0)): CalcState {
  return run(["shift", "calc"], { ...state, editor: editorFromAtoms(source) });
}

describe("selected-guide CALC, SOLVE, and multi-statement sessions", () => {
  it("replays E-19's 3A+B prompts and repeated CALC result cycle", () => {
    let state = run(["3", "alpha", "neg", "add", "alpha", "dms", "calc"]);
    expect(state.calcSession?.phase).toBe("prompt");
    expect(lcdExpression(state)).toBe("A?");
    expect(lcdResult(state)).toBe("0");

    state = run(["5", "equals"], state);
    expect(lcdExpression(state)).toBe("B?");
    state = run(["1", "0", "equals"], state);
    expect(state.result?.approx).toBe("25");
    expect(lcdExpression(state)).toBe("3A+B");

    state = run(["equals"], state);
    expect(lcdExpression(state)).toBe("A?");
    expect(lcdResult(state)).toBe("5");
    state = run(["7", "equals"], state);
    expect(lcdExpression(state)).toBe("B?");
    expect(lcdResult(state)).toBe("10");
    state = run(["2", "0", "equals"], state);
    expect(state.result?.approx).toBe("41");
    expect(state.variables.A).toBe("7");
    expect(state.variables.B).toBe("20");
    expect(state.history).toHaveLength(2);

    state = run(["ac"], state);
    expect(state.calcSession).toBeNull();
    expect(lcdExpression(state)).toBe("3A+B");
  });

  it("treats CALC equality as a variable assignment", () => {
    const source: Atom[] = [variable("A"), op("="), variable("B"), op("+"), variable("C")];
    let state = { ...createInitialState(0), editor: editorFromAtoms(source) };
    state = run(["calc", "2", "equals", "3", "equals"], state);
    expect(state.variables.A).toBe("5");
    expect(state.result?.approx).toBe("5");
  });

  it("keeps CALC variable substitution in CMPLX mode with the i symbol", () => {
    const state = run([
      "mode", "2", "alpha", "neg", "add", "alpha", "dms", "eng", "calc",
      "2", "equals", "1", "equals",
    ]);
    expect(state.mode).toBe("CMPLX");
    expect(state.result?.complex).toEqual({ re: "2", im: "1" });
    expect(state.calcSession?.phase).toBe("result");
  });

  it("replays E-20's two CALC complex substitutions in polar format", () => {
    let state = run(["mode", "2", "alpha", "neg", "add", "alpha", "dms", "eng", "shift", "2", "3", "calc"]);
    state = run(["sqrt", "3", "rparen", "equals"], state);
    state = run(["1", "equals"], state);
    expect(state.result?.display).toBe("2∠30");

    state = run(["calc"], state);
    state = run(["1", "equals"], state);
    state = run(["sqrt", "3", "rparen", "equals"], state);
    expect(state.result?.display).toBe("2∠60");
  });

  it("shows every colon-separated result and Disp only while an intermediate result is active", () => {
    let state = run(["3", "add", "3", "alpha", "integral", "3", "mul", "3", "equals"]);
    expect(state.result?.approx).toBe("6");
    expect(lcdIndicators(state).disp).toBe(true);
    expect(state.history).toHaveLength(0);

    state = run(["equals"], state);
    expect(state.result?.approx).toBe("9");
    expect(lcdResult(state)).toBe("9");
    expect(lcdIndicators(state).disp).toBe(false);
    expect(state.history).toHaveLength(1);
  });

  it("replays E-21's Y, A, B prompts, initial guess, decimal solution, and residual", () => {
    let state = run([
      "alpha", "sd", "alpha", "calc", "alpha", "neg", "alpha", "rparen", "square", "add", "alpha", "dms", "shift", "calc",
    ]);
    expect(state.solveSession?.phase).toBe("parameters");
    expect(lcdExpression(state)).toBe("Y?");
    state = run(["0", "equals", "1", "equals", "neg", "2", "equals"], state);
    expect(state.solveSession?.phase).toBe("initial");
    expect(lcdExpression(state)).toBe("Solve for X");
    state = run(["1", "equals"], state);

    expect(state.solveSession?.phase).toBe("solution");
    expect(Number(state.result?.approx)).toBeCloseTo(Math.sqrt(2), 9);
    expect(state.solveSession?.residual).toBe("0");
    expect(lcdResult(state)).toContain("X=");
    expect(lcdResult(state)).toContain("L−R=");
    expect(state.variables.Y).toBe("0");
    expect(state.variables.A).toBe("1");
    expect(state.variables.B).toBe("-2");
  });

  it("replays E-22's 3, 7, 13 sequence and asks for the current initial value each time", () => {
    let state = run([
      "alpha", "sd", "alpha", "calc", "alpha", "rparen", "square", "sub", "alpha", "rparen", "add", "1", "shift", "calc",
    ]);
    state = run(["3", "equals", "1", "equals"], state);
    expect(state.result?.approx).toBe("2");
    expect(state.solveSession?.residual).toBe("0");

    state = run(["equals", "7", "equals"], state);
    expect(state.solveSession?.phase).toBe("initial");
    expect(lcdExpression(state)).toBe("Solve for X");
    expect(state.solveSession?.initialGuess).toBe("2");
    expect(lcdResult(state)).toBe("2");
    state = run(["equals"], state);
    expect(state.result?.approx).toBe("3");
    expect(state.solveSession?.residual).toBe("0");

    state = run(["equals", "1", "3", "equals", "equals"], state);
    expect(state.result?.approx).toBe("4");
    expect(state.solveSession?.residual).toBe("0");
  });

  it("solves for an explicitly named non-X variable", () => {
    let state = run([
      "alpha", "sd", "alpha", "calc", "alpha", "rparen", "add", "5", "shift", "rparen", "alpha", "sd", "shift", "calc",
    ]);
    expect(lcdExpression(state)).toBe("X?");
    state = run(["7", "equals"], state);
    expect(state.solveSession?.phase).toBe("initial");
    state = run(["equals"], state);
    expect(state.solveSession?.target).toBe("Y");
    expect(state.result?.approx).toBe("12");
    expect(lcdResult(state)).toContain("Y=12");
  });

  it("rejects absent solve variables and unclosed calls before asking for parameters", () => {
    const missing = solveFrom([variable("A"), op("+"), num("1")]);
    expect(missing.screen).toMatchObject({ kind: "error", code: "Variable ERROR" });
    expect(missing.solveSession).toBeNull();

    const namedMissing = solveFrom([
      { t: "post", op: "sq", inner: [variable("X")] }, op("+"), num("1"), { t: "comma" }, variable("Y"),
    ]);
    expect(namedMissing.screen).toMatchObject({ kind: "error", code: "Variable ERROR" });
    expect(namedMissing.solveSession).toBeNull();

    const unclosed = run(["sin", "3", "0", "shift", "calc"]);
    expect(unclosed.screen).toMatchObject({ kind: "error", code: "Syntax ERROR" });
    expect(unclosed.solveSession).toBeNull();
  });

  it("does not accept a false zero residual for a scaled equation", () => {
    let state = run([
      "1", "exp10", "neg", "1", "2", "rparen", "mul", "lparen",
      "alpha", "rparen", "sub", "2", "rparen", "shift", "calc",
    ]);
    expect(state.solveSession?.phase).toBe("initial");
    expect(lcdExpression(state)).toBe("Solve for X");
    expect(lcdResult(state)).toBe("0");
    state = run(["equals"], state);
    expect(state.solveSession?.phase).toBe("solution");
    expect(state.result?.approx).toBe("2");
    expect(state.solveSession?.residual).toBe("0");
    expect(lcdResult(state)).toContain("X=2");
    expect(lcdResult(state)).toContain("L−R=0");
  });

  it("preserves a scaled nonzero L-R residual after solving", () => {
    let state = run([
      "1", "exp10", "neg", "1", "2", "rparen", "mul", "lparen",
      "3", "mul", "alpha", "rparen", "sub", "1", "0", "rparen", "shift", "calc",
    ]);
    expect(state.solveSession?.phase).toBe("initial");
    state = run(["equals"], state);
    expect(state.solveSession?.phase).toBe("solution");
    expect(Number(state.result?.approx)).toBeCloseTo(10 / 3, 10);
    expect(state.solveSession?.residual).not.toBe("0");
    expect(state.solveSession?.residual).toMatch(/×10/);
  });

  it("keeps Newton non-convergence on the Continue path until AC cancels", () => {
    const source: Atom[] = [{ t: "post", op: "sq", inner: [variable("X")] }, op("+"), num("1")];
    let state = solveFrom(source);
    state = run(["1", "equals"], state);
    expect(state.solveSession?.phase).toBe("continue");
    expect(lcdExpression(state)).toBe("Continue: [=]");
    state = run(["equals"], state);
    expect(state.solveSession?.phase).toBe("continue");
    state = run(["ac"], state);
    expect(state.solveSession).toBeNull();
    expect(lcdExpression(state)).toBe("X²+1");
  });
});

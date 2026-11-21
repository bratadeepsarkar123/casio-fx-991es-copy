import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { evaluateAtoms } from "./evaluate.ts";
import { D, createUint32Rng } from "./numeric.ts";
import { differentiateCentral, integrateAdaptive, sumIntegerRange } from "./calculus.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import type { Atom, CalcState } from "./types.ts";

const n = (s: string): Atom => ({ t: "num", s });
const x: Atom = { t: "var", name: "X" };
const call = (name: string, ...args: Atom[][]): Atom => ({ t: "call", name, args, closed: true });
const lnX = call("ln", [x]);

function evaluate(callAtom: Atom, state = createInitialState(0)) {
  return evaluateAtoms([callAtom], state, createUint32Rng(state.rngSeed));
}

function setLineIO(state = createInitialState(0)): CalcState {
  return dispatchKeys(state, ["shift", "mode", "2"], 0);
}

function naturalIntegral() {
  return dispatchKeys(createInitialState(0), [
    "integral", "ln", "alpha", "rparen", "rparen", "right", "1", "right", "alpha", "exp10", "equals",
  ], 0);
}

describe("selected-guide numerical calculus", () => {
  it("executes the E-17 Natural integral keys and renders its three slots", () => {
    const state = naturalIntegral();
    expect(state.screen.kind).toBe("result");
    expect(lcdResult(state)).toBe("1");
    expect(state.variables.X).toBe("0");
    expect(D(state.ans).minus(1).abs().lt("1e-12")).toBe(true);
    const template = dispatchKeys(createInitialState(0), ["integral"], 0);
    expect(template.editor.root[0]).toMatchObject({ t: "call", name: "int", args: [[], [], []] });
    expect(lcdExpression(template)).toContain("∫");
  });

  it("keeps the selected E-9 right-hand capture inside the integral function slot", () => {
    let state = dispatchKeys(createInitialState(0), ["1", "add", "9", "left", "shift", "del", "integral"], 0);
    expect(state.editor.root[2]).toMatchObject({ t: "call", name: "int", args: [[n("9")], [], []] });
    state = dispatchKeys(state, ["right", "1", "right", "2", "equals"], 0);
    expect(lcdResult(state)).toBe("10");
  });

  it("executes the E-17 LineIO integral path with default tolerance", () => {
    const state = dispatchKeys(setLineIO(), [
      "integral", "ln", "alpha", "rparen", "rparen", "shift", "rparen", "1", "shift", "rparen", "alpha", "exp10", "rparen", "equals",
    ], 0);
    expect(lcdExpression({ ...state, screen: { kind: "input" }, result: null })).toContain("∫(ln(X),1,e)");
    expect(lcdResult(state)).toBe("1");
  });

  it("executes E-17 d/dx(sin(x)) at π/2 in Rad through Natural slot navigation", () => {
    const rad = dispatchKeys(createInitialState(0), ["shift", "mode", "4"], 0);
    const state = dispatchKeys(rad, [
      "shift", "integral", "sin", "alpha", "rparen", "rparen", "right", "frac", "shift", "exp10", "right", "2", "equals",
    ], 0);
    expect(state.screen.kind).toBe("result");
    expect(D(state.result?.approx ?? "NaN").abs().lt("1e-10")).toBe(true);
    expect(state.setup.angleUnit).toBe("Rad");
  });

  it("executes the E-17 Linear derivative path with an omitted tolerance", () => {
    const rad = dispatchKeys(setLineIO(), ["shift", "mode", "4"], 0);
    const state = dispatchKeys(rad, [
      "shift", "integral", "sin", "alpha", "rparen", "rparen", "shift", "rparen", "shift", "exp10", "div", "2", "rparen", "equals",
    ], 0);
    expect(lcdResult(state)).toBe("0");
    expect(lcdExpression({ ...state, screen: { kind: "input" }, result: null })).toContain("d/dx(sin(X),π÷2)");
  });

  it("executes E-17 Natural and Linear Σ examples for X+1 from 1 through 5", () => {
    const natural = dispatchKeys(createInitialState(0), [
      "shift", "logab", "alpha", "rparen", "add", "1", "right", "1", "right", "5", "equals",
    ], 0);
    expect(lcdResult(natural)).toBe("20");
    expect(natural.variables.X).toBe("0");

    const linear = dispatchKeys(setLineIO(), [
      "shift", "logab", "alpha", "rparen", "add", "1", "shift", "rparen", "1", "shift", "rparen", "5", "rparen", "equals",
    ], 0);
    expect(lcdResult(linear)).toBe("20");
  });

  it("integrates reversed and split intervals and accepts the E-17 logarithm", () => {
    const state = createInitialState(0);
    const forward = evaluate(call("int", [lnX], [n("1")], [{ t: "sym", name: "e" }]), state);
    const reverse = evaluate(call("int", [lnX], [{ t: "sym", name: "e" }], [n("1")]), state);
    const left = evaluate(call("int", [n("1")], [n("0")], [n("1")]), state);
    const right = evaluate(call("int", [n("1")], [n("1")], [n("2")]), state);
    expect(D(forward.approx).minus(1).abs().lt("1e-10")).toBe(true);
    expect(D(reverse.approx).plus(1).abs().lt("1e-10")).toBe(true);
    expect(D(left.approx).plus(D(right.approx)).eq(2)).toBe(true);
  });

  it("follows E-16 guidance by evaluating positive and negative cycles separately", () => {
    const sine = (value: ReturnType<typeof D>) => value.sin();
    const positive = integrateAdaptive(sine, D(0), D("3.14159265358980"));
    const negative = integrateAdaptive(sine, D("3.14159265358980"), D("6.28318530717960"));
    expect(positive.minus(2).abs().lt("1e-10")).toBe(true);
    expect(negative.plus(2).abs().lt("1e-10")).toBe(true);
    expect(positive.plus(negative).abs().lt("1e-10")).toBe(true);
  });

  it("differentiates smooth functions and preserves a small nonzero slope", () => {
    expect(differentiateCentral((value) => value.times(value).times(value), D(2)).minus(12).abs().lt("1e-8")).toBe(true);
    expect(differentiateCentral((value) => value.times("1e-12"), D(4)).eq("1e-12")).toBe(true);
  });

  it("sums one term and a negative lower bound, with strict E-14 endpoint limits", () => {
    expect(sumIntegerRange((value) => value.plus(1), D(1), D(1)).eq(2)).toBe(true);
    expect(sumIntegerRange((value) => value, D(-2), D(0)).eq(-3)).toBe(true);
    expect(() => sumIntegerRange((value) => value, D("-1e10"), D("-1e10"))).toThrow();
    expect(() => sumIntegerRange((value) => value, D("1e10"), D("1e10"))).toThrow();
    expect(sumIntegerRange((value) => value, D("-9999999999"), D("-9999999999")).eq("-9999999999")).toBe(true);
    expect(sumIntegerRange((value) => value, D("9999999999"), D("9999999999")).eq("9999999999")).toBe(true);
    expect(() => sumIntegerRange((value) => value, D("1.5"), D(2))).toThrow();
    expect(() => sumIntegerRange((value) => value, D(2), D(1))).toThrow();
  });

  it("rejects forbidden nesting and below-minimum tolerance, and times out bounded nonconvergence", () => {
    const nestedInRootIndex: Atom = {
      t: "nthrt",
      n: [call("Σ", [n("1")], [n("1")], [n("1")])],
      inner: [n("4")],
    };
    expect(() => evaluate(call("Σ", [nestedInRootIndex], [n("1")], [n("1")]))).toThrow();
    expect(() => integrateAdaptive((value) => value, D(0), D(1), D("1e-15"))).toThrow();
    expect(() => integrateAdaptive((value) => value.times("1e10").floor().mod(2), D(0), D(1), D("1e-14"))).toThrowError("Time Out Error");
    expect(() => differentiateCentral((value) => value.gt(0) ? D(1) : D(0), D(0), D("1e-14"), true)).toThrowError("Time Out Error");
  });
});

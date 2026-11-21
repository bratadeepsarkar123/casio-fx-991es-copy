import { describe, expect, it } from "vitest";
import { evaluateAtoms } from "./evaluate.ts";
import { createInitialState } from "./machine.ts";
import { createUint32Rng } from "./numeric.ts";
import type { Atom, CalcState, ResultValue } from "./types.ts";
import { toggleSexagesimal } from "./format.ts";

const num = (s: string): Atom => ({ t: "num", s });
const neg = (s: string): Atom => ({ t: "neg", inner: [num(s)] });
const call = (name: string, ...args: Atom[][]): Atom => ({ t: "call", name, args, closed: true });
const post = (op: "sq" | "inv", value: Atom): Atom => ({ t: "post", op, inner: [value] });

function run(atom: Atom, state: CalcState = createInitialState(0)): ResultValue {
  return evaluateAtoms([atom], state, createUint32Rng(state.rngSeed));
}

function expectMathError(atom: Atom, state?: CalcState): void {
  expect(() => run(atom, state)).toThrowError(expect.objectContaining({ code: "Math ERROR" }));
}

describe("selected-manual E-38/E-39 numerical input ranges", () => {
  it("checks trig limits before exact-angle shortcuts and treats only printed tan singularities as errors", () => {
    expectMathError(call("sin", [num("9000000000")]));
    expectMathError(call("sin", [num("1000000000000"), { t: "op", op: "×" }, { t: "sym", name: "pi" }]));
    expectMathError(call("tan", [num("90")]));
    expectMathError(call("tan", [num("100" )]), {
      ...createInitialState(0),
      setup: { ...createInitialState(0).setup, angleUnit: "Gra" },
    });
    expect(() => run(call("sin", [num("8999999999")]))).not.toThrow();
    expect(() => run(call("tan", [num("90.0000000001")]))).not.toThrow();
    expectMathError(call("sin", [num("157079632.7")]), {
      ...createInitialState(0),
      setup: { ...createInitialState(0).setup, angleUnit: "Rad" },
    });
  });

  it("applies the E-38 inverse and hyperbolic inclusive boundaries", () => {
    expect(() => run(call("asin", [num("1")]))).not.toThrow();
    expectMathError(call("acos", [num("1.0000000001")]));
    expect(() => run(call("atan", [num("9.999999999e99")]))).not.toThrow();
    expectMathError(call("atan", [num("1e100")]));
    expect(() => run(call("sinh", [num("230.2585092")]))).not.toThrow();
    expectMathError(call("cosh", [num("230.2585093")]));
    expect(() => run(call("asinh", [num("4.999999999e99")]))).not.toThrow();
    expectMathError(call("acosh", [num("0.9999999999")]));
    expectMathError(call("tanh", [num("1e100")]));
    expect(() => run(call("atanh", [num("0.9999999999")]))).not.toThrow();
    expectMathError(call("atanh", [num("0.99999999991")]));
  });

  it("checks log, exponential, square-root, square and inverse inputs before calculation", () => {
    expect(() => run(call("ln", [num("9.999999999e99")]))).not.toThrow();
    expectMathError(call("log", [num("9.9999999991e99")]));
    expect(() => run(call("exp10", [num("99.99999999")]))).not.toThrow();
    expectMathError(call("exp10", [num("100")]));
    expect(() => run(call("exp", [num("230.2585092")]))).not.toThrow();
    expectMathError(call("exp", [num("230.2585093")]));
    expect(() => run({ t: "sqrt", inner: [num("0")] })).not.toThrow();
    expectMathError({ t: "sqrt", inner: [num("1e100")] });
    expect(() => run(post("sq", num("1e49")))).not.toThrow();
    expectMathError(post("sq", num("1e50")));
    expect(() => run(post("inv", num("1e99")))).not.toThrow();
    expectMathError(post("inv", num("1e100")));
    expectMathError(post("inv", num("0")));
    expect(() => run({ t: "cbrt", inner: [neg("8")] })).not.toThrow();
    expectMathError({ t: "cbrt", inner: [num("1e100")] });
  });

  it("supports odd-denominator negative-base powers and indexed roots within E-39 bounds", () => {
    const cubeRootPower: Atom = {
      t: "pow",
      base: [neg("8")],
      exp: [{ t: "frac", num: [num("1")], den: [num("3")] }],
    };
    const fifthPower: Atom = { t: "pow", base: [neg("32")], exp: [num("0.2")] };
    expect(run(cubeRootPower).approx).toBe("-2");
    expect(Number(run(fifthPower).approx)).toBeCloseTo(-2, 12);
    expect(run({ t: "pow", base: [neg("32")], exp: [{ t: "frac", num: [num("2")], den: [num("5")] }] }).approx)
      .toBe("4");
    expectMathError({ t: "pow", base: [neg("8")], exp: [{ t: "frac", num: [num("1")], den: [num("2")] }] });
    expectMathError({ t: "pow", base: [num("10")], exp: [num("100")] });
    expectMathError({ t: "pow", base: [num("10000000000")], exp: [neg("1e99")] });
    expect(() => run({ t: "pow", base: [num("10")], exp: [num("40")] })).not.toThrow();
    expect(() => run({ t: "pow", base: [num("2")], exp: [num("200")] })).not.toThrow();
    expect(() => run({ t: "pow", base: [num("10")], exp: [num("60")] })).not.toThrow();
    expectMathError({
      t: "nthrt",
      n: [num("0.2")],
      inner: [num("1e30")],
    });
    expect(() => run({
      t: "nthrt",
      n: [num("0.2")],
      inner: [num("100000000")],
    })).not.toThrow();
    expect(run({ t: "nthrt", n: [num("3")], inner: [neg("8")] }).approx).toBe("-2");
    expect(run({ t: "nthrt", n: [num("2.5")], inner: [neg("32")] }).approx).toBe("4");
    expectMathError({ t: "nthrt", n: [num("2")], inner: [neg("8")] });
    expectMathError({ t: "nthrt", n: [num("0")], inner: [num("2")] });
  });

  it("bounds nPr and the E-39 nCr intermediate while keeping ordinary examples", () => {
    const op = (name: "nPr" | "nCr", nValue: string, rValue: string): Atom[] => [
      num(nValue), { t: "op", op: name }, num(rValue),
    ];
    const state = createInitialState(0);
    expect(evaluateAtoms(op("nPr", "10", "4"), state, createUint32Rng(1)).approx).toBe("5040");
    expect(evaluateAtoms(op("nCr", "10", "4"), state, createUint32Rng(1)).approx).toBe("210");
    expect(() => evaluateAtoms(op("nCr", "160", "80"), state, createUint32Rng(1))).toThrowError(
      expect.objectContaining({ code: "Math ERROR" }),
    );
    expect(() => evaluateAtoms(op("nPr", "200", "100"), state, createUint32Rng(1))).toThrowError(
      expect.objectContaining({ code: "Math ERROR" }),
    );
    expect(() => evaluateAtoms(op("nCr", "10000000000", "1"), state, createUint32Rng(1))).toThrowError(
      expect.objectContaining({ code: "Math ERROR" }),
    );
  }, 1000);

  it("enforces Pol/Rec and sexagesimal input/conversion ranges", () => {
    expect(() => run(call("Pol", [num("3")], [num("4")]))).not.toThrow();
    expect(() => run(call("Pol", [num("9.999999999e99")], [num("0")]))).not.toThrow();
    expectMathError(call("Pol", [num("1e100")], [num("0")]));
    expectMathError(call("Pol", [num("9.9999999999e99")], [num("0")]));
    expect(() => run(call("Rec", [num("0")], [num("0")]))).not.toThrow();
    expect(() => run(call("Rec", [num("9.999999999e99")], [num("45")]))).not.toThrow();
    expectMathError(call("Rec", [num("9.9999999999e99")], [num("45")]));
    expectMathError(call("Rec", [num("-0.1")], [num("0")]));
    expectMathError(call("Rec", [num("1")], [num("9000000000")]));
    expectMathError({ t: "sexagesimal", deg: [num("0")], min: [neg("1")], sec: [num("0")] });
    expectMathError({ t: "sexagesimal", deg: [num("1e100")], min: [num("0")], sec: [num("0")] });

    const setup = createInitialState(0).setup;
    const maxSexagesimal = "9999999.9997222222";
    const sexagesimalResult = {
      approx: "10000000",
      display: "10000000",
      sexagesimal: "10000000°0′0″",
      naturalKind: "decimal" as const,
      internal: { re: "10000000" },
    };
    expect(() => toggleSexagesimal(sexagesimalResult, setup)).toThrowError(
      expect.objectContaining({ code: "Math ERROR" }),
    );
    expect(toggleSexagesimal({
      ...sexagesimalResult,
      approx: maxSexagesimal,
      sexagesimal: "9999999°59′59″",
      internal: { re: maxSexagesimal },
    }, setup).display).toBe("9999999°59′59″");
    expect(() => toggleSexagesimal({
      ...sexagesimalResult,
      approx: "10000000",
      internal: { re: "10000000" },
    }, setup)).toThrowError(expect.objectContaining({ code: "Math ERROR" }));
  });
});

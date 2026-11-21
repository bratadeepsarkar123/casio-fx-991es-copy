import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import type { CalcState } from "./types.ts";
import type { KeyId } from "./keys.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import { fractionNumeratorForResult, resultFromSym } from "./format.ts";
import { symRat } from "./symbolic.ts";
import { deserializeState, serializeState } from "./persist.ts";

function run(keys: KeyId[], initial = createInitialState(0)): CalcState {
  return dispatchKeys(initial, keys, 0);
}

function fix3(state = createInitialState(0)): CalcState {
  return run(["shift", "mode", "2", "shift", "mode", "6", "3"], state);
}

describe("selected manual numeric retention", () => {
  it("replays the printed E-13 variable and independent-memory examples", () => {
    let state = run(["3", "add", "5", "shift", "rcl", "neg"]);
    expect(state.variables.A).toBe("8");

    state = run(["ac", "rcl", "neg"], state);
    expect(state.screen.kind).toBe("result");
    expect(lcdResult(state)).toBe("8");

    state = run(["ac", "alpha", "neg", "mul", "1", "0", "equals"], state);
    expect(lcdResult(state)).toBe("80");
    state = run(["rcl", "neg"], state);
    expect(state.screen.kind).toBe("result");
    expect(lcdResult(state)).toBe("8");
    state = run(["mul", "3", "equals"], state);
    expect(lcdResult(state)).toBe("24");
    state = run(["0", "shift", "rcl", "neg"], state);
    expect(state.variables.A).toBe("0");

    state = run(["0", "shift", "rcl", "mplus"], state);
    state = run(["1", "0", "mul", "5", "mplus"], state);
    expect(state.memoryM).toBe("50");
    state = run(["1", "0", "add", "5", "shift", "mplus"], state);
    expect(state.memoryM).toBe("35");
    state = run(["rcl", "mplus"], state);
    expect(state.screen.kind).toBe("result");
    expect(lcdResult(state)).toBe("35");
    state = run(["mul", "2", "equals"], state);
    expect(lcdResult(state)).toBe("70");
    state = run(["ac", "rcl", "mplus"], state);
    expect(state.screen.kind).toBe("result");
    expect(lcdResult(state)).toBe("35");
  });

  it("keeps 15-digit Ans through a Fix 3 two-step calculation", () => {
    let state = run(["1", "0", "div", "3", "equals"], fix3());
    expect(lcdResult(state)).toBe("3.333");
    expect(state.ans).toBe("3.33333333333333");
    expect(state.result?.internal?.re).toBe("3.33333333333333");
    expect(state.history[0]?.result.internal?.re).toBe("3.33333333333333");

    state = run(["mul", "3", "equals"], state);
    expect(lcdResult(state)).toBe("10.000");
  });

  it("keeps Fix 3 precision through STO/RCL variable reuse", () => {
    let state = run(["1", "0", "div", "3", "equals"], fix3());
    state = run(["shift", "rcl", "neg"], state);
    expect(state.variables.A).toBe("3.33333333333333");
    state = run(["ac", "alpha", "neg", "mul", "3", "equals"], state);
    expect(lcdResult(state)).toBe("10.000");
  });

  it("applies Rnd using Fix 3 before retaining the next calculation", () => {
    const state = run(["shift", "0", "1", "0", "div", "3", "rparen", "mul", "3", "equals"], fix3());
    expect(lcdResult(state)).toBe("9.999");
  });

  it("keeps Fix 3 precision in independent memory", () => {
    let state = run(["1", "0", "div", "3", "equals", "mplus"], fix3());
    expect(state.memoryM).toBe("3.33333333333333");
    state = run(["ac", "alpha", "mplus", "mul", "3", "equals"], state);
    expect(lcdResult(state)).toBe("10.000");
  });

  it("persists the retained Ans across a v1 save/load and continues at Fix 3", () => {
    const state = run(["1", "0", "div", "3", "equals"], fix3());
    const loaded = deserializeState(JSON.parse(JSON.stringify(serializeState(state))), 10);
    expect(loaded?.ans).toBe("3.33333333333333");
    expect(loaded?.result?.internal?.re).toBe("3.33333333333333");
    const continued = run(["mul", "3", "equals"], loaded!);
    expect(lcdResult(continued)).toBe("10.000");
  });

  it("retains Pol coordinates independently of the Fix 3 LCD projection", () => {
    let state = run(["shift", "add", "1", "shift", "rparen", "1", "rparen", "equals"], fix3());
    expect(state.result?.polRec?.X).toBe("1.414");
    expect(state.variables.X).toBe(state.result?.internal?.x);
    state = run(["ac", "alpha", "rparen", "square", "equals"], state);
    expect(lcdResult(state)).toBe("2.000");
  });

  it("retains both complex components at 15 digits under Fix 3", () => {
    let state = run(["mode", "2"], fix3());
    state = run(["lparen", "1", "div", "3", "rparen", "add", "lparen", "1", "div", "3", "rparen", "eng", "equals"], state);
    expect(state.result?.internal?.re).toBe("0.333333333333333");
    expect(state.result?.internal?.im).toBe("0.333333333333333");
    expect(state.ansIm).toBe("0.333333333333333");
    state = run(["mul", "3", "equals"], state);
    expect(lcdResult(state)).toBe("1.000\n+1.000i");
  });

  it("shows both selected E-17 Pol and Rec values on separate LineIO rows", () => {
    const naturalPol = run([
      "shift", "add", "sqrt", "2", "right", "shift", "rparen", "sqrt", "2", "right", "rparen", "equals",
    ]);
    expect(lcdResult(naturalPol)).toBe("r=2, \u03b8=45");
    const naturalRec = run([
      "shift", "sub", "sqrt", "2", "right", "shift", "rparen", "4", "5", "rparen", "equals",
    ]);
    expect(lcdResult(naturalRec)).toBe("X=1, Y=1");

    const pol = run([
      "shift", "mode", "2", "shift", "add", "sqrt", "2", "rparen", "shift", "rparen", "sqrt", "2", "rparen", "rparen", "equals",
    ]);
    expect(lcdResult(pol)).toBe("r=2\nθ=45");

    const rec = run([
      "shift", "mode", "2", "shift", "sub", "sqrt", "2", "right", "shift", "rparen", "4", "5", "rparen", "equals",
    ]);
    expect(lcdResult(rec)).toBe("X=1\nY=1");
  });

  it("shows complex polar radius and angle on separate LineIO rows", () => {
    const state = run([
      "mode", "2", "shift", "mode", "down", "3", "2", "2", "shift", "neg", "4", "5", "equals",
    ], fix3());
    expect(lcdResult(state)).toBe("r=2.000\nθ=45.000");
  });

  it("stores a v1 result without the new precision field using its legacy value", () => {
    const legacy = run(["1", "0", "div", "3", "equals"], fix3());
    const { internal: _internal, ...legacyResult } = legacy.result!;
    const oldState = { ...legacy, result: legacyResult, ans: "3.333" };
    const stored = run(["shift", "rcl", "neg"], oldState);
    expect(stored.variables.A).toBe("3.333");
  });

  it("switches the displayed 7/6 result immediately to mixed form", () => {
    let state = run(["2", "frac", "3", "right", "add", "1", "frac", "2", "right", "equals"]);
    expect(lcdResult(state)).toBe("7/6");
    state = run(["shift", "sd"], state);
    expect(state.setup.fractionFormat).toBe("ab/c");
    expect(lcdResult(state)).toBe("1 1/6");
  });

  it("renders older fraction metadata in the currently selected form", () => {
    const legacyFraction = {
      approx: "1.391304348",
      display: "32/23",
      naturalKind: "fraction" as const,
      fraction: { mixed: "1", num: "9", den: "23" },
    };
    expect(fractionNumeratorForResult(legacyFraction)).toBe("32");
    expect(fractionNumeratorForResult({ ...legacyFraction, naturalKind: "mixed" })).toBe("9");
  });

  it("keeps the E-10 Linear 1÷5 result decimal until S⇔D", () => {
    let state = run(["shift", "mode", "2", "1", "div", "5", "equals"]);
    expect(lcdResult(state)).toBe("0.2");
    state = run(["sd"], state);
    expect(lcdResult(state)).toBe("1┘5");
  });

  it("keeps exact literal-fraction calculations fractional in Linear and decimal mixtures decimal", () => {
    const exact = run([
      "shift", "mode", "2", "2", "frac", "3", "right", "add", "1", "frac", "2", "right", "equals",
    ]);
    expect(lcdResult(exact)).toBe("7┘6");

    const mixedDecimal = run([
      "shift", "mode", "2", "2", "frac", "3", "right", "add", "0", "dot", "5", "equals",
    ]);
    expect(lcdResult(mixedDecimal)).toBe("1.166666667");
  });

  it("replays the printed E-10 LineIO mixed-fraction separator", () => {
    const mixed = run([
      "shift", "mode", "2", "4", "sub", "3", "frac", "1", "frac", "2", "equals",
    ]);
    expect(lcdExpression(mixed)).toBe("4-3┘1┘2");
    expect(lcdResult(mixed)).toBe("1┘2");

    const exact = run([
      "shift", "mode", "2", "2", "frac", "3", "add", "1", "frac", "2", "equals",
    ]);
    expect(lcdExpression(exact)).toBe("(2┘3)+(1┘2)");
    expect(lcdResult(exact)).toBe("7┘6");

    const denominatorEdit = run([
      "shift", "mode", "2", "1", "frac", "2", "add", "3", "equals",
    ]);
    expect(lcdExpression(denominatorEdit)).toBe("(1┘2)+3");
    expect(lcdResult(denominatorEdit)).toBe("7┘2");

    const grouped = run([
      "shift", "mode", "2", "1", "add", "lparen", "3", "frac", "1", "frac", "2", "right", "rparen", "equals",
    ]);
    expect(lcdExpression(grouped)).toBe("1+(3┘1┘2)");
    expect(lcdResult(grouped)).toBe("9┘2");

    const deleted = run([
      "shift", "mode", "2", "4", "sub", "3", "frac", "1", "frac", "2", "del",
    ]);
    expect(lcdExpression(deleted)).toBe("4-3┘1┘");

    const replayed = run([
      "shift", "mode", "2", "4", "sub", "3", "frac", "1", "frac", "2", "equals", "up",
    ]);
    expect(lcdExpression(replayed)).toBe("4-3┘1┘2");

    const restored = deserializeState(JSON.parse(JSON.stringify(serializeState(mixed))), 0);
    expect(restored).not.toBeNull();
    expect(lcdExpression(restored!)).toBe("4-3┘1┘2");
    expect(lcdResult(restored!)).toBe("1┘2");

    const natural = run(["4", "sub", "shift", "frac", "3", "right", "1", "down", "2", "equals"]);
    expect(lcdResult(natural)).toBe("1/2");
  });

  it("allows SHIFT = results to return to π form when S⇔D is pressed", () => {
    let state = run(["shift", "exp10", "div", "6", "equals"]);
    state = run(["shift", "equals"], state);
    expect(lcdResult(state)).toMatch(/^0\.523598775/);
    state = run(["sd"], state);
    expect(lcdResult(state)).toContain("π/6");
  });

  it("replays the E-12 789 minus Ans continuation", () => {
    const state = run(["1", "2", "3", "add", "4", "5", "6", "equals", "7", "8", "9", "sub", "ans", "equals"]);
    expect(lcdExpression(state)).toBe("789-Ans");
    expect(lcdResult(state)).toBe("210");
  });

  it("counts separators in the E-10 mixed-conversion display limit", () => {
    const setup = {
      ...createInitialState(0).setup,
      fractionFormat: "ab/c" as const,
    };
    const tenCharacters = resultFromSym(symRat(987655n, 8n), setup);
    expect(tenCharacters.display).toBe("123456 7/8");
    expect(tenCharacters.naturalKind).toBe("mixed");

    const overLimit = resultFromSym(symRat(11111111n, 9n), setup);
    expect(overLimit.naturalKind).toBe("decimal");
  });

  it("accepts a ten-character mixed input and rejects an eleven-character input by evaluation", () => {
    const atLimit = run(["1", "2", "3", "4", "5", "6", "shift", "frac", "7", "down", "8", "equals"]);
    expect(atLimit.screen.kind).toBe("result");
    expect(atLimit.result?.approx).toBe("123456.875");

    const overLimit = run(["1", "2", "3", "4", "5", "6", "7", "shift", "frac", "8", "down", "9", "equals"]);
    expect(overLimit.screen.kind).toBe("error");
    if (overLimit.screen.kind === "error") {
      expect(overLimit.screen.code).toBe("Math ERROR");
    }
  });

  it("shows the two E-11 sexagesimal examples in DMS form and toggles 2.255 both ways", () => {
    let state = run(["2", "dms", "2", "0", "dms", "3", "0", "dms", "add", "0", "dms", "3", "9", "dms", "3", "0", "dms", "equals"]);
    expect(lcdResult(state)).toBe("3\u00b00\u20320\u2033");

    state = run(["2", "dms", "1", "5", "dms", "1", "8", "dms", "equals"]);
    expect(lcdResult(state)).toBe("2\u00b015\u203218\u2033");
    state = run(["dms"], state);
    expect(lcdResult(state)).toBe("2.255");
    state = run(["dms"], state);
    expect(lcdResult(state)).toBe("2\u00b015\u203218\u2033");
  });

  it("replays the printed E-11 engineering repeat directions", () => {
    const standardThenEng = run(["1", "2", "3", "4", "equals", "eng", "eng"]);
    expect(lcdResult(standardThenEng)).toBe("1234\u00d710\u2070");

    const reverseThenForward = run(["1", "2", "3", "equals", "shift", "eng", "shift", "eng"]);
    expect(lcdResult(reverseThenForward)).toBe("0.000123\u00d710\u2076");

    const dotResult = run(["1", "2", "3", "4", "equals"]);
    const dotEngineering = run(["eng"], dotResult);
    expect(lcdResult(dotEngineering)).toBe("1.234\u00d710\u00b3");
    expect(dotEngineering.ans).toBe("1234");

    const commaResult = run(["shift", "mode", "down", "5", "2", "1", "2", "3", "4", "equals"]);
    expect(commaResult.setup.decimalMark).toBe("Comma");
    expect(commaResult.ans).toBe("1234");
    const commaEngineering = run(["eng"], commaResult);
    expect(lcdResult(commaEngineering)).toBe("1,234\u00d710\u00b3");
    expect(commaEngineering.ans).toBe("1234");
    const commaShiftEngineering = run(["shift", "eng"], commaEngineering);
    expect(lcdResult(commaShiftEngineering)).toBe("0,001234\u00d710\u2076");
    expect(commaShiftEngineering.ans).toBe("1234");
    expect(commaShiftEngineering.result?.internal?.re).toBe("1234");
  });

  it("retains subsecond precision to hundredths in sexagesimal display", () => {
    const state = run(["0", "dms", "0", "dms", "1", "dot", "2", "3", "4", "dms", "equals"]);
    expect(lcdResult(state)).toContain("1.23");
  });

  it("replays the E-17 Fix 3 radical product in Natural and LineIO entry", () => {
    const fix3Setup = ["shift", "mode", "6", "3"] as KeyId[];
    const natural = run(["sqrt", "2", "right", "mul", "3", "equals"], run(fix3Setup));
    expect(lcdResult(natural)).toBe("3√2");
    expect(lcdResult(run(["shift", "equals"], natural))).toBe("4.243");

    const linear = run(["sqrt", "2", "rparen", "mul", "3", "equals"], run(["shift", "mode", "2", ...fix3Setup]));
    expect(lcdResult(linear)).toBe("4.243");
  });

  it("replays E-17 factorial and Abs examples in both printed input layouts", () => {
    const factorialKeys = ["lparen", "5", "add", "3", "rparen", "shift", "xinv", "equals"] as KeyId[];
    expect(lcdResult(run(factorialKeys))).toBe("40320");
    expect(lcdResult(run(["shift", "mode", "2", ...factorialKeys]))).toBe("40320");

    const absLinear = run(["shift", "mode", "2", "shift", "hyp", "2", "sub", "7", "rparen", "mul", "2", "equals"]);
    expect(lcdResult(absLinear)).toBe("10");
    const absNatural = run(["shift", "hyp", "2", "sub", "7", "right", "mul", "2", "equals"]);
    expect(lcdResult(absNatural)).toBe("10");
  });

  it("replays the printed E-18 permutation and combination keys", () => {
    expect(lcdResult(run(["1", "0", "shift", "mul", "4", "equals"]))).toBe("5040");
    expect(lcdResult(run(["1", "0", "shift", "div", "4", "equals"]))).toBe("210");
  });

  it("applies E-6 result separators to a derived Pol(3,4) check", () => {
    const dot = run(["shift", "add", "3", "shift", "rparen", "4", "rparen", "equals"]);
    expect(lcdResult(dot)).toBe("r=5, θ=53.13010235");

    const comma = run([
      "shift", "mode", "down", "5", "2", "shift", "add", "3", "shift", "rparen", "4", "rparen", "equals",
    ]);
    expect(comma.setup.decimalMark).toBe("Comma");
    expect(lcdResult(comma)).toBe("r=5; θ=53,13010235");
  });

  it("replays the selected E-6 Fix, Sci and Norm display examples", () => {
    const fix3 = run(["shift", "mode", "2", "shift", "mode", "6", "3", "1", "0", "0", "div", "7", "equals"]);
    expect(lcdResult(fix3)).toBe("14.286");
    const fix2 = run(["shift", "mode", "2", "shift", "mode", "6", "2", "1", "0", "0", "div", "7", "equals"]);
    expect(lcdResult(fix2)).toBe("14.29");

    const sci5 = run(["shift", "mode", "2", "shift", "mode", "7", "5", "1", "div", "7", "equals"]);
    expect(lcdResult(sci5)).toBe("1.4286\u00d710\u207b\u00b9");
    const sci4 = run(["shift", "mode", "2", "shift", "mode", "7", "4", "1", "div", "7", "equals"]);
    expect(lcdResult(sci4)).toBe("1.429\u00d710\u207b\u00b9");

    const norm1 = run(["shift", "mode", "2", "shift", "mode", "8", "1", "1", "div", "2", "0", "0", "equals"]);
    expect(lcdResult(norm1)).toBe("5\u00d710\u207b\u00b3");
    const norm2 = run(["shift", "mode", "2", "shift", "mode", "8", "2", "1", "div", "2", "0", "0", "equals"]);
    expect(lcdResult(norm2)).toBe("0.005");
  });

  it("matches the selected E-8 priority distinction between omitted and explicit multiplication", () => {
    const omitted = run(["6", "div", "2", "lparen", "1", "add", "2", "rparen", "equals"]);
    expect(lcdResult(omitted)).toBe("1");
    const explicit = run(["6", "div", "2", "mul", "lparen", "1", "add", "2", "rparen", "equals"]);
    expect(lcdResult(explicit)).toBe("9");
  });

  it("replays E-7 explicit and omitted multiplication examples", () => {
    const explicit = run([
      "4", "mul", "sin", "3", "0", "rparen", "mul", "lparen", "3", "0", "add", "1", "0", "mul", "3", "rparen", "equals",
    ]);
    expect(lcdResult(explicit)).toBe("120");

    const omitted = run([
      "4", "sin", "3", "0", "rparen", "lparen", "3", "0", "add", "1", "0", "mul", "3", "equals",
    ]);
    expect(lcdResult(omitted)).toBe("120");
  });

  it("replays the E-8 Natural radical quotient with physical keys", () => {
    let printed = run(["frac", "2", "add", "sqrt", "2"]);
    expect(printed.editor.cursor.path).toEqual([0, 0, 2, 2]);
    printed = dispatchKeys(printed, ["right"], 0);
    expect(printed.editor.cursor.path).toEqual([0, 0]);
    expect(printed.editor.cursor.index).toBe(3);
    printed = dispatchKeys(printed, ["right"], 0);
    expect(printed.editor.cursor.path).toEqual([0, 1]);
    expect(printed.editor.cursor.index).toBe(0);
    const state = run([
      "frac", "2", "add", "sqrt", "2", "right", "right", "1", "add", "sqrt", "2", "equals",
    ]);
    expect(lcdResult(state)).toBe("√2");
    expect(state.result?.approx).toBe("1.414213562");
  });

  it("replays selected E-16 logarithm and power examples in the shown layouts", () => {
    const lineLog10 = run(["shift", "mode", "2", "log", "1", "0", "0", "0", "rparen", "equals"]);
    expect(lcdResult(lineLog10)).toBe("3");
    const naturalLog2 = run(["logab", "2", "right", "1", "6", "equals"]);
    expect(lcdResult(naturalLog2)).toBe("4");
    const lineLog2 = run(["shift", "mode", "2", "log", "2", "shift", "rparen", "1", "6", "rparen", "equals"]);
    expect(lcdResult(lineLog2)).toBe("4");

    const power = run(["1", "dot", "2", "mul", "exp10", "3", "equals"]);
    expect(lcdResult(power)).toBe("1200");
    const groupedPower = run(["lparen", "1", "add", "1", "rparen", "power", "lparen", "2", "add", "2", "rparen", "equals"]);
    expect(lcdResult(groupedPower)).toBe("16");

    const naturalRoot = run(["shift", "power", "5", "right", "3", "2", "equals"]);
    expect(lcdResult(naturalRoot)).toBe("2");
    const lineRoot = run(["shift", "mode", "2", "5", "shift", "power", "3", "2", "rparen", "equals"]);
    expect(lcdResult(lineRoot)).toBe("2");
  });

  it("replays the E-16 sin and inverse-sin LineIO examples", () => {
    const line = run(["shift", "mode", "2"]);
    expect(lcdResult(run(["sin", "3", "0", "rparen", "equals"], line))).toBe("0.5");
    expect(lcdResult(run(["shift", "sin", "0", "dot", "5", "rparen", "equals"], line))).toBe("30");
  });

  it("replays the E-16 radian and grad conversion keys", () => {
    const radians = run(["lparen", "shift", "exp10", "div", "2", "rparen", "shift", "ans", "2", "equals"]);
    expect(lcdResult(radians)).toBe("90");
    const grads = run(["5", "0", "shift", "ans", "3", "equals"]);
    expect(lcdResult(grads)).toBe("45");
  });

  it("replays the E-17 Ran# repetition keys within the 0-to-1000 product range", () => {
    let state = run(["1", "0", "0", "0", "shift", "dot", "equals"]);
    const first = Number(state.result?.approx);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1000);
    state = run(["equals"], state);
    const second = Number(state.result?.approx);
    expect(Number.isInteger(second)).toBe(true);
    expect(second).toBeGreaterThanOrEqual(0);
    expect(second).toBeLessThan(1000);
    state = run(["equals"], state);
    const third = Number(state.result?.approx);
    expect(Number.isInteger(third)).toBe(true);
    expect(third).toBeGreaterThanOrEqual(0);
    expect(third).toBeLessThan(1000);
  });

  it("shows the standalone E-15 Natural Ran# value as a reduced fraction", () => {
    const state = run(["shift", "dot", "equals"]);
    expect(state.screen.kind).toBe("result");
    expect(state.result?.naturalKind).toBe("fraction");
    expect(lcdResult(state)).toMatch(/^\d+\/\d+$/);
  });

  it("replays the E-18 RanInt(1,6) sample within its specified range", () => {
    const ranInt = run(["alpha", "dot", "1", "shift", "rparen", "6", "rparen", "equals"]);
    expect(Number(ranInt.result?.approx)).toBeGreaterThanOrEqual(1);
    expect(Number(ranInt.result?.approx)).toBeLessThanOrEqual(6);
  });

  it("replays E-16 e to the fifth times two in the printed LineIO layout", () => {
    const sci3 = run(["shift", "mode", "7", "3"]);
    const line = run(["shift", "mode", "2"], sci3);
    const state = run(["shift", "ln", "5", "rparen", "mul", "2", "equals"], line);
    expect(lcdResult(state)).toBe("2.97\u00d710\u00b2");
  });

  it("matches E-16 Sci 3 mantissa digits and superscript exponents", () => {
    const sci3 = run(["shift", "mode", "7", "3"]);
    const ln90 = run(["ln", "9", "0", "rparen", "equals"], sci3);
    expect(lcdResult(ln90)).toBe("4.50×10⁰");

    const exp5Times2 = run(["ac", "shift", "ln", "5", "right", "mul", "2", "equals"], ln90);
    expect(lcdResult(exp5Times2)).toBe("2.97×10²");
    expect(exp5Times2.result?.approx).not.toContain("×");
  });
  it("replays physical E-39 boundary keys for trig, factorial and nCr/nPr guards", () => {
    const sinAtUpperExclusiveBound = run([
      "sin", "9", "0", "0", "0", "0", "0", "0", "0", "0", "0", "rparen", "equals",
    ]);
    expect(sinAtUpperExclusiveBound.screen.kind).toBe("error");
    expect(lcdResult(sinAtUpperExclusiveBound)).toBe("Math ERROR");

    const sinJustInsideBound = run([
      "sin", "8", "9", "9", "9", "9", "9", "9", "9", "9", "9", "rparen", "equals",
    ]);
    expect(sinJustInsideBound.screen.kind).toBe("result");

    const factorialAtUpperInclusiveBound = run(["6", "9", "shift", "xinv", "equals"]);
    expect(lcdResult(factorialAtUpperInclusiveBound)).toBe("1.711224524\u00d710\u2079\u2078");

    const nCrIntermediateOverflow = run(["1", "6", "0", "shift", "div", "8", "0", "equals"]);
    expect(nCrIntermediateOverflow.screen.kind).toBe("error");
    expect(lcdResult(nCrIntermediateOverflow)).toBe("Math ERROR");

    const nPrIntermediateOverflow = run(["1", "6", "0", "shift", "mul", "8", "0", "equals"]);
    expect(nPrIntermediateOverflow.screen.kind).toBe("error");
    expect(lcdResult(nPrIntermediateOverflow)).toBe("Math ERROR");
  });

  it("replays additional printed E-39 domain boundaries through public keys", () => {
    const exp10AtUpperExclusive = run(["exp10", "1", "0", "0", "equals"]);
    expect(exp10AtUpperExclusive.screen.kind).toBe("error");
    expect(lcdResult(exp10AtUpperExclusive)).toBe("Math ERROR");

    const inverseZero = run(["0", "xinv", "equals"]);
    expect(inverseZero.screen.kind).toBe("error");
    expect(lcdResult(inverseZero)).toBe("Math ERROR");

    const squareAtUpperExclusive = run(["1", "exp10", "5", "0", "square", "equals"]);
    expect(squareAtUpperExclusive.screen.kind).toBe("error");
    expect(lcdResult(squareAtUpperExclusive)).toBe("Math ERROR");
  });
});

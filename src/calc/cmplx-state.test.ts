import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { deserializeState, serializeState } from "./persist.ts";
import { lcdExpression, lcdIndicators, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

describe("CMPLX reducer / evaluation", () => {
  it("MODE 2 enters CMPLX without changing Ans TARGET-OFFICIAL-DOC", () => {
    const prior = run(["9", "equals"]);
    const s = run(["mode", "2"], prior);
    expect(s.mode).toBe("CMPLX");
    expect(lcdIndicators(s).mode).toBe("CMPLX");
    expect(s.ans).toMatch(/^9/);
    expect(s.ansIm).toBe("0");
    expect(s.variables.X).toBe(prior.variables.X);
    expect(s.screen.kind).toBe("input");
  });

  it("2+3i displays 2+3i and stores rectangular Ans", () => {
    const s = run(["mode", "2", "2", "add", "3", "alpha", "eng", "equals"]);
    expect(lcdExpression(s)).toBe("2+3i");
    expect(lcdResult(s)).toBe("2+3i");
    expect(s.result?.naturalKind).toBe("complex");
    expect(s.result?.complex).toEqual({ re: "2", im: "3" });
    expect(s.ans).toBe("2");
    expect(s.ansIm).toBe("3");
  });

  it("5i and -4i drop a zero real part", () => {
    expect(lcdResult(run(["mode", "2", "5", "alpha", "eng", "equals"]))).toBe("5i");
    expect(lcdResult(run(["mode", "2", "neg", "4", "alpha", "eng", "equals"]))).toBe("-4i");
  });

  it("(2+6i)÷(2i)=3-i TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "2",
      "lparen",
      "2",
      "add",
      "6",
      "alpha",
      "eng",
      "rparen",
      "div",
      "lparen",
      "2",
      "alpha",
      "eng",
      "rparen",
      "equals",
    ]);
    expect(lcdResult(s)).toBe("3-i");
    expect(s.ans).toBe("3");
    expect(s.ansIm).toBe("-1");
    expect(s.result?.complex).toEqual({ re: "3", im: "-1" });
  });

  it("(2+3i)+(4+5i)=6+8i", () => {
    const s = run([
      "mode",
      "2",
      "lparen",
      "2",
      "add",
      "3",
      "alpha",
      "eng",
      "rparen",
      "add",
      "lparen",
      "4",
      "add",
      "5",
      "alpha",
      "eng",
      "rparen",
      "equals",
    ]);
    expect(lcdResult(s)).toBe("6+8i");
    expect(s.ans).toBe("6");
    expect(s.ansIm).toBe("8");
  });

  it("(2+3i)(4+5i)=-7+22i", () => {
    const s = run([
      "mode",
      "2",
      "lparen",
      "2",
      "add",
      "3",
      "alpha",
      "eng",
      "rparen",
      "lparen",
      "4",
      "add",
      "5",
      "alpha",
      "eng",
      "rparen",
      "equals",
    ]);
    expect(lcdResult(s)).toBe("-7+22i");
    expect(s.result?.complex).toEqual({ re: "-7", im: "22" });
  });

  it("2∠45 = √2+√2i in Deg TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "2", "2", "shift", "neg", "4", "5", "equals"]);
    expect(lcdResult(s)).toBe("√2+√2i");
    expect(s.result?.naturalKind).toBe("complex");
  });

  it("√2+√2i displays 2∠45 when SETUP is r∠θ TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "2",
      "shift",
      "mode",
      "down",
      "3",
      "2",
      "sqrt",
      "2",
      "add",
      "sqrt",
      "2",
      "rparen",
      "alpha",
      "eng",
      "equals",
    ]);
    expect(s.setup.complexFormat).toBe("r∠θ");
    expect(lcdResult(s)).toBe("2∠45");
    expect(s.result?.naturalKind).toBe("polar");
  });

  it("override r∠θ / a+bi at the end of the expression TARGET-OFFICIAL-DOC", () => {
    const polar = run([
      "mode",
      "2",
      "sqrt",
      "2",
      "add",
      "sqrt",
      "2",
      "rparen",
      "alpha",
      "eng",
      "shift",
      "2",
      "3",
      "equals",
    ]);
    expect(lcdResult(polar)).toBe("2∠45");
    const rect = run(["mode", "2", "2", "shift", "neg", "4", "5", "shift", "2", "4", "equals"]);
    expect(lcdResult(rect)).toBe("√2+√2i");
  });

  it("(1-i)^-1 = 1/2+1/2i TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "2", "lparen", "1", "sub", "alpha", "eng", "rparen", "xinv", "equals"]);
    expect(lcdResult(s)).toBe("1/2+1/2i");
  });

  it("(1+i)^2+(1-i)^2 = 0 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "2",
      "lparen",
      "1",
      "add",
      "alpha",
      "eng",
      "rparen",
      "square",
      "add",
      "lparen",
      "1",
      "sub",
      "alpha",
      "eng",
      "rparen",
      "square",
      "equals",
    ]);
    expect(lcdResult(s)).toBe("0");
    expect(s.ansIm).toBe("0");
    expect(s.result?.naturalKind).toBe("decimal");
  });

  it("Conjg(2+3i)=2-3i TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "2", "shift", "2", "2", "2", "add", "3", "alpha", "eng", "equals"]);
    expect(lcdResult(s)).toBe("2-3i");
  });

  it("Abs(1+i)=√2 and arg(1+i)=45 TARGET-OFFICIAL-DOC", () => {
    const abs = run(["mode", "2", "shift", "hyp", "1", "add", "alpha", "eng", "equals"]);
    expect(lcdResult(abs)).toBe("√2");
    const arg = run(["mode", "2", "shift", "2", "1", "1", "add", "alpha", "eng", "equals"]);
    expect(lcdResult(arg)).toBe("45");
  });

  it("SHIFT+2 in CMPLX opens the complex menu CROSS-MODEL-SOURCE numbering NHR", () => {
    const s = run(["mode", "2", "shift", "2"]);
    expect(s.menu.kind).toBe("cmplx-op");
    expect(lcdResult(s)).toBe("1:arg 2:Conjg 3:r∠θ 4:a+bi");
  });

  it("i in COMP is Math ERROR; COMP is not a complex domain", () => {
    const s = run(["alpha", "eng", "equals"]);
    expect(s.mode).toBe("COMP");
    expect(s.screen.kind).toBe("error");
    expect(lcdResult(s)).toBe("Math ERROR");
  });

  it("SHIFT+2 in COMP does not open the CMPLX menu", () => {
    const s = run(["shift", "2"]);
    expect(s.mode).toBe("COMP");
    expect(s.menu.kind).toBe("none");
  });

  it("∠ in COMP is Math ERROR INFERRED", () => {
    const s = run(["2", "shift", "neg", "4", "5", "equals"]);
    expect(s.screen.kind).toBe("error");
    expect(lcdResult(s)).toBe("Math ERROR");
  });

  it("√ of a negative real in CMPLX is Math ERROR INFERRED", () => {
    const s = run(["mode", "2", "sqrt", "neg", "1", "equals"]);
    expect(lcdResult(s)).toBe("Math ERROR");
  });

  it("sin of a non-real is Math ERROR DEFERRED", () => {
    const s = run(["mode", "2", "sin", "alpha", "eng", "equals"]);
    expect(lcdResult(s)).toBe("Math ERROR");
  });

  it("divide by 0+0i is Math ERROR", () => {
    const s = run(["mode", "2", "1", "add", "alpha", "eng", "div", "0", "equals"]);
    expect(lcdResult(s)).toBe("Math ERROR");
  });

  it("complex STO with nonzero imag is Math ERROR PARTIAL", () => {
    const s = run(["mode", "2", "2", "add", "3", "alpha", "eng", "equals", "shift", "rcl", "neg"]);
    expect(lcdResult(s)).toBe("Math ERROR");
    expect(s.variables.A).toBe("0");
  });

  it("MODE 1 leaves CMPLX; i is Math ERROR again; complex Ans cannot be recalled in COMP", () => {
    const cmplx = run(["mode", "2", "2", "add", "3", "alpha", "eng", "equals"]);
    expect(cmplx.ansIm).toBe("3");
    const comp = run(["mode", "1", "alpha", "eng", "equals"], cmplx);
    expect(comp.mode).toBe("COMP");
    expect(lcdResult(comp)).toBe("Math ERROR");
    const ans = run(["mode", "1", "ans", "equals"], cmplx);
    expect(lcdResult(ans)).toBe("Math ERROR");
  });

  it("real CMPLX results survive MODE 1 as ordinary Ans", () => {
    const s = run(["mode", "2", "8", "equals", "mode", "1", "ans", "equals"]);
    expect(s.mode).toBe("COMP");
    expect(lcdResult(s)).toMatch(/^8/);
    expect(s.ansIm).toBe("0");
  });

  it("TABLE still evaluates with COMP semantics (i is Math ERROR, not complex)", () => {
    const s = run(["mode", "7", "alpha", "eng", "equals", "equals", "equals", "equals"]);
    expect(s.mode).toBe("TABLE");
    expect(s.table?.phase).toBe("view");
    expect(s.table?.rows[0]?.fxError).toBe("Math ERROR");
  });
});

describe("CMPLX persist schema v1", () => {
  it("loads a v1 COMP envelope that omits ansIm/preAnsIm", () => {
    const { ansIm: _a, preAnsIm: _p, ...rest } = createInitialState(0);
    const back = deserializeState({ schemaVersion: 1, savedAt: 0, state: rest }, 1);
    expect(back?.ansIm).toBe("0");
    expect(back?.preAnsIm).toBe("0");
    expect(back?.mode).toBe("COMP");
  });

  it("round-trips CMPLX Ans imag without bumping schemaVersion", () => {
    const filled = run(["mode", "2", "2", "add", "3", "alpha", "eng", "equals"]);
    const env = serializeState(filled);
    expect(env.schemaVersion).toBe(1);
    expect(env.state.ansIm).toBe("3");
    expect(env.state.ans).toBe("2");
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 0);
    expect(back?.mode).toBe("CMPLX");
    expect(back?.ans).toBe("2");
    expect(back?.ansIm).toBe("3");
    expect(back?.result?.display).toBe("2+3i");
  });
});

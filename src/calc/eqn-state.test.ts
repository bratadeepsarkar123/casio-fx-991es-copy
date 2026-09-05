import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import { toDec } from "./symbolic.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

describe("EQN reducer / session", () => {
  it("MODE 5 enters EQN type menu without changing Ans", () => {
    const prior = run(["9", "equals"]);
    const s = run(["mode", "5"], prior);
    expect(s.mode).toBe("EQN");
    expect(s.eqn?.phase).toBe("type");
    expect(lcdExpression(s)).toBe("EQN");
    expect(lcdResult(s)).toContain("2-UNK");
    expect(s.ans).toMatch(/^9/);
    expect(s.variables.X).toBe(prior.variables.X);
  });

  it("type 1 opens lin2 editor a1= 0", () => {
    const s = run(["mode", "5", "1"]);
    expect(s.eqn?.type).toBe("lin2");
    expect(s.eqn?.phase).toBe("editor");
    expect(s.eqn?.coeffs).toHaveLength(6);
    expect(lcdExpression(s)).toBe("a1=");
    expect(lcdResult(s)).toBe("0");
  });

  it("Ex1 key sequence solves to X=-1 then Y=2 TARGET-OFFICIAL-DOC", () => {
    let s = run([
      "mode",
      "5",
      "1",
      "1",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "4",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.phase).toBe("solutions");
    expect(s.eqn?.solutions.map((x) => x.label)).toEqual(["X", "Y"]);
    expect(s.eqn?.solutions.map((x) => toDec(x.sym).toString())).toEqual(["-1", "2"]);
    expect(lcdExpression(s)).toBe("X=");
    expect(lcdResult(s)).toBe("-1");
    expect(s.ans).toBe("0");
    s = dispatchKeys(s, ["equals"], 0);
    expect(lcdExpression(s)).toBe("Y=");
    expect(lcdResult(s)).toBe("2");
    s = dispatchKeys(s, ["equals"], 0);
    expect(s.eqn?.phase).toBe("editor");
    expect(lcdExpression(s)).toBe("a1=");
  });

  it("AC in editor zeros all coefficients TARGET-OFFICIAL-DOC", () => {
    let s = run(["mode", "5", "1", "8", "equals"]);
    expect(toDec(s.eqn!.coeffs[0]!.sym).toString()).toBe("8");
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.eqn?.phase).toBe("editor");
    expect(s.eqn?.coeffIndex).toBe(0);
    expect(s.eqn?.coeffs.every((c) => toDec(c.sym).isZero())).toBe(true);
  });

  it("AC on a solution returns to the coefficient editor and keeps coeffs", () => {
    let s = run([
      "mode",
      "5",
      "1",
      "1",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "4",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.phase).toBe("solutions");
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.eqn?.phase).toBe("editor");
    expect(toDec(s.eqn!.coeffs[0]!.sym).toString()).toBe("1");
    expect(s.eqn?.solutions).toEqual([]);
  });

  it("inconsistent system shows No Solution; AC returns to editor", () => {
    let s = run([
      "mode",
      "5",
      "1",
      "1",
      "equals",
      "1",
      "equals",
      "1",
      "equals",
      "2",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.phase).toBe("message");
    expect(s.eqn?.message).toBe("no-solution");
    expect(lcdResult(s)).toBe("No Solution");
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.eqn?.phase).toBe("editor");
  });

  it("dependent system shows Infinitely Many", () => {
    const s = run([
      "mode",
      "5",
      "1",
      "1",
      "equals",
      "1",
      "equals",
      "1",
      "equals",
      "2",
      "equals",
      "2",
      "equals",
      "2",
      "equals",
      "equals",
    ]);
    expect(s.eqn?.message).toBe("infinite");
    expect(lcdResult(s)).toBe("Infinitely Many");
  });

  it("quadratic a=0 is Math ERROR INFERRED", () => {
    const s = run(["mode", "5", "3", "0", "equals", "1", "equals", "1", "equals", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Math ERROR");
    }
  });

  it("leaving EQN for COMP wipes the session and does not rewrite COMP arithmetic", () => {
    const s = run(["mode", "5", "1", "1", "equals", "mode", "1", "2", "add", "3", "equals"]);
    expect(s.mode).toBe("COMP");
    expect(s.eqn).toBeNull();
    expect(lcdResult(s)).toBe("5");
  });

  it("does not contaminate TABLE / BASE-N / CMPLX / STAT entry", () => {
    expect(run(["mode", "7"]).mode).toBe("TABLE");
    expect(run(["mode", "4"]).mode).toBe("BASE-N");
    expect(run(["mode", "2"]).mode).toBe("CMPLX");
    expect(run(["mode", "3"]).mode).toBe("STAT");
    const afterEqn = run(["mode", "5", "1", "mode", "3"]);
    expect(afterEqn.mode).toBe("STAT");
    expect(afterEqn.eqn).toBeNull();
    expect(afterEqn.stat?.phase).toBe("type");
  });

  it("STO / Pol / Rec / M+ are ignored in the coefficient editor TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "5", "1", "shift", "rcl", "1"]);
    expect(s.menu.kind).toBe("none");
    expect(s.eqn?.phase).toBe("editor");
    expect(lcdExpression(s)).toBe("a1=");
  });

  it("up/down scroll solutions without wrapping to the editor", () => {
    let s = run([
      "mode",
      "5",
      "1",
      "1",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "2",
      "equals",
      "3",
      "equals",
      "4",
      "equals",
      "equals",
    ]);
    s = dispatchKeys(s, ["down"], 0);
    expect(lcdExpression(s)).toBe("Y=");
    s = dispatchKeys(s, ["up"], 0);
    expect(lcdExpression(s)).toBe("X=");
    expect(s.eqn?.phase).toBe("solutions");
  });
});

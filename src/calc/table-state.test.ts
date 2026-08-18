import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

function enterTable(start?: CalcState): CalcState {
  return run(["mode", "7"], start);
}

describe("TABLE reducer / evaluation", () => {
  it("MODE 7 enters TABLE f(x) prompt without changing Ans", () => {
    const prior = run(["9", "equals"]);
    const s = enterTable(prior);
    expect(s.mode).toBe("TABLE");
    expect(s.table?.phase).toBe("fx");
    expect(lcdResult(s)).toBe("f(x)=");
    expect(s.ans).toMatch(/^9/);
    expect(s.variables.X).toBe(prior.variables.X);
  });

  it("f(x)=x² Start=1 End=5 Step=1 generates five rows", () => {
    const s = run(["mode", "7", "alpha", "rparen", "square", "equals", "equals", "equals", "equals"]);
    expect(s.table?.phase).toBe("view");
    expect(s.screen.kind).toBe("table-view");
    expect(s.table?.rows).toHaveLength(5);
    expect(s.table?.rows.map((r) => r.xApprox)).toEqual(["1", "2", "3", "4", "5"]);
    expect(s.table?.rows.map((r) => r.fxApprox)).toEqual(["1", "4", "9", "16", "25"]);
    expect(s.table?.rowIndex).toBe(0);
    expect(lcdExpression(s)).toBe("X=1");
    expect(lcdResult(s)).toBe("1");
  });

  it("f(x)=x+1 uses the row X and SETUP formatting", () => {
    const s = run(["mode", "7", "alpha", "rparen", "add", "1", "equals", "equals", "equals", "equals"]);
    expect(s.table?.rows.map((r) => r.fxApprox)).toEqual(["2", "3", "4", "5", "6"]);
  });

  it("f(x)=sin(x) Deg uses the current angle unit (exact 30°)", () => {
    const s = run([
      "mode",
      "7",
      "sin",
      "alpha",
      "rparen",
      "equals",
      "del",
      "0",
      "equals",
      "del",
      "9",
      "0",
      "equals",
      "del",
      "3",
      "0",
      "equals",
    ]);
    expect(s.table?.rows).toHaveLength(4);
    expect(s.table?.rows.map((r) => r.xApprox)).toEqual(["0", "30", "60", "90"]);
    expect(s.table?.rows[0]?.fxDisplay).toBe("0");
    expect(s.table?.rows[1]?.fxDisplay?.replace(/\s/g, "")).toMatch(/1\/2/);
    expect(s.table?.rows[3]?.fxApprox).toMatch(/^1/);
  });

  it("up/down navigate rows; AC returns to f(x) with the function preserved", () => {
    let s = run(["mode", "7", "alpha", "rparen", "square", "equals", "equals", "equals", "equals"]);
    s = dispatchKeys(s, ["down", "down"], 0);
    expect(s.table?.rowIndex).toBe(2);
    expect(lcdExpression(s)).toBe("X=3");
    expect(lcdResult(s)).toBe("9");
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.table?.phase).toBe("fx");
    expect(lcdResult(s)).toBe("f(x)=");
    expect(lcdExpression(s)).toMatch(/X|x/);
  });

  it("does not mutate X or Ans until the table is generated", () => {
    const prior = run(["4", "equals", "shift", "rcl", "rparen"]);
    expect(prior.variables.X).toMatch(/^4/);
    expect(prior.ans).toMatch(/^4/);
    let s = enterTable(prior);
    s = run(["alpha", "rparen", "square", "equals"], s);
    expect(s.table?.phase).toBe("start");
    expect(s.variables.X).toMatch(/^4/);
    expect(s.ans).toMatch(/^4/);
    s = run(["equals", "equals", "equals"], s);
    expect(s.table?.phase).toBe("view");
    expect(s.ans).toMatch(/^4/);
    expect(s.variables.X).toBe("5");
  });

  it("zero Step is Argument ERROR", () => {
    const s = run(["mode", "7", "alpha", "rparen", "equals", "equals", "equals", "del", "0", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Argument ERROR");
    }
    expect(s.variables.X).toBe("0");
  });

  it("more than 30 X-values is Insufficient MEM Error", () => {
    const s = run([
      "mode",
      "7",
      "alpha",
      "rparen",
      "equals",
      "equals",
      "del",
      "3",
      "1",
      "equals",
      "equals",
    ]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Insufficient MEM Error");
    }
  });

  it("Pol/int in f(x) is Syntax ERROR (TARGET-OFFICIAL-DOC forbidden)", () => {
    const s = run(["mode", "7", "shift", "integral", "equals"]);
    expect(s.screen.kind).toBe("error");
    if (s.screen.kind === "error") {
      expect(s.screen.code).toBe("Syntax ERROR");
    }
  });

  it("a Math ERROR row does not wipe Ans or abort the table", () => {
    const prior = run(["8", "equals"]);
    const s = run(
      ["mode", "7", "1", "div", "alpha", "rparen", "equals", "neg", "equals", "del", "1", "equals", "equals"],
      prior,
    );
    expect(s.table?.phase).toBe("view");
    expect(s.ans).toMatch(/^8/);
    expect(s.table?.rows.some((r) => r.fxError === "Math ERROR")).toBe(true);
    expect(s.table?.rows.some((r) => r.fxError === null)).toBe(true);
  });
});

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
    let s = run(
      [
        "mode",
        "7",
        "1",
        "div",
        "alpha",
        "rparen",
        "equals",
        "del",
        "0",
        "equals",
        "del",
        "1",
        "equals",
        "equals",
      ],
      prior,
    );
    expect(s.table?.phase).toBe("view");
    expect(s.ans).toMatch(/^8/);
    expect(s.table?.rows.map((r) => r.xApprox)).toEqual(["0", "1"]);
    expect(s.table?.rows[0]?.fxError).toBe("Math ERROR");
    expect(s.table?.rows[1]?.fxError).toBeNull();
    expect(lcdExpression(s)).toBe("X=0");
    expect(lcdResult(s)).toBe("Math ERROR");
    s = dispatchKeys(s, ["down"], 0);
    expect(s.table?.rowIndex).toBe(1);
    expect(lcdExpression(s)).toBe("X=1");
    expect(lcdResult(s)).toMatch(/^1/);
    expect(s.ans).toMatch(/^8/);
  });

  it("MODE 1 leaves TABLE and clears the session", () => {
    const s = run(["mode", "7", "alpha", "rparen", "square", "equals", "equals", "equals", "equals", "mode", "1"]);
    expect(s.mode).toBe("COMP");
    expect(s.table).toBeNull();
    expect(s.screen.kind).toBe("input");
  });

  it("SETUP Fix n=2 formats table approx strings without changing COMP Ans", () => {
    const prior = run(["7", "equals", "shift", "mode", "6", "2"]);
    expect(prior.setup.numberFormat).toEqual({ kind: "Fix", n: 2 });
    const s = run(["mode", "7", "alpha", "rparen", "square", "equals", "equals", "equals", "equals"], prior);
    expect(s.table?.rows.map((r) => r.fxApprox)).toEqual(["1.00", "4.00", "9.00", "16.00", "25.00"]);
    expect(s.ans).toMatch(/^7/);
  });

  it("switching Natural/Linear in TABLE deletes the function (TARGET-OFFICIAL-DOC)", () => {
    let s = run(["mode", "7", "alpha", "rparen", "square", "equals"]);
    expect(s.table?.phase).toBe("start");
    expect(s.table?.fx.length).toBeGreaterThan(0);
    s = dispatchKeys(s, ["shift", "mode", "2"], 0);
    expect(s.setup.displayFormat).toBe("LineIO");
    expect(s.table?.phase).toBe("fx");
    expect(s.table?.fx).toEqual([]);
    expect(lcdResult(s)).toBe("f(x)=");
    expect(lcdExpression(s)).toBe("");
  });

  it("SETUP tableFormat f(x),g(x) is ignored; TABLE still generates a single f(x)", () => {
    const prior = run(["shift", "mode", "down", "5", "2"]);
    expect(prior.setup.tableFormat).toBe("f(x),g(x)");
    const s = run(["mode", "7", "alpha", "rparen", "add", "1", "equals", "equals", "equals", "equals"], prior);
    expect(s.table?.rows.map((r) => r.fxApprox)).toEqual(["2", "3", "4", "5", "6"]);
    expect(s.table?.rows[0]).not.toHaveProperty("gxApprox");
  });

  it("AC after Argument ERROR does not wipe Ans or persistent X", () => {
    const prior = run(["6", "equals", "shift", "rcl", "rparen"]);
    let s = run(["mode", "7", "alpha", "rparen", "equals", "equals", "equals", "del", "0", "equals"], prior);
    expect(s.screen.kind).toBe("error");
    s = dispatchKeys(s, ["ac"], 0);
    expect(s.screen.kind).toBe("input");
    expect(s.ans).toMatch(/^6/);
    expect(s.variables.X).toMatch(/^6/);
    expect(s.table?.phase).toBe("step");
  });
});

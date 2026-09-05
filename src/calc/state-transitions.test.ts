import { describe, expect, it } from "vitest";
import { AUTO_OFF_MS, createInitialState, dispatchKeys, reduce } from "./machine.ts";
import { deserializeState, serializeState } from "./persist.ts";
import { lcdExpression, lcdIndicators, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState } from "./types.ts";

function run(keys: KeyId[], now = 0, start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(now), keys, now);
}

function snapshot(s: CalcState) {
  return {
    expr: lcdExpression(s),
    result: s.result?.approx ?? null,
    ans: s.ans,
    preAns: s.preAns,
    A: s.variables.A,
    M: s.memoryM,
    history: s.history.length,
    mode: s.mode,
    angle: s.setup.angleUnit,
    format: s.setup.displayFormat,
    power: s.power,
    screen: s.screen.kind,
  };
}

describe("state-transition matrix", () => {
  it("AC clears expression/result but keeps Ans, PreAns, vars, M, history, setup", () => {
    let s = run(["7", "equals", "shift", "rcl", "neg", "mplus", "1", "add", "2"]);
    expect(s.ans).toMatch(/^7/);
    expect(s.variables.A).toMatch(/^7/);
    expect(s.memoryM).not.toBe("0");
    expect(s.history.length).toBeGreaterThan(0);
    const before = snapshot(s);
    s = dispatchKeys(s, ["ac"], 0);
    expect(lcdExpression(s)).toBe("");
    expect(s.result).toBeNull();
    expect(s.ans).toBe(before.ans);
    expect(s.preAns).toBe(before.preAns);
    expect(s.variables.A).toBe(before.A);
    expect(s.memoryM).toBe(before.M);
    expect(s.history.length).toBe(before.history);
    expect(s.setup.angleUnit).toBe(before.angle);
  });

  it("MODE change clears history/editor/result and PreAns when leaving COMP; keeps Ans/vars/M", () => {
    let s = run(["9", "equals", "shift", "rcl", "neg", "mplus"]);
    s = run(["1", "equals"], 0, s);
    expect(s.preAns).toMatch(/^9/);
    const ans = s.ans;
    const a = s.variables.A;
    const m = s.memoryM;
    s = dispatchKeys(s, ["mode", "3"], 0);
    expect(s.mode).toBe("STAT");
    expect(s.history.length).toBe(0);
    expect(s.preAns).toBe("0");
    expect(s.ans).toBe(ans);
    expect(s.variables.A).toBe(a);
    expect(s.memoryM).toBe(m);
    s = dispatchKeys(s, ["mode", "1"], 0);
    expect(s.mode).toBe("COMP");
    expect(s.preAns).toBe("0");
  });

  it("SETUP display change clears history but keeps memories", () => {
    let s = run(["8", "equals"]);
    const hist = s.history.length;
    expect(hist).toBeGreaterThan(0);
    s = dispatchKeys(s, ["shift", "mode", "2"], 0);
    expect(s.setup.displayFormat).toBe("LineIO");
    expect(s.history.length).toBe(0);
    expect(s.ans).toMatch(/^8/);
  });

  it("CLR Setup resets setup/mode/history/editor and keeps memories", () => {
    let s = run(["shift", "mode", "4", "6", "equals", "shift", "rcl", "neg"]);
    expect(s.setup.angleUnit).toBe("Rad");
    s = dispatchKeys(s, ["shift", "9", "1", "equals"], 0);
    expect(s.mode).toBe("COMP");
    expect(s.setup.angleUnit).toBe("Deg");
    expect(s.setup.displayFormat).toBe("MthIO-MathO");
    expect(s.history.length).toBe(0);
    expect(lcdExpression(s)).toBe("");
    expect(s.ans).toMatch(/^6/);
    expect(s.variables.A).toMatch(/^6/);
  });

  it("CLR Memory zeros Ans, PreAns, vars, M and keeps setup/history", () => {
    let s = run(["5", "equals", "shift", "rcl", "neg", "mplus"]);
    const hist = s.history.length;
    const angle = s.setup.angleUnit;
    s = dispatchKeys(s, ["shift", "9", "2", "equals"], 0);
    expect(s.ans).toBe("0");
    expect(s.preAns).toBe("0");
    expect(s.variables.A).toBe("0");
    expect(s.memoryM).toBe("0");
    expect(s.history.length).toBe(hist);
    expect(s.setup.angleUnit).toBe(angle);
  });

  it("CLR All resets setup and memories", () => {
    let s = run(["shift", "mode", "4", "4", "equals", "mplus"]);
    s = dispatchKeys(s, ["shift", "9", "3", "equals"], 0);
    expect(s.setup.angleUnit).toBe("Deg");
    expect(s.ans).toBe("0");
    expect(s.memoryM).toBe("0");
    expect(s.history.length).toBe(0);
  });

  it("power off/on keeps Ans, PreAns, vars, M, history, setup", () => {
    let s = run(["3", "equals", "2", "equals"]);
    const before = snapshot(s);
    s = dispatchKeys(s, ["shift", "ac"], 0);
    expect(s.power).toBe("off");
    s = dispatchKeys(s, ["7"], 0);
    expect(s.power).toBe("off");
    expect(lcdExpression(s)).toBe(before.expr);
    s = dispatchKeys(s, ["on"], 0);
    expect(s.power).toBe("on");
    expect(s.ans).toBe(before.ans);
    expect(s.preAns).toBe(before.preAns);
    expect(s.history.length).toBe(before.history);
    expect(s.setup.angleUnit).toBe(before.angle);
  });

  it("auto power-off after 10 minutes ignores the waking key except ON", () => {
    let s = createInitialState(0);
    s = reduce(s, { keyId: "7", source: "test", nowMs: AUTO_OFF_MS + 1 });
    expect(s.power).toBe("off");
    expect(lcdExpression(s)).toBe("");
    s = reduce(s, { keyId: "on", source: "test", nowMs: AUTO_OFF_MS + 2 });
    expect(s.power).toBe("on");
  });

  it("localStorage round-trip restores Ans/M/history and forces power on", () => {
    let s = run(["7", "equals", "mplus"]);
    s = dispatchKeys(s, ["shift", "ac"], 0);
    const env = serializeState(s);
    const restored = deserializeState(env, 1234);
    expect(restored).not.toBeNull();
    expect(restored?.power).toBe("on");
    expect(restored?.ans).toMatch(/^7/);
    expect(restored?.memoryM).toMatch(/^7/);
    expect(restored?.history.length).toBe(1);
    expect(restored?.lastActivityMs).toBe(1234);
  });

  it("replay history is independent of Ans after AC", () => {
    let s = run(["4", "mul", "3", "equals", "ac", "up"]);
    expect(s.screen.kind).toBe("replay");
    expect(lcdResult(s)).toBe("12");
    expect(s.ans).toMatch(/^12/);
  });
});

describe("LCD indicators", () => {
  it("exposes SHIFT, ALPHA, HYP, M, angle, Math, FIX, mode, replay", () => {
    let s = createInitialState(0);
    expect(lcdIndicators(s).angle).toBe("D");
    expect(lcdIndicators(s).math).toBe(true);
    s = dispatchKeys(s, ["shift"], 0);
    expect(lcdIndicators(s).shift).toBe(true);
    s = dispatchKeys(s, ["alpha"], 0);
    expect(lcdIndicators(s).alpha).toBe(true);
    s = dispatchKeys(s, ["ac", "hyp"], 0);
    expect(lcdIndicators(s).hyp).toBe(true);
    s = dispatchKeys(s, ["ac", "5", "equals", "mplus"], 0);
    expect(lcdIndicators(s).memory).toBe(true);
    expect(lcdIndicators(s).replay).toBe(true);
    s = dispatchKeys(s, ["shift", "mode", "6", "2"], 0);
    expect(lcdIndicators(s).fix).toBe(true);
    s = dispatchKeys(s, ["mode", "2"], 0);
    expect(lcdIndicators(s).mode).toBe("CMPLX");
  });
});

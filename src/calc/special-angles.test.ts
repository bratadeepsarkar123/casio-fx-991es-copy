import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdResult } from "../ui/lcdModel.ts";
import type { CalcState } from "./types.ts";
import type { KeyId } from "./keys.ts";

function run(keys: KeyId[], setup?: (s: CalcState) => CalcState): CalcState {
  let s = createInitialState(0);
  if (setup) {
    s = setup(s);
  }
  return dispatchKeys(s, keys, 0);
}

function lineIo(s: CalcState): CalcState {
  return { ...s, setup: { ...s.setup, displayFormat: "LineIO" } };
}

describe("special-angle Natural Display vs nearby floats", () => {
  it("sin 30° exact is 1/2 in MathO and 0.5 in LineIO", () => {
    const math = run(["sin", "3", "0", "equals"]);
    expect(lcdResult(math).replace(/\s/g, "")).toMatch(/1\/2/);
    const line = run(["sin", "3", "0", "equals"], lineIo);
    expect(lcdResult(line)).toMatch(/^0\.5/);
  });

  it("sin 30.001° is not the exact 1/2 shortcut", () => {
    const s = run(["sin", "3", "0", "dot", "0", "0", "1", "equals"]);
    expect(lcdResult(s).replace(/\s/g, "")).not.toMatch(/^1\/2$/);
    expect(lcdResult(s)).not.toBe("0.5");
  });

  it("nested 15+15 still hits the exact 30° case", () => {
    const s = run(["sin", "1", "5", "add", "1", "5", "equals"]);
    expect(lcdResult(s).replace(/\s/g, "")).toMatch(/1\/2/);
  });

  it("Rad sin(π/6) is exact 1/2; nearby 0.5236 is not", () => {
    const exact = run(["shift", "mode", "4", "sin", "shift", "exp10", "div", "6", "equals"]);
    expect(lcdResult(exact).replace(/\s/g, "")).toMatch(/1\/2/);
    const nearby = run(
      ["shift", "mode", "4", "sin", "0", "dot", "5", "2", "3", "6", "equals"],
      (s) => ({ ...s, setup: { ...s.setup, displayFormat: "LineIO" } }),
    );
    expect(lcdResult(nearby).replace(/\s/g, "")).not.toMatch(/1\/2/);
  });

  it("Gra sin(50) is sin 45° = √2/2, not a Deg 50 shortcut", () => {
    const s = run(["shift", "mode", "5", "sin", "5", "0", "equals"]);
    expect(lcdResult(s)).toMatch(/√2/);
  });

  it("S⇔D toggles exact sin 30 between 1/2 and decimal", () => {
    const s = run(["sin", "3", "0", "equals"]);
    expect(s.result?.naturalKind).toBe("fraction");
    const dec = dispatchKeys(s, ["sd"], 0);
    expect(dec.result?.naturalKind).toBe("decimal");
    expect(lcdResult(dec)).toMatch(/^0\.5/);
    const back = dispatchKeys(dec, ["sd"], 0);
    expect(back.result?.naturalKind).toBe("fraction");
  });

  it("tan 90° exact is Math ERROR; 89.9° is not", () => {
    const err = run(["tan", "9", "0", "equals"]);
    expect(err.screen.kind).toBe("error");
    const ok = run(["tan", "8", "9", "dot", "9", "equals"], lineIo);
    expect(ok.screen.kind).toBe("result");
  });

  it("asin 0.5 Deg is 30; 0.5001 is not", () => {
    const exact = run(["shift", "sin", "0", "dot", "5", "equals"], lineIo);
    expect(lcdResult(exact)).toMatch(/^30/);
    const nearby = run(["shift", "sin", "0", "dot", "5", "0", "0", "1", "equals"], lineIo);
    expect(lcdResult(nearby)).not.toMatch(/^30$/);
  });
});

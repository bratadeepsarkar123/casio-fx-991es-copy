import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("cursor / editing goldens", () => {
  it("inserts in the middle of a number", () => {
    const s = run(["1", "2", "3", "left", "left", "0"]);
    expect(lcdExpression(s)).toBe("1023");
  });

  it("DEL removes the left digit", () => {
    const s = run(["1", "2", "3", "del"]);
    expect(lcdExpression(s)).toBe("12");
  });

  it("keeps + inside sin() (operator-exit does not leave the call)", () => {
    const s = run(["sin", "3", "0", "add", "1"]);
    expect(lcdExpression(s)).toMatch(/sin\(30\+1/);
  });

  it("requires RIGHT to leave a fraction denominator before infix +", () => {
    // Natural Display keeps operators in the denominator until RIGHT is pressed;
    // the selected E-8 trace depends on that behavior.  E-10 explicitly presses
    // RIGHT before the following operator.
    const explicitExit = run(["1", "frac", "2", "right", "add", "3"]);
    expect(lcdExpression(explicitExit)).toBe("(1/2)+3");
    expect(lcdResult(run(["1", "frac", "2", "right", "add", "3", "equals"]))).toBe("7/2");

    const denominatorOperator = run(["1", "frac", "2", "add", "3", "equals"]);
    expect(lcdResult(denominatorOperator)).toBe("1/5");
  });

  it("nth-root template: cursor in n, then right into radicand", () => {
    const n = run(["shift", "power", "5"]);
    expect(lcdExpression(n)).toMatch(/5√/);
    const full = dispatchKeys(n, ["right", "3", "2"], 0);
    expect(lcdExpression(full)).toMatch(/5√32/);
  });

  it("LineIO indexed-root entry keeps the printed index before SHIFT power", () => {
    const s = run(["shift", "mode", "2", "5", "shift", "power", "3", "2", "rparen", "equals"]);
    expect(lcdResult(s)).toBe("2");
  });

  it("replay then edit replaces the last operator", () => {
    const s = run(["4", "mul", "3", "add", "2", "equals", "left", "del", "del", "sub", "7", "equals"]);
    expect(lcdResult(s)).toBe("5");
  });

  it("physical ×10^x does not swallow the following operator into the exponent", () => {
    const s = run(["2", "exp10", "3", "add", "4", "equals"]);
    expect(lcdResult(s)).toBe("2004");
    const expr = run(["2", "exp10", "3", "add", "4"]);
    expect(lcdExpression(expr)).toMatch(/2×10\^\(?3\)?\+4/);
  });

  it("SHIFT+log exp10 still keeps following operators inside the exponent", () => {
    const s = run(["shift", "log", "3", "add", "4", "equals"]);
    expect(lcdResult(s)).toBe("10000000");
  });

  it("caret ^ still keeps following operators inside the exponent", () => {
    const s = run(["2", "power", "3", "add", "4", "equals"]);
    expect(lcdResult(s)).toBe("128");
  });
});

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

  it("exits a fraction denominator on infix +", () => {
    const s = run(["1", "frac", "2", "add", "3"]);
    expect(lcdExpression(s)).toBe("(1/2)+3");
  });

  it("nth-root template: cursor in n, then right into radicand", () => {
    const n = run(["shift", "power", "5"]);
    expect(lcdExpression(n)).toMatch(/5√/);
    const full = dispatchKeys(n, ["right", "3", "2"], 0);
    expect(lcdExpression(full)).toMatch(/5√32/);
  });

  it("replay then edit replaces the last operator", () => {
    const s = run(["4", "mul", "3", "add", "2", "equals", "left", "del", "del", "sub", "7", "equals"]);
    expect(lcdResult(s)).toBe("5");
  });
});

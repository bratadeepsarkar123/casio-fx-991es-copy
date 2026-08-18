import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("BASE-N goldens", () => {
  it("GT-BN-OFFICIAL-EX1 BIN 11+1 TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "4", "log", "1", "1", "add", "1", "equals"]);
    expect(s.mode).toBe("BASE-N");
    expect(s.baseN.radix).toBe(2);
    expect(s.baseN.value).toBe("4");
    expect(lcdResult(s)).toBe("0000000000000100");
    expect(s.ans).toBe("4");
  });

  it("GT-BN-OFFICIAL-CONV 15×37 then HEX/BIN/OCT TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "4", "1", "5", "mul", "3", "7", "equals", "power"]);
    expect(s.baseN.radix).toBe(16);
    expect(s.baseN.value).toBe("555");
    expect(lcdResult(s)).toBe("0000022B");
  });

  it("GT-BN-OFFICIAL-AND BIN 1010 and 1100 TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "4", "log", "1", "0", "1", "0", "shift", "3", "1", "1", "1", "0", "0", "equals"]);
    expect(s.baseN.radix).toBe(2);
    expect(s.baseN.value).toBe("8");
    expect(lcdResult(s)).toBe("0000000000001000");
  });
});

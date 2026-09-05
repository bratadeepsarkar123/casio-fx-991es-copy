import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";
import type { CalcState } from "../src/calc/types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

describe("S⇔D in LineO / LineIO (hardware: decimal ↔ fraction)", () => {
  it("MthIO-LineO 56÷69= is decimal; S⇔D toggles to 56/69 and back", () => {
    const s = run(["shift", "mode", "1", "2", "5", "6", "div", "6", "9", "equals"]);
    expect(s.setup.displayFormat).toBe("MthIO-LineO");
    expect(s.result?.naturalKind).toBe("decimal");
    expect(lcdResult(s)).toMatch(/^0\.811/);
    expect(s.result?.fraction).toEqual({ num: "56", den: "69" });
    const frac = run(["sd"], s);
    expect(frac.result?.naturalKind).toBe("fraction");
    expect(lcdResult(frac).replace(/\s/g, "")).toBe("56/69");
    const back = run(["sd"], frac);
    expect(back.result?.naturalKind).toBe("decimal");
    expect(lcdResult(back)).toMatch(/^0\.811/);
  });

  it("LineIO 56÷69= also toggles S⇔D to 56/69", () => {
    const s = run(["shift", "mode", "2", "5", "6", "div", "6", "9", "equals"]);
    expect(s.setup.displayFormat).toBe("LineIO");
    expect(lcdResult(s)).toMatch(/^0\.811/);
    const frac = run(["sd"], s);
    expect(lcdResult(frac).replace(/\s/g, "")).toBe("56/69");
  });
});

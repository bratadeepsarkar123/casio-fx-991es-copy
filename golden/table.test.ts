import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdExpression, lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("TABLE goldens", () => {
  it("GT-TBL-OFFICIAL-EX1 f(x)=x²+1/2 for -1≦x≦1 step 0.5 TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "7",
      "alpha",
      "rparen",
      "square",
      "add",
      "1",
      "frac",
      "2",
      "equals",
      "del",
      "neg",
      "1",
      "equals",
      "del",
      "1",
      "equals",
      "del",
      "0",
      "dot",
      "5",
      "equals",
    ]);
    expect(s.mode).toBe("TABLE");
    expect(s.table?.phase).toBe("view");
    expect(s.table?.rowIndex).toBe(0);
    expect(s.table?.rows).toHaveLength(5);
    expect(s.table?.rows.map((r) => r.xApprox)).toEqual(["-1", "-0.5", "0", "0.5", "1"]);
    expect(s.table?.rows[0]?.fxDisplay?.replace(/\s/g, "")).toMatch(/3\/2|1\.5/);
    expect(s.table?.rows[2]?.fxDisplay?.replace(/\s/g, "")).toMatch(/1\/2|0\.5/);
    expect(lcdExpression(s)).toMatch(/X=-1/);
    expect(s.variables.X).toBe("1");
    expect(s.ans).toBe("0");
  });

  it("GT-TBL-XSQ-DEFAULTS f(x)=x² defaults Start 1 End 5 Step 1 TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "7", "alpha", "rparen", "square", "equals", "equals", "equals", "equals"]);
    expect(s.table?.phase).toBe("view");
    expect(s.table?.rows.map((r) => ({ x: r.xApprox, fx: r.fxApprox }))).toEqual([
      { x: "1", fx: "1" },
      { x: "2", fx: "4" },
      { x: "3", fx: "9" },
      { x: "4", fx: "16" },
      { x: "5", fx: "25" },
    ]);
    expect(lcdResult(s)).toBe("1");
  });
});

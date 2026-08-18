import { describe, expect, it } from "vitest";
import { D } from "./numeric.ts";
import {
  TABLE_MAX_ROWS,
  planTableXs,
  tableFunctionHasForbiddenCall,
} from "./table.ts";
import type { Atom } from "./types.ts";

describe("TABLE row planning (TARGET-OFFICIAL-DOC)", () => {
  it("Start=1 End=5 Step=1 is inclusive and yields 5 rows", () => {
    const planned = planTableXs(D(1), D(5), D(1));
    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.xs.map((x) => x.toString())).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("End is inclusive for -1 ≦ x ≦ 1 step 0.5", () => {
    const planned = planTableXs(D(-1), D(1), D("0.5"));
    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.xs.map((x) => x.toString())).toEqual(["-1", "-0.5", "0", "0.5", "1"]);
  });

  it("stops at the last x ≤ End when Step does not land on End", () => {
    const planned = planTableXs(D(1), D(2), D("0.3"));
    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.xs.map((x) => x.toString())).toEqual(["1", "1.3", "1.6", "1.9"]);
  });

  it("zero Step is Argument ERROR (INFERRED; step is an increment)", () => {
    const planned = planTableXs(D(1), D(5), D(0));
    expect(planned).toEqual({ ok: false, code: "Argument ERROR" });
  });

  it("negative Step is Argument ERROR (INFERRED; End must be greater than Start)", () => {
    const planned = planTableXs(D(1), D(5), D(-1));
    expect(planned).toEqual({ ok: false, code: "Argument ERROR" });
  });

  it("End ≤ Start is Argument ERROR", () => {
    expect(planTableXs(D(5), D(1), D(1))).toEqual({ ok: false, code: "Argument ERROR" });
    expect(planTableXs(D(1), D(1), D(1))).toEqual({ ok: false, code: "Argument ERROR" });
  });

  it("31 X-values is Insufficient MEM Error; 30 is allowed", () => {
    expect(planTableXs(D(1), D(31), D(1))).toEqual({ ok: false, code: "Insufficient MEM Error" });
    const thirty = planTableXs(D(1), D(30), D(1));
    expect(thirty.ok).toBe(true);
    if (thirty.ok) {
      expect(thirty.xs).toHaveLength(TABLE_MAX_ROWS);
    }
  });

  it("rejects Pol/int/diff/Σ/Rec in f(x)", () => {
    const call = (name: string): Atom[] => [{ t: "call", name, args: [[]], closed: false }];
    expect(tableFunctionHasForbiddenCall(call("Pol"))).toBe(true);
    expect(tableFunctionHasForbiddenCall(call("int"))).toBe(true);
    expect(tableFunctionHasForbiddenCall(call("sin"))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("CMPLX goldens", () => {
  it("GT-CX-OFFICIAL-EX1 (2+6i)÷(2i)=3-i TARGET-OFFICIAL-DOC", () => {
    const s = run([
      "mode",
      "2",
      "lparen",
      "2",
      "add",
      "6",
      "alpha",
      "eng",
      "rparen",
      "div",
      "lparen",
      "2",
      "alpha",
      "eng",
      "rparen",
      "equals",
    ]);
    expect(s.mode).toBe("CMPLX");
    expect(lcdResult(s)).toBe("3-i");
    expect(s.ans).toBe("3");
    expect(s.ansIm).toBe("-1");
    expect(s.result?.naturalKind).toBe("complex");
    expect(s.result?.complex).toEqual({ re: "3", im: "-1" });
  });

  it("GT-CX-OFFICIAL-POLAR 2∠45=√2+√2i TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "2", "2", "shift", "neg", "4", "5", "equals"]);
    expect(s.mode).toBe("CMPLX");
    expect(lcdResult(s)).toBe("√2+√2i");
    expect(s.result?.naturalKind).toBe("complex");
  });

  it("GT-CX-OFFICIAL-INV (1-i)^-1=1/2+1/2i TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "2", "lparen", "1", "sub", "alpha", "eng", "rparen", "xinv", "equals"]);
    expect(lcdResult(s)).toBe("1/2+1/2i");
    expect(s.result?.complex).toEqual({ re: "0.5", im: "0.5" });
  });

  it("GT-CX-OFFICIAL-CONJG Conjg(2+3i)=2-3i TARGET-OFFICIAL-DOC", () => {
    const s = run(["mode", "2", "shift", "2", "2", "2", "add", "3", "alpha", "eng", "equals"]);
    expect(lcdResult(s)).toBe("2-3i");
    expect(s.ans).toBe("2");
    expect(s.ansIm).toBe("-3");
  });
});

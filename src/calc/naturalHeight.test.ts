import { describe, expect, it } from "vitest";
import { byteCount, MAX_BYTES } from "./editor.ts";
import { createInitialState, dispatchKeys, reduce } from "./machine.ts";
import { deserializeState, serializeState } from "./persist.ts";
import {
  LCD_PANEL_FONT_SCALE,
  NATURAL_EXPRESSION_FONT_SCALE,
  NATURAL_EXPRESSION_LINE_HEIGHT,
  naturalFormulaHeightLines,
  naturalFormulaHeightScreens,
  naturalFormulaMaxHeightLines,
  naturalFractionMinimumScale,
} from "./naturalHeight.ts";
import type { Atom } from "./types.ts";

function balancedFraction(depth: number): Atom {
  if (depth === 0) {
    return { t: "num", s: "1" };
  }
  return {
    t: "frac",
    num: [balancedFraction(depth - 1)],
    den: [balancedFraction(depth - 1)],
  };
}

describe("selected E-8 Natural Display formula admission geometry", () => {
  it("accepts a shallow fraction and derives the ceiling from 2 × 31 LCD dots", () => {
    const shallow = [{ t: "frac", num: [{ t: "num", s: "1" }], den: [{ t: "num", s: "2" }] }] satisfies Atom[];
    expect(naturalFormulaHeightLines(shallow)).toBeCloseTo(2 * naturalFractionMinimumScale + 0.125);
    expect(naturalFormulaMaxHeightLines()).toBeCloseTo(
      2 / (LCD_PANEL_FONT_SCALE * NATURAL_EXPRESSION_FONT_SCALE * NATURAL_EXPRESSION_LINE_HEIGHT),
    );
    expect(naturalFormulaHeightScreens(shallow)).toBeLessThan(2);
  });

  it("keeps a nested candidate at the boundary and identifies the first excessive balanced candidate", () => {
    const lastBelowLimit = [balancedFraction(2)];
    const firstAboveLimit = [balancedFraction(3)];
    expect(byteCount(firstAboveLimit)).toBeLessThanOrEqual(MAX_BYTES);
    expect(naturalFormulaHeightLines(lastBelowLimit)).toBeLessThan(naturalFormulaMaxHeightLines());
    expect(naturalFormulaHeightScreens(lastBelowLimit)).toBeLessThan(2);
    expect(naturalFormulaHeightLines(firstAboveLimit)).toBeGreaterThan(naturalFormulaMaxHeightLines());
    expect(naturalFormulaHeightScreens(firstAboveLimit)).toBeGreaterThan(2);
  });
});

describe("AC restoration follows measured LCD continuation", () => {
  it("a short result clears normally", () => {
    const calculated = dispatchKeys(createInitialState(0), ["1", "2", "3", "equals"], 0);
    const afterAc = reduce(calculated, { keyId: "ac", source: "test", nowMs: 1 });
    expect(afterAc.screen.kind).toBe("input");
    expect(afterAc.result).toBeNull();
    expect(afterAc.editor.root).toEqual([]);
  });

  it("an explicitly measured clipped result restores editable, serializable input", () => {
    const calculated = dispatchKeys(createInitialState(0), ["1", "2", "3", "equals"], 0);
    const originalInput = calculated.editor.root;
    const afterAc = reduce(calculated, {
      keyId: "ac",
      source: "test",
      nowMs: 1,
      restoreInputOnAc: true,
    });
    expect(afterAc.screen.kind).toBe("input");
    expect(afterAc.result).toBeNull();
    expect(afterAc.editor.root).toEqual(originalInput);
    expect(deserializeState(JSON.parse(JSON.stringify(serializeState(afterAc))), 2)?.editor.root).toEqual(originalInput);

    const edited = reduce(afterAc, { keyId: "del", source: "test", nowMs: 3 });
    expect(edited.editor.root).not.toEqual(originalInput);
    const cleared = reduce(edited, { keyId: "ac", source: "test", nowMs: 4 });
    expect(cleared.editor.root).toEqual([]);
  });
});

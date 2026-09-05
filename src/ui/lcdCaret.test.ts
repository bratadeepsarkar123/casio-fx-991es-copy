import { describe, expect, it } from "vitest";
import { atomsToLinear, atomsToLinearSplit } from "../calc/editor.ts";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import type { KeyId } from "../calc/keys.ts";
import { lcdExpression, lcdExpressionParts } from "./lcdModel.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("display caret (not lcdExpression)", () => {
  it("lcdExpression stays caret-free after mid-number insert", () => {
    const s = run(["1", "2", "3", "left", "left", "0"]);
    expect(lcdExpression(s)).toBe("1023");
  });

  it("splits around the editor cursor in a number", () => {
    const mid = run(["1", "2", "3", "left", "left"]);
    const parts = lcdExpressionParts(mid);
    expect(parts.showCaret).toBe(true);
    expect(parts.before).toBe("1");
    expect(parts.after).toBe("23");
    expect(`${parts.before}${parts.after}`).toBe(lcdExpression(mid));
  });

  it("shows a caret on an empty input screen", () => {
    const s = createInitialState(0);
    const parts = lcdExpressionParts(s);
    expect(parts.showCaret).toBe(true);
    expect(parts.before).toBe("");
    expect(parts.after).toBe("");
  });

  it("hides the caret on a result screen", () => {
    const s = run(["1", "add", "2", "equals"]);
    const parts = lcdExpressionParts(s);
    expect(parts.showCaret).toBe(false);
    expect(`${parts.before}${parts.after}`).toBe(lcdExpression(s));
  });

  it("atomsToLinearSplit concatenates to atomsToLinear", () => {
    const s = run(["sin", "3", "0", "add", "1", "left", "left"]);
    const split = atomsToLinearSplit(s.editor.root, s.setup.displayFormat, s.editor.cursor);
    expect(`${split.before}${split.after}`).toBe(atomsToLinear(s.editor.root, s.setup.displayFormat));
  });
});

import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import { lcdMenuView, lcdResult, lcdShowsMenu } from "./lcdModel.ts";
import type { KeyId } from "../calc/keys.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("LCD menus occupy the full body (not the clipped result strip)", () => {
  it("MODE lists 1:COMP through 8:VECTOR as two-column items", () => {
    const s = run(["mode"]);
    expect(lcdShowsMenu(s)).toBe(true);
    expect(lcdResult(s)).toContain("1:COMP");
    expect(lcdResult(s)).toContain("3:STAT");
    expect(lcdResult(s)).toContain("8:VECTOR");
    const view = lcdMenuView(s);
    expect(view?.items).toContain("1:COMP");
    expect(view?.items).toContain("2:CMPLX");
    expect(view?.items).toContain("3:STAT");
    expect(view?.items.length).toBe(8);
  });

  it("SETUP page 0 lists MthIO through Norm", () => {
    const s = run(["shift", "mode"]);
    expect(lcdShowsMenu(s)).toBe(true);
    const view = lcdMenuView(s);
    expect(view?.items).toContain("1:MthIO");
    expect(view?.items).toContain("2:LineIO");
    expect(view?.items).toContain("3:Deg");
  });

  it("SETUP 1 shows Result Format? 1:MathO 2:LineO", () => {
    const s = run(["shift", "mode", "1"]);
    expect(s.menu.kind).toBe("mthio");
    expect(lcdResult(s)).toContain("Result Format?");
    expect(lcdResult(s)).toContain("1:MathO");
    expect(lcdResult(s)).toContain("2:LineO");
    const view = lcdMenuView(s);
    expect(view?.prompt).toBe("Result Format?");
    expect(view?.items).toEqual(["1:MathO", "2:LineO"]);
  });
});

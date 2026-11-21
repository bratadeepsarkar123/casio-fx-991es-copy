import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import { lcdIndicators, lcdMenuView, lcdResult, lcdShowsMenu } from "./lcdModel.ts";
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

  it("shows shared page arrows on SETUP and other menus that really have two pages", () => {
    let state = run(["shift", "mode"]);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: true, menuUp: false, replay: false, replayDown: false });
    state = dispatchKeys(state, ["down"], 0);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: false, menuUp: true });

    state = run(["hyp"]);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: true, menuUp: false });
    state = dispatchKeys(state, ["down"], 0);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: false, menuUp: true });

    state = run(["mode", "4", "shift", "3"]);
    expect(state.menu.kind).toBe("base-op");
    expect(lcdIndicators(state)).toMatchObject({ menuDown: true, menuUp: false });
    state = dispatchKeys(state, ["down"], 0);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: false, menuUp: true });

    state = run(["mode", "3"]);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: true, menuUp: false });
    state = dispatchKeys(state, ["down"], 0);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: false, menuUp: true });

    state = run(["mode", "3", "2", "1", "right", "2", "ac", "shift", "1", "3"]);
    expect(state.menu.kind).toBe("stat-sum");
    expect(lcdIndicators(state)).toMatchObject({ menuDown: true, menuUp: false });
    state = dispatchKeys(state, ["down"], 0);
    expect(lcdIndicators(state)).toMatchObject({ menuDown: false, menuUp: true });

    state = run(["mode", "3", "1", "2", "1", "ac", "shift", "1", "3"]);
    expect(state.menu.kind).toBe("stat-sum");
    expect(lcdIndicators(state)).toMatchObject({ menuDown: false, menuUp: false });
  });

  it("selects replay arrows by history position and keeps the E-4 result arrow", () => {
    let state = run(["1", "add", "1", "equals"]);
    expect(lcdIndicators(state)).toMatchObject({ replay: true, replayDown: false });

    state = run(["1", "add", "1", "equals", "2", "add", "2", "equals", "3", "add", "3", "equals"]);
    expect(lcdIndicators(state)).toMatchObject({ replay: true, replayDown: false });
    state = dispatchKeys(state, ["up"], 0);
    expect(state.screen).toEqual({ kind: "replay", historyIndex: 1 });
    expect(lcdIndicators(state)).toMatchObject({ replay: true, replayDown: true });
    state = dispatchKeys(state, ["up"], 0);
    expect(state.screen).toEqual({ kind: "replay", historyIndex: 0 });
    expect(lcdIndicators(state)).toMatchObject({ replay: false, replayDown: true });
    state = dispatchKeys(state, ["down"], 0);
    expect(state.screen).toEqual({ kind: "replay", historyIndex: 1 });
    expect(lcdIndicators(state)).toMatchObject({ replay: true, replayDown: true });
    state = dispatchKeys(state, ["down"], 0);
    expect(state.screen).toEqual({ kind: "replay", historyIndex: 2 });
    expect(lcdIndicators(state)).toMatchObject({ replay: true, replayDown: false });
  });
});

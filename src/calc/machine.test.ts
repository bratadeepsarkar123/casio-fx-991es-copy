import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys, reduce } from "./machine.ts";

describe("state machine latches", () => {
  it("SHIFT toggles and is consumed", () => {
    let s = createInitialState();
    s = dispatchKeys(s, ["shift"]);
    expect(s.shift).toBe(true);
    s = dispatchKeys(s, ["sin"]);
    expect(s.shift).toBe(false);
  });

  it("ON turns power on", () => {
    let s = createInitialState();
    s = dispatchKeys(s, ["shift", "ac"]);
    expect(s.power).toBe("off");
    s = dispatchKeys(s, ["on"]);
    expect(s.power).toBe("on");
  });

  it("equals advances rngSeed so Ran# is not stuck", () => {
    const start = createInitialState(0);
    const s = dispatchKeys(start, ["1", "equals"], 0);
    expect(s.rngSeed).toBe(start.rngSeed + 1);
  });
});

describe("AC overflow recall", () => {
  function calculateThenRecall() {
    const result = dispatchKeys(createInitialState(), ["1", "add", "2", "equals"]);
    return reduce(result, { keyId: "ac", source: "test", restoreInputOnAc: true });
  }

  it("starts a new expression on the first ordinary key after AC", () => {
    const recalled = calculateThenRecall();
    expect(recalled.pendingInputRecall).toBe(true);
    expect(recalled.editor.root).toEqual(recalled.history.at(-1)?.expression);

    const fresh = reduce(recalled, { keyId: "7", source: "test" });
    expect(fresh.pendingInputRecall).toBe(false);
    expect(fresh.editor.root).toEqual([{ t: "num", s: "7" }]);
  });

  it("keeps recalled input when an arrow starts editing it", () => {
    const recalled = calculateThenRecall();
    const moved = reduce(recalled, { keyId: "left", source: "test" });
    expect(moved.pendingInputRecall).toBe(false);
    expect(moved.editor.root).toEqual(recalled.editor.root);

    const edited = reduce(moved, { keyId: "7", source: "test" });
    expect(edited.editor.root).not.toEqual([{ t: "num", s: "7" }]);
    expect(edited.editor.root.length).toBeGreaterThan(1);
  });

  it("keeps pending recall through SHIFT and ALPHA, then starts their mapped entry fresh", () => {
    const shifted = reduce(calculateThenRecall(), { keyId: "shift", source: "test" });
    expect(shifted.pendingInputRecall).toBe(true);
    const constantMenu = reduce(shifted, { keyId: "7", source: "test" });
    expect(constantMenu.editor.root).toEqual([]);
    expect(constantMenu.menu.kind).toBe("const-entry");

    const alpha = reduce(calculateThenRecall(), { keyId: "alpha", source: "test" });
    expect(alpha.pendingInputRecall).toBe(true);
    const variable = reduce(alpha, { keyId: "rparen", source: "test" });
    expect(variable.pendingInputRecall).toBe(false);
    expect(variable.editor.root).toEqual([{ t: "var", name: "X" }]);
  });
});

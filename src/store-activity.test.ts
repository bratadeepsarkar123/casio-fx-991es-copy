import { describe, expect, it } from "vitest";
import { AUTO_OFF_MS, createInitialState } from "./calc/machine.ts";
import { useCalcStore } from "./store.ts";

describe("LCD scroll activity", () => {
  it("refreshes activity when a visible result consumes a horizontal key", () => {
    const state = {
      ...createInitialState(100),
      lastActivityMs: 100,
      screen: { kind: "result" as const },
      result: { approx: "123456789012345", display: "123456789012345", naturalKind: "decimal" as const },
    };
    useCalcStore.setState({ state });

    expect(useCalcStore.getState().recordActivity(250)).toBe(true);
    expect(useCalcStore.getState().state.lastActivityMs).toBe(250);
    expect(useCalcStore.getState().state.screen.kind).toBe("result");
    expect(useCalcStore.getState().state.editor.root).toEqual(state.editor.root);
  });

  it("does not consume a scroll key after idle timeout", () => {
    const state = {
      ...createInitialState(100),
      lastActivityMs: 100,
      screen: { kind: "result" as const },
      result: { approx: "123456789012345", display: "123456789012345", naturalKind: "decimal" as const },
    };
    useCalcStore.setState({ state });

    expect(useCalcStore.getState().recordActivity(100 + AUTO_OFF_MS)).toBe(false);
    expect(useCalcStore.getState().state.power).toBe("off");
  });
});

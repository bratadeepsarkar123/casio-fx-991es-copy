import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { deserializeState, isPersistedCalcState, serializeState } from "./persist.ts";

describe("persist schema v1", () => {
  it("rejects the wrong schema version", () => {
    expect(deserializeState({ schemaVersion: 2, state: createInitialState(0) })).toBeNull();
    expect(deserializeState(null)).toBeNull();
    expect(deserializeState({ schemaVersion: 1 })).toBeNull();
  });

  it("rejects a nested state that only has schemaVersion", () => {
    expect(
      deserializeState({
        schemaVersion: 1,
        state: { schemaVersion: 1 },
      }),
    ).toBeNull();
    expect(isPersistedCalcState({ schemaVersion: 1 })).toBe(false);
    expect(isPersistedCalcState(createInitialState(0))).toBe(true);
  });

  it("rejects a nested state with an unknown mode", () => {
    const raw = {
      schemaVersion: 1,
      state: { ...createInitialState(0), mode: "INEQ" },
    };
    expect(deserializeState(raw)).toBeNull();
  });

  it("round-trips a COMP result including PreAns", () => {
    const s = createInitialState(0);
    const filled = {
      ...s,
      ans: "5",
      preAns: "3",
      memoryM: "8",
      screen: { kind: "result" as const },
      result: { approx: "5", display: "5", naturalKind: "decimal" as const },
    };
    const env = serializeState(filled);
    expect(env.schemaVersion).toBe(1);
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 99);
    expect(back?.ans).toBe("5");
    expect(back?.preAns).toBe("3");
    expect(back?.memoryM).toBe("8");
    expect(back?.power).toBe("on");
    expect(back?.lastActivityMs).toBe(99);
    expect(back?.table).toBeNull();
  });

  it("loads a v1 COMP envelope that omits table", () => {
    const { table: _ignored, ...rest } = createInitialState(0);
    const back = deserializeState({ schemaVersion: 1, savedAt: 0, state: rest }, 1);
    expect(back?.mode).toBe("COMP");
    expect(back?.table).toBeNull();
    expect(back?.ans).toBe("0");
  });

  it("does not persist a generated TABLE grid (INFERRED; NHR vs hardware)", () => {
    const filled = dispatchKeys(createInitialState(0), ["mode", "7", "alpha", "rparen", "square", "equals", "equals", "equals", "equals"], 0);
    expect(filled.table?.phase).toBe("view");
    const env = serializeState(filled);
    expect(env.state.table).toBeNull();
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 0);
    expect(back?.mode).toBe("TABLE");
    expect(back?.table?.phase).toBe("fx");
    expect(back?.table?.rows).toEqual([]);
  });

  it("loads a v1 COMP envelope whose baseN is radix-only", () => {
    const s = createInitialState(0);
    const rest = { ...s, baseN: { radix: 10 as const } };
    const back = deserializeState({ schemaVersion: 1, savedAt: 0, state: rest }, 1);
    expect(back?.mode).toBe("COMP");
    expect(back?.baseN.radix).toBe(10);
    expect(back?.baseN.tokens).toEqual([]);
  });

  it("loads a v1 COMP envelope that omits ansIm/preAnsIm", () => {
    const { ansIm: _ignoredIm, preAnsIm: _ignoredPre, ...rest } = createInitialState(0);
    const back = deserializeState({ schemaVersion: 1, savedAt: 0, state: rest }, 1);
    expect(back?.ansIm).toBe("0");
    expect(back?.preAnsIm).toBe("0");
  });

  it("round-trips CMPLX Ans imag on schema v1", () => {
    const filled = dispatchKeys(createInitialState(0), ["mode", "2", "2", "add", "3", "alpha", "eng", "equals"], 0);
    expect(filled.ansIm).toBe("3");
    const env = serializeState(filled);
    expect(env.schemaVersion).toBe(1);
    expect(env.state.ansIm).toBe("3");
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 0);
    expect(back?.mode).toBe("CMPLX");
    expect(back?.ans).toBe("2");
    expect(back?.ansIm).toBe("3");
  });

  it("does not persist a STAT dataset (INFERRED; NHR vs hardware)", () => {
    const filled = dispatchKeys(
      createInitialState(0),
      ["mode", "3", "1", "2", "equals", "4", "equals", "ac"],
      0,
    );
    expect(filled.stat?.phase).toBe("calc");
    expect(filled.stat?.rows[0]?.x).toBe("2");
    const env = serializeState(filled);
    expect(env.schemaVersion).toBe(1);
    expect(env.state.stat).toBeNull();
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 0);
    expect(back?.mode).toBe("STAT");
    expect(back?.stat?.phase).toBe("type");
    expect(back?.stat?.rows).toEqual([{ x: null, y: null, freq: null }]);
    expect(back?.screen.kind).toBe("input");
  });

  it("loads a v1 COMP envelope that omits stat", () => {
    const { table: _t, stat: _s, ...rest } = createInitialState(0);
    const back = deserializeState({ schemaVersion: 1, savedAt: 0, state: rest }, 1);
    expect(back?.mode).toBe("COMP");
    expect(back?.stat).toBeNull();
  });

  it("does not persist BASE-N tokens (INFERRED; NHR vs hardware)", () => {
    const filled = dispatchKeys(createInitialState(0), ["mode", "4", "log", "1", "1", "add", "1", "equals"], 0);
    expect(filled.baseN.value).toBe("4");
    const env = serializeState(filled);
    expect(env.state.baseN.tokens).toEqual([]);
    expect(env.state.baseN.value).toBeNull();
    expect(env.state.baseN.radix).toBe(2);
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 0);
    expect(back?.mode).toBe("BASE-N");
    expect(back?.baseN.radix).toBe(2);
    expect(back?.baseN.tokens).toEqual([]);
    expect(back?.screen.kind).toBe("input");
  });
});

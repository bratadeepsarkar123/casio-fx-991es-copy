import { describe, expect, it } from "vitest";
import editorTraceFixture from "../../golden/fixtures/GT-EDITOR-SELECTED-E7-E9-E40.json";
import { applyIdleTimeout, AUTO_OFF_MS, createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdExpressionParts, lcdResult } from "../ui/lcdModel.ts";
import type { CalcState } from "./types.ts";
import type { IdleTimerScheduler } from "../idleTimer.ts";
import { armIdleTimeout } from "../idleTimer.ts";
import { isKeyId, type KeyId } from "./keys.ts";
import { useCalcStore } from "../store.ts";
import { deserializeState, PERSIST_KEY } from "./persist.ts";

function run(keys: Parameters<typeof dispatchKeys>[1], state: CalcState = createInitialState(0)): CalcState {
  return dispatchKeys(state, keys, 0);
}

function caret(state: CalcState) {
  const parts = lcdExpressionParts(state);
  return {
    before: parts.before,
    after: parts.after,
    cursor: { ...state.editor.cursor, path: [...state.editor.cursor.path] },
  };
}

describe("selected manual editor traces", () => {
  it("matches the page-cited display/cursor trace fixture after each checkpoint", () => {
    const fixture = editorTraceFixture as {
      evidenceClass: string;
      targetConfirm: string;
      pages: number[];
      traces: Array<{
        id: string;
        keys: string[];
        checkpoints: Array<{ after: number; expected: Record<string, unknown> }>;
      }>;
    };
    expect(fixture.evidenceClass).toBe("OWNER-SELECTED-MANUAL");
    expect(fixture.targetConfirm).toBe("UNCONFIRMED");
    expect(fixture.pages).toEqual([8, 10, 41]);
    for (const trace of fixture.traces) {
      let state = createInitialState(0);
      const checkpoints = new Map(trace.checkpoints.map((checkpoint) => [checkpoint.after, checkpoint.expected]));
      trace.keys.forEach((rawKey, index) => {
        if (!isKeyId(rawKey)) {
          throw new Error(rawKey);
        }
        state = dispatchKeys(state, [rawKey as KeyId], 0);
        const expected = checkpoints.get(index + 1);
        if (!expected) {
          return;
        }
        const parts = lcdExpressionParts(state);
        const actual: Record<string, unknown> = {
          expression: lcdExpression(state),
          before: parts.before,
          after: parts.after,
          cursor: { ...state.editor.cursor, path: [...state.editor.cursor.path] },
          screen: state.screen.kind,
          insertMode: state.editor.insertMode,
          capture: Boolean(state.editor.argumentCapture),
        };
        if (state.screen.kind === "result") {
          actual.result = lcdResult(state);
        }
        expect(actual, trace.id + " after key " + (index + 1)).toMatchObject(expected);
      });
    }
  });

  it("Natural root arrows wrap and nested fraction arrows switch slots before history", () => {
    let state = run(["1", "2", "3"]);
    expect(caret(state)).toMatchObject({ before: "123", after: "" });
    state = run(["left"], state);
    expect(caret(state)).toMatchObject({ before: "12", after: "3" });
    state = run(["right"], state);
    expect(caret(state)).toMatchObject({ before: "123", after: "" });
    state = run(["right"], state);
    expect(caret(state)).toMatchObject({ before: "", after: "123" });
    state = run(["left"], state);
    expect(caret(state)).toMatchObject({ before: "123", after: "" });

    state = run(["1", "equals", "2", "equals", "ac", "1", "frac", "2"]);
    expect(state.history).toHaveLength(2);
    expect(state.editor.cursor.path).toEqual([0, 1]);
    state = run(["up"], state);
    expect(state.screen.kind).toBe("input");
    expect(state.editor.cursor.path).toEqual([0, 0]);
    state = run(["down"], state);
    expect(state.editor.cursor.path).toEqual([0, 1]);
    expect(lcdExpression(state)).toBe("(1/2)");
  });

  it("LineIO Up/Down move to expression start/end; overwrite replaces digits and functions", () => {
    let state = run(["shift", "mode", "2", "1", "2", "3"]);
    state = run(["up"], state);
    const atStart = caret(state);
    state = run(["down"], state);
    const atEnd = caret(state);
    expect(atStart).toMatchObject({ before: "", after: "123", cursor: { path: [], index: 1, offset: 0 } });
    expect(atEnd).toMatchObject({ before: "123", after: "", cursor: { path: [], index: 1, offset: 3 } });

    state = run(["up", "shift", "del", "9"], state);
    expect(state.editor.insertMode).toBe("overwrite");
    expect(caret(state)).toMatchObject({ before: "9", after: "23" });
    state = run(["up", "sin"], state);
    expect(lcdExpression(state)).toBe("sin(23");
    expect(state.editor.root.map((atom) => atom.t)).toEqual(["call", "num"]);
  });

  it("LineIO Home/End move out of a nested fraction to the full expression boundaries", () => {
    let state = run(["shift", "mode", "2", "1", "frac", "2"]);
    expect(state.editor.cursor.path.length).toBeGreaterThan(0);
    state = run(["up"], state);
    expect(state.editor.cursor.path).toEqual([]);
    expect(caret(state).before).toBe("");
    state = run(["down"], state);
    expect(state.editor.cursor.path).toEqual([]);
    expect(caret(state).after).toBe("");
  });

  it("overwrite DEL deletes under the cursor and Natural display resets insert mode", () => {
    let state = run(["shift", "mode", "2", "1", "2", "3", "up", "shift", "del", "del"]);
    expect(lcdExpression(state)).toBe("23");
    expect(state.editor.insertMode).toBe("overwrite");
    state = run(["shift", "mode", "1", "1"], state);
    expect(state.setup.displayFormat).toBe("MthIO-MathO");
    expect(state.editor.insertMode).toBe("insert");
  });

  it("captures the expression to the right and wraps it with the next supported function", () => {
    let state = run(["1", "add", "9", "left"]);
    expect(caret(state).after).toBe("9");
    state = run(["shift", "del"], state);
    expect(lcdExpression(state)).toBe("1+9");
    expect(state.editor.argumentCapture).toBeDefined();
    state = run(["sqrt"], state);
    expect(lcdExpression(state)).toBe("1+√(9)");
    expect(lcdResult(run(["equals"], state))).toBe("4");
  });

  it("replays the selected E-9 1+7/6 capture sequence with four left keys", () => {
    let state = run(["1", "add", "7", "frac", "6", "left", "left", "left", "left"]);
    state = run(["shift", "del", "sqrt"], state);
    expect(state.editor.root[0]).toMatchObject({ t: "num", s: "1" });
    expect(state.editor.root[1]).toMatchObject({ t: "op", op: "+" });
    expect(state.editor.root[2]).toMatchObject({ t: "sqrt", inner: [{ t: "frac", num: [{ t: "num", s: "7" }], den: [{ t: "num", s: "6" }] }] });
    expect(lcdExpression(state)).toBe("1+√((7/6))");
  });


  it.each([
    { label: "fraction", keys: ["frac"], atom: "frac" },
    { label: "log base", keys: ["logab"], atom: "logb" },
    { label: "power", keys: ["power"], atom: "pow" },
    { label: "nth root", keys: ["shift", "power"], atom: "nthrt" },
    { label: "10 power", keys: ["shift", "log"], atom: "call" },
    { label: "e power", keys: ["shift", "ln"], atom: "call" },
    { label: "square root", keys: ["sqrt"], atom: "sqrt" },
    { label: "cube root", keys: ["shift", "sqrt"], atom: "cbrt" },
    { label: "integral", keys: ["integral"], atom: "call" },
    { label: "derivative", keys: ["shift", "integral"], atom: "call" },
    { label: "summation", keys: ["shift", "logab"], atom: "call" },
    { label: "absolute value", keys: ["shift", "hyp"], atom: "abs" },
  ])("captures a right-hand value for the selected E-9 $label wrapper", ({ keys, atom }) => {
    let state = run(["1", "add", "9", "left", "shift", "del"]);
    state = run(keys as KeyId[], state);
    expect(state.editor.root[2]?.t).toBe(atom);
    expect(state.editor.argumentCapture).toBeUndefined();
  });

  it("inserting an operator in the middle of a number preserves the right side", () => {
    const state = run(["1", "2", "3", "left", "add"]);
    expect(caret(state)).toMatchObject({ before: "12+", after: "3" });
    expect(lcdExpression(state)).toBe("12+3");
  });

  it("DEL immediately after an inserted plus removes the plus in one press", () => {
    const state = run(["1", "2", "3", "left", "add", "del"]);
    expect(lcdExpression(state)).toBe("123");
    expect(caret(state)).toMatchObject({ before: "12", after: "3" });
  });

  it("DEL at `1+|23` removes the plus in one press", () => {
    const state = run(["1", "add", "2", "3", "left", "left", "del"]);
    expect(lcdExpression(state)).toBe("123");
    expect(caret(state)).toMatchObject({ before: "1", after: "23" });
  });

  it("replays the selected E-40 divide-by-zero correction sequence to 14/5", () => {
    let state = run(["1", "4", "div", "0", "mul", "2", "equals"]);
    const error = { display: lcdExpression(state), errorIndex: state.screen.kind === "error" ? state.screen.errorIndex : null };
    state = run(["right"], state);
    const afterRight = caret(state);
    state = run(["left", "1", "equals"], state);
    expect(error.errorIndex).not.toBeNull();
    expect(afterRight.cursor.path).toEqual([]);
    expect(state.screen.kind).toBe("result");
    expect(lcdResult(state)).toBe("14/5");
  });
});

describe("idle shutdown timer", () => {
  it("powers off without a key after ten idle minutes, including while a menu is open", () => {
    let now = 1000;
    let state: CalcState = { ...createInitialState(now), menu: { kind: "setup", page: 0 } };
    const task: { current: { due: number; callback: () => void } | null } = { current: null };
    const scheduler: IdleTimerScheduler = {
      setTimeout: (callback, delayMs) => {
        task.current = { due: now + delayMs, callback };
        return 1 as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => {
        task.current = null;
      },
    };
    const cancel = armIdleTimeout(
      () => state,
      (at) => { state = applyIdleTimeout(state, at); },
      () => now,
      scheduler,
    );
    expect(task.current?.due).toBe(now + AUTO_OFF_MS);
    now += AUTO_OFF_MS - 1;
    expect(state.power).toBe("on");
    now += 1;
    task.current?.callback();
    expect(state.power).toBe("off");
    expect(state.screen.kind).toBe("off");
    cancel();
  });

  it("does not arm another timer for an already powered-off state", () => {
    const state = { ...createInitialState(0), power: "off" as const, screen: { kind: "off" as const } };
    let scheduled = false;
    const scheduler: IdleTimerScheduler = {
      setTimeout: () => {
        scheduled = true;
        return 1 as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => undefined,
    };
    const cancel = armIdleTimeout(() => state, () => undefined, () => AUTO_OFF_MS, scheduler);
    expect(scheduled).toBe(false);
    cancel();
  });

  it("persists timer shutdown and wakes with fresh idle time on hydration", () => {
    const originalState = useCalcStore.getState().state;
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    try {
      useCalcStore.setState({ state: createInitialState(0) });
      useCalcStore.getState().tick(AUTO_OFF_MS);
      expect(useCalcStore.getState().state.power).toBe("off");
      const saved = JSON.parse(values.get(PERSIST_KEY) ?? "null") as unknown;
      const hydrated = deserializeState(saved, AUTO_OFF_MS + 5);
      expect(hydrated?.power).toBe("on");
      expect(hydrated?.lastActivityMs).toBe(AUTO_OFF_MS + 5);
    } finally {
      useCalcStore.setState({ state: originalState });
      if (previousStorage) {
        Object.defineProperty(globalThis, "localStorage", previousStorage);
      } else {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { byteCount } from "./editor.ts";
import { createInitialState, dispatchKeys } from "./machine.ts";
import type { KeyId } from "./keys.ts";
import { lcdInputByteWarning } from "../ui/lcdModel.ts";
import { lcdIndicators, lcdResult } from "../ui/lcdModel.ts";
import { Lcd } from "../ui/Lcd.tsx";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

describe("selected manual E-3 through E-16 editor traces", () => {
  it("E-7 admits at most 99 ordinary one-byte digits and changes the warning caret at 89", () => {
    const eightyNine = run(Array.from({ length: 89 }, () => "1") as KeyId[]);
    expect(byteCount(eightyNine.editor.root)).toBe(89);
    expect(lcdInputByteWarning(eightyNine)).toBe(true);
    const warningMarkup = renderToStaticMarkup(createElement(Lcd, { state: eightyNine, style: { width: 320, height: 120 } }));
    expect(warningMarkup).toContain("is-byte-warning");

    const ninetyNine = dispatchKeys(eightyNine, Array.from({ length: 10 }, () => "1") as KeyId[], 0);
    expect(byteCount(ninetyNine.editor.root)).toBe(99);
    expect(lcdInputByteWarning(ninetyNine)).toBe(true);
    const blocked = dispatchKeys(ninetyNine, ["1"], 0);
    expect(byteCount(blocked.editor.root)).toBe(99);
    expect(blocked.editor.root).toEqual(ninetyNine.editor.root);

    let line = run(["shift", "mode", "2", "1"]);
    line = dispatchKeys(line, Array.from({ length: 99 }, () => "1") as KeyId[], 0);
    line = dispatchKeys(line, ["shift", "del", "left", "2"], 0);
    expect(byteCount(line.editor.root)).toBe(99);
    line = dispatchKeys(line, ["shift", "del", "del", "1"], 0);
    expect(byteCount(line.editor.root)).toBe(99);

    let table = run(["mode", "7"]);
    table = dispatchKeys(table, Array.from({ length: 89 }, () => "1") as KeyId[], 0);
    expect(byteCount(table.editor.root)).toBe(89);
    table = dispatchKeys(table, Array.from({ length: 10 }, () => "1") as KeyId[], 0);
    expect(byteCount(table.editor.root)).toBe(99);
    table = dispatchKeys(table, ["1"], 0);
    expect(byteCount(table.editor.root)).toBe(99);
    table = dispatchKeys(table, ["del"], 0);
    expect(byteCount(table.editor.root)).toBe(98);
  });

  it("E-9 captures the complete right-hand linear run, digit splits, and stops at functions", () => {
    let state = run(["1", "add", "2", "mul", "3", "left", "left", "left", "left", "shift", "del"]);
    expect(state.editor.argumentCapture).toMatchObject({ start: 2, end: 5 });
    state = dispatchKeys(state, ["sqrt"], 0);
    expect(state.editor.root[2]).toMatchObject({
      t: "sqrt",
      inner: [{ t: "num", s: "2" }, { t: "op", op: "×" }, { t: "num", s: "3" }],
    });

    state = run(["1", "2", "3", "left", "left", "shift", "del"]);
    expect(state.editor.argumentCapture).toMatchObject({ start: 0, end: 1, offset: 1 });
    state = dispatchKeys(state, ["sqrt"], 0);
    expect(state.editor.root[0]).toMatchObject({ t: "num", s: "1" });
    expect(state.editor.root[1]).toMatchObject({ t: "sqrt", inner: [{ t: "num", s: "23" }] });

    state = run(["1", "add", "2", "mul", "sin", "3", "left", "left", "left", "left", "left", "shift", "del"]);
    expect(state.editor.argumentCapture).toMatchObject({ start: 2, end: 3 });
    state = dispatchKeys(state, ["sqrt"], 0);
    expect(state.editor.root[2]).toMatchObject({ t: "sqrt", inner: [{ t: "num", s: "2" }] });
  });

  it("E-5/E-16 exposes the six-item HYP menu, paging arrows, AC close, and numbered examples", () => {
    let state = run(["hyp"]);
    expect(state.menu).toEqual({ kind: "hyp", page: 0 });
    expect(lcdResult(state)).toBe("1:sinh 2:cosh 3:tanh");
    expect(lcdIndicators(state).menuDown).toBe(true);
    expect(lcdIndicators(state).menuUp).toBe(false);
    state = dispatchKeys(state, ["down"], 0);
    expect(state.menu).toEqual({ kind: "hyp", page: 1 });
    expect(lcdResult(state)).toBe("4:sinh^-1 5:cosh^-1 6:tanh^-1");
    expect(lcdIndicators(state).menuUp).toBe(true);
    expect(lcdIndicators(state).menuDown).toBe(false);
    const sinh = dispatchKeys(run(["hyp"]), ["1", "1", "rparen", "equals"], 0);
    expect(lcdResult(sinh)).toBe("1.175201194");
    const acosh = dispatchKeys(run(["hyp"]), ["5", "1", "rparen", "equals"], 0);
    expect(lcdResult(acosh)).toBe("0");
    expect(dispatchKeys(run(["hyp"]), ["ac"], 0).menu).toEqual({ kind: "none" });
  });

  it("E-12 trims replay by approximate bytes while retaining variable-length newest entries", () => {
    let state = run([]);
    for (let i = 0; i < 10; i += 1) {
      state = dispatchKeys(state, [...Array.from({ length: 30 }, () => "1"), "equals"] as KeyId[], 0);
    }
    const used = state.history.reduce((total, entry) => total + byteCount(entry.expression) + entry.result.display.length, 0);
    expect(used).toBeLessThanOrEqual(200);
    expect(state.history.length).toBeGreaterThan(0);
    expect(byteCount(state.history.at(-1)?.expression ?? [])).toBeGreaterThan(0);
  });

  it("E-14 blocks consecutive postfix operators but permits Natural nested exponent entry after LEFT", () => {
    const consecutive = run(["2", "square", "square"]);
    expect(consecutive.editor.root).toEqual([{ t: "post", op: "sq", inner: [{ t: "num", s: "2" }] }]);
    const nested = run(["2", "square", "left", "square"]);
    expect(nested.editor.root).toEqual([{
      t: "post",
      op: "sq",
      inner: [{ t: "post", op: "sq", inner: [{ t: "num", s: "2" }] }],
    }]);
  });

  it("E-16 preserves the printed explicit-parenthesis (5²)³ example", () => {
    const state = run(["lparen", "5", "square", "rparen", "shift", "square", "equals"]);
    expect(state.screen.kind).toBe("result");
    expect(state.result?.display).toBe("15625");
  });
});

import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";
import type { CalcState } from "./types.ts";

function run(keys: KeyId[], start?: CalcState): CalcState {
  return dispatchKeys(start ?? createInitialState(0), keys, 0);
}

function numKeys(n: string): KeyId[] {
  const keys: KeyId[] = [];
  let rest = n;
  if (rest.startsWith("-")) {
    keys.push("neg");
    rest = rest.slice(1);
  }
  for (const ch of rest) {
    if (ch === ".") {
      keys.push("dot");
    } else {
      keys.push(ch as KeyId);
    }
  }
  return keys;
}

function enterValues(values: string[]): KeyId[] {
  return values.flatMap((v) => [...numKeys(v), "equals"]);
}

describe("STAT reducer / dataset domain", () => {
  it("MODE 3 opens the STAT type menu without changing Ans or variables", () => {
    const prior = run(["9", "equals", "shift", "rcl", "neg"]);
    const s = run(["mode", "3"], prior);
    expect(s.mode).toBe("STAT");
    expect(s.stat?.phase).toBe("type");
    expect(s.stat?.type).toBeNull();
    expect(lcdResult(s)).toContain("1-VAR");
    expect(s.ans).toMatch(/^9/);
    expect(s.variables.A).toMatch(/^9/);
    expect(s.table).toBeNull();
  });

  it("1-VAR editor stores X in StatSession rows, not COMP Atom[]", () => {
    const s = run(["mode", "3", "1", ...enterValues(["2", "4", "6"])]);
    expect(s.stat?.phase).toBe("editor");
    expect(s.stat?.type).toBe("1-VAR");
    expect(s.editor.root).toEqual([]);
    expect(s.stat?.rows.map((r) => r.x)).toEqual(["2", "4", "6", null]);
    expect(lcdExpression(s)).toBe("X4=");
  });

  it("AC in the editor goes to the calc screen and keeps the dataset", () => {
    let s = run(["mode", "3", "1", ...enterValues(["2", "4", "6"]), "ac"]);
    expect(s.stat?.phase).toBe("calc");
    expect(s.stat?.rows.map((r) => r.x)).toEqual(["2", "4", "6", null]);
    expect(s.ans).toBe("0");
    s = run(["shift", "1", "4", "2", "equals"], s);
    expect(lcdResult(s)).toBe("4");
    expect(s.ans).toBe("4");
  });

  it("FREQ ON 1-VAR Ex2 mean and σx via keys TARGET-OFFICIAL-DOC", () => {
    let s = run(["shift", "mode", "down", "4", "1"]);
    expect(s.setup.statFreq).toBe(true);
    s = run(["mode", "3", "1", ...enterValues(["1", "2", "3", "4", "5"]), "right", "up", "up", "up", "up", "up", ...enterValues(["1", "2", "3", "2"]), "ac"], s);
    expect(s.stat?.phase).toBe("calc");
    expect(s.stat?.rows.slice(0, 5).map((r) => ({ x: r.x, f: r.freq }))).toEqual([
      { x: "1", f: "1" },
      { x: "2", f: "2" },
      { x: "3", f: "3" },
      { x: "4", f: "2" },
      { x: "5", f: null },
    ]);
    s = run(["shift", "1", "4", "2", "equals"], s);
    expect(lcdResult(s)).toBe("3");
    s = run(["shift", "1", "4", "3", "equals"], s);
    expect(lcdResult(s)).toBe("1.154700538");
  });

  it("DEL deletes the current editor line (TARGET-OFFICIAL-DOC)", () => {
    let s = run(["mode", "3", "1", ...enterValues(["1", "2", "3"])]);
    s = run(["up", "del"], s);
    expect(s.stat?.rows.map((r) => r.x)).toEqual(["1", "2", null]);
  });

  it("STAT Edit Ins / Del-A", () => {
    let s = run(["mode", "3", "1", ...enterValues(["1", "2"]), "up", "shift", "1", "3", "1"]);
    expect(s.stat?.rows.map((r) => r.x)).toEqual(["1", null, "2", null]);
    s = run(["shift", "1", "3", "2"], s);
    expect(s.stat?.phase).toBe("editor");
    expect(s.stat?.rows).toEqual([{ x: null, y: null, freq: null }]);
  });

  it("leaving STAT wipes the dataset; COMP/TABLE/BASE-N/CMPLX stay independent", () => {
    let s = run(["mode", "3", "1", ...enterValues(["8", "9"]), "mode", "1"]);
    expect(s.mode).toBe("COMP");
    expect(s.stat).toBeNull();
    s = run(["2", "add", "2", "equals"], s);
    expect(lcdResult(s)).toBe("4");
    s = run(["mode", "7"], s);
    expect(s.mode).toBe("TABLE");
    expect(s.stat).toBeNull();
    s = run(["mode", "4"], s);
    expect(s.mode).toBe("BASE-N");
    expect(s.stat).toBeNull();
    s = run(["mode", "2"], s);
    expect(s.mode).toBe("CMPLX");
    expect(s.stat).toBeNull();
    s = run(["mode", "3"], s);
    expect(s.stat?.rows).toEqual([{ x: null, y: null, freq: null }]);
    expect(s.stat?.phase).toBe("type");
  });

  it("changing Stat Format while in STAT deletes editor data (TARGET-OFFICIAL-DOC)", () => {
    let s = run(["mode", "3", "1", ...enterValues(["1", "2"])]);
    expect(filledXs(s)).toEqual(["1", "2"]);
    s = run(["shift", "mode", "down", "4", "1"], s);
    expect(s.setup.statFreq).toBe(true);
    expect(s.stat?.rows).toEqual([{ x: null, y: null, freq: null }]);
  });

  it("STAT editor does not fall through into COMP (sin is swallowed)", () => {
    const s = run(["mode", "3", "1", "sin", "3", "0"]);
    expect(s.stat?.phase).toBe("editor");
    expect(s.editor.root).toEqual([]);
    expect(s.stat?.input).toBe("30");
    expect(lcdResult(s)).toBe("30");
  });

  it("paired A+BX keeps data when switching to ln X; 1-VAR switch wipes", () => {
    let s = run(["mode", "3", "2", ...enterValues(["20", "110"]), "right", "up", "up", ...enterValues(["3150", "7310"]), "ac"]);
    expect(s.stat?.type).toBe("A+BX");
    s = run(["shift", "1", "1", "4"], s);
    expect(s.stat?.type).toBe("ln X");
    expect(s.stat?.phase).toBe("calc");
    expect(s.stat?.rows[0]?.x).toBe("20");
    s = run(["shift", "1", "1", "1"], s);
    expect(s.stat?.type).toBe("1-VAR");
    expect(s.stat?.rows).toEqual([{ x: null, y: null, freq: null }]);
  });

  it("STAT calc Math ERROR on empty mean does not corrupt COMP memories", () => {
    let s = run(["5", "equals", "shift", "rcl", "neg", "mode", "3", "1", "ac", "shift", "1", "4", "2", "equals"]);
    expect(s.screen.kind).toBe("error");
    expect(s.screen.kind === "error" ? s.screen.code : "").toBe("Math ERROR");
    expect(s.variables.A).toMatch(/^5/);
    expect(s.ans).toMatch(/^5/);
  });
});

function filledXs(s: CalcState): Array<string | null> {
  return (s.stat?.rows ?? []).map((r) => r.x).filter((x) => x != null);
}

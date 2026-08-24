import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys, reduce } from "./machine.ts";
import type { Atom, CalcState } from "./types.ts";

function withInjectedCall(name: string, start?: CalcState): CalcState {
  const s = start ?? createInitialState(0);
  const call: Atom = { t: "call", name, args: [[]], closed: true };
  return {
    ...s,
    editor: { ...s.editor, root: [call], cursor: { path: [], index: 1, offset: null } },
    screen: { kind: "input" },
  };
}

describe("COMP call.name domain-token gate", () => {
  it.each(["mat-A", "mat-B", "mat-C", "mat-Ans", "mat-det", "mat-trn", "vct-A", "vct-B", "vct-C", "vct-Ans", "vct-dot", "stat-meanX", "stat-n", "stat-P"])(
    "injected %s is Syntax ERROR in COMP (not a MATRIX/VECTOR/STAT evaluation)",
    (name) => {
      const s = reduce(withInjectedCall(name), { keyId: "equals", source: "test", nowMs: 0 });
      expect(s.mode).toBe("COMP");
      expect(s.screen.kind).toBe("error");
      if (s.screen.kind === "error") {
        expect(s.screen.code).toBe("Syntax ERROR");
      }
    },
  );

  it("MODE from MATRIX to COMP wipes the editor so mat-* cannot leak by key sequence", () => {
    let s = dispatchKeys(createInitialState(0), ["mode", "6", "shift", "4", "3"], 0);
    expect(s.mode).toBe("MATRIX");
    expect(s.editor.root.some((a) => a.t === "call" && a.name.startsWith("mat-"))).toBe(true);
    s = dispatchKeys(s, ["mode", "1"], 0);
    expect(s.mode).toBe("COMP");
    expect(s.editor.root).toEqual([]);
    expect(s.matrix).toBeNull();
  });

  it("MODE from VECTOR to COMP wipes the editor so vct-* cannot leak by key sequence", () => {
    let s = dispatchKeys(createInitialState(0), ["mode", "8", "shift", "5", "3"], 0);
    expect(s.mode).toBe("VECTOR");
    expect(s.editor.root.some((a) => a.t === "call" && a.name.startsWith("vct-"))).toBe(true);
    s = dispatchKeys(s, ["mode", "1"], 0);
    expect(s.mode).toBe("COMP");
    expect(s.editor.root).toEqual([]);
    expect(s.vector).toBeNull();
  });

  it("unimplemented COMP tokens Pol / int / diff / Σ remain Syntax ERROR", () => {
    for (const name of ["Pol", "Rec", "int", "diff", "Σ"]) {
      const s = reduce(withInjectedCall(name), { keyId: "equals", source: "test", nowMs: 0 });
      expect(s.screen.kind).toBe("error");
      if (s.screen.kind === "error") {
        expect(s.screen.code).toBe("Syntax ERROR");
      }
    }
  });
});

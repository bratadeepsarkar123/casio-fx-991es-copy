import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { atomsToLinear } from "./editor.ts";
import { lcdExpression, lcdResult } from "../ui/lcdModel.ts";
import type { KeyId } from "./keys.ts";
import { SCIENTIFIC_CONSTANTS, UNIT_CONVERSIONS } from "./scientificData.ts";
import { D } from "./numeric.ts";
import { matrixToDecGrid } from "./matrixNumeric.ts";
import { vectorToDecCells } from "./vectorNumeric.ts";
import { lcdGridModel } from "../ui/gridModel.ts";

function run(keys: KeyId[]) {
  return dispatchKeys(createInitialState(0), keys, 0);
}

function enterConst(code: number, prefix: KeyId[] = []) {
  const digits = String(code).padStart(2, "0");
  return run([...prefix, "shift", "7", digits[0] as KeyId, digits[1] as KeyId, "equals"]);
}

function enterConv(code: number, prefix: KeyId[] = []) {
  const digits = String(code).padStart(2, "0");
  return run([...prefix, "shift", "8", digits[0] as KeyId, digits[1] as KeyId, "equals"]);
}

describe("selected manual E-36/E-37 CONST command", () => {
  it("selects every documented constant through SHIFT 7 and evaluates its catalog value", () => {
    expect(SCIENTIFIC_CONSTANTS).toHaveLength(40);
    for (const entry of SCIENTIFIC_CONSTANTS) {
      const state = enterConst(entry.code);
      expect(state.screen.kind, `CONST ${entry.code} screen`).toBe("result");
      const expected = D(entry.value).toSignificantDigits(10);
      expect(D(state.result?.approx ?? "NaN").eq(expected), `CONST ${entry.code} value (${entry.value})`).toBe(true);
      expect(lcdExpression(state), `CONST ${entry.code} symbol`).toBe(entry.symbol);
    }
  });

  it("evaluates C0 in COMP, CMPLX and the actual STAT, EQN, MATRIX, TABLE and VECTOR consumers", () => {
    expect(enterConst(28).result?.approx).toBe("299792458");
    expect(enterConst(28, ["mode", "2"]).result?.approx).toBe("299792458");

    const stat = run(["mode", "3", "1", "shift", "7", "2", "8", "equals"]);
    expect(stat.stat?.rows[0]?.x).toBe("299792458");
    expect(stat.stat?.rowIndex).toBe(1);

    const eqn = run(["mode", "5", "1", "shift", "7", "2", "8", "equals"]);
    expect(eqn.eqn?.coeffs[0]?.atoms).toEqual([{ t: "call", name: "const-28", args: [], closed: true }]);
    expect(atomsToLinear(eqn.eqn?.coeffs[0]?.atoms ?? [], "LineIO")).toBe("C0");

    const matrix = run(["mode", "6", "1", "1", "shift", "7", "2", "8", "equals"]);
    expect(matrix.matrix?.registers.A?.cells[0]?.[0]).toMatchObject({ k: "rat", r: { n: 299792458n, d: 1n } });

    const vector = run(["mode", "8", "1", "2", "shift", "7", "2", "8", "equals"]);
    expect(vector.vector?.registers.A?.cells[0]).toMatchObject({ k: "rat", r: { n: 299792458n, d: 1n } });

    const table = run(["mode", "7", "shift", "7", "2", "8", "equals"]);
    expect(table.table?.phase).toBe("start");
    expect(table.table?.fx).toEqual([{ t: "call", name: "const-28", args: [], closed: true }]);
    expect(lcdResult(table)).toBe("Start?");

    const tableValues = run(["mode", "7", "shift", "7", "2", "8", "equals", "equals", "equals", "equals"]);
    expect(tableValues.table?.rows.map((row) => row.fxApprox)).toEqual(Array(5).fill("299792458"));
  });

  it("does not expose CONST in BASE-N", () => {
    const state = run(["mode", "4", "shift", "7"]);
    expect(state.menu.kind).toBe("none");
  });

  it("reproduces the E-36 vacuum-light-speed identity from ε0 and μ0", () => {
    const state = run([
      "1", "div", "sqrt", "lparen",
      "shift", "7", "3", "2", "mul", "shift", "7", "3", "3", "rparen",
      "right", "equals",
    ]);
    expect(state.result?.approx).toBe("299792458");
  });
});

describe("selected manual E-37/E-38 CONV command", () => {
  it("uses postfix precedence and leaves unconsumed siblings intact", () => {
    const addition = enterConv(2, ["2", "add", "5"]);
    expect(addition.result?.approx).toBe("3.968503937");
    expect(lcdExpression(addition)).toBe("2+5cm►in");

    const multiply = enterConv(38, ["2", "mul", "5"]);
    expect(multiply.result?.approx).toBe("82");
    expect(lcdExpression(multiply)).toBe("2×5°C►°F");

    const signed = enterConv(38, ["neg", "3", "1"]);
    expect(signed.result?.approx).toBe("-23.8");
    expect(lcdExpression(signed)).toBe("(-)31°C►°F");

    const parenthesized = enterConv(2, ["lparen", "2", "add", "5", "rparen"]);
    expect(parenthesized.result?.approx).toBe("2.755905512");
    expect(lcdExpression(parenthesized)).toBe("(2+5)cm►in");

    const nested = enterConv(2, ["2", "add", "sqrt", "5"]);
    expect(nested.result?.approx).toBe("3.403033833");
    expect(lcdExpression(nested)).toBe("2+√(5cm►in)");
  });

  it("matches printed E-37 examples and evaluates every conversion in both directions", () => {
    expect(enterConv(2, ["5"]).result?.approx).toBe("1.968503937");
    expect(enterConv(22, ["1", "0", "0"]).result?.approx).toBe("3.527396584");
    expect(enterConv(38, ["neg", "3", "1"]).result?.approx).toBe("-23.8");

    expect(UNIT_CONVERSIONS).toHaveLength(40);
    const factors = [
      "2.54", "0.3048", "0.9144", "1.609344", "1852", "4046.873", "3.785412", "4.54609",
      "3.085678e13", "0.2777778", "28.34952", "0.4535924", "101325", "133.3224", "0.7456999",
      "98066.5", "9.80665", "6.894757",
    ];
    let pairIndex = 0;
    for (const entry of UNIT_CONVERSIONS) {
      expect(entry.source.length, `CONV ${entry.code} citation`).toBeGreaterThan(10);
      if (entry.code <= 36 && entry.code % 2 === 1) {
        expect(D(entry.pairFactor ?? "NaN").eq(factors[pairIndex]!), `CONV ${entry.code} SP 811 factor`).toBe(true);
        pairIndex += 1;
      }
      const state = enterConv(entry.code, ["2"]);
      expect(state.screen.kind, `CONV ${entry.code} screen`).toBe("result");
      let expected: ReturnType<typeof D>;
      if (entry.code === 37) {
        expected = D(2).minus(32).times(5).div(9);
      } else if (entry.code === 38) {
        expected = D(2).times(9).div(5).plus(32);
      } else if (entry.code === 39) {
        expected = D(2).div("4.18580");
      } else if (entry.code === 40) {
        expected = D(2).times("4.18580");
      } else {
        const factor = entry.code % 2 === 1
          ? entry.pairFactor
          : UNIT_CONVERSIONS[entry.code - 2]?.pairFactor;
        expected = entry.code % 2 === 1 ? D(2).times(factor ?? "NaN") : D(2).div(factor ?? "NaN");
      }
      expect(D(state.result?.approx ?? "NaN").eq(expected.toSignificantDigits(10)), `CONV ${entry.code} result`).toBe(true);
      expect(lcdExpression(state), `CONV ${entry.code} expression`).toContain(entry.label);
    }
    expect(pairIndex).toBe(18);
  });

  it("converts entered STAT cell expressions and reaches the committed selected data cell", () => {
    const state = run(["mode", "3", "1", "5", "shift", "8", "0", "2", "equals"]);
    expect(state.stat?.rows[0]?.x).toBe("1.96850393700787");
    expect(lcdGridModel(state)?.rows[0]?.cells[0]?.value).toBe("1.968503937");
    expect(state.stat?.rowIndex).toBe(1);
  });

  it("commits CONV expressions through the other documented mode editors", () => {
    expect(enterConv(2, ["5"]).result?.approx).toBe("1.968503937");
    expect(enterConv(2, ["mode", "2", "5"]).result?.approx).toBe("1.968503937");

    const eqn = run(["mode", "5", "1", "5", "shift", "8", "0", "2", "equals"]);
    expect(atomsToLinear(eqn.eqn?.coeffs[0]?.atoms ?? [], "LineIO")).toBe("5cm►in");

    const matrix = run(["mode", "6", "1", "1", "5", "shift", "8", "0", "2", "equals"]);
    expect(Number(matrixToDecGrid(matrix.matrix!.registers.A!)[0]?.[0])).toBeCloseTo(1.968503937, 8);

    const vector = run(["mode", "8", "1", "2", "5", "shift", "8", "0", "2", "equals"]);
    expect(Number(vectorToDecCells(vector.vector!.registers.A!)[0])).toBeCloseTo(1.968503937, 8);
  });

  it("excludes CONV in BASE-N and TABLE", () => {
    expect(run(["mode", "4", "shift", "8"]).menu.kind).toBe("none");
    expect(run(["mode", "7", "shift", "8"]).menu.kind).toBe("none");
  });

  it("reports an invalid two-digit command instead of inserting a partial call", () => {
    for (const command of ["7", "8"] as const) {
      const state = run(["shift", command, "4", "1"]);
      expect(state.screen).toMatchObject({ kind: "error", code: "Argument ERROR" });
      expect(state.editor.root).toEqual([]);
    }
  });
});

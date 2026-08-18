import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../src/calc/machine.ts";
import { lcdResult } from "../src/ui/lcdModel.ts";
import type { KeyId } from "../src/calc/keys.ts";
import { isKeyId } from "../src/calc/keys.ts";

interface Fixture {
  id: string;
  sourceEvidenceId: string;
  evidenceClass?: string;
  targetConfirm?: string;
  page: number;
  keys: string[];
  expectedDisplay: string;
}

describe("independent golden fixtures", () => {
  it("GT-P22-EX1 JSON fixture matches engine", () => {
    const raw = readFileSync(new URL("./fixtures/GT-P22-EX1.json", import.meta.url), "utf8");
    const fx = JSON.parse(raw) as Fixture;
    expect(fx.evidenceClass).toBe("CROSS-MODEL-SOURCE");
    expect(fx.targetConfirm).toBe("CONFIRMED");
    const keys = fx.keys.map((k) => {
      if (!isKeyId(k)) {
        throw new Error(k);
      }
      return k;
    }) as KeyId[];
    const s = dispatchKeys(createInitialState(0), keys, 0);
    expect(lcdResult(s).replace(/\s/g, "")).toContain(fx.expectedDisplay.replace(/\s/g, ""));
  });

  it("GT-TBL-XSQ-DEFAULTS JSON fixture matches TABLE state TARGET-OFFICIAL-DOC", () => {
    const raw = readFileSync(new URL("./fixtures/GT-TBL-XSQ-DEFAULTS.json", import.meta.url), "utf8");
    const fx = JSON.parse(raw) as {
      evidenceClass: string;
      targetConfirm: string;
      keys: string[];
      expected: { mode: string; phase: string; rowIndex: number; xs: string[]; fx: string[] };
    };
    expect(fx.evidenceClass).toBe("TARGET-OFFICIAL-DOC");
    expect(fx.targetConfirm).toBe("CONFIRMED");
    const keys = fx.keys.map((k) => {
      if (!isKeyId(k)) {
        throw new Error(k);
      }
      return k;
    }) as KeyId[];
    const s = dispatchKeys(createInitialState(0), keys, 0);
    expect(s.mode).toBe(fx.expected.mode);
    expect(s.table?.phase).toBe(fx.expected.phase);
    expect(s.table?.rowIndex).toBe(fx.expected.rowIndex);
    expect(s.table?.rows.map((r) => r.xApprox)).toEqual(fx.expected.xs);
    expect(s.table?.rows.map((r) => r.fxApprox)).toEqual(fx.expected.fx);
  });

  it.each(["GT-CX-OFFICIAL-EX1", "GT-CX-OFFICIAL-POLAR", "GT-CX-OFFICIAL-INV", "GT-CX-OFFICIAL-CONJG"])(
    "%s JSON fixture matches CMPLX state TARGET-OFFICIAL-DOC",
    (id) => {
      const raw = readFileSync(new URL(`./fixtures/${id}.json`, import.meta.url), "utf8");
      const fx = JSON.parse(raw) as {
        id: string;
        evidenceClass: string;
        targetConfirm: string;
        keys: string[];
        expected: {
          mode: string;
          screen: string;
          display: string;
          ans?: string;
          ansIm?: string;
          naturalKind: string;
          complex?: { re: string; im: string };
        };
      };
      expect(fx.id).toBe(id);
      expect(fx.evidenceClass).toBe("TARGET-OFFICIAL-DOC");
      expect(fx.targetConfirm).toBe("CONFIRMED");
      const keys = fx.keys.map((k) => {
        if (!isKeyId(k)) {
          throw new Error(k);
        }
        return k;
      }) as KeyId[];
      const s = dispatchKeys(createInitialState(0), keys, 0);
      expect(s.mode).toBe(fx.expected.mode);
      expect(s.screen.kind).toBe(fx.expected.screen);
      expect(lcdResult(s)).toBe(fx.expected.display);
      expect(s.result?.naturalKind).toBe(fx.expected.naturalKind);
      if (fx.expected.ans !== undefined) {
        expect(s.ans).toBe(fx.expected.ans);
      }
      if (fx.expected.ansIm !== undefined) {
        expect(s.ansIm).toBe(fx.expected.ansIm);
      }
      if (fx.expected.complex) {
        expect(s.result?.complex).toEqual(fx.expected.complex);
      }
    },
  );

  it.each(["GT-BN-OFFICIAL-EX1", "GT-BN-OFFICIAL-AND", "GT-BN-OFFICIAL-OR"])(
    "%s JSON fixture matches BASE-N state TARGET-OFFICIAL-DOC",
    (id) => {
      const raw = readFileSync(new URL(`./fixtures/${id}.json`, import.meta.url), "utf8");
      const fx = JSON.parse(raw) as {
        id: string;
        evidenceClass: string;
        targetConfirm: string;
        keys: string[];
        expected: { mode: string; radix: number; value: string; display: string };
      };
      expect(fx.id).toBe(id);
      expect(fx.evidenceClass).toBe("TARGET-OFFICIAL-DOC");
      expect(fx.targetConfirm).toBe("CONFIRMED");
      const keys = fx.keys.map((k) => {
        if (!isKeyId(k)) {
          throw new Error(k);
        }
        return k;
      }) as KeyId[];
      const s = dispatchKeys(createInitialState(0), keys, 0);
      expect(s.mode).toBe(fx.expected.mode);
      expect(s.baseN.radix).toBe(fx.expected.radix);
      expect(s.baseN.value).toBe(fx.expected.value);
      expect(lcdResult(s)).toBe(fx.expected.display);
    },
  );
});

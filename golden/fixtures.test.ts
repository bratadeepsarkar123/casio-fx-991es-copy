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
});

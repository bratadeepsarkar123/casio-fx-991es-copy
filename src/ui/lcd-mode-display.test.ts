import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import { effectiveDisplayFormat } from "../calc/format.ts";
import { lcdIndicators } from "./lcdModel.ts";

describe("selected-guide automatic Linear Display modes", () => {
  it("forces STAT, BASE-N, MATRIX and VECTOR to LineIO without changing SETUP", () => {
    for (const digit of ["3", "4", "6", "8"] as const) {
      const state = dispatchKeys(createInitialState(0), ["mode", digit], 0);
      expect(effectiveDisplayFormat(state.mode, state.setup.displayFormat)).toBe("LineIO");
      expect(lcdIndicators(state).math).toBe(false);
      expect(state.setup.displayFormat).toBe("MthIO-MathO");
    }
  });

  it("keeps COMP, CMPLX, EQN and TABLE on the configured display format", () => {
    for (const digit of ["1", "2", "5", "7"] as const) {
      const state = dispatchKeys(createInitialState(0), ["mode", digit], 0);
      expect(effectiveDisplayFormat(state.mode, state.setup.displayFormat)).toBe("MthIO-MathO");
      expect(lcdIndicators(state).math).toBe(true);
    }
  });
});

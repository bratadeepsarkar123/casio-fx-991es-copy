import type { CalcState } from "../calc/types.ts";
import { atomsToLinear } from "../calc/editor.ts";

export function lcdExpression(state: CalcState): string {
  if (state.screen.kind === "error") {
    return atomsToLinear(state.screen.expression, state.setup.displayFormat);
  }
  return atomsToLinear(state.editor.root, state.setup.displayFormat);
}

export function lcdResult(state: CalcState): string {
  if (state.screen.kind === "error") {
    return state.screen.code;
  }
  if (state.screen.kind === "off") {
    return "";
  }
  if (state.menu.kind === "mode") {
    return "1:COMP 2:CMPLX 3:STAT 4:BASE-N 5:EQN 6:MATRIX 7:TABLE 8:VECTOR";
  }
  if (state.menu.kind === "setup") {
    return state.menu.page === 0
      ? "1:MthIO 2:LineIO 3:Deg 4:Rad 5:Gra 6:Fix 7:Sci 8:Norm"
      : "1:ab/c 2:d/c 3:CMPLX 4:STAT 5:TABLE 6:Rdec 7:Disp 8:CONT";
  }
  if (state.menu.kind !== "none") {
    return state.menu.kind.toUpperCase();
  }
  if (state.result && (state.screen.kind === "result" || state.screen.kind === "replay")) {
    return state.result.display;
  }
  return "";
}

export function angleIndicator(state: CalcState): "D" | "R" | "G" {
  switch (state.setup.angleUnit) {
    case "Deg":
      return "D";
    case "Rad":
      return "R";
    case "Gra":
      return "G";
    default: {
      const _never: never = state.setup.angleUnit;
      return _never;
    }
  }
}

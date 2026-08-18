import type { CalcState } from "../calc/types.ts";
import { atomsToLinear } from "../calc/editor.ts";
import { formatBaseNExpression, radixLabel } from "../calc/baseN.ts";

function tablePromptLabel(phase: "fx" | "start" | "end" | "step"): string {
  switch (phase) {
    case "fx":
      return "f(x)=";
    case "start":
      return "Start?";
    case "end":
      return "End?";
    case "step":
      return "Step?";
    default: {
      const _never: never = phase;
      return _never;
    }
  }
}

export function lcdExpression(state: CalcState): string {
  if (state.mode === "BASE-N") {
    return formatBaseNExpression(state.baseN.tokens);
  }
  if (state.screen.kind === "error") {
    return atomsToLinear(state.screen.expression, state.setup.displayFormat);
  }
  if (state.mode === "TABLE" && state.table?.phase === "view") {
    const row = state.table.rows[state.table.rowIndex];
    if (!row) {
      return "";
    }
    return `X=${row.xDisplay}`;
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
  if (state.menu.kind === "base-op") {
    return state.menu.page === 0
      ? "1:and 2:or 3:xor 4:xnor 5:Not 6:Neg"
      : "1:d 2:h 3:b 4:o";
  }
  if (state.menu.kind !== "none") {
    return state.menu.kind.toUpperCase();
  }
  if (state.mode === "TABLE" && state.table) {
    if (state.table.phase === "view") {
      const row = state.table.rows[state.table.rowIndex];
      if (!row) {
        return "";
      }
      return row.fxError ?? row.fxDisplay ?? "";
    }
    return tablePromptLabel(state.table.phase);
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

export interface LcdIndicators {
  shift: boolean;
  alpha: boolean;
  hyp: boolean;
  memory: boolean;
  angle: "D" | "R" | "G";
  math: boolean;
  fix: boolean;
  sci: boolean;
  mode: string | null;
  replay: boolean;
  sto: boolean;
  rcl: boolean;
  baseN: "BIN" | "OCT" | "DEC" | "HEX" | null;
}

export function lcdIndicators(state: CalcState): LcdIndicators {
  return {
    shift: state.shift,
    alpha: state.alpha,
    hyp: state.hyp,
    memory: state.memoryM !== "0",
    angle: angleIndicator(state),
    math: state.mode === "BASE-N" ? false : state.setup.displayFormat !== "LineIO",
    fix: state.setup.numberFormat.kind === "Fix",
    sci: state.setup.numberFormat.kind === "Sci",
    mode: state.mode === "COMP" ? null : state.mode,
    replay: state.history.length > 0,
    sto: state.menu.kind === "sto",
    rcl: state.menu.kind === "rcl",
    baseN: state.mode === "BASE-N" ? radixLabel(state.baseN.radix) : null,
  };
}

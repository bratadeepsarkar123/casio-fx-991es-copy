import type { CalcState } from "../calc/types.ts";
import { atomsToLinear, atomsToLinearSplit } from "../calc/editor.ts";
import { formatBaseNExpression, radixLabel } from "../calc/baseN.ts";
import { STAT_CALL_LABELS } from "../calc/statNumeric.ts";
import { statEditorExpression, statEditorValue, statMenuText, statTypeMenuText } from "../calc/stat.ts";
import {
  eqnEditorExpression,
  eqnEditorValue,
  eqnMessageText,
  eqnSolutionExpression,
  eqnSolutionValue,
  eqnTypeMenuText,
} from "../calc/eqn.ts";
import {
  matrixCellPrompt,
  matrixDataRegText,
  matrixDimRegText,
  matrixDimSizeExpr,
  matrixDimSizeResult,
  matrixEditorExpression,
  matrixEditorValue,
  matrixMenuText,
  matrixStoDestText,
  relabelMatrixCalls,
} from "../calc/matrix.ts";
import {
  relabelVectorCalls,
  vectorCellPrompt,
  vectorDataRegText,
  vectorDimRegText,
  vectorDimSizeExpr,
  vectorDimSizeResult,
  vectorEditorExpression,
  vectorEditorValue,
  vectorMenuText,
  vectorStoDestText,
} from "../calc/vector.ts";

function relabelStatCalls(expr: string): string {
  let out = expr;
  const names = Object.keys(STAT_CALL_LABELS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const label = STAT_CALL_LABELS[name];
    if (!label) {
      continue;
    }
    out = out.split(name).join(label);
  }
  return out;
}

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
  if (state.mode === "STAT" && state.stat?.phase === "editor") {
    return statEditorExpression(state.stat);
  }
  if (state.mode === "STAT" && state.stat?.phase === "type") {
    return "STAT";
  }
  if (state.mode === "EQN" && state.eqn) {
    if (state.eqn.phase === "type") {
      return "EQN";
    }
    if (state.eqn.phase === "editor") {
      return eqnEditorExpression(state);
    }
    if (state.eqn.phase === "solutions") {
      return eqnSolutionExpression(state.eqn);
    }
    if (state.eqn.phase === "message") {
      return "EQN";
    }
  }
  if (state.mode === "MATRIX" && state.matrix) {
    const mx = state.matrix;
    if (mx.phase === "dim-reg") {
      return "MATRIX";
    }
    if (mx.phase === "dim-size" && mx.dimTarget) {
      return matrixDimSizeExpr(mx.dimTarget);
    }
    if (mx.phase === "data-reg") {
      return "MATRIX";
    }
    if (mx.phase === "sto-dest") {
      return "STO";
    }
    if (mx.phase === "editor") {
      return matrixEditorExpression(state);
    }
    if (mx.phase === "matans") {
      return matrixCellPrompt("Ans", mx.row, mx.col);
    }
  }
  if (state.mode === "VECTOR" && state.vector) {
    const vc = state.vector;
    if (vc.phase === "dim-reg") {
      return "VECTOR";
    }
    if (vc.phase === "dim-size" && vc.dimTarget) {
      return vectorDimSizeExpr(vc.dimTarget);
    }
    if (vc.phase === "data-reg") {
      return "VECTOR";
    }
    if (vc.phase === "sto-dest") {
      return "STO";
    }
    if (vc.phase === "editor") {
      return vectorEditorExpression(state);
    }
    if (vc.phase === "vctans") {
      return vectorCellPrompt("Ans", vc.index);
    }
  }
  if (state.mode === "TABLE" && state.table?.phase === "view") {
    const row = state.table.rows[state.table.rowIndex];
    if (!row) {
      return "";
    }
    return `X=${row.xDisplay}`;
  }
  const expr = atomsToLinear(state.editor.root, state.setup.displayFormat);
  if (state.mode === "STAT") {
    return relabelStatCalls(expr);
  }
  if (state.mode === "MATRIX") {
    return relabelMatrixCalls(expr);
  }
  if (state.mode === "VECTOR") {
    return relabelVectorCalls(expr);
  }
  return expr;
}

export interface LcdExprParts {
  before: string;
  after: string;
  showCaret: boolean;
}

function relabelForMode(expr: string, state: CalcState): string {
  if (state.mode === "STAT") {
    return relabelStatCalls(expr);
  }
  if (state.mode === "MATRIX") {
    return relabelMatrixCalls(expr);
  }
  if (state.mode === "VECTOR") {
    return relabelVectorCalls(expr);
  }
  return expr;
}

/** Display-only split. Must not be used by goldens — `lcdExpression` stays caret-free. */
export function lcdExpressionParts(state: CalcState): LcdExprParts {
  if (state.power === "off") {
    return { before: lcdExpression(state), after: "", showCaret: false };
  }
  if (state.mode === "BASE-N" && state.screen.kind === "input" && state.menu.kind === "none") {
    return {
      before: formatBaseNExpression(state.baseN.tokens.slice(0, state.baseN.cursor)),
      after: formatBaseNExpression(state.baseN.tokens.slice(state.baseN.cursor)),
      showCaret: true,
    };
  }
  const expr = lcdExpression(state);
  const linear = relabelForMode(atomsToLinear(state.editor.root, state.setup.displayFormat), state);
  const showCaret = state.screen.kind === "input" && state.menu.kind === "none" && expr === linear;
  if (!showCaret) {
    return { before: expr, after: "", showCaret: false };
  }
  const split = atomsToLinearSplit(state.editor.root, state.setup.displayFormat, state.editor.cursor);
  return {
    before: relabelForMode(split.before, state),
    after: relabelForMode(split.after, state),
    showCaret: true,
  };
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
  if (state.menu.kind === "cmplx-op") {
    return "1:arg 2:Conjg 3:r∠θ 4:a+bi";
  }
  if (state.menu.kind === "matrix-op") {
    return matrixMenuText();
  }
  if (state.menu.kind === "vector-op") {
    return vectorMenuText();
  }
  const statMenu = statMenuText(state);
  if (statMenu) {
    return statMenu;
  }
  if (state.menu.kind !== "none") {
    return state.menu.kind.toUpperCase();
  }
  if (state.mode === "STAT" && state.stat) {
    if (state.stat.phase === "type") {
      return statTypeMenuText(state.stat.typePage);
    }
    if (state.stat.phase === "editor") {
      return statEditorValue(state.stat);
    }
  }
  if (state.mode === "EQN" && state.eqn) {
    if (state.eqn.phase === "type") {
      return eqnTypeMenuText();
    }
    if (state.eqn.phase === "editor") {
      return eqnEditorValue(state);
    }
    if (state.eqn.phase === "solutions") {
      return eqnSolutionValue(state)?.display ?? "";
    }
    if (state.eqn.phase === "message") {
      return eqnMessageText(state.eqn);
    }
  }
  if (state.mode === "MATRIX" && state.matrix) {
    const mx = state.matrix;
    if (mx.phase === "dim-reg") {
      return matrixDimRegText();
    }
    if (mx.phase === "dim-size") {
      return matrixDimSizeResult();
    }
    if (mx.phase === "data-reg") {
      return matrixDataRegText();
    }
    if (mx.phase === "sto-dest") {
      return matrixStoDestText();
    }
    if (mx.phase === "editor") {
      return matrixEditorValue(state);
    }
    if (mx.phase === "matans") {
      return state.result?.display ?? matrixEditorValue(state);
    }
  }
  if (state.mode === "VECTOR" && state.vector) {
    const vc = state.vector;
    if (vc.phase === "dim-reg") {
      return vectorDimRegText();
    }
    if (vc.phase === "dim-size") {
      return vectorDimSizeResult();
    }
    if (vc.phase === "data-reg") {
      return vectorDataRegText();
    }
    if (vc.phase === "sto-dest") {
      return vectorStoDestText();
    }
    if (vc.phase === "editor") {
      return vectorEditorValue(state);
    }
    if (vc.phase === "vctans") {
      return state.result?.display ?? vectorEditorValue(state);
    }
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
  disp: boolean;
  exprOverflow: boolean;
  resultOverflow: boolean;
}

/** Clone character budget for overflow arrows. Not a 31×96 column count (D-024). */
export const LCD_EXPR_VISIBLE_CHARS = 16;
export const LCD_RESULT_VISIBLE_CHARS = 12;

function modeIndicator(mode: CalcState["mode"]): string | null {
  switch (mode) {
    case "COMP":
      return null;
    case "MATRIX":
      return "MAT";
    case "VECTOR":
      return "VCT";
    case "CMPLX":
    case "STAT":
    case "BASE-N":
    case "EQN":
    case "TABLE":
      return mode;
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

function hasColon(state: CalcState): boolean {
  const walk = (xs: typeof state.editor.root): boolean => {
    for (const a of xs) {
      if (a.t === "colon") {
        return true;
      }
      switch (a.t) {
        case "frac":
          if (walk(a.num) || walk(a.den)) {
            return true;
          }
          break;
        case "mixed":
          if (walk(a.whole) || walk(a.num) || walk(a.den)) {
            return true;
          }
          break;
        case "sqrt":
        case "cbrt":
        case "neg":
        case "abs":
        case "group":
        case "post":
        case "angle":
          if (walk(a.inner)) {
            return true;
          }
          break;
        case "nthrt":
          if (walk(a.n) || walk(a.inner)) {
            return true;
          }
          break;
        case "pow":
          if (walk(a.base) || walk(a.exp)) {
            return true;
          }
          break;
        case "logb":
          if (walk(a.base) || walk(a.arg)) {
            return true;
          }
          break;
        case "call":
          if (a.args.some((arg) => walk(arg))) {
            return true;
          }
          break;
        default:
          break;
      }
    }
    return false;
  };
  return walk(state.editor.root);
}

/** True when the expression line is the editor AST (Natural HTML), not a mode prompt. */
export function lcdShowsNatural(state: CalcState): boolean {
  if (state.power === "off" || state.mode === "BASE-N") {
    return false;
  }
  if (state.setup.displayFormat === "LineIO") {
    return false;
  }
  if (state.screen.kind === "error" || state.menu.kind !== "none") {
    return false;
  }
  const expr = lcdExpression(state);
  const linear = relabelForMode(atomsToLinear(state.editor.root, state.setup.displayFormat), state);
  return expr === linear;
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
    mode: modeIndicator(state.mode),
    replay: state.history.length > 0,
    sto: state.menu.kind === "sto",
    rcl: state.menu.kind === "rcl",
    baseN: state.mode === "BASE-N" ? radixLabel(state.baseN.radix) : null,
    disp: hasColon(state),
    exprOverflow: lcdExpression(state).length > LCD_EXPR_VISIBLE_CHARS,
    resultOverflow: lcdResult(state).length > LCD_RESULT_VISIBLE_CHARS,
  };
}

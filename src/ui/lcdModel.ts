import type { CalcState } from "../calc/types.ts";
import { atomsToLinear, atomsToLinearSplit, byteCount, MAX_BYTES } from "../calc/editor.ts";
import { formatBaseNExpression, radixLabel } from "../calc/baseN.ts";
import { TABLE_DEFAULT_END, TABLE_DEFAULT_START, TABLE_DEFAULT_STEP } from "../calc/table.ts";
import { isPairedStatType, STAT_CALL_LABELS } from "../calc/statNumeric.ts";
import { calcPromptVar, calcSessionShowsDisp, solvePromptVar } from "../calc/calcSession.ts";
import { effectiveDisplayFormat, formatBySetup } from "../calc/format.ts";
import { parseCalcNumber } from "../calc/numeric.ts";
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
  const displayFormat = effectiveDisplayFormat(state.mode, state.setup.displayFormat);
  if (state.screen.kind === "error") {
    return atomsToLinear(state.screen.expression, displayFormat);
  }
  if (state.calcSession) {
    if (state.calcSession.phase === "prompt") {
      return `${calcPromptVar(state.calcSession) ?? "?"}?`;
    }
    return atomsToLinear(state.calcSession.source, state.setup.displayFormat);
  }
  if (state.solveSession) {
    if (state.solveSession.phase === "parameters") {
      return `${solvePromptVar(state.solveSession) ?? "?"}?`;
    }
    if (state.solveSession.phase === "initial") {
      return `Solve for ${state.solveSession.target}`;
    }
    if (state.solveSession.phase === "continue") {
      return "Continue: [=]";
    }
    return atomsToLinear(state.solveSession.source, state.setup.displayFormat);
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
  if (state.mode === "TABLE" && state.table && state.table.phase !== "fx") {
    const table = state.table;
    const suggested =
      table.phase === "start"
        ? table.startAtoms.length > 0
          ? table.startAtoms
          : [{ t: "num" as const, s: TABLE_DEFAULT_START }]
        : table.phase === "end"
          ? table.endAtoms.length > 0
            ? table.endAtoms
            : [{ t: "num" as const, s: TABLE_DEFAULT_END }]
          : table.stepAtoms.length > 0
            ? table.stepAtoms
            : [{ t: "num" as const, s: TABLE_DEFAULT_STEP }];
    return atomsToLinear(state.editor.root.length > 0 ? state.editor.root : suggested, displayFormat);
  }
  const expr = atomsToLinear(state.editor.root, displayFormat);
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
  if (
    (state.calcSession?.phase === "prompt" || state.solveSession?.phase === "parameters" || state.solveSession?.phase === "initial") &&
    state.screen.kind === "input"
  ) {
    const prompt = state.calcSession?.phase === "prompt"
      ? `${calcPromptVar(state.calcSession) ?? "?"}? `
      : state.solveSession?.phase === "parameters"
        ? `${solvePromptVar(state.solveSession) ?? "?"}? `
        : `Solve for ${state.solveSession?.target ?? "X"} `;
    const split = atomsToLinearSplit(state.editor.root, "LineIO", state.editor.cursor);
    return { before: prompt + split.before, after: split.after, showCaret: true };
  }
  const expr = lcdExpression(state);
  const displayFormat = effectiveDisplayFormat(state.mode, state.setup.displayFormat);
  const linear = relabelForMode(atomsToLinear(state.editor.root, displayFormat), state);
  const showCaret = state.screen.kind === "input" && state.menu.kind === "none" && expr === linear;
  if (!showCaret) {
    return { before: expr, after: "", showCaret: false };
  }
  const split = atomsToLinearSplit(state.editor.root, displayFormat, state.editor.cursor);
  return {
    before: relabelForMode(split.before, state),
    after: relabelForMode(split.after, state),
    showCaret: true,
  };
}

function systemMenuText(state: CalcState): string | null {
  const menu = state.menu;
  switch (menu.kind) {
    case "none":
      return null;
    case "mode":
      return "1:COMP 2:CMPLX 3:STAT 4:BASE-N 5:EQN 6:MATRIX 7:TABLE 8:VECTOR";
    case "setup":
      if (menu.page === 0) {
        return "1:MthIO 2:LineIO 3:Deg 4:Rad 5:Gra 6:Fix 7:Sci 8:Norm";
      }
      return "1:ab/c 2:d/c 3:CMPLX 4:STAT 5:Disp 6:CONT";
    case "mthio":
      return "Result Format? 1:MathO 2:LineO";
    case "fix":
      return "Fix 0~9?";
    case "sci":
      return "Sci 0~9?";
    case "norm":
      return "Norm 1:Norm1 2:Norm2";
    case "clr":
      return "1:Setup 2:Memory 3:All";
    case "confirm":
      return "Sure?";
    case "sto":
      return "STO";
    case "rcl":
      return "RCL";
    case "drg":
      return "1:° 2:r 3:g";
    case "hyp":
      return menu.page === 0 ? "1:sinh 2:cosh 3:tanh" : "4:sinh^-1 5:cosh^-1 6:tanh^-1";
    case "cmplx-fmt":
      return "1:a+bi 2:r∠θ";
    case "stat-fmt":
      return "1:FreqOn 2:FreqOff";
    case "table-fmt":
      return "1:f(x) 2:f(x),g(x)";
    case "rdec":
      return "1:On 2:Off";
    case "disp":
      return "1:Dot 2:Comma";
    case "contrast":
      return `CONT ${state.setup.contrast}`;
    case "base-op":
      return menu.page === 0 ? "1:and 2:or 3:xor 4:xnor 5:Not 6:Neg" : "1:d 2:h 3:b 4:o";
    case "cmplx-op":
      return "1:arg 2:Conjg 3:r∠θ 4:a+bi";
    case "comp-fn":
      return "1:GCD 2:LCM 3:Int 4:Intg";
    case "const-entry":
      return `CONSTANT Number 01~40? ${menu.digits}`;
    case "conv-entry":
      return `CONVERSION Number 01~40? ${menu.digits}`;
    case "matrix-op":
      return matrixMenuText();
    case "vector-op":
      return vectorMenuText();
    case "stat-op":
    case "stat-editor":
    case "stat-edit":
    case "stat-sum":
    case "stat-var":
    case "stat-reg":
    case "stat-distr":
    case "stat-minmax":
      return statMenuText(state);
    default: {
      const _never: never = menu;
      return _never;
    }
  }
}

/** Numbered MODE/SETUP/type menus use the full LCD body, not the 12-char result strip. */
export function lcdShowsMenu(state: CalcState): boolean {
  if (state.power === "off" || state.screen.kind === "error" || state.screen.kind === "off") {
    return false;
  }
  if (state.menu.kind !== "none") {
    return true;
  }
  if (state.mode === "STAT" && state.stat?.phase === "type") {
    return true;
  }
  if (state.mode === "EQN" && state.eqn?.phase === "type") {
    return true;
  }
  if (state.mode === "MATRIX" && state.matrix) {
    const phase = state.matrix.phase;
    if (phase === "dim-reg" || phase === "data-reg" || phase === "sto-dest") {
      return true;
    }
  }
  if (state.mode === "VECTOR" && state.vector) {
    const phase = state.vector.phase;
    if (phase === "dim-reg" || phase === "data-reg" || phase === "sto-dest") {
      return true;
    }
  }
  return false;
}

export interface LcdMenuView {
  prompt: string;
  items: string[];
  entry?: string;
}

export function lcdMenuView(state: CalcState): LcdMenuView | null {
  if (!lcdShowsMenu(state)) {
    return null;
  }
  if (state.menu.kind === "const-entry" || state.menu.kind === "conv-entry") {
    const constantEntry = state.menu.kind === "const-entry";
    const title = constantEntry ? "CONSTANT" : "CONVERSION";
    const digits = state.menu.digits.padEnd(2, "_");
    return {
      prompt: `${title}\nNumber 01~40?`,
      items: [],
      entry: `[${digits}]`,
    };
  }
  const text = lcdResult(state);
  const items = [...text.matchAll(/(?:^|\s)(\d+:\S+)/g)].map((m) => m[1] ?? "");
  const prompt = text.replace(/(?:^|\s)(\d+:\S+)/g, "").replace(/\s+/g, " ").trim();
  return { prompt, items: items.filter(Boolean) };
}

export function lcdResult(state: CalcState): string {
  if (state.screen.kind === "error") {
    return state.screen.code;
  }
  if (state.screen.kind === "off") {
    return "";
  }
  if (state.calcSession?.phase === "prompt") {
    const variable = calcPromptVar(state.calcSession);
    return variable ? formatBySetup(parseCalcNumber(state.variables[variable]), state.setup) : "";
  }
  if (state.solveSession?.phase === "parameters") {
    const variable = solvePromptVar(state.solveSession);
    return variable ? formatBySetup(parseCalcNumber(state.variables[variable]), state.setup) : "";
  }
  if (state.solveSession?.phase === "initial") {
    return formatBySetup(parseCalcNumber(state.solveSession.initialGuess), state.setup);
  }
  if (state.solveSession?.phase === "solution") {
    return `${state.solveSession.target}=${state.solveSession.solution ?? state.solveSession.initialGuess}  L−R=${state.solveSession.residual ?? "0"}`;
  }
  if (state.solveSession?.phase === "continue") {
    return "";
  }
  const menuText = systemMenuText(state);
  if (menuText !== null) {
    return menuText;
  }
  if (state.mode === "STAT" && state.stat) {
    if (state.stat.phase === "type") {
      return statTypeMenuText(state.stat.typePage);
    }
    if (state.stat.phase === "editor") {
      return state.editor.root.length > 0
        ? atomsToLinear(state.editor.root, "LineIO")
        : statEditorValue(state.stat);
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

export interface LcdResultRow {
  label: string;
  value: string;
}

/** Separate LineIO multi-component results into shared label/value columns. */
export function lcdResultRows(state: CalcState): LcdResultRow[] | null {
  const result = state.result;
  if (!result || effectiveDisplayFormat(state.mode, state.setup.displayFormat) === "MthIO-MathO") {
    return null;
  }
  if (!result.polRec && !result.complex) {
    return null;
  }
  const lines = result.display.split("\n");
  if (lines.length < 2) {
    return null;
  }
  return lines.slice(0, 2).map((line) => {
    const separator = line.indexOf("=");
    return separator >= 0
      ? { label: line.slice(0, separator + 1), value: line.slice(separator + 1) }
      : { label: "", value: line };
  });
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
  replayDown: boolean;
  sto: boolean;
  rcl: boolean;
  baseN: "BIN" | "OCT" | "DEC" | "HEX" | null;
  disp: boolean;
  exprOverflow: boolean;
  resultOverflow: boolean;
  menuUp: boolean;
  menuDown: boolean;
}

function pagedMenuPage(state: CalcState): number | null {
  switch (state.menu.kind) {
    case "setup":
    case "hyp":
    case "base-op":
      return state.menu.page;
    case "stat-sum":
    case "stat-var":
      return state.stat?.type && isPairedStatType(state.stat.type) ? state.menu.page : null;
    default:
      if (state.mode === "STAT" && state.stat?.phase === "type") {
        return state.stat.typePage;
      }
      return null;
  }
}

/** Clone character budget for overflow arrows. Not a 31×96 column count (D-024). */
export const LCD_EXPR_VISIBLE_CHARS = 16;
export const LCD_RESULT_VISIBLE_CHARS = 12;

/** E-7: the physical caret changes shape with ten or fewer input bytes left. */
export function lcdInputByteWarning(state: CalcState): boolean {
  if (state.menu.kind !== "none" || state.screen.kind !== "input") {
    return false;
  }
  if (state.mode !== "COMP" && state.mode !== "CMPLX") {
    return false;
  }
  return byteCount(state.editor.root) >= MAX_BYTES - 10;
}

function modeIndicator(mode: CalcState["mode"]): string | null {
  switch (mode) {
    case "COMP":
    case "BASE-N":
    case "EQN":
    case "TABLE":
      return null;
    case "MATRIX":
      return "MAT";
    case "VECTOR":
      return "VCT";
    case "CMPLX":
    case "STAT":
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
        case "sexagesimal":
          if (walk(a.deg) || walk(a.min) || walk(a.sec)) {
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
  if (state.calcSession || state.solveSession) {
    return false;
  }
  const displayFormat = effectiveDisplayFormat(state.mode, state.setup.displayFormat);
  if (displayFormat === "LineIO") {
    return false;
  }
  if (state.screen.kind === "error" || state.menu.kind !== "none") {
    return false;
  }
  const expr = lcdExpression(state);
  const linear = relabelForMode(atomsToLinear(state.editor.root, displayFormat), state);
  return expr === linear;
}

export function lcdIndicators(state: CalcState): LcdIndicators {
  const solveResultLength = state.solveSession?.phase === "solution"
    ? Math.max(
        `${state.solveSession.target}=${state.solveSession.solution ?? state.solveSession.initialGuess}`.length,
        `L−R=${state.solveSession.residual ?? "0"}`.length,
      )
    : lcdResult(state).length;
  const menuPage = pagedMenuPage(state);
  const historyScreen = state.screen.kind === "input" || state.screen.kind === "result" || state.screen.kind === "replay";
  const showReplayIndicators = !lcdShowsMenu(state) && historyScreen;
  const replayUp = showReplayIndicators && (
    state.screen.kind === "replay" ? state.screen.historyIndex > 0 : state.history.length > 0
  );
  const replayDown = showReplayIndicators && state.screen.kind === "replay" &&
    state.screen.historyIndex < state.history.length - 1;
  return {
    shift: state.shift,
    alpha: state.alpha,
    hyp: state.hyp,
    memory: state.memoryM !== "0",
    angle: angleIndicator(state),
    math: effectiveDisplayFormat(state.mode, state.setup.displayFormat) !== "LineIO",
    fix: state.setup.numberFormat.kind === "Fix",
    sci: state.setup.numberFormat.kind === "Sci",
    mode: modeIndicator(state.mode),
    replay: replayUp,
    replayDown,
    sto: state.menu.kind === "sto",
    rcl: state.menu.kind === "rcl",
    baseN: state.mode === "BASE-N" ? radixLabel(state.baseN.radix) : null,
    disp: Boolean(state.multiStatement && hasColon(state)) || calcSessionShowsDisp(state.calcSession),
    exprOverflow: !lcdShowsMenu(state) && lcdExpression(state).length > LCD_EXPR_VISIBLE_CHARS,
      resultOverflow:
        !lcdShowsMenu(state) &&
        solveResultLength > (state.solveSession?.phase === "solution" ? 16 : LCD_RESULT_VISIBLE_CHARS),
    menuUp: menuPage !== null && menuPage > 0,
    menuDown: menuPage !== null && menuPage < 1,
  };
}

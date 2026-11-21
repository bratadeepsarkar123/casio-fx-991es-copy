import type { KeyEvent, KeyId } from "./keys.ts";
import {
  closeGroupOrCall,
  byteCount,
  captureRightArgument,
  deleteAtCursor,
  deleteLeft,
  emptyEditor,
  editorFromAtoms,
  insertAbs,
  insertAngle as wrapAngle,
  insertAtom,
  insertCall,
  insertCallTemplate,
  insertClosedCall,
  insertColon,
  insertComma,
  insertCbrt,
  insertCplxFmt,
  insertDigit,
  insertDot,
  insertDms,
  insertFraction,
  insertLinearFraction,
  insertGroup,
  insertLogab,
  insertNeg,
  insertNthRoot,
  insertNthRootWithIndex,
  insertOp,
  insertPost,
  insertPower,
  insertSqrt,
  insertSym,
  insertUnitConversion,
  insertVar,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
  prepareForBinaryOp,
  SCI10_CALL_NAME,
  wrapCapturedArgument,
  MAX_BYTES,
  trimHistory,
} from "./editor.ts";
import { evaluateEquals } from "./evaluate.ts";
import { advanceMultiStatement, reduceCalcSession, reduceSolveSession, startCalc, startMultiStatement, startSolve } from "./calcSession.ts";
import { applyDecimalMark, effectiveDisplayFormat, formatBySetup, formatEngineering, fractionResultForSetup, toggleDecimal, toggleSexagesimal } from "./format.ts";
import { D, createUint32Rng, parseCalcNumber, roundInternal } from "./numeric.ts";
import { naturalFormulaHeightLines, naturalFormulaMaxHeightLines } from "./naturalHeight.ts";
import {
  scientificConstantCallName,
  scientificConstantByCallName,
  unitConversionCallName,
  unitConversionByCallName,
} from "./scientificData.ts";
import { emptyTableSession, reduceTable, tableReturnToFx } from "./table.ts";
import { applyBaseOpMenu, emptyBaseN, reduceBaseN, reduceBaseNError } from "./baseN.ts";
import { emptyStatSession, handleStatMenu, isStatMenuKind, reduceStat, wipeStatData } from "./stat.ts";
import { emptyEqnSession, reduceEqn } from "./eqn.ts";
import { emptyMatrixSession, handleMatrixMenu, isMatrixMenuKind, reduceMatrix, wipeMatrixRegisters } from "./matrix.ts";
import { emptyVectorSession, handleVectorMenu, isVectorMenuKind, reduceVector, wipeVectorRegisters } from "./vector.ts";
import type {
  Atom,
  CalcMode,
  CalcState,
  ErrorCode,
  HistoryEntry,
  MenuState,
  ResultValue,
  SetupState,
  VarName,
} from "./types.ts";
import { VAR_NAMES } from "./types.ts";

const AUTO_OFF_MS = 10 * 60 * 1000;
export { AUTO_OFF_MS };

export function applyIdleTimeout(state: CalcState, nowMs: number): CalcState {
  if (state.power === "on" && nowMs - state.lastActivityMs >= AUTO_OFF_MS) {
    return { ...state, power: "off", screen: { kind: "off" }, pendingInputRecall: false };
  }
  return state;
}

export function defaultSetup(): SetupState {
  return {
    displayFormat: "MthIO-MathO",
    angleUnit: "Deg",
    numberFormat: { kind: "Norm", n: 1 },
    fractionFormat: "d/c",
    complexFormat: "a+bi",
    statFreq: false,
    tableFormat: "f(x)",
    rdec: true,
    decimalMark: "Dot",
    contrast: 5,
  };
}

export function createInitialState(nowMs = 0): CalcState {
  const zeros = Object.fromEntries(VAR_NAMES.map((v) => [v, "0"])) as Record<VarName, string>;
  return {
    schemaVersion: 1,
    power: "on",
    mode: "COMP",
    setup: defaultSetup(),
    shift: false,
    alpha: false,
    hyp: false,
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
    pendingInputRecall: false,
    resultDecimal: false,
    ans: "0",
    preAns: "0",
    ansIm: "0",
    preAnsIm: "0",
    variables: zeros,
    memoryM: "0",
    history: [],
    calcSession: null,
    multiStatement: null,
    solveSession: null,
    menu: { kind: "none" },
    lastActivityMs: nowMs,
    rngSeed: 1,
    baseN: emptyBaseN(10),
    table: null,
    stat: null,
    eqn: null,
    matrix: null,
    vector: null,
  };
}

function withActivity(state: CalcState, nowMs: number): CalcState {
  return { ...state, lastActivityMs: nowMs };
}

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

function replayHistoryEntry(state: CalcState, entry: HistoryEntry, index: number): CalcState {
  const baseN = entry.baseN;
  const isBaseN = state.mode === "BASE-N" && baseN !== undefined;
  return {
    ...clearLatches(state),
    editor: isBaseN ? emptyEditor() : editorFromAtoms(entry.expression),
    baseN: isBaseN && baseN
      ? { ...baseN, tokens: baseN.tokens.slice(), value: entry.result.approx }
      : state.baseN,
    screen: { kind: "replay", historyIndex: index },
    result: entry.result,
  };
}

function withBinaryOp(state: CalcState, op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "∠"): CalcState {
  const base = continueFromResult(state);
  const lineIO = effectiveDisplayFormat(base.mode, base.setup.displayFormat) === "LineIO";
  return {
    ...clearLatches(base),
    editor: insertOp(prepareForBinaryOp(base.editor, lineIO), op),
    screen: { kind: "input" },
  };
}

const MODE_BY_DIGIT: Record<string, CalcMode> = {
  "1": "COMP",
  "2": "CMPLX",
  "3": "STAT",
  "4": "BASE-N",
  "5": "EQN",
  "6": "MATRIX",
  "7": "TABLE",
  "8": "VECTOR",
};

function handleMenu(state: CalcState, keyId: KeyId): CalcState | null {
  const menu = state.menu;
  if (menu.kind === "none") {
    return null;
  }
  if (keyId === "ac") {
    return { ...state, menu: { kind: "none" } };
  }
  if (menu.kind === "const-entry" || menu.kind === "conv-entry") {
    if (keyId < "0" || keyId > "9") {
      return state;
    }
    const digits = menu.digits + keyId;
    if (digits.length < 2) {
      return { ...state, menu: { ...menu, digits } };
    }
    const code = Number(digits);
    const isConstant = menu.kind === "const-entry";
    const name = isConstant ? scientificConstantCallName(code) : unitConversionCallName(code);
    const valid = isConstant
      ? scientificConstantByCallName(name) !== undefined
      : unitConversionByCallName(name) !== undefined;
    if (!valid) {
      return {
        ...clearLatches(state),
        menu: { kind: "none" },
        screen: { kind: "error", code: "Argument ERROR", expression: state.editor.root, errorIndex: 0 },
        result: null,
      };
    }
    if (isConstant) {
      const base = beginInputIfResult(prepareStatExpression({ ...state, menu: { kind: "none" } }));
      return {
        ...clearLatches(base),
        menu: { kind: "none" },
        editor: insertAtom(base.editor, { t: "call", name, args: [], closed: true }),
        screen: { kind: "input" },
      };
    }
    const prepared = prepareStatExpression({ ...state, menu: { kind: "none" } });
    const base = prepared.screen.kind === "result"
      ? { ...prepared, editor: insertSym(emptyEditor(), "ans"), screen: { kind: "input" as const }, result: null }
      : prepared.editor.root.length === 0
        ? { ...prepared, editor: insertSym(prepared.editor, "ans") }
        : prepared;
    return {
      ...clearLatches(base),
      menu: { kind: "none" },
      editor: insertUnitConversion(base.editor, name),
      screen: { kind: "input" },
      result: null,
    };
  }
  if (menu.kind === "mode") {
    const mode = MODE_BY_DIGIT[keyId];
    if (mode) {
      return {
        ...clearLatches(state),
        mode,
        menu: { kind: "none" },
        editor: emptyEditor(),
        screen: { kind: "input" },
        result: null,
        history: [],
        calcSession: null,
        multiStatement: null,
        solveSession: null,
        preAns: mode === "COMP" || mode === "CMPLX" ? state.preAns : "0",
        preAnsIm: mode === "COMP" || mode === "CMPLX" ? state.preAnsIm : "0",
        table: mode === "TABLE" ? emptyTableSession() : null,
        stat: mode === "STAT" ? emptyStatSession() : null,
        eqn: mode === "EQN" ? emptyEqnSession() : null,
        matrix: mode === "MATRIX" ? emptyMatrixSession() : null,
        vector: mode === "VECTOR" ? emptyVectorSession() : null,
        baseN: emptyBaseN(10),
      };
    }
    return state;
  }
  if (menu.kind === "setup") {
    if (keyId === "down") {
      return { ...state, menu: { kind: "setup", page: Math.min(1, menu.page + 1) } };
    }
    if (keyId === "up") {
      return { ...state, menu: { kind: "setup", page: Math.max(0, menu.page - 1) } };
    }
    if (menu.page === 0) {
      switch (keyId) {
        case "1":
          return { ...state, menu: { kind: "mthio" } };
        case "2":
          return applySetup(state, { displayFormat: "LineIO" });
        case "3":
          return applySetup(state, { angleUnit: "Deg" });
        case "4":
          return applySetup(state, { angleUnit: "Rad" });
        case "5":
          return applySetup(state, { angleUnit: "Gra" });
        case "6":
          return { ...state, menu: { kind: "fix" } };
        case "7":
          return { ...state, menu: { kind: "sci" } };
        case "8":
          return { ...state, menu: { kind: "norm" } };
        default:
          return state;
      }
    }
    switch (keyId) {
      case "1":
        return applySetup(state, { fractionFormat: "ab/c" });
      case "2":
        return applySetup(state, { fractionFormat: "d/c" });
      case "3":
        return { ...state, menu: { kind: "cmplx-fmt" } };
      case "4":
        return { ...state, menu: { kind: "stat-fmt" } };
      case "5":
        return { ...state, menu: { kind: "disp" } };
      case "6":
        return { ...state, menu: { kind: "contrast" } };
      default:
        return state;
    }
  }
  if (menu.kind === "mthio") {
    if (keyId === "1") {
      return applySetup(state, { displayFormat: "MthIO-MathO" });
    }
    if (keyId === "2") {
      return applySetup(state, { displayFormat: "MthIO-LineO" });
    }
    return state;
  }
  if (menu.kind === "fix" || menu.kind === "sci") {
    if (keyId >= "0" && keyId <= "9") {
      const n = Number(keyId);
      return applySetup(state, {
        numberFormat: menu.kind === "fix" ? { kind: "Fix", n } : { kind: "Sci", n },
      });
    }
    return state;
  }
  if (menu.kind === "norm") {
    if (keyId === "1") {
      return applySetup(state, { numberFormat: { kind: "Norm", n: 1 } });
    }
    if (keyId === "2") {
      return applySetup(state, { numberFormat: { kind: "Norm", n: 2 } });
    }
    return state;
  }
  if (menu.kind === "cmplx-fmt") {
    if (keyId === "1") {
      return applySetup(state, { complexFormat: "a+bi" });
    }
    if (keyId === "2") {
      return applySetup(state, { complexFormat: "r∠θ" });
    }
    return state;
  }
  if (menu.kind === "stat-fmt") {
    if (keyId === "1") {
      return applySetup(state, { statFreq: true });
    }
    if (keyId === "2") {
      return applySetup(state, { statFreq: false });
    }
    return state;
  }
  if (menu.kind === "table-fmt") {
    if (keyId === "1") {
      return applySetup(state, { tableFormat: "f(x)" });
    }
    if (keyId === "2") {
      return applySetup(state, { tableFormat: "f(x),g(x)" });
    }
    return state;
  }
  if (menu.kind === "rdec") {
    if (keyId === "1") {
      return applySetup(state, { rdec: true });
    }
    if (keyId === "2") {
      return applySetup(state, { rdec: false });
    }
    return state;
  }
  if (menu.kind === "disp") {
    if (keyId === "1") {
      return applySetup(state, { decimalMark: "Dot" });
    }
    if (keyId === "2") {
      return applySetup(state, { decimalMark: "Comma" });
    }
    return state;
  }
  if (menu.kind === "clr") {
    if (keyId === "1") {
      return { ...state, menu: { kind: "confirm", action: "setup" } };
    }
    if (keyId === "2") {
      return { ...state, menu: { kind: "confirm", action: "memory" } };
    }
    if (keyId === "3") {
      return { ...state, menu: { kind: "confirm", action: "all" } };
    }
    return state;
  }
  if (menu.kind === "confirm") {
    if (keyId === "equals" || keyId === "1") {
      return runConfirm(state, menu.action);
    }
    if (keyId === "2") {
      return { ...state, menu: { kind: "none" } };
    }
    return state;
  }
  if (menu.kind === "sto") {
    const name = alphaVar(keyId);
    if (!name) {
      return state;
    }
    let base = state;
    if (state.screen.kind !== "result" && state.editor.root.length > 0) {
      base = onEquals(state, createUint32Rng(state.rngSeed));
      if (base.screen.kind === "error") {
        return { ...base, menu: { kind: "none" } };
      }
    }
    const value = base.result?.internal?.re ?? base.result?.complex?.re ?? base.result?.approx ?? base.ans;
    const imag = base.result?.internal?.im ?? base.result?.complex?.im ?? "0";
    if (imag !== "0" && !D(imag).isZero()) {
      return {
        ...clearLatches(base),
        menu: { kind: "none" },
        screen: { kind: "error", code: "Math ERROR", expression: base.editor.root, errorIndex: 0 },
        result: null,
      };
    }
    const variables = { ...base.variables, [name]: value };
    const memoryM = name === "M" ? value : base.memoryM;
    return { ...clearLatches(base), variables, memoryM, menu: { kind: "none" } };
  }
  if (menu.kind === "rcl") {
    const name = alphaVar(keyId);
    if (!name) {
      return state;
    }
    const recallToResult = state.screen.kind === "result" || (state.screen.kind === "input" && state.editor.root.length === 0);
    if (recallToResult && (state.mode === "COMP" || state.mode === "CMPLX")) {
      return onEquals(
        {
          ...clearLatches(state),
          menu: { kind: "none" },
          editor: editorFromAtoms([{ t: "var", name }]),
          screen: { kind: "input" },
          result: null,
        },
        createUint32Rng(state.rngSeed),
      );
    }
    return {
      ...clearLatches(state),
      menu: { kind: "none" },
      editor: insertVar(state.editor, name),
      screen: { kind: "input" },
    };
  }
  if (menu.kind === "drg") {
    if (keyId === "1") {
      return insertAngle(state, "°");
    }
    if (keyId === "2") {
      return insertAngle(state, "r");
    }
    if (keyId === "3") {
      return insertAngle(state, "g");
    }
    return state;
  }
  if (menu.kind === "hyp") {
    if (keyId === "up" || keyId === "down") {
      return { ...state, menu: { kind: "hyp", page: keyId === "up" ? 0 : 1 } };
    }
    const names = {
      "1": "sinh",
      "2": "cosh",
      "3": "tanh",
      "4": "asinh",
      "5": "acosh",
      "6": "atanh",
    };
    const name = names[keyId as keyof typeof names];
    if (!name) {
      return state;
    }
    const base = beginInputIfResult({ ...state, menu: { kind: "none" } });
    return {
      ...clearLatches(base),
      menu: { kind: "none" },
      editor: insertCall(base.editor, name),
      screen: { kind: "input" },
    };
  }
  if (menu.kind === "contrast") {
    if (keyId === "right") {
      return { ...state, setup: { ...state.setup, contrast: Math.min(6, state.setup.contrast + 1) } };
    }
    if (keyId === "left") {
      return { ...state, setup: { ...state.setup, contrast: Math.max(1, state.setup.contrast - 1) } };
    }
    return state;
  }
  if (menu.kind === "base-op") {
    return applyBaseOpMenu(state, keyId);
  }
  if (menu.kind === "cmplx-op") {
    switch (keyId) {
      case "1":
        return {
          ...clearLatches(state),
          menu: { kind: "none" },
          editor: insertCall(beginInputIfResult(state).editor, "arg"),
          screen: { kind: "input" },
        };
      case "2":
        return {
          ...clearLatches(state),
          menu: { kind: "none" },
          editor: insertCall(beginInputIfResult(state).editor, "conjg"),
          screen: { kind: "input" },
        };
      case "3":
        return {
          ...clearLatches(state),
          menu: { kind: "none" },
          editor: insertCplxFmt(state.editor, "r∠θ"),
          screen: { kind: "input" },
        };
      case "4":
        return {
          ...clearLatches(state),
          menu: { kind: "none" },
          editor: insertCplxFmt(state.editor, "a+bi"),
          screen: { kind: "input" },
        };
      default:
        return state;
    }
  }
  if (isStatMenuKind(menu.kind)) {
    return handleStatMenu(state, keyId);
  }
  if (isMatrixMenuKind(menu.kind)) {
    return handleMatrixMenu(state, keyId);
  }
  if (isVectorMenuKind(menu.kind)) {
    return handleVectorMenu(state, keyId);
  }
  if (menu.kind === "comp-fn") {
    const name =
      keyId === "1" ? "GCD" : keyId === "2" ? "LCM" : keyId === "3" ? "Int" : keyId === "4" ? "Intg" : null;
    if (!name) {
      return state;
    }
    return {
      ...clearLatches(state),
      menu: { kind: "none" },
      editor: insertCall(beginInputIfResult(state).editor, name),
      screen: { kind: "input" },
    };
  }
  return state;
}

function applySetup(state: CalcState, patch: Partial<SetupState>): CalcState {
  const displayChanged = patch.displayFormat !== undefined && patch.displayFormat !== state.setup.displayFormat;
  const next: CalcState = {
    ...clearLatches(state),
    setup: { ...state.setup, ...patch },
    editor: displayChanged ? { ...state.editor, insertMode: "insert" } : state.editor,
    menu: { kind: "none" },
    history:
      displayChanged
        ? []
        : state.history,
  };
  if (next.mode === "TABLE" && patch.displayFormat !== undefined) {
    return {
      ...next,
      table: emptyTableSession(),
      editor: emptyEditor(),
      screen: { kind: "input" },
      result: null,
    };
  }
  if (next.mode === "STAT" && patch.statFreq !== undefined) {
    return wipeStatData(next, true);
  }
  return next;
}

function runConfirm(state: CalcState, action: "setup" | "memory" | "all"): CalcState {
  if (action === "memory") {
    const zeros = Object.fromEntries(VAR_NAMES.map((v) => [v, "0"])) as Record<VarName, string>;
    return {
      ...state,
      menu: { kind: "none" },
      variables: zeros,
      memoryM: "0",
      ans: "0",
      history: [],
      preAns: "0",
      ansIm: "0",
      preAnsIm: "0",
      matrix: state.matrix ? wipeMatrixRegisters(state.matrix) : null,
      vector: state.vector ? wipeVectorRegisters(state.vector) : null,
      editor: state.mode === "MATRIX" || state.mode === "VECTOR" ? emptyEditor() : state.editor,
      screen: state.mode === "MATRIX" || state.mode === "VECTOR" ? { kind: "input" as const } : state.screen,
      result: state.mode === "MATRIX" || state.mode === "VECTOR" ? null : state.result,
    };
  }
  if (action === "setup") {
    return {
      ...state,
      menu: { kind: "none" },
      mode: "COMP",
      setup: defaultSetup(),
      editor: emptyEditor(),
      screen: { kind: "input" },
      result: null,
      history: [],
      table: null,
      stat: null,
      eqn: null,
      matrix: null,
      vector: null,
      baseN: emptyBaseN(10),
    };
  }
  const cleared = runConfirm(state, "memory");
  return runConfirm(cleared, "setup");
}

function alphaVar(keyId: KeyId): VarName | null {
  const map: Partial<Record<KeyId, VarName>> = {
    neg: "A",
    dms: "B",
    hyp: "C",
    sin: "D",
    cos: "E",
    tan: "F",
    rparen: "X",
    sd: "Y",
    mplus: "M",
  };
  return map[keyId] ?? null;
}

function insertAngle(state: CalcState, unit: "°" | "r" | "g"): CalcState {
  return {
    ...clearLatches(state),
    menu: { kind: "none" },
    editor: wrapAngle(state.editor, unit),
    screen: { kind: "input" },
  };
}

function insertNumericalCall(editor: CalcState["editor"], name: "int" | "diff" | "Σ", displayFormat: SetupState["displayFormat"]): CalcState["editor"] {
  const natural = displayFormat === "MthIO-MathO";
  const argCount = natural ? (name === "diff" ? 2 : 3) : 1;
  const make = (fn: Atom[]): Atom => ({
    t: "call",
    name,
    args: [fn, ...Array.from({ length: argCount - 1 }, () => [])],
    closed: false,
  });
  return wrapCapturedArgument(editor, (fn) => make(fn), "args0") ?? insertCallTemplate(editor, name, argCount);
}

function beginInputIfResult(state: CalcState): CalcState {
  if (state.screen.kind === "result" || state.screen.kind === "replay") {
    return {
      ...state,
      editor: emptyEditor(),
      screen: { kind: "input" },
      result: null,
      calcSession: null,
      multiStatement: null,
      solveSession: null,
    };
  }
  if (state.screen.kind === "error") {
    return { ...state, editor: emptyEditor(), screen: { kind: "input" }, result: null, calcSession: null, multiStatement: null, solveSession: null };
  }
  return state;
}

function prepareStatExpression(state: CalcState): CalcState {
  const stat = state.stat;
  if (state.mode !== "STAT" || stat?.phase !== "editor" || !stat.editing || state.editor.root.length > 0) {
    return state;
  }
  return {
    ...state,
    stat: { ...stat, input: "", editing: false },
    editor: editorFromAtoms([{ t: "num", s: stat.input }]),
  };
}

function continueFromResult(state: CalcState): CalcState {
  if (state.screen.kind === "result") {
    return {
      ...state,
      editor: insertSym(emptyEditor(), "ans"),
      screen: { kind: "input" },
      calcSession: null,
      multiStatement: null,
      solveSession: null,
    };
  }
  return state;
}

function trigName(state: CalcState, base: "sin" | "cos" | "tan"): string {
  const inv = state.shift;
  const hyp = state.hyp;
  if (hyp && inv) {
    return `a${base}h`;
  }
  if (hyp) {
    return `${base}h`;
  }
  if (inv) {
    return `a${base}`;
  }
  return base;
}

function guessErrorIndex(atoms: Atom[]): number {
  for (let i = 0; i + 1 < atoms.length; i += 1) {
    const op = atoms[i];
    const next = atoms[i + 1];
    if (op?.t === "op" && (op.op === "÷" || op.op === "÷R") && next?.t === "num") {
      try {
        if (D(next.s).isZero()) {
          return i + 1;
        }
      } catch {
        return i + 1;
      }
    }
  }
  return 0;
}

export function commitEqualsResult(state: CalcState, result: ResultValue): CalcState {
  const entry = { expression: state.editor.root, result };
  return {
    ...clearLatches(state),
    calculationPending: false,
    screen: { kind: "result" },
    result,
    resultDecimal: result.naturalKind === "decimal",
    preAns: state.ans,
    preAnsIm: state.ansIm,
    ans: result.internal?.re ?? result.complex?.re ?? result.approx,
    ansIm: result.internal?.im ?? result.complex?.im ?? "0",
    history: trimHistory([...state.history, entry]),
    rngSeed: state.rngSeed + 1,
    variables: result.polRec
      ? {
          ...state.variables,
          X: result.internal?.x ?? result.polRec.X,
          Y: result.internal?.y ?? result.polRec.Y,
        }
      : state.variables,
  };
}

export function commitEqualsError(state: CalcState, code: ErrorCode): CalcState {
  return {
    ...clearLatches(state),
    calculationPending: false,
    screen: {
      kind: "error",
      code,
      expression: state.editor.root,
      errorIndex: guessErrorIndex(state.editor.root),
    },
    result: null,
  };
}

function onEquals(state: CalcState, nextUint32: () => number): CalcState {
  try {
    return commitEqualsResult(state, evaluateEquals(state, nextUint32));
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return commitEqualsError(state, code);
  }
}

function reduceInternal(state: CalcState, event: KeyEvent): CalcState {
  const now = event.nowMs ?? state.lastActivityMs;
  if (state.power === "off" && event.keyId !== "on") {
    return state;
  }
  if (state.power === "on" && event.keyId !== "on") {
    const timedOut = applyIdleTimeout(state, now);
    if (timedOut !== state) {
      return timedOut;
    }
  }
  let s = withActivity(state, now);
  const displayFormat = s.calcSession || s.solveSession
    ? "LineIO"
    : effectiveDisplayFormat(s.mode, s.setup.displayFormat);
  if (event.keyId === "on") {
    const next = {
      ...s,
      power: "on" as const,
      screen: { kind: "input" as const },
      shift: false,
      alpha: false,
      hyp: false,
      menu: { kind: "none" as const },
      history: [],
      calcSession: null,
      multiStatement: null,
      solveSession: null,
    };
    if (next.mode === "TABLE" && next.table) {
      return tableReturnToFx(next);
    }
    return next;
  }

  const menuHandled = handleMenu(s, event.keyId);
  if (menuHandled) {
    return menuHandled;
  }

  if (event.keyId === "shift") {
    return { ...s, shift: !s.shift, alpha: false };
  }
  if (event.keyId === "alpha") {
    return { ...s, alpha: !s.alpha, shift: false };
  }

  if (s.mode === "BASE-N") {
    if (s.screen.kind === "error") {
      return reduceBaseNError(s, event);
    }
    const baseHandled = reduceBaseN(s, event);
    if (baseHandled) {
      return baseHandled;
    }
  }

  if (s.shift && event.keyId === "7" && s.mode !== "BASE-N") {
    return { ...clearLatches(s), menu: { kind: "const-entry", digits: "" } };
  }
  if (s.shift && event.keyId === "8" && s.mode !== "BASE-N") {
    if (s.mode === "TABLE") {
      return clearLatches(s);
    }
    return { ...clearLatches(s), menu: { kind: "conv-entry", digits: "" } };
  }

  if (s.mode === "STAT") {
    const statHandled = reduceStat(s, event);
    if (statHandled) {
      return statHandled;
    }
  }

  if (s.mode === "EQN") {
    const eqnHandled = reduceEqn(s, event);
    if (eqnHandled) {
      return eqnHandled;
    }
  }

  if (s.mode === "MATRIX") {
    const matrixHandled = reduceMatrix(s, event);
    if (matrixHandled) {
      return matrixHandled;
    }
  }

  if (s.mode === "VECTOR") {
    const vectorHandled = reduceVector(s, event);
    if (vectorHandled) {
      return vectorHandled;
    }
  }

  const sessionRng = createUint32Rng(s.rngSeed);
  const calcHandled = reduceCalcSession(s, event.keyId, sessionRng);
  if (calcHandled) {
    return calcHandled;
  }
  const solveHandled = reduceSolveSession(s, event.keyId, sessionRng);
  if (solveHandled) {
    return solveHandled;
  }

  if (event.keyId === "calc") {
    if (s.alpha) {
      return {
        ...clearLatches(s),
        editor: insertAtom(beginInputIfResult(s).editor, { t: "op", op: "=" }),
        screen: { kind: "input" },
      };
    }
    if (s.shift) {
      return startSolve(s) ?? clearLatches(s);
    }
    if (s.mode === "COMP" || s.mode === "CMPLX") {
      return startCalc(s, sessionRng) ?? clearLatches(s);
    }
    return clearLatches(s);
  }

  if (event.keyId === "hyp") {
    if (s.shift) {
      const editor = beginInputIfResult(s).editor;
      return {
        ...clearLatches(s),
        editor: wrapCapturedArgument(editor, (inner) => ({ t: "abs", inner }), "inner") ?? insertAbs(editor),
        screen: { kind: "input" },
      };
    }
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "C"), screen: { kind: "input" } };
    }
    return { ...s, hyp: true, menu: { kind: "hyp", page: 0 } };
  }

  if (s.screen.kind === "error") {
    if (event.keyId === "ac") {
      return { ...clearLatches(s), editor: emptyEditor(), screen: { kind: "input" }, result: null };
    }
    if (event.keyId === "left" || event.keyId === "right") {
      return {
        ...clearLatches(s),
        editor: editorFromAtoms(s.screen.expression, s.screen.errorIndex + 1),
        screen: { kind: "input" },
      };
    }
    return s;
  }

  const tableHandled = reduceTable(s, event);
  if (tableHandled) {
    return tableHandled;
  }

  if (event.keyId === "ac") {
    if (s.shift) {
      return { ...s, power: "off", screen: { kind: "off" }, shift: false, alpha: false, hyp: false };
    }
    if ((s.screen.kind === "result" || s.screen.kind === "replay") && event.restoreInputOnAc) {
      return {
        ...clearLatches(s),
        screen: { kind: "input" },
        result: null,
        pendingInputRecall: true,
        menu: { kind: "none" },
        calcSession: null,
        multiStatement: null,
        solveSession: null,
      };
    }
    return { ...clearLatches(s), editor: emptyEditor(), screen: { kind: "input" }, result: null, menu: { kind: "none" }, calcSession: null, multiStatement: null, solveSession: null };
  }

  if (event.keyId === "mode") {
    if (s.shift) {
      return { ...clearLatches(s), menu: { kind: "setup", page: 0 } };
    }
    return { ...clearLatches(s), menu: { kind: "mode", page: 0 } };
  }

  if (event.keyId === "del") {
    if (s.shift) {
      if (displayFormat === "LineIO") {
        return { ...clearLatches(s), editor: { ...s.editor, insertMode: s.editor.insertMode === "insert" ? "overwrite" : "insert" } };
      }
      return { ...clearLatches(s), editor: captureRightArgument(s.editor) };
    }
    return {
      ...clearLatches(s),
      editor: s.editor.insertMode === "overwrite" ? deleteAtCursor(s.editor) : deleteLeft(s.editor),
      screen: { kind: "input" },
    };
  }

  if (event.keyId === "left") {
    if (s.screen.kind === "result") {
      return { ...clearLatches(s), screen: { kind: "input" } };
    }
    if (displayFormat === "LineIO" && s.editor.cursor.path.length === 0 && s.editor.cursor.index === 0 && s.editor.cursor.offset === null) {
      return clearLatches(s);
    }
    return { ...clearLatches(s), editor: moveLeft(s.editor), screen: { kind: "input" } };
  }
  if (event.keyId === "right") {
    if (s.screen.kind === "result") {
      return { ...clearLatches(s), screen: { kind: "input" } };
    }
    const lastAtom = s.editor.root[s.editor.root.length - 1];
    if (
      displayFormat === "LineIO" &&
      s.editor.cursor.path.length === 0 &&
      s.editor.cursor.index >= s.editor.root.length &&
      (s.editor.cursor.offset === null || (lastAtom?.t === "num" && s.editor.cursor.offset >= lastAtom.s.length))
    ) {
      return clearLatches(s);
    }
    return { ...clearLatches(s), editor: moveRight(s.editor), screen: { kind: "input" } };
  }
  if (event.keyId === "up" || event.keyId === "down") {
    if (s.screen.kind === "input" && displayFormat === "LineIO") {
      const index = event.keyId === "up" ? 0 : s.editor.root.length;
      const first = s.editor.root[0];
      const last = s.editor.root[s.editor.root.length - 1];
      return {
        ...clearLatches(s),
        editor: {
          ...s.editor,
          cursor: event.keyId === "up"
            ? { path: [], index: first?.t === "num" ? 1 : 0, offset: first?.t === "num" ? 0 : null }
            : { path: [], index, offset: last?.t === "num" ? last.s.length : null },
        },
      };
    }
    if (s.screen.kind === "input" && s.editor.cursor.path.length > 0) {
      return { ...clearLatches(s), editor: event.keyId === "up" ? moveUp(s.editor) : moveDown(s.editor) };
    }
    if (s.screen.kind === "result" || s.screen.kind === "input") {
      const hist = s.history;
      if (hist.length === 0) {
        return clearLatches(s);
      }
      const idx = event.keyId === "up"
        ? hist.length - (s.screen.kind === "result" ? 2 : 1)
        : 0;
      const entry = hist[idx];
      if (!entry) {
        return clearLatches(s);
      }
      return replayHistoryEntry(s, entry, idx);
    }
    if (s.screen.kind === "replay") {
      const delta = event.keyId === "up" ? -1 : 1;
      const idx = Math.min(s.history.length - 1, Math.max(0, s.screen.historyIndex + delta));
      const entry = s.history[idx];
      if (!entry) {
        return s;
      }
      return replayHistoryEntry(s, entry, idx);
    }
    return { ...clearLatches(s), editor: event.keyId === "up" ? moveUp(s.editor) : moveDown(s.editor) };
  }

  if (event.keyId === "equals") {
    const rng = createUint32Rng(s.rngSeed);
    if (!s.shift && s.multiStatement) {
      return advanceMultiStatement(s, rng) ?? clearLatches(s);
    }
    if (!s.shift && s.screen.kind === "input") {
      const stepwise = startMultiStatement(s, rng);
      if (stepwise) {
        return stepwise;
      }
    }
    if (s.shift) {
      try {
        const result = evaluateEquals(s, rng);
        const approx: ResultValue = {
          ...result,
          display: formatBySetup(parseCalcNumber(result.internal?.re ?? result.complex?.re ?? result.approx), s.setup),
          naturalKind: "decimal",
          // The printed SHIFT = conversion can be toggled back to fraction/π
          // forms, but it does not restore the radical form of this result.
          sqrt: undefined,
        };
        return {
          ...clearLatches(s),
          screen: { kind: "result" },
          result: approx,
          resultDecimal: true,
          preAns: s.ans,
          preAnsIm: s.ansIm,
          ans: result.internal?.re ?? result.complex?.re ?? result.approx,
          ansIm: result.internal?.im ?? result.complex?.im ?? "0",
          history: trimHistory([...s.history, { expression: s.editor.root, result: approx }]),
          rngSeed: s.rngSeed + 1,
        };
      } catch {
        return onEquals(s, createUint32Rng(s.rngSeed));
      }
    }
    return onEquals(s, rng);
  }

  if (event.keyId === "sd") {
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "Y"), screen: { kind: "input" } };
    }
    if (s.shift) {
      const next: SetupState = {
        ...s.setup,
        fractionFormat: s.setup.fractionFormat === "d/c" ? "ab/c" : "d/c",
      };
      const result = s.result ? fractionResultForSetup(s.result, next) : undefined;
      return {
        ...clearLatches(s),
        setup: next,
        ...(result ? { result, resultDecimal: result.naturalKind === "decimal" } : {}),
      };
    }
    if (s.result) {
      if (s.result.remainder) {
        return clearLatches(s);
      }
      const toggled = toggleDecimal(s.result, s.setup);
      return { ...clearLatches(s), result: toggled, resultDecimal: toggled.naturalKind === "decimal" };
    }
    return clearLatches(s);
  }

  if (s.alpha) {
    const v = alphaVar(event.keyId);
    if (v) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, v), screen: { kind: "input" } };
    }
    if (event.keyId === "exp10") {
      return { ...clearLatches(s), editor: insertSym(beginInputIfResult(s).editor, "e"), screen: { kind: "input" } };
    }
    if (event.keyId === "dot") {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "RanInt"), screen: { kind: "input" } };
    }
    if (event.keyId === "eng") {
      return { ...clearLatches(s), editor: insertSym(beginInputIfResult(s).editor, "i"), screen: { kind: "input" } };
    }
    if (event.keyId === "0") {
      return { ...clearLatches(s), menu: { kind: "comp-fn" } };
    }
    if (event.keyId === "div") {
      return withBinaryOp(beginInputIfResult(s), "÷R");
    }
  }

  if (event.keyId === "rcl") {
    if (s.shift) {
      return { ...clearLatches(s), menu: { kind: "sto" } };
    }
    return { ...clearLatches(s), menu: { kind: "rcl" } };
  }

  if (event.keyId === "mplus") {
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "M"), screen: { kind: "input" } };
    }
    let base = s;
    if (s.screen.kind !== "result" && s.editor.root.length > 0) {
      base = onEquals(s, createUint32Rng(s.rngSeed));
      if (base.screen.kind === "error") {
        return base;
      }
    }
    const imag = base.result?.internal?.im ?? base.result?.complex?.im ?? "0";
    if (imag !== "0" && !D(imag).isZero()) {
      return {
        ...clearLatches(base),
        screen: { kind: "error", code: "Math ERROR", expression: base.editor.root, errorIndex: 0 },
        result: null,
      };
    }
    const value = parseCalcNumber(base.result?.internal?.re ?? base.result?.complex?.re ?? base.result?.approx ?? base.ans);
    const next = roundInternal(s.shift ? parseCalcNumber(base.memoryM).minus(value) : parseCalcNumber(base.memoryM).plus(value));
    const mStr = next.toString();
    return {
      ...clearLatches(base),
      memoryM: mStr,
      variables: { ...base.variables, M: mStr },
    };
  }

  if (event.keyId === "ans") {
    if (s.alpha) {
      return {
        ...clearLatches(s),
        editor: insertSym(beginInputIfResult(s).editor, "preAns"),
        screen: { kind: "input" },
      };
    }
    if (s.shift) {
      return { ...clearLatches(s), menu: { kind: "drg" } };
    }
    return { ...clearLatches(s), editor: insertSym(beginInputIfResult(s).editor, "ans"), screen: { kind: "input" } };
  }

  if (event.keyId === "exp10") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertSym(beginInputIfResult(s).editor, "pi"), screen: { kind: "input" } };
    }
    return {
      ...clearLatches(s),
      editor: insertCall(beginInputIfResult(s).editor, SCI10_CALL_NAME),
      screen: { kind: "input" },
    };
  }

  if (event.keyId === "dot") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertClosedCall(beginInputIfResult(s).editor, "Ran#"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertDot(beginInputIfResult(s).editor), screen: { kind: "input" } };
  }

  const digits: KeyId[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  if ((digits as string[]).includes(event.keyId) && !s.shift) {
    return {
      ...clearLatches(s),
      editor: insertDigit(beginInputIfResult(s).editor, event.keyId),
      screen: { kind: "input" },
    };
  }

  if (s.shift && event.keyId === "0") {
    return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "Rnd"), screen: { kind: "input" } };
  }
  if (s.shift && event.keyId === "9") {
    return { ...clearLatches(s), menu: { kind: "clr" } };
  }
  if (s.shift && event.keyId === "2" && s.mode === "CMPLX") {
    return { ...clearLatches(s), menu: { kind: "cmplx-op" } };
  }

  if (event.keyId === "add") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "Pol"), screen: { kind: "input" } };
    }
    const base = continueFromResult(s);
    return withBinaryOp(base, "+");
  }
  if (event.keyId === "sub") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "Rec"), screen: { kind: "input" } };
    }
    const base = continueFromResult(s);
    return withBinaryOp(base, "-");
  }
  if (event.keyId === "mul") {
    if (s.shift) {
      return withBinaryOp(beginInputIfResult(s), "nPr");
    }
    const base = continueFromResult(s);
    return withBinaryOp(base, "×");
  }
  if (event.keyId === "div") {
    if (s.shift) {
      return withBinaryOp(beginInputIfResult(s), "nCr");
    }
    const base = continueFromResult(s);
    return withBinaryOp(base, "÷");
  }

  if (event.keyId === "frac") {
    const editor = beginInputIfResult(s).editor;
    const lineIO = displayFormat === "LineIO";
    return {
      ...clearLatches(s),
      editor: !s.shift
        ? (lineIO
          ? insertLinearFraction(editor)
          : wrapCapturedArgument(editor, (num) => ({ t: "frac", num, den: [] }), "den") ?? insertFraction(editor, false))
        : insertFraction(editor, true),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "sqrt") {
    const editor = beginInputIfResult(s).editor;
    return {
      ...clearLatches(s),
      editor: wrapCapturedArgument(
        editor,
        (inner) => s.shift ? ({ t: "cbrt", inner }) : ({ t: "sqrt", inner }),
        "inner",
      ) ?? (s.shift ? insertCbrt(editor) : insertSqrt(editor)),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "square") {
    const editor = beginInputIfResult(s).editor;
    const post = s.shift ? "cube" : "sq";
    return {
      ...clearLatches(s),
      editor: insertPost(editor, post),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "power") {
    const editor = beginInputIfResult(s).editor;
    return {
      ...clearLatches(s),
      editor: s.shift
        ? wrapCapturedArgument(editor, (inner) => ({ t: "nthrt", n: [], inner }), "n") ??
          (displayFormat === "LineIO" ? insertNthRootWithIndex(editor) : insertNthRoot(editor))
        : wrapCapturedArgument(editor, (base) => ({ t: "pow", base, exp: [] }), "exp") ?? insertPower(editor),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "log") {
    const editor = beginInputIfResult(s).editor;
    if (s.shift) {
      return { ...clearLatches(s), editor: wrapCapturedArgument(editor, (args) => ({ t: "call", name: "exp10", args: [args], closed: false }), "args0") ?? insertCall(editor, "exp10"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertCall(editor, "log"), screen: { kind: "input" } };
  }
  if (event.keyId === "ln") {
    const editor = beginInputIfResult(s).editor;
    if (s.shift) {
      return { ...clearLatches(s), editor: wrapCapturedArgument(editor, (args) => ({ t: "call", name: "exp", args: [args], closed: false }), "args0") ?? insertCall(editor, "exp"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertCall(editor, "ln"), screen: { kind: "input" } };
  }
  if (event.keyId === "logab") {
    if (s.shift) {
      const editor = beginInputIfResult(s).editor;
      return { ...clearLatches(s), editor: insertNumericalCall(editor, "Σ", displayFormat), screen: { kind: "input" } };
    }
    const editor = beginInputIfResult(s).editor;
    return {
      ...clearLatches(s),
      editor: wrapCapturedArgument(editor, (arg) => ({ t: "logb", base: [], arg }), "base") ?? insertLogab(editor),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "xinv") {
    const editor = beginInputIfResult(s).editor;
    if (s.shift) {
      return { ...clearLatches(s), editor: insertPost(editor, "fact"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertPost(editor, "inv"), screen: { kind: "input" } };
  }
  if (event.keyId === "integral") {
    const editor = beginInputIfResult(s).editor;
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertColon(editor), screen: { kind: "input" } };
    }
    const name = s.shift ? "diff" : "int";
    return { ...clearLatches(s), editor: insertNumericalCall(editor, name, displayFormat), screen: { kind: "input" } };
  }
  if (event.keyId === "neg") {
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "A"), screen: { kind: "input" } };
    }
    if (s.shift) {
      return withBinaryOp(s, "∠");
    }
    return { ...clearLatches(s), editor: insertNeg(beginInputIfResult(s).editor), screen: { kind: "input" } };
  }
  if (event.keyId === "lparen") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertPost(beginInputIfResult(s).editor, "pct"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertGroup(beginInputIfResult(s).editor), screen: { kind: "input" } };
  }
  if (event.keyId === "rparen") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertComma(beginInputIfResult(s).editor), screen: { kind: "input" } };
    }
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "X"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: closeGroupOrCall(s.editor), screen: { kind: "input" } };
  }
  if (event.keyId === "sin" || event.keyId === "cos" || event.keyId === "tan") {
    const name = trigName(s, event.keyId);
    return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, name), screen: { kind: "input" } };
  }
  if (event.keyId === "dms") {
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "B"), screen: { kind: "input" } };
    }
    if (s.screen.kind === "result" && s.result) {
      try {
        const toggled = toggleSexagesimal(s.result, s.setup);
        return { ...clearLatches(s), result: toggled };
      } catch (err) {
        const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
        return commitEqualsError(s, code);
      }
    }
    return { ...clearLatches(s), editor: insertDms(beginInputIfResult(s).editor), screen: { kind: "input" } };
  }
  if (event.keyId === "eng") {
    if (s.mode === "CMPLX" && !s.shift) {
      return { ...clearLatches(s), editor: insertSym(beginInputIfResult(s).editor, "i"), screen: { kind: "input" } };
    }
    if (s.result) {
      const x = parseCalcNumber(s.result.internal?.re ?? s.result.approx);
      const prev = s.result.engActive ? (s.result.engOffset ?? 0) : 0;
      const nextOffset = s.result.engActive ? prev + (s.shift ? 1 : -1) : s.shift ? 1 : 0;
      const eng = applyDecimalMark(formatEngineering(x, D(nextOffset)), s.setup.decimalMark);
      return {
        ...clearLatches(s),
        result: { ...s.result, display: eng, engOffset: nextOffset, engActive: true, naturalKind: "decimal" },
      };
    }
    return clearLatches(s);
  }

  return clearLatches(s);
}

/** Enforce the selected E-7 expression byte limit after every public edit. */
export function reduce(state: CalcState, event: KeyEvent): CalcState {
  const isNavigation = event.keyId === "left" || event.keyId === "right" || event.keyId === "up" || event.keyId === "down";
  const isModifier = event.keyId === "shift" || event.keyId === "alpha" || event.keyId === "hyp";
  const keepsRecalledInput = isNavigation || isModifier || (event.keyId === "del" && state.shift);
  let base = state;
  if (state.pendingInputRecall) {
    if (keepsRecalledInput) {
      base = isNavigation ? { ...state, pendingInputRecall: false } : state;
    } else if (event.keyId !== "ac") {
      // AC plus arrows explicitly opens the old expression for editing. If the
      // next action starts another example, discard that recalled expression
      // before dispatching the key (including SHIFT/ALPHA mapped functions).
      base = {
        ...state,
        pendingInputRecall: false,
        editor: emptyEditor(),
        screen: { kind: "input" },
        result: null,
        resultDecimal: false,
        menu: { kind: "none" },
        calcSession: null,
        multiStatement: null,
        solveSession: null,
      };
    } else {
      base = { ...state, pendingInputRecall: false };
    }
  }
  const next = reduceInternal(base, event);
  const editorChanged = next.editor.root !== base.editor.root;
  const previousBytes = byteCount(base.editor.root);
  const nextBytes = byteCount(next.editor.root);
  if (editorChanged && next.screen.kind === "input" && nextBytes > MAX_BYTES && nextBytes >= previousBytes) {
    return { ...next, editor: base.editor };
  }
  const naturalInput = effectiveDisplayFormat(next.mode, next.setup.displayFormat) === "MthIO-MathO";
  if (
    editorChanged &&
    next.screen.kind === "input" &&
    naturalInput &&
    naturalFormulaHeightLines(next.editor.root, next.editor.cursor) > naturalFormulaMaxHeightLines()
  ) {
    return { ...next, editor: base.editor };
  }
  return next;
}

export function dispatchKeys(state: CalcState, keys: KeyId[], nowMs = 0): CalcState {
  let s = state;
  for (const keyId of keys) {
    s = reduce(s, { keyId, source: "test", nowMs });
  }
  return s;
}

export type { MenuState };

import type { KeyEvent, KeyId } from "./keys.ts";
import {
  closeGroupOrCall,
  deleteLeft,
  emptyEditor,
  editorFromAtoms,
  insertAbs,
  insertAtom,
  insertCall,
  insertColon,
  insertComma,
  insertCbrt,
  insertCplxFmt,
  insertDigit,
  insertDot,
  insertFraction,
  insertGroup,
  insertLogab,
  insertNeg,
  insertNthRoot,
  insertOp,
  insertPost,
  insertPower,
  insertSqrt,
  insertSym,
  insertVar,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
  prepareForBinaryOp,
} from "./editor.ts";
import { evaluateEquals } from "./evaluate.ts";
import { formatBySetup, toggleDecimal } from "./format.ts";
import { D, createUint32Rng } from "./numeric.ts";
import { emptyTableSession, reduceTable, tableReturnToFx } from "./table.ts";
import { applyBaseOpMenu, emptyBaseN, reduceBaseN, reduceBaseNError } from "./baseN.ts";
import type {
  Atom,
  CalcMode,
  CalcState,
  ErrorCode,
  MenuState,
  ResultValue,
  SetupState,
  VarName,
} from "./types.ts";
import { VAR_NAMES } from "./types.ts";

const AUTO_OFF_MS = 10 * 60 * 1000;
export { AUTO_OFF_MS };

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
    resultDecimal: false,
    ans: "0",
    preAns: "0",
    ansIm: "0",
    preAnsIm: "0",
    variables: zeros,
    memoryM: "0",
    history: [],
    menu: { kind: "none" },
    lastActivityMs: nowMs,
    rngSeed: 1,
    baseN: emptyBaseN(10),
    table: null,
  };
}

function withActivity(state: CalcState, nowMs: number): CalcState {
  return { ...state, lastActivityMs: nowMs };
}

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

function withBinaryOp(state: CalcState, op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "∠"): CalcState {
  const base = continueFromResult(state);
  return {
    ...clearLatches(base),
    editor: insertOp(prepareForBinaryOp(base.editor), op),
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
        preAns: mode === "COMP" || mode === "CMPLX" ? state.preAns : "0",
        preAnsIm: mode === "COMP" || mode === "CMPLX" ? state.preAnsIm : "0",
        table: mode === "TABLE" ? emptyTableSession() : null,
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
        return { ...state, menu: { kind: "table-fmt" } };
      case "6":
        return { ...state, menu: { kind: "rdec" } };
      case "7":
        return { ...state, menu: { kind: "disp" } };
      case "8":
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
    const value = base.result?.complex?.re ?? base.result?.approx ?? base.ans;
    const imag = base.result?.complex?.im ?? "0";
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
    return null;
  }
  if (menu.kind === "contrast") {
    if (keyId === "right") {
      return applySetup(state, { contrast: Math.min(6, state.setup.contrast + 1) });
    }
    if (keyId === "left") {
      return applySetup(state, { contrast: Math.max(1, state.setup.contrast - 1) });
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
  return state;
}

function applySetup(state: CalcState, patch: Partial<SetupState>): CalcState {
  const next: CalcState = {
    ...clearLatches(state),
    setup: { ...state.setup, ...patch },
    menu: { kind: "none" },
    history: [],
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
      preAns: "0",
      ansIm: "0",
      preAnsIm: "0",
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
    editor: insertAtom(state.editor, { t: "angle", unit, inner: [] }),
    screen: { kind: "input" },
  };
}

function beginInputIfResult(state: CalcState): CalcState {
  if (state.screen.kind === "result" || state.screen.kind === "replay") {
    return {
      ...state,
      editor: emptyEditor(),
      screen: { kind: "input" },
      result: null,
    };
  }
  if (state.screen.kind === "error") {
    return { ...state, editor: emptyEditor(), screen: { kind: "input" }, result: null };
  }
  return state;
}

function continueFromResult(state: CalcState): CalcState {
  if (state.screen.kind === "result") {
    return {
      ...state,
      editor: insertSym(emptyEditor(), "ans"),
      screen: { kind: "input" },
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

function onEquals(state: CalcState, nextUint32: () => number): CalcState {
  try {
    const result = evaluateEquals(state, nextUint32);
    const entry = { expression: state.editor.root, result };
    const history = [...state.history, entry].slice(-40);
    return {
      ...clearLatches(state),
      screen: { kind: "result" },
      result,
      resultDecimal: result.naturalKind === "decimal",
      preAns: state.ans,
      preAnsIm: state.ansIm,
      ans: result.complex?.re ?? result.approx,
      ansIm: result.complex?.im ?? "0",
      history,
      rngSeed: state.rngSeed + 1,
    };
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return {
      ...clearLatches(state),
      screen: {
        kind: "error",
        code,
        expression: state.editor.root,
        errorIndex: guessErrorIndex(state.editor.root),
      },
      result: null,
    };
  }
}

export function reduce(state: CalcState, event: KeyEvent): CalcState {
  const now = event.nowMs ?? state.lastActivityMs;
  if (state.power === "off" && event.keyId !== "on") {
    return state;
  }
  if (state.power === "on" && now - state.lastActivityMs > AUTO_OFF_MS && event.keyId !== "on") {
    return { ...state, power: "off", screen: { kind: "off" } };
  }
  let s = withActivity(state, now);
  if (event.keyId === "on") {
    const next = {
      ...s,
      power: "on" as const,
      screen: { kind: "input" as const },
      shift: false,
      alpha: false,
      hyp: false,
      menu: { kind: "none" as const },
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

  if (event.keyId === "hyp") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertAbs(beginInputIfResult(s).editor), screen: { kind: "input" } };
    }
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertVar(beginInputIfResult(s).editor, "C"), screen: { kind: "input" } };
    }
    return { ...s, hyp: true };
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
    return { ...clearLatches(s), editor: emptyEditor(), screen: { kind: "input" }, result: null, menu: { kind: "none" } };
  }

  if (event.keyId === "mode") {
    if (s.shift) {
      return { ...clearLatches(s), menu: { kind: "setup", page: 0 } };
    }
    return { ...clearLatches(s), menu: { kind: "mode", page: 0 } };
  }

  if (event.keyId === "del") {
    if (s.shift) {
      return { ...clearLatches(s), editor: { ...s.editor, insertMode: s.editor.insertMode === "insert" ? "overwrite" : "insert" } };
    }
    return { ...clearLatches(s), editor: deleteLeft(s.editor), screen: { kind: "input" } };
  }

  if (event.keyId === "left") {
    if (s.screen.kind === "result") {
      return { ...clearLatches(s), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: moveLeft(s.editor), screen: { kind: "input" } };
  }
  if (event.keyId === "right") {
    if (s.screen.kind === "result") {
      return { ...clearLatches(s), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: moveRight(s.editor), screen: { kind: "input" } };
  }
  if (event.keyId === "up" || event.keyId === "down") {
    if (s.screen.kind === "result" || s.screen.kind === "input") {
      const hist = s.history;
      if (hist.length === 0) {
        return clearLatches(s);
      }
      const idx = event.keyId === "up" ? hist.length - 1 : 0;
      const entry = hist[idx];
      if (!entry) {
        return clearLatches(s);
      }
      return {
        ...clearLatches(s),
        editor: editorFromAtoms(entry.expression),
        screen: { kind: "replay", historyIndex: idx },
        result: entry.result,
      };
    }
    if (s.screen.kind === "replay") {
      const delta = event.keyId === "up" ? -1 : 1;
      const idx = Math.min(s.history.length - 1, Math.max(0, s.screen.historyIndex + delta));
      const entry = s.history[idx];
      if (!entry) {
        return s;
      }
      return {
        ...s,
        editor: editorFromAtoms(entry.expression),
        screen: { kind: "replay", historyIndex: idx },
        result: entry.result,
      };
    }
    return { ...clearLatches(s), editor: event.keyId === "up" ? moveUp(s.editor) : moveDown(s.editor) };
  }

  if (event.keyId === "equals") {
    const rng = createUint32Rng(s.rngSeed);
    if (s.shift) {
      try {
        const result = evaluateEquals(s, rng);
        const approx: ResultValue = { ...result, display: result.approx, naturalKind: "decimal" };
        return {
          ...clearLatches(s),
          screen: { kind: "result" },
          result: approx,
          resultDecimal: true,
          preAns: s.ans,
          preAnsIm: s.ansIm,
          ans: result.complex?.re ?? result.approx,
          ansIm: result.complex?.im ?? "0",
          history: [...s.history, { expression: s.editor.root, result: approx }].slice(-40),
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
      return { ...clearLatches(s), setup: next };
    }
    if (s.result) {
      const toggled = toggleDecimal(s.result);
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
    const imag = base.result?.complex?.im ?? "0";
    if (imag !== "0" && !D(imag).isZero()) {
      return {
        ...clearLatches(base),
        screen: { kind: "error", code: "Math ERROR", expression: base.editor.root, errorIndex: 0 },
        result: null,
      };
    }
    const value = D(base.result?.complex?.re ?? base.result?.approx ?? base.ans);
    const next = s.shift ? D(base.memoryM).minus(value) : D(base.memoryM).plus(value);
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
    return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "exp10"), screen: { kind: "input" } };
  }

  if (event.keyId === "dot") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "Ran#"), screen: { kind: "input" } };
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
    return {
      ...clearLatches(s),
      editor: insertFraction(beginInputIfResult(s).editor, s.shift),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "sqrt") {
    return {
      ...clearLatches(s),
      editor: s.shift ? insertCbrt(beginInputIfResult(s).editor) : insertSqrt(beginInputIfResult(s).editor),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "square") {
    return {
      ...clearLatches(s),
      editor: insertPost(beginInputIfResult(s).editor, s.shift ? "cube" : "sq"),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "power") {
    return {
      ...clearLatches(s),
      editor: s.shift ? insertNthRoot(beginInputIfResult(s).editor) : insertPower(beginInputIfResult(s).editor),
      screen: { kind: "input" },
    };
  }
  if (event.keyId === "log") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "exp10"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "log"), screen: { kind: "input" } };
  }
  if (event.keyId === "ln") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "exp"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "ln"), screen: { kind: "input" } };
  }
  if (event.keyId === "logab") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, "Σ"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertLogab(beginInputIfResult(s).editor), screen: { kind: "input" } };
  }
  if (event.keyId === "xinv") {
    if (s.shift) {
      return { ...clearLatches(s), editor: insertPost(beginInputIfResult(s).editor, "fact"), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertPost(beginInputIfResult(s).editor, "inv"), screen: { kind: "input" } };
  }
  if (event.keyId === "integral") {
    if (s.alpha) {
      return { ...clearLatches(s), editor: insertColon(beginInputIfResult(s).editor), screen: { kind: "input" } };
    }
    return { ...clearLatches(s), editor: insertCall(beginInputIfResult(s).editor, s.shift ? "diff" : "int"), screen: { kind: "input" } };
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
    return { ...clearLatches(s), editor: insertPost(beginInputIfResult(s).editor, "dms"), screen: { kind: "input" } };
  }
  if (event.keyId === "eng") {
    if (s.result) {
      const x = D(s.result.approx);
      const shifted = s.shift ? x.div(1000) : x.times(s.result.approx.includes("×10") ? 1 : 1);
      void shifted;
      const eng = formatBySetup(x, { ...s.setup, numberFormat: { kind: "Sci", n: 4 } });
      return { ...clearLatches(s), result: { ...s.result, display: eng, approx: eng, naturalKind: "decimal" } };
    }
    return clearLatches(s);
  }

  return clearLatches(s);
}

export function dispatchKeys(state: CalcState, keys: KeyId[], nowMs = 0): CalcState {
  let s = state;
  for (const keyId of keys) {
    s = reduce(s, { keyId, source: "test", nowMs });
  }
  return s;
}

export type { MenuState };

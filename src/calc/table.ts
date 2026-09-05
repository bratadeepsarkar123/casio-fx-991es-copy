import { Decimal } from "decimal.js";
import {
  deleteLeft,
  editorFromAtoms,
  emptyEditor,
  moveDown,
  moveUp,
} from "./editor.ts";
import { resultFromSym } from "./format.ts";
import { fromDec } from "./symbolic.ts";
import { evaluateAtoms } from "./evaluate.ts";
import { createUint32Rng, D, parseCalcNumber, type Dec } from "./numeric.ts";
import type { KeyEvent } from "./keys.ts";
import type {
  Atom,
  CalcState,
  ErrorCode,
  TablePhase,
  TableRow,
  TableSession,
} from "./types.ts";

/** TARGET-OFFICIAL-DOC: max 30 X-values (Insufficient MEM Error). */
export const TABLE_MAX_ROWS = 30;

/** TARGET-OFFICIAL-DOC defaults. */
export const TABLE_DEFAULT_START = "1";
export const TABLE_DEFAULT_END = "5";
export const TABLE_DEFAULT_STEP = "1";

/** TARGET-OFFICIAL-DOC: cannot appear in f(x). */
const FORBIDDEN_CALLS = new Set(["Pol", "Rec", "int", "diff", "Σ"]);

export function emptyTableSession(): TableSession {
  return {
    phase: "fx",
    fx: [],
    startAtoms: [],
    endAtoms: [],
    stepAtoms: [],
    rows: [],
    rowIndex: 0,
  };
}

export function enterTableMode(state: CalcState): CalcState {
  return {
    ...state,
    mode: "TABLE",
    table: emptyTableSession(),
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
    history: [],
  };
}

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

function numAtoms(s: string): Atom[] {
  return [{ t: "num", s }];
}

function editorWithDefault(atoms: Atom[], fallback: string) {
  return editorFromAtoms(atoms.length > 0 ? atoms : numAtoms(fallback));
}

function walkAtoms(atoms: Atom[], visit: (atom: Atom) => void): void {
  for (const atom of atoms) {
    visit(atom);
    switch (atom.t) {
      case "num":
      case "op":
      case "var":
      case "sym":
      case "colon":
      case "comma":
      case "placeholder":
      case "cplxfmt":
        break;
      case "frac":
        walkAtoms(atom.num, visit);
        walkAtoms(atom.den, visit);
        break;
      case "mixed":
        walkAtoms(atom.whole, visit);
        walkAtoms(atom.num, visit);
        walkAtoms(atom.den, visit);
        break;
      case "sexagesimal":
        walkAtoms(atom.deg, visit);
        walkAtoms(atom.min, visit);
        walkAtoms(atom.sec, visit);
        break;
      case "sqrt":
      case "cbrt":
      case "neg":
      case "abs":
      case "group":
      case "post":
      case "angle":
        walkAtoms(atom.inner, visit);
        break;
      case "nthrt":
        walkAtoms(atom.n, visit);
        walkAtoms(atom.inner, visit);
        break;
      case "pow":
        walkAtoms(atom.base, visit);
        walkAtoms(atom.exp, visit);
        break;
      case "logb":
        walkAtoms(atom.base, visit);
        walkAtoms(atom.arg, visit);
        break;
      case "call":
        for (const arg of atom.args) {
          walkAtoms(arg, visit);
        }
        break;
      default: {
        const _never: never = atom;
        return _never;
      }
    }
  }
}

export function tableFunctionHasForbiddenCall(atoms: Atom[]): boolean {
  let found = false;
  walkAtoms(atoms, (atom) => {
    if (atom.t === "call" && FORBIDDEN_CALLS.has(atom.name)) {
      found = true;
    }
  });
  return found;
}

export function planTableXs(
  start: Dec,
  end: Dec,
  step: Dec,
): { ok: true; xs: Dec[] } | { ok: false; code: ErrorCode } {
  if (!start.isFinite() || !end.isFinite() || !step.isFinite()) {
    return { ok: false, code: "Math ERROR" };
  }
  if (step.lte(0)) {
    return { ok: false, code: "Argument ERROR" };
  }
  if (end.lte(start)) {
    return { ok: false, code: "Argument ERROR" };
  }
  const span = end.minus(start).div(step);
  const nMinus1 = span.toDecimalPlaces(0, Decimal.ROUND_FLOOR);
  const count = nMinus1.plus(1);
  if (count.gt(TABLE_MAX_ROWS)) {
    return { ok: false, code: "Insufficient MEM Error" };
  }
  if (count.lt(1)) {
    return { ok: false, code: "Argument ERROR" };
  }
  const xs: Dec[] = [];
  let i = D(0);
  while (i.lt(count)) {
    xs.push(start.plus(step.times(i)));
    i = i.plus(1);
  }
  return { ok: true, xs };
}

function tableError(state: CalcState, code: ErrorCode, expression: Atom[]): CalcState {
  return {
    ...clearLatches(state),
    screen: { kind: "error", code, expression, errorIndex: 0 },
    result: null,
  };
}

function evalParam(state: CalcState, atoms: Atom[]): { ok: true; value: Dec; result: ReturnType<typeof evaluateAtoms> } | { ok: false; code: ErrorCode } {
  try {
    const result = evaluateAtoms(atoms, state, createUint32Rng(state.rngSeed));
    const value = parseCalcNumber(result.approx);
    if (!value.isFinite()) {
      return { ok: false, code: "Math ERROR" };
    }
    return { ok: true, value, result };
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return { ok: false, code };
  }
}

export function generateTableRows(
  state: CalcState,
  fx: Atom[],
  xs: Dec[],
): { rows: TableRow[]; lastX: string; rngSeed: number } {
  const rows: TableRow[] = [];
  let seed = state.rngSeed;
  let lastX = state.variables.X;
  for (const x of xs) {
    const xShown = resultFromSym(fromDec(x), state.setup);
    lastX = xShown.approx;
    try {
      const fxResult = evaluateAtoms(fx, state, createUint32Rng(seed), { X: x.toString() });
      rows.push({
        xApprox: xShown.approx,
        xDisplay: xShown.display,
        fxApprox: fxResult.approx,
        fxDisplay: fxResult.display,
        fxError: null,
      });
    } catch (err) {
      const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
      rows.push({
        xApprox: xShown.approx,
        xDisplay: xShown.display,
        fxApprox: null,
        fxDisplay: null,
        fxError: code,
      });
    }
    seed += 1;
  }
  return { rows, lastX, rngSeed: seed };
}

function goPrompt(state: CalcState, phase: Exclude<TablePhase, "view">, atoms: Atom[], fallback: string): CalcState {
  const table = state.table ?? emptyTableSession();
  return {
    ...clearLatches(state),
    table: { ...table, phase, rows: [], rowIndex: 0 },
    editor: editorWithDefault(atoms, fallback),
    screen: { kind: "input" },
    result: null,
  };
}

export function tableReturnToFx(state: CalcState): CalcState {
  const table = state.table ?? emptyTableSession();
  return {
    ...clearLatches(state),
    table: { ...table, phase: "fx", rows: [], rowIndex: 0 },
    editor: editorFromAtoms(table.fx),
    screen: { kind: "input" },
    result: null,
  };
}

export function tableConfirm(state: CalcState): CalcState {
  const table = state.table ?? emptyTableSession();
  switch (table.phase) {
    case "fx": {
      const fx = state.editor.root;
      if (fx.length === 0) {
        return tableError(state, "Syntax ERROR", fx);
      }
      if (tableFunctionHasForbiddenCall(fx)) {
        return tableError(state, "Syntax ERROR", fx);
      }
      return goPrompt({ ...state, table: { ...table, fx } }, "start", table.startAtoms, TABLE_DEFAULT_START);
    }
    case "start": {
      const atoms = state.editor.root.length > 0 ? state.editor.root : numAtoms(TABLE_DEFAULT_START);
      const parsed = evalParam(state, atoms);
      if (!parsed.ok) {
        return tableError(state, parsed.code, atoms);
      }
      return goPrompt(
        { ...state, table: { ...table, startAtoms: atoms } },
        "end",
        table.endAtoms,
        TABLE_DEFAULT_END,
      );
    }
    case "end": {
      const atoms = state.editor.root.length > 0 ? state.editor.root : numAtoms(TABLE_DEFAULT_END);
      const parsed = evalParam(state, atoms);
      if (!parsed.ok) {
        return tableError(state, parsed.code, atoms);
      }
      return goPrompt(
        { ...state, table: { ...table, endAtoms: atoms } },
        "step",
        table.stepAtoms,
        TABLE_DEFAULT_STEP,
      );
    }
    case "step": {
      const stepAtoms = state.editor.root.length > 0 ? state.editor.root : numAtoms(TABLE_DEFAULT_STEP);
      const startAtoms = table.startAtoms.length > 0 ? table.startAtoms : numAtoms(TABLE_DEFAULT_START);
      const endAtoms = table.endAtoms.length > 0 ? table.endAtoms : numAtoms(TABLE_DEFAULT_END);
      const startP = evalParam(state, startAtoms);
      const endP = evalParam(state, endAtoms);
      const stepP = evalParam(state, stepAtoms);
      if (!startP.ok) {
        return tableError(state, startP.code, startAtoms);
      }
      if (!endP.ok) {
        return tableError(state, endP.code, endAtoms);
      }
      if (!stepP.ok) {
        return tableError(state, stepP.code, stepAtoms);
      }
      const planned = planTableXs(startP.value, endP.value, stepP.value);
      if (!planned.ok) {
        return tableError(state, planned.code, stepAtoms);
      }
      const generated = generateTableRows(state, table.fx, planned.xs);
      return {
        ...clearLatches(state),
        table: {
          ...table,
          phase: "view",
          stepAtoms,
          rows: generated.rows,
          rowIndex: 0,
        },
        editor: emptyEditor(),
        screen: { kind: "table-view" },
        result: null,
        rngSeed: generated.rngSeed,
        variables: { ...state.variables, X: generated.lastX },
      };
    }
    case "view":
      return clearLatches(state);
    default: {
      const _never: never = table.phase;
      return _never;
    }
  }
}

function tableMove(state: CalcState, delta: number): CalcState {
  const table = state.table;
  if (!table || table.rows.length === 0) {
    return state;
  }
  let next = table.rowIndex + delta;
  if (next < 0) {
    next = 0;
  }
  if (next > table.rows.length - 1) {
    next = table.rows.length - 1;
  }
  return {
    ...clearLatches(state),
    table: { ...table, rowIndex: next },
    screen: { kind: "table-view" },
  };
}

/**
 * TABLE-owned reducer. Returns null to fall through to COMP editing keys.
 */
export function reduceTable(state: CalcState, event: KeyEvent): CalcState | null {
  if (state.mode !== "TABLE" || !state.table) {
    return null;
  }
  const keyId = event.keyId;
  const phase = state.table.phase;

  if (phase === "view") {
    if (keyId === "mode") {
      return null;
    }
    if (keyId === "ac") {
      if (state.shift) {
        return null;
      }
      return tableReturnToFx(state);
    }
    if (keyId === "up") {
      return tableMove(state, -1);
    }
    if (keyId === "down") {
      return tableMove(state, 1);
    }
    if (keyId === "equals") {
      return clearLatches(state);
    }
    if (keyId === "del") {
      return clearLatches(state);
    }
    if (keyId === "left" || keyId === "right") {
      return clearLatches(state);
    }
    return clearLatches(state);
  }

  if (keyId === "equals") {
    return tableConfirm(state);
  }
  if (keyId === "up") {
    return { ...clearLatches(state), editor: moveUp(state.editor), screen: { kind: "input" } };
  }
  if (keyId === "down") {
    return { ...clearLatches(state), editor: moveDown(state.editor), screen: { kind: "input" } };
  }
  if (keyId === "del" && !state.shift) {
    return { ...clearLatches(state), editor: deleteLeft(state.editor), screen: { kind: "input" } };
  }
  return null;
}

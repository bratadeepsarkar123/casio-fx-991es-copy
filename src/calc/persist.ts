import type { CalcState, VarName } from "./types.ts";
import { VAR_NAMES } from "./types.ts";
import { createInitialState } from "./machine.ts";
import { emptyTableSession } from "./table.ts";
import { emptyBaseN } from "./baseN.ts";

export const PERSIST_KEY = "fx991es-plus2/v1";
export const SCHEMA_VERSION = 1;

export interface PersistEnvelope {
  schemaVersion: 1;
  savedAt: number;
  state: CalcState;
}

const CALC_MODES = new Set([
  "COMP",
  "CMPLX",
  "STAT",
  "BASE-N",
  "EQN",
  "MATRIX",
  "TABLE",
  "VECTOR",
]);

const POWERS = new Set(["on", "off"]);
const INSERT_MODES = new Set(["insert", "overwrite"]);
const DISPLAY_FORMATS = new Set(["MthIO-MathO", "MthIO-LineO", "LineIO"]);
const ANGLE_UNITS = new Set(["Deg", "Rad", "Gra"]);
const FRACTION_FORMATS = new Set(["d/c", "ab/c"]);
const COMPLEX_FORMATS = new Set(["a+bi", "r∠θ"]);
const TABLE_FORMATS = new Set(["f(x)", "f(x),g(x)"]);
const DECIMAL_MARKS = new Set(["Dot", "Comma"]);
const NUMBER_FORMAT_KINDS = new Set(["Norm", "Fix", "Sci"]);
const RADICES = new Set([2, 8, 10, 16]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSetup(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (!DISPLAY_FORMATS.has(value.displayFormat as string)) {
    return false;
  }
  if (!ANGLE_UNITS.has(value.angleUnit as string)) {
    return false;
  }
  if (!isRecord(value.numberFormat)) {
    return false;
  }
  if (!NUMBER_FORMAT_KINDS.has(value.numberFormat.kind as string)) {
    return false;
  }
  if (typeof value.numberFormat.n !== "number") {
    return false;
  }
  if (!FRACTION_FORMATS.has(value.fractionFormat as string)) {
    return false;
  }
  if (!COMPLEX_FORMATS.has(value.complexFormat as string)) {
    return false;
  }
  if (typeof value.statFreq !== "boolean") {
    return false;
  }
  if (!TABLE_FORMATS.has(value.tableFormat as string)) {
    return false;
  }
  if (typeof value.rdec !== "boolean") {
    return false;
  }
  if (!DECIMAL_MARKS.has(value.decimalMark as string)) {
    return false;
  }
  return typeof value.contrast === "number";
}

function isEditor(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (!Array.isArray(value.root)) {
    return false;
  }
  if (!INSERT_MODES.has(value.insertMode as string)) {
    return false;
  }
  if (!isRecord(value.cursor)) {
    return false;
  }
  if (!Array.isArray(value.cursor.path)) {
    return false;
  }
  if (typeof value.cursor.index !== "number") {
    return false;
  }
  return value.cursor.offset === null || typeof value.cursor.offset === "number";
}

function isScreen(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  switch (value.kind) {
    case "input":
    case "result":
    case "off":
      return true;
    case "error":
      return (
        typeof value.code === "string" &&
        Array.isArray(value.expression) &&
        typeof value.errorIndex === "number"
      );
    case "replay":
      return typeof value.historyIndex === "number";
    case "table-view":
      return true;
    default:
      return false;
  }
}

function isVariables(value: unknown): value is Record<VarName, string> {
  if (!isRecord(value)) {
    return false;
  }
  for (const name of VAR_NAMES) {
    if (typeof value[name] !== "string") {
      return false;
    }
  }
  return true;
}

function isResultValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.approx === "string" &&
    typeof value.display === "string" &&
    typeof value.naturalKind === "string"
  );
}

/**
 * Structural schema-v1 check. Does not deep-validate Atom trees.
 * Rejects envelopes that would otherwise be spread into CalcState and
 * become a second, corrupt source of truth.
 */
export function isPersistedCalcState(value: unknown): value is CalcState {
  if (!isRecord(value)) {
    return false;
  }
  if (value.schemaVersion !== 1) {
    return false;
  }
  if (typeof value.power !== "string" || !POWERS.has(value.power)) {
    return false;
  }
  if (typeof value.mode !== "string" || !CALC_MODES.has(value.mode)) {
    return false;
  }
  if (!isSetup(value.setup)) {
    return false;
  }
  if (typeof value.shift !== "boolean" || typeof value.alpha !== "boolean" || typeof value.hyp !== "boolean") {
    return false;
  }
  if (!isEditor(value.editor)) {
    return false;
  }
  if (!isScreen(value.screen)) {
    return false;
  }
  if (!isResultValue(value.result)) {
    return false;
  }
  if (typeof value.resultDecimal !== "boolean") {
    return false;
  }
  if (typeof value.ans !== "string" || typeof value.preAns !== "string") {
    return false;
  }
  if (value.ansIm !== undefined && typeof value.ansIm !== "string") {
    return false;
  }
  if (value.preAnsIm !== undefined && typeof value.preAnsIm !== "string") {
    return false;
  }
  if (!isVariables(value.variables)) {
    return false;
  }
  if (typeof value.memoryM !== "string") {
    return false;
  }
  if (!Array.isArray(value.history)) {
    return false;
  }
  if (!isRecord(value.menu) || typeof value.menu.kind !== "string") {
    return false;
  }
  if (typeof value.lastActivityMs !== "number" || typeof value.rngSeed !== "number") {
    return false;
  }
  if (!isRecord(value.baseN) || !RADICES.has(value.baseN.radix as number)) {
    return false;
  }
  return true;
}

export function serializeState(state: CalcState): PersistEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: Date.now(),
    state: {
      ...state,
      table: null,
      baseN: emptyBaseN(state.baseN.radix),
      editor: state.mode === "TABLE" || state.mode === "BASE-N" ? createInitialState(0).editor : state.editor,
      screen: state.mode === "TABLE" || state.mode === "BASE-N" ? { kind: "input" } : state.screen,
      result: state.mode === "TABLE" || state.mode === "BASE-N" ? null : state.result,
    },
  };
}

export function deserializeState(raw: unknown, nowMs = 0): CalcState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const env = raw as Partial<PersistEnvelope>;
  if (env.schemaVersion !== 1 || !env.state) {
    return null;
  }
  if (!isPersistedCalcState(env.state)) {
    return null;
  }
  const persisted = env.state as CalcState & { ansIm?: string; preAnsIm?: string };
  return {
    ...persisted,
    ansIm: typeof persisted.ansIm === "string" ? persisted.ansIm : "0",
    preAnsIm: typeof persisted.preAnsIm === "string" ? persisted.preAnsIm : "0",
    table: env.state.mode === "TABLE" ? emptyTableSession() : null,
    baseN: emptyBaseN(env.state.baseN.radix),
    lastActivityMs: nowMs,
    power: "on",
    screen:
      env.state.power === "off"
        ? { kind: "input" }
        : env.state.mode === "TABLE" || env.state.mode === "BASE-N"
          ? { kind: "input" }
          : env.state.screen,
  };
}

export function loadPersisted(nowMs = 0): CalcState {
  try {
    const raw = globalThis.localStorage?.getItem(PERSIST_KEY);
    if (!raw) {
      return createInitialState(nowMs);
    }
    const parsed: unknown = JSON.parse(raw);
    return deserializeState(parsed, nowMs) ?? createInitialState(nowMs);
  } catch {
    return createInitialState(nowMs);
  }
}

export function savePersisted(state: CalcState): void {
  try {
    globalThis.localStorage?.setItem(PERSIST_KEY, JSON.stringify(serializeState(state)));
  } catch {
    // memory-only fallback
  }
}

export function clearPersisted(): void {
  try {
    globalThis.localStorage?.removeItem(PERSIST_KEY);
  } catch {
    // ignore
  }
}

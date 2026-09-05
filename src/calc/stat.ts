import { emptyEditor, insertCall, insertClosedCall, wrapRootAsClosedCall } from "./editor.ts";
import type { KeyEvent, KeyId } from "./keys.ts";
import { isPairedStatType, statMaxRows } from "./statNumeric.ts";
import type {
  CalcState,
  ErrorCode,
  StatCol,
  StatRow,
  StatSession,
  StatType,
} from "./types.ts";

const TYPE_BY_DIGIT: Record<string, StatType> = {
  "1": "1-VAR",
  "2": "A+BX",
  "3": "_+CX2",
  "4": "ln X",
  "5": "e^X",
  "6": "A•B^X",
  "7": "A•X^B",
  "8": "1/X",
};

const PREFIX_STAT_CALLS = new Set(["stat-P", "stat-Q", "stat-R"]);
const WRAP_STAT_CALLS = new Set(["stat-xhat", "stat-yhat", "stat-xhat1", "stat-xhat2", "stat-t"]);

function blankRow(): StatRow {
  return { x: null, y: null, freq: null };
}

export function emptyStatSession(): StatSession {
  return {
    type: null,
    phase: "type",
    typePage: 0,
    rows: [blankRow()],
    rowIndex: 0,
    col: "x",
    input: "",
    editing: false,
  };
}

export function enterStatMode(state: CalcState): CalcState {
  return {
    ...state,
    mode: "STAT",
    stat: emptyStatSession(),
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
    history: [],
  };
}

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

function withStat(state: CalcState, stat: StatSession, extra: Partial<CalcState> = {}): CalcState {
  return { ...clearLatches(state), stat, ...extra };
}

export function columnsFor(type: StatType, freqOn: boolean): StatCol[] {
  const cols: StatCol[] = ["x"];
  if (isPairedStatType(type)) {
    cols.push("y");
  }
  if (freqOn) {
    cols.push("freq");
  }
  return cols;
}

function cellOf(row: StatRow, col: StatCol): string | null {
  switch (col) {
    case "x":
      return row.x;
    case "y":
      return row.y;
    case "freq":
      return row.freq;
    default: {
      const _never: never = col;
      return _never;
    }
  }
}

function writeCell(row: StatRow, col: StatCol, value: string | null): StatRow {
  switch (col) {
    case "x":
      return { ...row, x: value };
    case "y":
      return { ...row, y: value };
    case "freq":
      return { ...row, freq: value };
    default: {
      const _never: never = col;
      return _never;
    }
  }
}

function displayedInput(stat: StatSession): string {
  if (stat.editing) {
    return stat.input;
  }
  const row = stat.rows[stat.rowIndex];
  if (!row) {
    return "";
  }
  return cellOf(row, stat.col) ?? "";
}

export function statTypeMenuText(page: 0 | 1): string {
  return page === 0 ? "1:1-VAR 2:A+BX 3:_+CX2 4:ln X" : "5:e^X 6:A•B^X 7:A•X^B 8:1/X";
}

function colLabel(col: StatCol): string {
  switch (col) {
    case "x":
      return "X";
    case "y":
      return "Y";
    case "freq":
      return "FREQ";
    default: {
      const _never: never = col;
      return _never;
    }
  }
}

export function statEditorExpression(stat: StatSession): string {
  return `${colLabel(stat.col)}${stat.rowIndex + 1}=`;
}

export function statEditorValue(stat: StatSession): string {
  return displayedInput(stat);
}

function editorState(state: CalcState, stat: StatSession): CalcState {
  return withStat(state, stat, {
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
  });
}

export function filledStatCount(rows: StatRow[], type: StatType): number {
  const paired = isPairedStatType(type);
  let n = 0;
  for (const row of rows) {
    if (row.x == null || row.x === "") {
      continue;
    }
    if (paired && (row.y == null || row.y === "")) {
      continue;
    }
    n += 1;
  }
  return n;
}

function statError(state: CalcState, code: ErrorCode): CalcState {
  return {
    ...clearLatches(state),
    screen: { kind: "error", code, expression: state.editor.root, errorIndex: 0 },
    result: null,
  };
}

function confirmType(state: CalcState, nextType: StatType): CalcState {
  const prev = state.stat;
  const prevType = prev?.type ?? null;
  const wipe = prevType == null || isPairedStatType(prevType) !== isPairedStatType(nextType);
  const keepRows = !wipe && prev ? prev.rows : [blankRow()];
  const hasData = filledStatCount(keepRows, nextType) > 0;
  const phase = hasData ? "calc" : "editor";
  return editorState(state, {
    type: nextType,
    phase,
    typePage: 0,
    rows: keepRows,
    rowIndex: 0,
    col: "x",
    input: "",
    editing: false,
  });
}

function clampCol(stat: StatSession, freqOn: boolean): StatCol {
  if (!stat.type) {
    return "x";
  }
  const cols = columnsFor(stat.type, freqOn);
  if (cols.includes(stat.col)) {
    return stat.col;
  }
  return "x";
}

function moveRow(stat: StatSession, delta: number, type: StatType, freqOn: boolean): StatSession {
  const max = statMaxRows(type, freqOn);
  let next = stat.rowIndex + delta;
  let rows = [...stat.rows];
  if (next < 0) {
    next = 0;
  }
  if (next >= rows.length) {
    if (rows.length >= max) {
      next = rows.length - 1;
    } else {
      rows = [...rows, blankRow()];
      next = rows.length - 1;
    }
  }
  return {
    ...stat,
    rows,
    rowIndex: next,
    input: "",
    editing: false,
    col: clampCol({ ...stat, rows }, freqOn),
  };
}

function moveCol(stat: StatSession, delta: number, freqOn: boolean): StatSession {
  if (!stat.type) {
    return stat;
  }
  const cols = columnsFor(stat.type, freqOn);
  const idx = cols.indexOf(stat.col);
  const next = Math.min(cols.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + delta));
  return { ...stat, col: cols[next] ?? "x", input: "", editing: false };
}

function commitCurrent(stat: StatSession): StatSession {
  const rows = [...stat.rows];
  const row = rows[stat.rowIndex] ?? blankRow();
  const value = stat.editing ? (stat.input === "" ? null : stat.input) : cellOf(row, stat.col);
  rows[stat.rowIndex] = writeCell(row, stat.col, value);
  return { ...stat, rows, input: "", editing: false };
}

function appendDigit(stat: StatSession, d: string): StatSession {
  const next = stat.editing ? stat.input + d : d;
  return { ...stat, input: next, editing: true };
}

function handleEditorKey(state: CalcState, keyId: KeyId): CalcState {
  const stat0 = state.stat;
  if (!stat0 || !stat0.type) {
    return state;
  }
  const type = stat0.type;
  const freqOn = state.setup.statFreq;
  const stat = { ...stat0, col: clampCol(stat0, freqOn) };

  if (state.shift && keyId === "1") {
    return withStat(state, stat, { menu: { kind: "stat-editor" } });
  }

  if (keyId === "ac") {
    if (state.shift) {
      return state;
    }
    const committed = commitCurrent(stat);
    return withStat(
      state,
      { ...committed, phase: "calc" },
      {
        editor: emptyEditor(),
        screen: { kind: "input" },
        result: null,
      },
    );
  }

  if (keyId === "equals") {
    const committed = commitCurrent(stat);
    const moved = moveRow(committed, 1, type, freqOn);
    if (moved.rows.length > statMaxRows(type, freqOn)) {
      return statError(withStat(state, committed), "Insufficient MEM Error");
    }
    return editorState(state, moved);
  }

  if (keyId === "del") {
    if (state.shift) {
      return clearLatches(state);
    }
    const rows = [...stat.rows];
    if (rows.length <= 1) {
      return editorState(state, {
        ...stat,
        rows: [blankRow()],
        rowIndex: 0,
        input: "",
        editing: false,
      });
    }
    rows.splice(stat.rowIndex, 1);
    const rowIndex = Math.min(stat.rowIndex, rows.length - 1);
    return editorState(state, { ...stat, rows, rowIndex, input: "", editing: false });
  }

  if (keyId === "left") {
    return editorState(state, moveCol(commitCurrent(stat), -1, freqOn));
  }
  if (keyId === "right") {
    return editorState(state, moveCol(commitCurrent(stat), 1, freqOn));
  }
  if (keyId === "up") {
    return editorState(state, moveRow(commitCurrent(stat), -1, type, freqOn));
  }
  if (keyId === "down") {
    return editorState(state, moveRow(commitCurrent(stat), 1, type, freqOn));
  }

  if (keyId === "neg") {
    const cur = displayedInput(stat);
    if (cur.startsWith("-")) {
      return editorState(state, { ...stat, input: cur.slice(1), editing: true });
    }
    return editorState(state, { ...stat, input: `-${cur}`, editing: true });
  }

  if (keyId === "dot") {
    const cur = stat.editing ? stat.input : "";
    if (cur.includes(".")) {
      return editorState(state, { ...stat, input: cur || displayedInput(stat), editing: true });
    }
    const next = stat.editing && stat.input !== "" ? `${stat.input}.` : "0.";
    return editorState(state, { ...stat, input: next, editing: true });
  }

  if (keyId === "exp10") {
    const cur = stat.editing ? stat.input : displayedInput(stat);
    if (cur.toLowerCase().includes("e")) {
      return editorState(state, { ...stat, input: cur, editing: true });
    }
    const next = cur === "" || cur === "-" ? `${cur}1e` : `${cur}e`;
    return editorState(state, { ...stat, input: next, editing: true });
  }

  const digits: KeyId[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  if ((digits as string[]).includes(keyId) && !state.shift) {
    return editorState(state, appendDigit(stat, keyId));
  }

  return editorState(state, stat);
}

function handleTypeKey(state: CalcState, keyId: KeyId): CalcState {
  const stat = state.stat ?? emptyStatSession();
  if (state.shift) {
    return withStat(state, { ...stat, phase: "type" });
  }
  if (keyId === "down") {
    return withStat(state, { ...stat, typePage: 1, phase: "type" });
  }
  if (keyId === "up") {
    return withStat(state, { ...stat, typePage: 0, phase: "type" });
  }
  const t = TYPE_BY_DIGIT[keyId];
  if (t) {
    return confirmType(state, t);
  }
  if (keyId === "ac" && !state.shift) {
    return withStat(state, stat, { menu: { kind: "none" } });
  }
  return withStat(state, { ...stat, phase: "type" });
}

export function wipeStatData(state: CalcState, keepType: boolean): CalcState {
  const prev = state.stat;
  if (!prev) {
    return { ...state, stat: emptyStatSession() };
  }
  if (!keepType || prev.type == null) {
    return editorState(state, emptyStatSession());
  }
  return editorState(state, {
    ...prev,
    rows: [blankRow()],
    rowIndex: 0,
    col: "x",
    input: "",
    editing: false,
    phase: prev.phase === "type" ? "type" : "editor",
  });
}

export function insertStatLine(state: CalcState): CalcState {
  const stat = state.stat;
  if (!stat || !stat.type || stat.phase !== "editor") {
    return { ...clearLatches(state), menu: { kind: "none" } };
  }
  const max = statMaxRows(stat.type, state.setup.statFreq);
  if (stat.rows.length >= max) {
    return statError({ ...state, menu: { kind: "none" } }, "Insufficient MEM Error");
  }
  const rows = [...stat.rows];
  rows.splice(stat.rowIndex, 0, blankRow());
  return editorState({ ...state, menu: { kind: "none" } }, { ...stat, rows, input: "", editing: false });
}

export function deleteAllStatLines(state: CalcState): CalcState {
  const stat = state.stat;
  if (!stat || !stat.type) {
    return { ...clearLatches(state), menu: { kind: "none" }, stat: emptyStatSession() };
  }
  return editorState(
    { ...state, menu: { kind: "none" } },
    {
      ...stat,
      phase: "editor",
      rows: [blankRow()],
      rowIndex: 0,
      col: "x",
      input: "",
      editing: false,
    },
  );
}

export function goStatTypeSelect(state: CalcState): CalcState {
  const stat = state.stat ?? emptyStatSession();
  return withStat(
    state,
    { ...stat, phase: "type", typePage: 0 },
    {
      menu: { kind: "none" },
      editor: emptyEditor(),
      screen: { kind: "input" },
      result: null,
    },
  );
}

export function goStatEditor(state: CalcState): CalcState {
  const stat = state.stat;
  if (!stat || !stat.type) {
    return goStatTypeSelect(state);
  }
  return editorState(
    { ...state, menu: { kind: "none" } },
    { ...stat, phase: "editor", input: "", editing: false, col: clampCol(stat, state.setup.statFreq) },
  );
}

export function insertStatCommand(state: CalcState, name: string): CalcState {
  const base =
    state.screen.kind === "result" || state.screen.kind === "replay"
      ? { ...state, editor: emptyEditor(), screen: { kind: "input" as const }, result: null }
      : { ...state, screen: { kind: "input" as const } };
  let editor = base.editor;
  if (WRAP_STAT_CALLS.has(name)) {
    editor = wrapRootAsClosedCall(base.editor, name);
  } else if (PREFIX_STAT_CALLS.has(name)) {
    editor = insertCall(base.editor, name);
  } else {
    editor = insertClosedCall(base.editor, name);
  }
  return {
    ...clearLatches(base),
    menu: { kind: "none" },
    editor,
    screen: { kind: "input" },
  };
}

/**
 * STAT-owned reducer. Returns null to fall through (MODE, SETUP, calc-phase COMP keys).
 * Editor/type phases swallow keys so they never become COMP Atom[].
 */
export function reduceStat(state: CalcState, event: KeyEvent): CalcState | null {
  if (state.mode !== "STAT" || !state.stat) {
    return null;
  }
  const keyId = event.keyId;
  const phase = state.stat.phase;

  if (state.screen.kind === "error") {
    if (phase !== "editor" && phase !== "type") {
      return null;
    }
    if (keyId === "ac") {
      if (state.shift) {
        return null;
      }
      return editorState(state, { ...state.stat, input: "", editing: false });
    }
    if (keyId === "left" || keyId === "right") {
      return editorState(state, state.stat);
    }
    return state;
  }

  if (keyId === "mode") {
    return null;
  }
  if (keyId === "ac" && state.shift) {
    return null;
  }

  if (phase === "type") {
    return handleTypeKey(state, keyId);
  }

  if (phase === "editor") {
    return handleEditorKey(state, keyId);
  }

  if (state.shift && keyId === "1") {
    return { ...clearLatches(state), menu: { kind: "stat-op" } };
  }
  return null;
}

export function isStatMenuKind(kind: CalcState["menu"]["kind"]): boolean {
  switch (kind) {
    case "stat-op":
    case "stat-editor":
    case "stat-edit":
    case "stat-sum":
    case "stat-var":
    case "stat-reg":
    case "stat-distr":
    case "stat-minmax":
      return true;
    default:
      return false;
  }
}

export function handleStatMenu(state: CalcState, keyId: KeyId): CalcState {
  const menu = state.menu;
  const type = state.stat?.type ?? null;
  const paired = type ? isPairedStatType(type) : false;

  if (menu.kind === "stat-op") {
    switch (keyId) {
      case "1":
        return goStatTypeSelect(state);
      case "2":
        return goStatEditor(state);
      case "3":
        return { ...state, menu: { kind: "stat-sum", page: 0 } };
      case "4":
        return { ...state, menu: { kind: "stat-var", page: 0 } };
      case "5":
        return { ...state, menu: { kind: paired ? "stat-reg" : "stat-distr" } };
      case "6":
        return { ...state, menu: { kind: "stat-minmax" } };
      default:
        return state;
    }
  }

  if (menu.kind === "stat-editor") {
    switch (keyId) {
      case "1":
        return goStatTypeSelect(state);
      case "2":
        return goStatEditor(state);
      case "3":
        return { ...state, menu: { kind: "stat-edit" } };
      default:
        return state;
    }
  }

  if (menu.kind === "stat-edit") {
    if (keyId === "1") {
      return insertStatLine(state);
    }
    if (keyId === "2") {
      return deleteAllStatLines(state);
    }
    return state;
  }

  if (menu.kind === "stat-sum") {
    if (keyId === "down") {
      return { ...state, menu: { kind: "stat-sum", page: 1 } };
    }
    if (keyId === "up") {
      return { ...state, menu: { kind: "stat-sum", page: 0 } };
    }
    const oneVar: Record<string, string> = { "1": "stat-sumX2", "2": "stat-sumX" };
    const pairedMap: Record<string, string> = {
      "1": "stat-sumX2",
      "2": "stat-sumX",
      "3": "stat-sumY2",
      "4": "stat-sumY",
      "5": "stat-sumXY",
      "6": "stat-sumX3",
      "7": "stat-sumX2Y",
      "8": "stat-sumX4",
    };
    const name = (paired ? pairedMap : oneVar)[keyId];
    if (name) {
      return insertStatCommand(state, name);
    }
    return state;
  }

  if (menu.kind === "stat-var") {
    if (keyId === "down") {
      return { ...state, menu: { kind: "stat-var", page: 1 } };
    }
    if (keyId === "up") {
      return { ...state, menu: { kind: "stat-var", page: 0 } };
    }
    const oneVar: Record<string, string> = {
      "1": "stat-n",
      "2": "stat-meanX",
      "3": "stat-popSdX",
      "4": "stat-sampleSdX",
    };
    const pairedMap: Record<string, string> = {
      "1": "stat-n",
      "2": "stat-meanX",
      "3": "stat-popSdX",
      "4": "stat-sampleSdX",
      "5": "stat-meanY",
      "6": "stat-popSdY",
      "7": "stat-sampleSdY",
    };
    const name = (paired ? pairedMap : oneVar)[keyId];
    if (name) {
      return insertStatCommand(state, name);
    }
    return state;
  }

  if (menu.kind === "stat-reg") {
    const quad = type === "_+CX2";
    const map: Record<string, string> = quad
      ? {
          "1": "stat-A",
          "2": "stat-B",
          "3": "stat-C",
          "4": "stat-xhat1",
          "5": "stat-xhat2",
          "6": "stat-yhat",
        }
      : {
          "1": "stat-A",
          "2": "stat-B",
          "3": "stat-r",
          "4": "stat-xhat",
          "5": "stat-yhat",
        };
    const name = map[keyId];
    if (name) {
      return insertStatCommand(state, name);
    }
    return state;
  }

  if (menu.kind === "stat-distr") {
    const map: Record<string, string> = {
      "1": "stat-P",
      "2": "stat-Q",
      "3": "stat-R",
      "4": "stat-t",
    };
    const name = map[keyId];
    if (name) {
      return insertStatCommand(state, name);
    }
    return state;
  }

  if (menu.kind === "stat-minmax") {
    const oneVar: Record<string, string> = { "1": "stat-minX", "2": "stat-maxX" };
    const pairedMap: Record<string, string> = {
      "1": "stat-minX",
      "2": "stat-maxX",
      "3": "stat-minY",
      "4": "stat-maxY",
    };
    const name = (paired ? pairedMap : oneVar)[keyId];
    if (name) {
      return insertStatCommand(state, name);
    }
    return state;
  }

  return state;
}

export function statMenuText(state: CalcState): string | null {
  const menu = state.menu;
  const type = state.stat?.type ?? null;
  const paired = type ? isPairedStatType(type) : false;
  switch (menu.kind) {
    case "stat-op":
      return paired
        ? "1:Type 2:Data 3:Sum 4:Var 5:Reg 6:MinMax"
        : "1:Type 2:Data 3:Sum 4:Var 5:Distr 6:MinMax";
    case "stat-editor":
      return "1:Type 2:Data 3:Edit";
    case "stat-edit":
      return "1:Ins 2:Del-A";
    case "stat-sum":
      if (!paired) {
        return "1:Σx² 2:Σx";
      }
      return menu.page === 0 ? "1:Σx² 2:Σx 3:Σy² 4:Σy" : "5:Σxy 6:Σx³ 7:Σx²y 8:Σx⁴";
    case "stat-var":
      if (!paired) {
        return "1:n 2:x̄ 3:σx 4:sx";
      }
      return menu.page === 0 ? "1:n 2:x̄ 3:σx 4:sx" : "5:ȳ 6:σy 7:sy";
    case "stat-reg":
      return type === "_+CX2" ? "1:A 2:B 3:C 4:x̂1 5:x̂2 6:ŷ" : "1:A 2:B 3:r 4:x̂ 5:ŷ";
    case "stat-distr":
      return "1:P( 2:Q( 3:R( 4:t";
    case "stat-minmax":
      return paired ? "1:minX 2:maxX 3:minY 4:maxY" : "1:minX 2:maxX";
    default:
      return null;
  }
}

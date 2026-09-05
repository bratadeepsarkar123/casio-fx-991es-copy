import { atomsToLinear, emptyEditor, insertCall, insertClosedCall, insertOp, insertPost, wrapRootAsClosedCall } from "./editor.ts";
import { evaluateToSym } from "./evaluate.ts";
import { resultFromSym } from "./format.ts";
import type { KeyEvent, KeyId } from "./keys.ts";
import { MATRIX_CALL_LABELS, evaluateMatrixExpr } from "./matrixEval.ts";
import { cloneMatrix, emptyMatrix } from "./matrixNumeric.ts";
import { CalcMathError, createUint32Rng } from "./numeric.ts";
import type { Atom, CalcState, ErrorCode, MatReg, MatrixDim, MatrixSession, MatrixValue } from "./types.ts";
import { isNonReal, symRat, type Sym } from "./symbolic.ts";

const ZERO_SYM: Sym = symRat(0n);

const DIM_BY_DIGIT: Record<string, { rows: MatrixDim; cols: MatrixDim }> = {
  "1": { rows: 1, cols: 1 },
  "2": { rows: 1, cols: 2 },
  "3": { rows: 1, cols: 3 },
  "4": { rows: 2, cols: 1 },
  "5": { rows: 2, cols: 2 },
  "6": { rows: 2, cols: 3 },
  "7": { rows: 3, cols: 1 },
  "8": { rows: 3, cols: 2 },
  "9": { rows: 3, cols: 3 },
};

const REG_BY_DIGIT: Record<string, "A" | "B" | "C"> = {
  "1": "A",
  "2": "B",
  "3": "C",
};

const DATA_BY_DIGIT: Record<string, MatReg> = {
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "Ans",
};

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

export function emptyMatrixSession(): MatrixSession {
  return {
    phase: "dim-reg",
    dimTarget: null,
    editorReg: null,
    row: 0,
    col: 0,
    registers: { A: null, B: null, C: null, Ans: null },
  };
}

export function wipeMatrixRegisters(session: MatrixSession): MatrixSession {
  return {
    ...session,
    phase: "dim-reg",
    dimTarget: null,
    editorReg: null,
    row: 0,
    col: 0,
    registers: { A: null, B: null, C: null, Ans: null },
  };
}

function withMatrix(state: CalcState, matrix: MatrixSession, patch: Partial<CalcState> = {}): CalcState {
  return {
    ...clearLatches(state),
    matrix,
    menu: patch.menu ?? { kind: "none" },
    editor: patch.editor ?? emptyEditor(),
    screen: patch.screen ?? { kind: "input" },
    result: patch.result ?? null,
    rngSeed: patch.rngSeed ?? state.rngSeed,
    ans: patch.ans ?? state.ans,
    ansIm: patch.ansIm ?? state.ansIm,
    preAns: patch.preAns ?? state.preAns,
    preAnsIm: patch.preAnsIm ?? state.preAnsIm,
    history: patch.history ?? state.history,
  };
}

function goCalc(state: CalcState, session: MatrixSession): CalcState {
  return withMatrix(state, { ...session, phase: "calc", editorReg: null, dimTarget: null });
}

function openEditor(state: CalcState, session: MatrixSession, reg: MatReg): CalcState {
  const m = session.registers[reg];
  if (!m) {
    return matrixError(state, "Dimension ERROR", state.editor.root);
  }
  return withMatrix(state, {
    ...session,
    phase: "editor",
    editorReg: reg,
    row: 0,
    col: 0,
    dimTarget: null,
  });
}

function assignDim(state: CalcState, session: MatrixSession, target: "A" | "B" | "C", rows: MatrixDim, cols: MatrixDim): CalcState {
  return withMatrix(state, {
    ...session,
    phase: "editor",
    dimTarget: null,
    editorReg: target,
    row: 0,
    col: 0,
    registers: { ...session.registers, [target]: emptyMatrix(rows, cols) },
  });
}

function matrixError(state: CalcState, code: ErrorCode, expression: Atom[]): CalcState {
  return {
    ...clearLatches(state),
    menu: { kind: "none" },
    screen: { kind: "error", code, expression, errorIndex: 0 },
    result: null,
  };
}

function currentMatrix(session: MatrixSession): MatrixValue | null {
  if (session.phase === "matans" || session.phase === "sto-dest") {
    return session.registers.Ans;
  }
  if (session.editorReg) {
    return session.registers[session.editorReg];
  }
  return null;
}

function isEditing(state: CalcState): boolean {
  return state.editor.root.length > 0;
}

function evalCurrentCell(state: CalcState): { sym: Sym; atoms: Atom[]; rngSeed: number } {
  const session = state.matrix;
  const stored = currentCellSym(session);
  const rng = createUint32Rng(state.rngSeed);
  if (state.editor.root.length === 0) {
    return { sym: stored, atoms: [], rngSeed: state.rngSeed };
  }
  const sym = evaluateToSym(state.editor.root, state, rng);
  if (isNonReal(sym)) {
    throw new CalcMathError();
  }
  return { atoms: state.editor.root, sym, rngSeed: state.rngSeed + 1 };
}

function currentCellSym(session: MatrixSession | null): Sym {
  if (!session || !session.editorReg) {
    return ZERO_SYM;
  }
  const m = session.registers[session.editorReg];
  return m?.cells[session.row]?.[session.col] ?? ZERO_SYM;
}

function writeCell(session: MatrixSession, sym: Sym): MatrixSession {
  const reg = session.editorReg;
  if (!reg) {
    return session;
  }
  const m = session.registers[reg];
  if (!m) {
    return session;
  }
  const next = cloneMatrix(m);
  const row = next.cells[session.row];
  if (!row || session.col >= row.length) {
    return session;
  }
  row[session.col] = sym;
  return { ...session, registers: { ...session.registers, [reg]: next } };
}

function lastCell(m: MatrixValue, row: number, col: number): boolean {
  return row === m.rows - 1 && col === m.cols - 1;
}

function nextCell(m: MatrixValue, row: number, col: number): { row: number; col: number } {
  if (col + 1 < m.cols) {
    return { row, col: col + 1 };
  }
  if (row + 1 < m.rows) {
    return { row: row + 1, col: 0 };
  }
  return { row, col };
}

function commitCell(state: CalcState): CalcState {
  const session = state.matrix;
  if (!session || !session.editorReg) {
    return state;
  }
  try {
    const { sym, rngSeed } = evalCurrentCell(state);
    return withMatrix(state, writeCell(session, sym), { rngSeed });
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return matrixError(state, code, state.editor.root);
  }
}

function moveEditor(state: CalcState, dRow: number, dCol: number): CalcState {
  const session = state.matrix;
  if (!session || !session.editorReg) {
    return state;
  }
  const m = session.registers[session.editorReg];
  if (!m) {
    return state;
  }
  let next = state;
  if (isEditing(state)) {
    next = commitCell(state);
    if (next.screen.kind === "error") {
      return next;
    }
  }
  const sess = next.matrix;
  if (!sess) {
    return next;
  }
  const row = Math.min(m.rows - 1, Math.max(0, sess.row + dRow));
  const col = Math.min(m.cols - 1, Math.max(0, sess.col + dCol));
  return withMatrix(next, { ...sess, row, col, phase: "editor" });
}

function showMatAns(state: CalcState, session: MatrixSession, matrix: MatrixValue, row = 0, col = 0): CalcState {
  const rr = Math.min(matrix.rows - 1, Math.max(0, row));
  const cc = Math.min(matrix.cols - 1, Math.max(0, col));
  const cell = matrix.cells[rr]?.[cc] ?? ZERO_SYM;
  const result = resultFromSym(cell, state.setup);
  return withMatrix(
    state,
    {
      ...session,
      phase: "matans",
      editorReg: "Ans",
      row: rr,
      col: cc,
      registers: { ...session.registers, Ans: cloneMatrix(matrix) },
    },
    { screen: { kind: "result" }, result, editor: emptyEditor() },
  );
}

function insertMatCall(state: CalcState, name: string): CalcState {
  const base =
    state.screen.kind === "result" || state.screen.kind === "replay"
      ? { ...state, editor: emptyEditor(), screen: { kind: "input" as const }, result: null }
      : { ...state, screen: { kind: "input" as const } };
  let editor = base.editor;
  if (name === "mat-det" || name === "mat-trn") {
    editor = wrapRootAsClosedCall(base.editor, name);
    if (base.editor.root.length === 0) {
      editor = insertCall(base.editor, name);
    }
  } else {
    editor = insertClosedCall(base.editor, name);
  }
  const session = state.matrix ?? emptyMatrixSession();
  return {
    ...clearLatches(base),
    matrix: { ...session, phase: "calc" },
    menu: { kind: "none" },
    editor,
    screen: { kind: "input" },
    result: null,
  };
}

function matAnsContinue(state: CalcState, kind: "add" | "sub" | "mul" | "div" | "sq" | "cube"): CalcState {
  const session = state.matrix;
  if (!session || !session.registers.Ans) {
    return matrixError(state, "Dimension ERROR", []);
  }
  let editor = insertClosedCall(emptyEditor(), "mat-Ans");
  if (kind === "sq" || kind === "cube") {
    editor = insertPost(editor, kind);
  } else {
    const op = kind === "add" ? "+" : kind === "sub" ? "-" : kind === "mul" ? "×" : "÷";
    editor = insertOp(editor, op);
  }
  return withMatrix(state, { ...session, phase: "calc", editorReg: null }, { editor, screen: { kind: "input" } });
}

function onCalcEquals(state: CalcState): CalcState {
  const session = state.matrix;
  if (!session) {
    return state;
  }
  if (state.editor.root.length === 0) {
    return clearLatches(state);
  }
  try {
    const out = evaluateMatrixExpr(state.editor.root, state);
    if (out.kind === "matrix") {
      return showMatAns(state, session, out.matrix, 0, 0);
    }
    const result = resultFromSym(out.sym, state.setup);
    return withMatrix(
      state,
      { ...session, phase: "calc" },
      {
        screen: { kind: "result" },
        result,
        ans: result.complex?.re ?? result.approx,
        ansIm: result.complex?.im ?? "0",
        preAns: state.ans,
        preAnsIm: state.ansIm,
        history: [...state.history, { expression: state.editor.root, result }].slice(-40),
        editor: state.editor,
      },
    );
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return matrixError(state, code, state.editor.root);
  }
}

function copyToReg(state: CalcState, dest: "A" | "B" | "C"): CalcState {
  const session = state.matrix;
  if (!session) {
    return state;
  }
  const src = currentMatrix(session);
  if (!src) {
    return matrixError(state, "Dimension ERROR", []);
  }
  return goCalc(state, {
    ...session,
    registers: { ...session.registers, [dest]: cloneMatrix(src) },
  });
}

function unsupportedEditorKey(state: CalcState, keyId: KeyId): boolean {
  if (state.shift && (keyId === "add" || keyId === "sub" || keyId === "mplus")) {
    return true;
  }
  if (state.alpha && keyId === "integral") {
    return true;
  }
  if (keyId === "mplus" || keyId === "calc") {
    return true;
  }
  return false;
}

function handleDimReg(state: CalcState, keyId: KeyId): CalcState {
  const session = state.matrix ?? emptyMatrixSession();
  if (keyId === "ac") {
    return goCalc(state, session);
  }
  const target = REG_BY_DIGIT[keyId];
  if (target) {
    return withMatrix(state, { ...session, phase: "dim-size", dimTarget: target });
  }
  return clearLatches(state);
}

function handleDimSize(state: CalcState, keyId: KeyId): CalcState {
  const session = state.matrix;
  if (!session || !session.dimTarget) {
    return withMatrix(state, emptyMatrixSession());
  }
  if (keyId === "ac") {
    return withMatrix(state, { ...session, phase: "dim-reg", dimTarget: null });
  }
  const dim = DIM_BY_DIGIT[keyId];
  if (dim) {
    return assignDim(state, session, session.dimTarget, dim.rows, dim.cols);
  }
  return clearLatches(state);
}

function handleDataReg(state: CalcState, keyId: KeyId): CalcState {
  const session = state.matrix ?? emptyMatrixSession();
  if (keyId === "ac") {
    return goCalc(state, session);
  }
  const reg = DATA_BY_DIGIT[keyId];
  if (reg) {
    return openEditor(state, session, reg);
  }
  return clearLatches(state);
}

function handleEditorKey(state: CalcState, keyId: KeyId): CalcState | null {
  const session = state.matrix;
  if (!session || !session.editorReg) {
    return state;
  }
  if (keyId === "mode") {
    return null;
  }
  if (state.shift && keyId === "4") {
    return { ...clearLatches(state), menu: { kind: "matrix-op" } };
  }
  if (state.shift && keyId === "rcl") {
    return withMatrix(state, { ...session, phase: "sto-dest" });
  }
  if (unsupportedEditorKey(state, keyId)) {
    return clearLatches(state);
  }
  if (keyId === "ac") {
    if (isEditing(state)) {
      const committed = commitCell(state);
      if (committed.screen.kind === "error") {
        return committed;
      }
      return goCalc(committed, committed.matrix ?? session);
    }
    return goCalc(state, session);
  }
  if (keyId === "equals") {
    const committed = commitCell(state);
    if (committed.screen.kind === "error") {
      return committed;
    }
    const sess = committed.matrix;
    if (!sess || !sess.editorReg) {
      return committed;
    }
    const m = sess.registers[sess.editorReg];
    if (!m) {
      return committed;
    }
    if (lastCell(m, sess.row, sess.col)) {
      return committed;
    }
    const next = nextCell(m, sess.row, sess.col);
    return withMatrix(committed, { ...sess, ...next, phase: "editor" });
  }
  if (keyId === "left") {
    return moveEditor(state, 0, -1);
  }
  if (keyId === "right") {
    return moveEditor(state, 0, 1);
  }
  if (keyId === "up") {
    return moveEditor(state, -1, 0);
  }
  if (keyId === "down") {
    return moveEditor(state, 1, 0);
  }
  return null;
}

function handleMatAnsKey(state: CalcState, keyId: KeyId): CalcState | null {
  const session = state.matrix;
  if (!session) {
    return state;
  }
  const m = session.registers.Ans;
  if (!m) {
    return goCalc(state, session);
  }
  if (keyId === "mode") {
    return null;
  }
  if (state.shift && keyId === "4") {
    return { ...clearLatches(state), menu: { kind: "matrix-op" } };
  }
  if (state.shift && keyId === "rcl") {
    return withMatrix(state, { ...session, phase: "sto-dest", editorReg: "Ans" });
  }
  if (keyId === "ac") {
    return goCalc(state, session);
  }
  if (keyId === "left") {
    return showMatAns(state, session, m, session.row, session.col - 1);
  }
  if (keyId === "right") {
    return showMatAns(state, session, m, session.row, session.col + 1);
  }
  if (keyId === "up") {
    return showMatAns(state, session, m, session.row - 1, session.col);
  }
  if (keyId === "down") {
    return showMatAns(state, session, m, session.row + 1, session.col);
  }
  if (keyId === "add") {
    return matAnsContinue(state, "add");
  }
  if (keyId === "sub") {
    return matAnsContinue(state, "sub");
  }
  if (keyId === "mul") {
    return matAnsContinue(state, "mul");
  }
  if (keyId === "div") {
    return matAnsContinue(state, "div");
  }
  if (keyId === "square") {
    return matAnsContinue(state, state.shift ? "cube" : "sq");
  }
  if (keyId === "equals") {
    return showMatAns(state, session, m, session.row, session.col);
  }
  return clearLatches(state);
}

function handleStoDest(state: CalcState, keyId: KeyId): CalcState {
  const session = state.matrix ?? emptyMatrixSession();
  if (keyId === "ac") {
    return session.registers.Ans && session.editorReg === "Ans"
      ? showMatAns(state, session, session.registers.Ans, session.row, session.col)
      : withMatrix(state, { ...session, phase: session.editorReg ? "editor" : "calc" });
  }
  const dest = REG_BY_DIGIT[keyId];
  if (dest) {
    return copyToReg(state, dest);
  }
  return clearLatches(state);
}

function handleCalcKey(state: CalcState, keyId: KeyId): CalcState | null {
  if (keyId === "mode") {
    return null;
  }
  if (state.shift && keyId === "4") {
    return { ...clearLatches(state), menu: { kind: "matrix-op" } };
  }
  if (keyId === "equals") {
    return onCalcEquals(state);
  }
  if (keyId === "ac" && !state.shift) {
    const session = state.matrix ?? emptyMatrixSession();
    return goCalc(state, session);
  }
  return null;
}

export function isMatrixMenuKind(kind: CalcState["menu"]["kind"]): boolean {
  return kind === "matrix-op";
}

export function handleMatrixMenu(state: CalcState, keyId: KeyId): CalcState {
  const session = state.matrix ?? emptyMatrixSession();
  switch (keyId) {
    case "1":
      return withMatrix(state, { ...session, phase: "dim-reg", dimTarget: null });
    case "2":
      return withMatrix(state, { ...session, phase: "data-reg" });
    case "3":
      return insertMatCall(state, "mat-A");
    case "4":
      return insertMatCall(state, "mat-B");
    case "5":
      return insertMatCall(state, "mat-C");
    case "6":
      return insertMatCall(state, "mat-Ans");
    case "7":
      return insertMatCall(state, "mat-det");
    case "8":
      return insertMatCall(state, "mat-trn");
    default:
      return state;
  }
}

/**
 * MATRIX-owned reducer. Returns null to fall through (MODE, SETUP, calc-phase COMP keys).
 * Editor/dim/MatAns phases swallow keys so matrix contents never become COMP Atom[].
 */
export function reduceMatrix(state: CalcState, event: KeyEvent): CalcState | null {
  if (state.mode !== "MATRIX" || !state.matrix) {
    return null;
  }
  const keyId = event.keyId;
  const phase = state.matrix.phase;

  if (state.screen.kind === "error") {
    if (keyId === "ac") {
      if (state.shift) {
        return null;
      }
      const session = state.matrix;
      if (session.phase === "editor") {
        return withMatrix(state, session);
      }
      return goCalc(state, session);
    }
    if (keyId === "left" || keyId === "right") {
      if (state.matrix.phase === "editor") {
        return withMatrix(state, state.matrix);
      }
      return {
        ...clearLatches(state),
        editor: state.screen.expression ? { ...state.editor, root: state.screen.expression } : state.editor,
        screen: { kind: "input" },
      };
    }
    return state;
  }

  if (keyId === "ac" && state.shift) {
    return null;
  }
  if (state.shift && keyId === "9") {
    return null;
  }

  if (phase === "dim-reg") {
    if (state.shift && keyId === "4") {
      return { ...clearLatches(state), menu: { kind: "matrix-op" } };
    }
    if (keyId === "mode") {
      return null;
    }
    return handleDimReg(state, keyId);
  }
  if (phase === "dim-size") {
    if (keyId === "mode") {
      return null;
    }
    return handleDimSize(state, keyId);
  }
  if (phase === "data-reg") {
    if (state.shift && keyId === "4") {
      return { ...clearLatches(state), menu: { kind: "matrix-op" } };
    }
    if (keyId === "mode") {
      return null;
    }
    return handleDataReg(state, keyId);
  }
  if (phase === "editor") {
    return handleEditorKey(state, keyId);
  }
  if (phase === "matans") {
    return handleMatAnsKey(state, keyId);
  }
  if (phase === "sto-dest") {
    if (keyId === "mode") {
      return null;
    }
    return handleStoDest(state, keyId);
  }
  return handleCalcKey(state, keyId);
}

export function matrixDimRegText(): string {
  return "1:MatA 2:MatB 3:MatC";
}

export function matrixDimSizeExpr(target: "A" | "B" | "C"): string {
  return `Mat${target} Dim`;
}

export function matrixDimSizeResult(): string {
  return "4:2x1 5:2x2 6:2x3";
}

export function matrixDataRegText(): string {
  return "1:MatA 2:MatB 3:MatC 4:Ans";
}

export function matrixStoDestText(): string {
  return "1:MatA 2:MatB 3:MatC";
}

export function matrixMenuText(): string {
  return "1:Dim 2:Data 3:MatA 4:MatB 5:MatC 6:MatAns 7:det 8:Trn";
}

export function matrixCellPrompt(reg: MatReg, row: number, col: number): string {
  const name = reg === "Ans" ? "Ans" : reg;
  return `${name}${row + 1}${col + 1}=`;
}

export function matrixEditorExpression(state: CalcState): string {
  const session = state.matrix;
  if (!session || !session.editorReg) {
    return "MATRIX";
  }
  return matrixCellPrompt(session.editorReg, session.row, session.col);
}

export function matrixEditorValue(state: CalcState): string {
  const session = state.matrix;
  if (!session) {
    return "";
  }
  if (state.editor.root.length > 0) {
    return atomsToLinear(state.editor.root, state.setup.displayFormat);
  }
  return resultFromSym(currentCellSym(session), state.setup).display;
}

export function relabelMatrixCalls(expr: string): string {
  let out = expr;
  const names = Object.keys(MATRIX_CALL_LABELS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const label = MATRIX_CALL_LABELS[name];
    if (!label) {
      continue;
    }
    out = out.split(name).join(label);
  }
  return out;
}

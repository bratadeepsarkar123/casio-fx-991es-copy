import { atomsToLinear, emptyEditor, insertClosedCall, insertOp } from "./editor.ts";
import { evaluateToSym } from "./evaluate.ts";
import { resultFromSym } from "./format.ts";
import type { KeyEvent, KeyId } from "./keys.ts";
import { VECTOR_CALL_LABELS, evaluateVectorExpr } from "./vectorEval.ts";
import { cloneVector, emptyVector } from "./vectorNumeric.ts";
import { CalcMathError, createUint32Rng } from "./numeric.ts";
import type { Atom, CalcState, ErrorCode, VctReg, VectorDim, VectorSession, VectorValue } from "./types.ts";
import { isNonReal, symRat, type Sym } from "./symbolic.ts";

const ZERO_SYM: Sym = symRat(0n);

const REG_BY_DIGIT: Record<string, "A" | "B" | "C"> = {
  "1": "A",
  "2": "B",
  "3": "C",
};

const DATA_BY_DIGIT: Record<string, VctReg> = {
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "Ans",
};

function dimFromDigit(keyId: string): VectorDim | null {
  if (keyId === "2") {
    return 2;
  }
  if (keyId === "3") {
    return 3;
  }
  return null;
}

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

export function emptyVectorSession(): VectorSession {
  return {
    phase: "dim-reg",
    dimTarget: null,
    editorReg: null,
    index: 0,
    registers: { A: null, B: null, C: null, Ans: null },
  };
}

export function wipeVectorRegisters(session: VectorSession): VectorSession {
  return {
    ...session,
    phase: "dim-reg",
    dimTarget: null,
    editorReg: null,
    index: 0,
    registers: { A: null, B: null, C: null, Ans: null },
  };
}

function withVector(state: CalcState, vector: VectorSession, patch: Partial<CalcState> = {}): CalcState {
  return {
    ...clearLatches(state),
    vector,
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

function goCalc(state: CalcState, session: VectorSession): CalcState {
  return withVector(state, { ...session, phase: "calc", editorReg: null, dimTarget: null });
}

function openEditor(state: CalcState, session: VectorSession, reg: VctReg): CalcState {
  const v = session.registers[reg];
  if (!v) {
    return vectorError(state, "Dimension ERROR", state.editor.root);
  }
  return withVector(state, {
    ...session,
    phase: "editor",
    editorReg: reg,
    index: 0,
    dimTarget: null,
  });
}

function assignDim(state: CalcState, session: VectorSession, target: "A" | "B" | "C", dim: VectorDim): CalcState {
  return withVector(state, {
    ...session,
    phase: "editor",
    dimTarget: null,
    editorReg: target,
    index: 0,
    registers: { ...session.registers, [target]: emptyVector(dim) },
  });
}

function vectorError(state: CalcState, code: ErrorCode, expression: Atom[]): CalcState {
  return {
    ...clearLatches(state),
    menu: { kind: "none" },
    screen: { kind: "error", code, expression, errorIndex: 0 },
    result: null,
  };
}

function currentVector(session: VectorSession): VectorValue | null {
  if (session.phase === "vctans" || session.phase === "sto-dest") {
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

function currentCellSym(session: VectorSession | null): Sym {
  if (!session || !session.editorReg) {
    return ZERO_SYM;
  }
  const v = session.registers[session.editorReg];
  return v?.cells[session.index] ?? ZERO_SYM;
}

function evalCurrentCell(state: CalcState): { sym: Sym; atoms: Atom[]; rngSeed: number } {
  const stored = currentCellSym(state.vector);
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

function writeCell(session: VectorSession, sym: Sym): VectorSession {
  const reg = session.editorReg;
  if (!reg) {
    return session;
  }
  const v = session.registers[reg];
  if (!v) {
    return session;
  }
  const next = cloneVector(v);
  if (session.index < 0 || session.index >= next.cells.length) {
    return session;
  }
  next.cells[session.index] = sym;
  return { ...session, registers: { ...session.registers, [reg]: next } };
}

function lastCell(v: VectorValue, index: number): boolean {
  return index === v.dim - 1;
}

function commitCell(state: CalcState): CalcState {
  const session = state.vector;
  if (!session || !session.editorReg) {
    return state;
  }
  try {
    const { sym, rngSeed } = evalCurrentCell(state);
    return withVector(state, writeCell(session, sym), { rngSeed });
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return vectorError(state, code, state.editor.root);
  }
}

function moveEditor(state: CalcState, delta: number): CalcState {
  const session = state.vector;
  if (!session || !session.editorReg) {
    return state;
  }
  const v = session.registers[session.editorReg];
  if (!v) {
    return state;
  }
  let next = state;
  if (isEditing(state)) {
    next = commitCell(state);
    if (next.screen.kind === "error") {
      return next;
    }
  }
  const sess = next.vector;
  if (!sess) {
    return next;
  }
  const index = Math.min(v.dim - 1, Math.max(0, sess.index + delta));
  return withVector(next, { ...sess, index, phase: "editor" });
}

function showVctAns(state: CalcState, session: VectorSession, vector: VectorValue, index = 0): CalcState {
  const ii = Math.min(vector.dim - 1, Math.max(0, index));
  const cell = vector.cells[ii] ?? ZERO_SYM;
  const result = resultFromSym(cell, state.setup);
  return withVector(
    state,
    {
      ...session,
      phase: "vctans",
      editorReg: "Ans",
      index: ii,
      registers: { ...session.registers, Ans: cloneVector(vector) },
    },
    { screen: { kind: "result" }, result, editor: emptyEditor() },
  );
}

function insertVctCall(state: CalcState, name: string): CalcState {
  const base =
    state.screen.kind === "result" || state.screen.kind === "replay"
      ? { ...state, editor: emptyEditor(), screen: { kind: "input" as const }, result: null }
      : { ...state, screen: { kind: "input" as const } };
  const editor = insertClosedCall(base.editor, name);
  const session = state.vector ?? emptyVectorSession();
  return {
    ...clearLatches(base),
    vector: { ...session, phase: "calc" },
    menu: { kind: "none" },
    editor,
    screen: { kind: "input" },
    result: null,
  };
}

function vctAnsContinue(state: CalcState, kind: "add" | "sub" | "mul" | "div"): CalcState {
  const session = state.vector;
  if (!session || !session.registers.Ans) {
    return vectorError(state, "Dimension ERROR", []);
  }
  let editor = insertClosedCall(emptyEditor(), "vct-Ans");
  const op = kind === "add" ? "+" : kind === "sub" ? "-" : kind === "mul" ? "×" : "÷";
  editor = insertOp(editor, op);
  return withVector(state, { ...session, phase: "calc", editorReg: null }, { editor, screen: { kind: "input" } });
}

function onCalcEquals(state: CalcState): CalcState {
  const session = state.vector;
  if (!session) {
    return state;
  }
  if (state.editor.root.length === 0) {
    return clearLatches(state);
  }
  try {
    const out = evaluateVectorExpr(state.editor.root, state);
    if (out.kind === "vector") {
      return showVctAns(state, session, out.vector, 0);
    }
    const result = resultFromSym(out.sym, state.setup);
    return withVector(
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
    return vectorError(state, code, state.editor.root);
  }
}

function copyToReg(state: CalcState, dest: "A" | "B" | "C"): CalcState {
  const session = state.vector;
  if (!session) {
    return state;
  }
  const src = currentVector(session);
  if (!src) {
    return vectorError(state, "Dimension ERROR", []);
  }
  return goCalc(state, {
    ...session,
    registers: { ...session.registers, [dest]: cloneVector(src) },
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
  const session = state.vector ?? emptyVectorSession();
  if (keyId === "ac") {
    return goCalc(state, session);
  }
  const target = REG_BY_DIGIT[keyId];
  if (target) {
    return withVector(state, { ...session, phase: "dim-size", dimTarget: target });
  }
  return clearLatches(state);
}

function handleDimSize(state: CalcState, keyId: KeyId): CalcState {
  const session = state.vector;
  if (!session || !session.dimTarget) {
    return withVector(state, emptyVectorSession());
  }
  if (keyId === "ac") {
    return withVector(state, { ...session, phase: "dim-reg", dimTarget: null });
  }
  const dim = dimFromDigit(keyId);
  if (dim) {
    return assignDim(state, session, session.dimTarget, dim);
  }
  return clearLatches(state);
}

function handleDataReg(state: CalcState, keyId: KeyId): CalcState {
  const session = state.vector ?? emptyVectorSession();
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
  const session = state.vector;
  if (!session || !session.editorReg) {
    return state;
  }
  if (keyId === "mode") {
    return null;
  }
  if (state.shift && keyId === "5") {
    return { ...clearLatches(state), menu: { kind: "vector-op" } };
  }
  if (state.shift && keyId === "rcl") {
    return withVector(state, { ...session, phase: "sto-dest" });
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
      return goCalc(committed, committed.vector ?? session);
    }
    return goCalc(state, session);
  }
  if (keyId === "equals") {
    const committed = commitCell(state);
    if (committed.screen.kind === "error") {
      return committed;
    }
    const sess = committed.vector;
    if (!sess || !sess.editorReg) {
      return committed;
    }
    const v = sess.registers[sess.editorReg];
    if (!v) {
      return committed;
    }
    if (lastCell(v, sess.index)) {
      return committed;
    }
    return withVector(committed, { ...sess, index: sess.index + 1, phase: "editor" });
  }
  if (keyId === "left" || keyId === "up") {
    return moveEditor(state, -1);
  }
  if (keyId === "right" || keyId === "down") {
    return moveEditor(state, 1);
  }
  return null;
}

function handleVctAnsKey(state: CalcState, keyId: KeyId): CalcState | null {
  const session = state.vector;
  if (!session) {
    return state;
  }
  const v = session.registers.Ans;
  if (!v) {
    return goCalc(state, session);
  }
  if (keyId === "mode") {
    return null;
  }
  if (state.shift && keyId === "5") {
    return { ...clearLatches(state), menu: { kind: "vector-op" } };
  }
  if (state.shift && keyId === "rcl") {
    return withVector(state, { ...session, phase: "sto-dest", editorReg: "Ans" });
  }
  if (keyId === "ac") {
    return goCalc(state, session);
  }
  if (keyId === "left" || keyId === "up") {
    return showVctAns(state, session, v, session.index - 1);
  }
  if (keyId === "right" || keyId === "down") {
    return showVctAns(state, session, v, session.index + 1);
  }
  if (keyId === "add") {
    return vctAnsContinue(state, "add");
  }
  if (keyId === "sub") {
    return vctAnsContinue(state, "sub");
  }
  if (keyId === "mul") {
    return vctAnsContinue(state, "mul");
  }
  if (keyId === "div") {
    return vctAnsContinue(state, "div");
  }
  if (keyId === "equals") {
    return showVctAns(state, session, v, session.index);
  }
  return clearLatches(state);
}

function handleStoDest(state: CalcState, keyId: KeyId): CalcState {
  const session = state.vector ?? emptyVectorSession();
  if (keyId === "ac") {
    return session.registers.Ans && session.editorReg === "Ans"
      ? showVctAns(state, session, session.registers.Ans, session.index)
      : withVector(state, { ...session, phase: session.editorReg ? "editor" : "calc" });
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
  if (state.shift && keyId === "5") {
    return { ...clearLatches(state), menu: { kind: "vector-op" } };
  }
  if (keyId === "equals") {
    return onCalcEquals(state);
  }
  if (keyId === "ac" && !state.shift) {
    const session = state.vector ?? emptyVectorSession();
    return goCalc(state, session);
  }
  return null;
}

export function isVectorMenuKind(kind: CalcState["menu"]["kind"]): boolean {
  return kind === "vector-op";
}

export function handleVectorMenu(state: CalcState, keyId: KeyId): CalcState {
  const session = state.vector ?? emptyVectorSession();
  switch (keyId) {
    case "1":
      return withVector(state, { ...session, phase: "dim-reg", dimTarget: null });
    case "2":
      return withVector(state, { ...session, phase: "data-reg" });
    case "3":
      return insertVctCall(state, "vct-A");
    case "4":
      return insertVctCall(state, "vct-B");
    case "5":
      return insertVctCall(state, "vct-C");
    case "6":
      return insertVctCall(state, "vct-Ans");
    case "7":
      return insertVctCall(state, "vct-dot");
    default:
      return state;
  }
}

/**
 * VECTOR-owned reducer. Returns null to fall through (MODE, SETUP, calc-phase COMP keys).
 * Editor/dim/VctAns phases swallow keys so vector contents never become COMP Atom[].
 */
export function reduceVector(state: CalcState, event: KeyEvent): CalcState | null {
  if (state.mode !== "VECTOR" || !state.vector) {
    return null;
  }
  const keyId = event.keyId;
  const phase = state.vector.phase;

  if (state.screen.kind === "error") {
    if (keyId === "ac") {
      if (state.shift) {
        return null;
      }
      const session = state.vector;
      if (session.phase === "editor") {
        return withVector(state, session);
      }
      return goCalc(state, session);
    }
    if (keyId === "left" || keyId === "right") {
      if (state.vector.phase === "editor") {
        return withVector(state, state.vector);
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
    if (state.shift && keyId === "5") {
      return { ...clearLatches(state), menu: { kind: "vector-op" } };
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
    if (state.shift && keyId === "5") {
      return { ...clearLatches(state), menu: { kind: "vector-op" } };
    }
    if (keyId === "mode") {
      return null;
    }
    return handleDataReg(state, keyId);
  }
  if (phase === "editor") {
    return handleEditorKey(state, keyId);
  }
  if (phase === "vctans") {
    return handleVctAnsKey(state, keyId);
  }
  if (phase === "sto-dest") {
    if (keyId === "mode") {
      return null;
    }
    return handleStoDest(state, keyId);
  }
  return handleCalcKey(state, keyId);
}

export function vectorDimRegText(): string {
  return "1:VctA 2:VctB 3:VctC";
}

export function vectorDimSizeExpr(target: "A" | "B" | "C"): string {
  return `Vct${target} Dim`;
}

export function vectorDimSizeResult(): string {
  return "2:2  3:3";
}

export function vectorDataRegText(): string {
  return "1:VctA 2:VctB 3:VctC 4:Ans";
}

export function vectorStoDestText(): string {
  return "1:VctA 2:VctB 3:VctC";
}

export function vectorMenuText(): string {
  return "1:Dim 2:Data 3:VctA 4:VctB 5:VctC 6:VctAns 7:Dot";
}

export function vectorCellPrompt(reg: VctReg, index: number): string {
  const name = reg === "Ans" ? "Ans" : reg;
  return `${name}${index + 1}=`;
}

export function vectorEditorExpression(state: CalcState): string {
  const session = state.vector;
  if (!session || !session.editorReg) {
    return "VECTOR";
  }
  return vectorCellPrompt(session.editorReg, session.index);
}

export function vectorEditorValue(state: CalcState): string {
  const session = state.vector;
  if (!session) {
    return "";
  }
  if (state.editor.root.length > 0) {
    return atomsToLinear(state.editor.root, state.setup.displayFormat);
  }
  return resultFromSym(currentCellSym(session), state.setup).display;
}

export function relabelVectorCalls(expr: string): string {
  let out = expr;
  const names = Object.keys(VECTOR_CALL_LABELS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const label = VECTOR_CALL_LABELS[name];
    if (!label) {
      continue;
    }
    out = out.split(name).join(label);
  }
  return out;
}

import { atomsToLinear, emptyEditor } from "./editor.ts";
import { evaluateToSym } from "./evaluate.ts";
import { eqnAllowsSqrt, formatEqnValue, solveEqn } from "./eqnSolve.ts";
import type { KeyEvent, KeyId } from "./keys.ts";
import { createUint32Rng } from "./numeric.ts";
import { symRat, type Sym } from "./symbolic.ts";
import type {
  Atom,
  CalcState,
  EqnCoeff,
  EqnSession,
  EqnSolution,
  EqnType,
  ResultValue,
} from "./types.ts";

const TYPE_BY_DIGIT: Record<string, EqnType> = {
  "1": "lin2",
  "2": "lin3",
  "3": "quad",
  "4": "cubic",
};

const ZERO: Sym = symRat(0n);

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

function zeroCoeff(): EqnCoeff {
  return { atoms: [], sym: ZERO };
}

export function eqnCoeffCount(type: EqnType): number {
  switch (type) {
    case "lin2":
      return 6;
    case "lin3":
      return 12;
    case "quad":
      return 3;
    case "cubic":
      return 4;
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

export function eqnCoeffLabel(type: EqnType, index: number): string {
  const labels = coeffLabels(type);
  return labels[index] ?? "a";
}

function coeffLabels(type: EqnType): string[] {
  switch (type) {
    case "lin2":
      return ["a1", "b1", "c1", "a2", "b2", "c2"];
    case "lin3":
      return ["a1", "b1", "c1", "d1", "a2", "b2", "c2", "d2", "a3", "b3", "c3", "d3"];
    case "quad":
      return ["a", "b", "c"];
    case "cubic":
      return ["a", "b", "c", "d"];
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

export function emptyEqnSession(): EqnSession {
  return {
    type: null,
    phase: "type",
    coeffIndex: 0,
    coeffs: [],
    solutions: [],
    solutionIndex: 0,
    message: null,
    readyToSolve: false,
  };
}

function editorSession(type: EqnType, coeffs?: EqnCoeff[], coeffIndex = 0): EqnSession {
  const n = eqnCoeffCount(type);
  const cells = coeffs && coeffs.length === n ? coeffs : Array.from({ length: n }, zeroCoeff);
  return {
    type,
    phase: "editor",
    coeffIndex,
    coeffs: cells,
    solutions: [],
    solutionIndex: 0,
    message: null,
    readyToSolve: false,
  };
}

export function enterEqnMode(state: CalcState): CalcState {
  return {
    ...state,
    mode: "EQN",
    eqn: emptyEqnSession(),
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
    history: [],
  };
}

function withEqn(state: CalcState, eqn: EqnSession, patch: Partial<CalcState> = {}): CalcState {
  return {
    ...clearLatches(state),
    eqn,
    editor: patch.editor ?? emptyEditor(),
    screen: patch.screen ?? { kind: "input" },
    result: patch.result ?? null,
    rngSeed: patch.rngSeed ?? state.rngSeed,
  };
}

function isEditing(state: CalcState): boolean {
  return state.editor.root.length > 0;
}

function evalCurrent(state: CalcState): { sym: Sym; atoms: Atom[]; rngSeed: number } {
  const rng = createUint32Rng(state.rngSeed);
  if (state.editor.root.length === 0) {
    const stored = state.eqn?.coeffs[state.eqn.coeffIndex];
    return { sym: stored?.sym ?? ZERO, atoms: stored?.atoms ?? [], rngSeed: state.rngSeed };
  }
  const sym = evaluateToSym(state.editor.root, state, rng);
  return { atoms: state.editor.root, sym, rngSeed: state.rngSeed + 1 };
}

function commitCell(state: CalcState): CalcState {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return state;
  }
  try {
    const { sym, atoms, rngSeed } = evalCurrent(state);
    const coeffs = eqn.coeffs.map((c, i) => (i === eqn.coeffIndex ? { atoms, sym } : c));
    const last = eqnCoeffCount(eqn.type) - 1;
    const onLast = eqn.coeffIndex >= last;
    return withEqn(
      state,
      {
        ...eqn,
        coeffs,
        readyToSolve: onLast,
        solutions: [],
        message: null,
        phase: "editor",
      },
      { rngSeed },
    );
  } catch (err) {
    const code = (err as { code?: "Math ERROR" | "Syntax ERROR" | "Argument ERROR" }).code ?? "Math ERROR";
    return {
      ...clearLatches(state),
      screen: {
        kind: "error",
        code,
        expression: state.editor.root,
        errorIndex: 0,
      },
      result: null,
    };
  }
}

function moveCoeff(state: CalcState, delta: number): CalcState {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return state;
  }
  let next = state;
  if (isEditing(state)) {
    next = commitCell(state);
    if (next.screen.kind === "error") {
      return next;
    }
  }
  const session = next.eqn;
  if (!session || !session.type) {
    return next;
  }
  const last = eqnCoeffCount(session.type) - 1;
  const idx = Math.min(last, Math.max(0, session.coeffIndex + delta));
  return withEqn(next, { ...session, coeffIndex: idx, readyToSolve: false, phase: "editor" });
}

function showSolution(state: CalcState, eqn: EqnSession, index: number): CalcState {
  const sol = eqn.solutions[index];
  if (!sol || !eqn.type) {
    return state;
  }
  const result = formatEqnValue(sol.sym, state.setup, eqnAllowsSqrt(eqn.type));
  return withEqn(
    state,
    { ...eqn, phase: "solutions", solutionIndex: index, message: null },
    { screen: { kind: "result" }, result, editor: emptyEditor() },
  );
}

function runSolve(state: CalcState): CalcState {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return state;
  }
  const outcome = solveEqn(
    eqn.type,
    eqn.coeffs.map((c) => c.sym),
  );
  switch (outcome.kind) {
    case "solutions": {
      const solutions: EqnSolution[] = outcome.solutions;
      return showSolution(state, { ...eqn, solutions, readyToSolve: false }, 0);
    }
    case "no-solution":
      return withEqn(state, {
        ...eqn,
        phase: "message",
        message: "no-solution",
        solutions: [],
        solutionIndex: 0,
        readyToSolve: false,
      });
    case "infinite":
      return withEqn(state, {
        ...eqn,
        phase: "message",
        message: "infinite",
        solutions: [],
        solutionIndex: 0,
        readyToSolve: false,
      });
    case "math-error":
      return {
        ...clearLatches(state),
        eqn: { ...eqn, readyToSolve: false, phase: "editor" },
        screen: {
          kind: "error",
          code: "Math ERROR",
          expression: state.editor.root,
          errorIndex: 0,
        },
        result: null,
        editor: emptyEditor(),
      };
    default: {
      const _never: never = outcome;
      return _never;
    }
  }
}

function returnToEditor(state: CalcState): CalcState {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return state;
  }
  return withEqn(state, editorSession(eqn.type, eqn.coeffs, 0));
}

function handleTypeKey(state: CalcState, keyId: KeyId): CalcState {
  if (keyId === "ac") {
    return withEqn(state, emptyEqnSession());
  }
  const type = TYPE_BY_DIGIT[keyId];
  if (type) {
    return withEqn(state, editorSession(type));
  }
  return clearLatches(state);
}

function handleSolutionsKey(state: CalcState, keyId: KeyId): CalcState | null {
  const eqn = state.eqn;
  if (!eqn) {
    return state;
  }
  if (keyId === "mode") {
    return null;
  }
  if (keyId === "ac") {
    return returnToEditor(state);
  }
  if (keyId === "equals") {
    const next = eqn.solutionIndex + 1;
    if (next >= eqn.solutions.length) {
      return returnToEditor(state);
    }
    return showSolution(state, eqn, next);
  }
  if (keyId === "up") {
    return showSolution(state, eqn, Math.max(0, eqn.solutionIndex - 1));
  }
  if (keyId === "down") {
    return showSolution(state, eqn, Math.min(eqn.solutions.length - 1, eqn.solutionIndex + 1));
  }
  return clearLatches(state);
}

function unsupportedEditorKey(state: CalcState, keyId: KeyId): boolean {
  if (state.shift && (keyId === "add" || keyId === "sub" || keyId === "rcl" || keyId === "mplus")) {
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

function handleEditorKey(state: CalcState, keyId: KeyId): CalcState | null {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return state;
  }
  if (keyId === "mode") {
    return null;
  }
  if (unsupportedEditorKey(state, keyId)) {
    return clearLatches(state);
  }
  if (keyId === "ac") {
    return withEqn(state, editorSession(eqn.type));
  }
  if (keyId === "equals") {
    const last = eqnCoeffCount(eqn.type) - 1;
    const onLast = eqn.coeffIndex >= last;
    if (onLast && eqn.readyToSolve && !isEditing(state)) {
      return runSolve(state);
    }
    const committed = commitCell(state);
    if (committed.screen.kind === "error") {
      return committed;
    }
    const session = committed.eqn;
    if (!session || !session.type) {
      return committed;
    }
    if (session.coeffIndex < last) {
      return withEqn(committed, {
        ...session,
        coeffIndex: session.coeffIndex + 1,
        readyToSolve: false,
      });
    }
    return committed;
  }
  if (keyId === "left" || keyId === "up") {
    return moveCoeff(state, -1);
  }
  if (keyId === "right" || keyId === "down") {
    return moveCoeff(state, 1);
  }
  return null;
}

export function reduceEqn(state: CalcState, event: KeyEvent): CalcState | null {
  if (state.mode !== "EQN" || !state.eqn) {
    return null;
  }
  const keyId = event.keyId;
  const phase = state.eqn.phase;

  if (state.screen.kind === "error") {
    if (keyId === "ac") {
      if (state.shift) {
        return null;
      }
      return withEqn(state, {
        ...state.eqn,
        phase: state.eqn.type ? "editor" : "type",
        readyToSolve: false,
      });
    }
    if (keyId === "left" || keyId === "right") {
      return withEqn(state, { ...state.eqn, phase: state.eqn.type ? "editor" : "type" });
    }
    return state;
  }

  if (keyId === "ac" && state.shift) {
    return null;
  }

  if (phase === "type") {
    return handleTypeKey(state, keyId);
  }
  if (phase === "message") {
    if (keyId === "mode") {
      return null;
    }
    if (keyId === "ac" || keyId === "equals") {
      return returnToEditor(state);
    }
    return clearLatches(state);
  }
  if (phase === "solutions") {
    return handleSolutionsKey(state, keyId);
  }
  return handleEditorKey(state, keyId);
}

export function eqnTypeMenuText(): string {
  return "1:2-UNK 2:3-UNK 3:QUAD 4:CUBIC";
}

export function eqnEditorExpression(state: CalcState): string {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return "EQN";
  }
  return `${eqnCoeffLabel(eqn.type, eqn.coeffIndex)}=`;
}

export function eqnEditorValue(state: CalcState): string {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return "";
  }
  if (state.editor.root.length > 0) {
    return atomsToLinear(state.editor.root, state.setup.displayFormat);
  }
  const cell = eqn.coeffs[eqn.coeffIndex];
  if (!cell) {
    return "0";
  }
  return formatEqnValue(cell.sym, state.setup, true).display;
}

export function eqnSolutionExpression(eqn: EqnSession): string {
  const sol = eqn.solutions[eqn.solutionIndex];
  if (!sol) {
    return "";
  }
  return `${sol.label}=`;
}

export function eqnSolutionValue(state: CalcState): ResultValue | null {
  const eqn = state.eqn;
  if (!eqn || !eqn.type) {
    return null;
  }
  const sol = eqn.solutions[eqn.solutionIndex];
  if (!sol) {
    return null;
  }
  return formatEqnValue(sol.sym, state.setup, eqnAllowsSqrt(eqn.type));
}

export function eqnMessageText(eqn: EqnSession): string {
  switch (eqn.message) {
    case "no-solution":
      return "No Solution";
    case "infinite":
      return "Infinitely Many";
    case null:
      return "";
    default: {
      const _never: never = eqn.message;
      return _never;
    }
  }
}

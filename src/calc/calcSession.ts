import { evaluateAtoms } from "./evaluate.ts";
import { evaluateToSym } from "./evaluate.ts";
import { editorFromAtoms, emptyEditor, trimHistory } from "./editor.ts";
import { formatBySetup } from "./format.ts";
import { D, createUint32Rng } from "./numeric.ts";
import { isNonReal, toDec } from "./symbolic.ts";
import { Decimal } from "decimal.js";
import type { Atom, CalcState, CalcSession, ErrorCode, MultiStatementSession, ResultValue, SolveSession, VarName } from "./types.ts";

const ZERO_ATOMS: Atom[] = [{ t: "num", s: "0" }];
const SOLVE_ITERATIONS = 36;
const SOLVE_TOLERANCE = D("1e-10");

function splitStatements(source: Atom[]): Atom[][] {
  const out: Atom[][] = [[]];
  for (const atom of source) {
    if (atom.t === "colon") {
      out.push([]);
    } else {
      out[out.length - 1]?.push(atom);
    }
  }
  return out;
}

function walkAtoms(atoms: Atom[], visit: (atom: Atom) => void): void {
  for (const atom of atoms) {
    visit(atom);
    switch (atom.t) {
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
      case "group":
      case "neg":
      case "abs":
      case "angle":
      case "post":
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
        atom.args.forEach((args) => walkAtoms(args, visit));
        break;
      default:
        break;
    }
  }
}

function collectVariables(atoms: Atom[], excluded: VarName[] = []): VarName[] {
  const ordered: VarName[] = [];
  const seen = new Set<VarName>(excluded);
  walkAtoms(atoms, (atom) => {
    if (atom.t === "var" && !seen.has(atom.name)) {
      seen.add(atom.name);
      ordered.push(atom.name);
    }
  });
  return ordered;
}

function hasOpenCall(atoms: Atom[]): boolean {
  let open = false;
  walkAtoms(atoms, (atom) => {
    if ((atom.t === "call" || atom.t === "group") && !atom.closed) open = true;
  });
  return open;
}

function containsUnsupportedSolveCall(atoms: Atom[]): boolean {
  let found = false;
  walkAtoms(atoms, (atom) => {
    if (atom.t === "call" && ["int", "diff", "Σ", "Pol", "Rec"].includes(atom.name)) found = true;
  });
  return found;
}

function firstTopLevelOp(atoms: Atom[], op: "=" | ","): number {
  return atoms.findIndex((atom) => {
    if (op === ",") return atom.t === "comma";
    return atom.t === "op" && atom.op === "=";
  });
}

function asVariable(atoms: Atom[]): VarName | null {
  return atoms.length === 1 && atoms[0]?.t === "var" ? atoms[0].name : null;
}

function calcPlan(source: Atom[]): { statements: Atom[][]; assignmentTarget: VarName | null; promptVars: VarName[] } {
  const statements = splitStatements(source);
  let assignmentTarget: VarName | null = null;
  const first = statements[0] ?? [];
  const equals = firstTopLevelOp(first, "=");
  if (equals >= 0) {
    const left = first.slice(0, equals);
    const target = asVariable(left);
    if (target) {
      assignmentTarget = target;
      statements[0] = first.slice(equals + 1);
    }
  }
  const promptVars = collectVariables(statements.flat());
  return { statements, assignmentTarget, promptVars };
}

function collectSolveSource(source: Atom[]): { left: Atom[]; right: Atom[]; target: VarName; vars: VarName[]; targetPresent: boolean } | null {
  let equation = [...source];
  let target: VarName = "X";
  const comma = firstTopLevelOp(equation, ",");
  if (comma >= 0) {
    const explicit = asVariable(equation.slice(comma + 1));
    if (!explicit) {
      return null;
    }
    target = explicit;
    equation = equation.slice(0, comma);
  }
  const eq = firstTopLevelOp(equation, "=");
  const left = eq >= 0 ? equation.slice(0, eq) : equation;
  const right = eq >= 0 ? equation.slice(eq + 1) : ZERO_ATOMS;
  if (left.length === 0 || right.length === 0) {
    return null;
  }
  const allVars = collectVariables([...left, ...right]);
  return { left, right, target, vars: allVars.filter((name) => name !== target), targetPresent: allVars.includes(target) };
}

function withError(state: CalcState, source: Atom[], code: ErrorCode): CalcState {
  return {
    ...state,
    editor: editorFromAtoms(source),
    screen: { kind: "error", code, expression: source, errorIndex: 0 },
    result: null,
    calcSession: null,
    multiStatement: null,
    solveSession: null,
    shift: false,
    alpha: false,
    hyp: false,
  };
}

function inputResult(state: CalcState, result: ResultValue, expression: Atom[], history = false): CalcState {
  const entry = { expression, result };
  return {
    ...state,
    editor: editorFromAtoms(expression),
    screen: { kind: "result" },
    result,
    resultDecimal: result.naturalKind === "decimal",
    preAns: state.ans,
    preAnsIm: state.ansIm,
    ans: result.internal?.re ?? result.complex?.re ?? result.approx,
    ansIm: result.internal?.im ?? result.complex?.im ?? "0",
    history: history ? trimHistory([...state.history, entry]) : state.history,
    shift: false,
    alpha: false,
    hyp: false,
  };
}

function inputValue(state: CalcState, fallback: string, rng: () => number): string {
  if (state.editor.root.length === 0) {
    return fallback;
  }
  const value = evaluateToSym(state.editor.root, state, rng);
  if (isNonReal(value)) {
    throw new Error("Argument ERROR");
  }
  return toDec(value).toSignificantDigits(15, Decimal.ROUND_HALF_UP).toString();
}

function evaluateCalcStatement(state: CalcState, session: CalcSession, rng: () => number): CalcState {
  const statement = session.statements[session.statementIndex];
  if (!statement) {
    return withError(state, session.source, "Syntax ERROR");
  }
  try {
    const result = evaluateAtoms(statement, state, rng);
    let variables = state.variables;
    if (session.statementIndex === 0 && session.assignmentTarget) {
      const exact = evaluateToSym(statement, state, rng);
      if (isNonReal(exact)) {
        return withError(state, session.source, "Math ERROR");
      }
      variables = {
        ...variables,
        [session.assignmentTarget]: toDec(exact).toSignificantDigits(15, Decimal.ROUND_HALF_UP).toString(),
      };
    }
    const withValue = { ...state, variables };
    const evaluated = inputResult(withValue, result, session.source, session.statementIndex === session.statements.length - 1);
    return {
      ...evaluated,
      calcSession: { ...session, phase: "result" },
      multiStatement: null,
    };
  } catch (error) {
    const code = (error as { code?: ErrorCode }).code ?? "Math ERROR";
    return withError(state, session.source, code);
  }
}

function promptCalc(state: CalcState, session: CalcSession, index: number): CalcState {
  const next = { ...session, phase: "prompt" as const, promptIndex: index, statementIndex: 0 };
  return {
    ...state,
    calcSession: next,
    multiStatement: null,
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
    shift: false,
    alpha: false,
    hyp: false,
  };
}

function submitCalcValue(state: CalcState, session: CalcSession, rng: () => number): CalcState {
  const variable = session.promptVars[session.promptIndex];
  if (!variable) {
    return evaluateCalcStatement(state, session, rng);
  }
  try {
    const value = inputValue(state, state.variables[variable], rng);
    const variables = { ...state.variables, [variable]: value };
    const nextIndex = session.promptIndex + 1;
    const updated = { ...state, variables, editor: emptyEditor() };
    if (nextIndex < session.promptVars.length) {
      return { ...updated, calcSession: { ...session, promptIndex: nextIndex }, screen: { kind: "input" }, result: null };
    }
    return evaluateCalcStatement(updated, { ...session, promptIndex: nextIndex, statementIndex: 0 }, rng);
  } catch (error) {
    const code = (error as { code?: ErrorCode }).code ?? "Math ERROR";
    return withError(state, session.source, code);
  }
}

export function startCalc(state: CalcState, rng: () => number): CalcState | null {
  const source = state.editor.root;
  const plan = calcPlan(source);
  if (plan.promptVars.length === 0 && !plan.assignmentTarget) {
    return null;
  }
  const session: CalcSession = {
    source,
    statements: plan.statements,
    promptVars: plan.promptVars,
    promptIndex: 0,
    statementIndex: 0,
    assignmentTarget: plan.assignmentTarget,
    phase: "prompt",
  };
  if (plan.promptVars.length === 0) {
    return evaluateCalcStatement({ ...state, calcSession: session }, session, rng);
  }
  return promptCalc(state, session, 0);
}

export function reduceCalcSession(state: CalcState, key: string, rng: () => number): CalcState | null {
  const session = state.calcSession;
  if (!session) return null;
  if (key === "ac") {
    return { ...state, calcSession: null, editor: editorFromAtoms(session.source), screen: { kind: "input" }, result: null, shift: false, alpha: false, hyp: false };
  }
  if (key === "equals") {
    if (session.phase === "prompt") return submitCalcValue(state, session, rng);
    if (session.statementIndex + 1 < session.statements.length) {
      return evaluateCalcStatement(state, { ...session, statementIndex: session.statementIndex + 1 }, rng);
    }
    return promptCalc(state, session, 0);
  }
  if (key === "calc" && session.phase === "result") {
    return promptCalc(state, session, 0);
  }
  return null;
}

export function startMultiStatement(state: CalcState, rng: () => number): CalcState | null {
  const statements = splitStatements(state.editor.root);
  if (statements.length < 2) return null;
  const session: MultiStatementSession = { source: state.editor.root, statements, statementIndex: 0 };
  return evaluateMultiStatement(state, session, rng);
}

function evaluateMultiStatement(state: CalcState, session: MultiStatementSession, rng: () => number): CalcState {
  const statement = session.statements[session.statementIndex];
  if (!statement) return withError(state, session.source, "Syntax ERROR");
  try {
    const result = evaluateAtoms(statement, state, rng);
    const final = session.statementIndex === session.statements.length - 1;
    const evaluated = inputResult(state, result, session.source, final);
    return {
      ...evaluated,
      multiStatement: final ? null : session,
    };
  } catch (error) {
    const code = (error as { code?: ErrorCode }).code ?? "Math ERROR";
    return withError(state, session.source, code);
  }
}

export function advanceMultiStatement(state: CalcState, rng: () => number): CalcState | null {
  const session = state.multiStatement;
  if (!session) return null;
  return evaluateMultiStatement(state, { ...session, statementIndex: session.statementIndex + 1 }, rng);
}

export function startSolve(state: CalcState): CalcState | null {
  if (state.mode !== "COMP") return null;
  const source = state.editor.root;
  const equation = collectSolveSource(source);
  if (!equation) return withError(state, source, "Syntax ERROR");
  if (hasOpenCall(source)) return withError(state, source, "Syntax ERROR");
  if (!equation.targetPresent) return withError(state, source, "Variable ERROR");
  if (containsUnsupportedSolveCall([...equation.left, ...equation.right])) {
    return withError(state, source, "Can't Solve Error");
  }
  const session: SolveSession = {
    source,
    left: equation.left,
    right: equation.right,
    target: equation.target,
    promptVars: equation.vars,
    promptIndex: 0,
    phase: equation.vars.length > 0 ? "parameters" : "initial",
    initialGuess: state.variables[equation.target],
    repeating: false,
  };
  return {
    ...state,
    solveSession: session,
    calcSession: null,
    multiStatement: null,
    editor: emptyEditor(),
    screen: { kind: "input" },
    result: null,
    shift: false,
    alpha: false,
    hyp: false,
  };
}

function evaluateEquation(state: CalcState, session: SolveSession, targetValue: string): { left: ReturnType<typeof D>; right: ReturnType<typeof D>; residual: ReturnType<typeof D> } {
  const bound: CalcState = { ...state, variables: { ...state.variables, [session.target]: targetValue } };
  const leftSym = evaluateToSym(session.left, bound, createUint32Rng(state.rngSeed));
  const rightSym = evaluateToSym(session.right, bound, createUint32Rng(state.rngSeed));
  if (isNonReal(leftSym) || isNonReal(rightSym)) throw new Error("Math ERROR");
  const left = toDec(leftSym);
  const right = toDec(rightSym);
  return { left, right, residual: left.minus(right) };
}

type NewtonResult = { kind: "solved"; value: ReturnType<typeof D>; residual: ReturnType<typeof D> } | { kind: "continue"; value: ReturnType<typeof D> };

function solveNewton(state: CalcState, session: SolveSession, guess: string): NewtonResult {
  // Keep guard digits between Newton steps. The calculator's evaluator rounds
  // each expression operation to its 15 digit internal precision when the
  // accepted value is substituted for the displayed L-R check.
  let x = D(guess);
  let initialResidual: ReturnType<typeof D> | null = null;
  for (let i = 0; i < SOLVE_ITERATIONS; i += 1) {
    const fx = evaluateEquation(state, session, x.toString()).residual;
    initialResidual ??= fx.abs();
    if (fx.isZero()) return { kind: "solved", value: x, residual: fx };
    const h = x.abs().times("1e-6").plus("1e-6");
    const plus = evaluateEquation(state, session, x.plus(h).toString()).residual;
    const minus = evaluateEquation(state, session, x.minus(h).toString()).residual;
    const derivative = plus.minus(minus).div(h.times(2));
    if (derivative.isZero()) return { kind: "continue", value: x };
    const next = x.minus(fx.div(derivative));
    if (!next.isFinite() || next.abs().gt("1e99")) return { kind: "continue", value: x };
    const evaluated = evaluateEquation(state, session, next.toString());
    const nextResidual = evaluated.residual;
    const representable = next.toSignificantDigits(15, Decimal.ROUND_HALF_UP);
    const representableResidual = evaluateEquation(state, session, representable.toString()).residual;
    if (representableResidual.isZero()) {
      return { kind: "solved", value: representable, residual: representableResidual };
    }
    const stepLimit = SOLVE_TOLERANCE.times(Decimal.max(x.abs(), next.abs(), 1));
    const residualLimit = (initialResidual ?? D(0)).times("1e-10");
    if (nextResidual.isZero() || (next.minus(x).abs().lte(stepLimit) && nextResidual.abs().lte(residualLimit))) {
      return { kind: "solved", value: next, residual: nextResidual };
    }
    x = next;
  }
  return { kind: "continue", value: x };
}

function runSolve(state: CalcState, session: SolveSession, guess: string): CalcState {
  try {
    const solved = solveNewton(state, session, guess);
    if (solved.kind === "continue") {
      return {
        ...state,
        editor: emptyEditor(),
        screen: { kind: "input" },
        result: null,
        solveSession: { ...session, phase: "continue", initialGuess: solved.value.toString(), repeating: session.repeating },
      };
    }
    const approx = solved.value.toSignificantDigits(15).toString();
    const shown = formatBySetup(solved.value, state.setup);
    const residual = formatBySetup(solved.residual, state.setup);
    const result: ResultValue = { approx, display: shown, naturalKind: "decimal", internal: { re: approx, im: "0" } };
    return {
      ...state,
      variables: { ...state.variables, [session.target]: approx },
      editor: editorFromAtoms(session.source),
      screen: { kind: "result" },
      result,
      resultDecimal: true,
      preAns: state.ans,
      preAnsIm: state.ansIm,
      ans: approx,
      ansIm: "0",
      history: trimHistory([...state.history, { expression: session.source, result }]),
      solveSession: { ...session, phase: "solution", initialGuess: approx, repeating: session.repeating, solution: shown, residual },
    };
  } catch {
    return withError(state, session.source, "Can't Solve Error");
  }
}

function submitSolveParameter(state: CalcState, session: SolveSession, rng: () => number): CalcState {
  const variable = session.promptVars[session.promptIndex];
  if (!variable) return { ...state, solveSession: { ...session, phase: session.repeating ? "continue" : "initial" }, editor: emptyEditor() };
  try {
    const value = inputValue(state, state.variables[variable], rng);
    const variables = { ...state.variables, [variable]: value };
    const index = session.promptIndex + 1;
    const nextSession = { ...session, promptIndex: index };
    const updated = { ...state, variables, editor: emptyEditor(), solveSession: nextSession, screen: { kind: "input" as const }, result: null };
    if (index < session.promptVars.length) return updated;
    return { ...updated, solveSession: { ...nextSession, phase: "initial" } };
  } catch (error) {
    const code = (error as { code?: ErrorCode }).code ?? "Math ERROR";
    return withError(state, session.source, code);
  }
}

export function reduceSolveSession(state: CalcState, key: string, rng: () => number): CalcState | null {
  const session = state.solveSession;
  if (!session) return null;
  if (key === "ac") {
    return { ...state, solveSession: null, editor: editorFromAtoms(session.source), screen: { kind: "input" }, result: null, shift: false, alpha: false, hyp: false };
  }
  if (session.phase === "continue" && key === "equals") {
    if (session.repeating && !session.promptVars.length) {
      return runSolve(state, { ...session, phase: "initial" }, session.initialGuess);
    }
    return runSolve(state, session, session.initialGuess);
  }
  if (session.phase === "solution" && key === "equals") {
    if (session.promptVars.length > 0) {
      return { ...state, solveSession: { ...session, phase: "parameters", promptIndex: 0, repeating: true }, editor: emptyEditor(), screen: { kind: "input" }, result: null };
    }
    return { ...state, solveSession: { ...session, phase: "initial", repeating: true }, editor: emptyEditor(), screen: { kind: "input" }, result: null };
  }
  if (session.phase === "parameters" && key === "equals") return submitSolveParameter(state, session, rng);
  if (session.phase === "initial" && key === "equals") {
    try {
      const guess = inputValue(state, session.initialGuess, rng);
      return runSolve(state, { ...session, initialGuess: guess }, guess);
    } catch (error) {
      const code = (error as { code?: ErrorCode }).code ?? "Math ERROR";
      return withError(state, session.source, code);
    }
  }
  return null;
}

export function calcPromptVar(session: CalcSession): VarName | null {
  return session.promptVars[session.promptIndex] ?? null;
}

export function solvePromptVar(session: SolveSession): VarName | null {
  return session.promptVars[session.promptIndex] ?? null;
}

export function calcSessionShowsDisp(session: CalcSession | null): boolean {
  return session?.phase === "result" && session.statementIndex + 1 < session.statements.length;
}

export function splitExpressionStatements(source: Atom[]): Atom[][] {
  return splitStatements(source);
}

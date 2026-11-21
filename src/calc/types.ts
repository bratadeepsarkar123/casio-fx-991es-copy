import type { KeyEvent } from "./keys.ts";
import type { Sym } from "./symbolic.ts";

export type CalcMode =
  | "COMP"
  | "CMPLX"
  | "STAT"
  | "BASE-N"
  | "EQN"
  | "MATRIX"
  | "TABLE"
  | "VECTOR";

export type AngleUnit = "Deg" | "Rad" | "Gra";
export type DisplayFormat = "MthIO-MathO" | "MthIO-LineO" | "LineIO";
export type NumberFormat =
  | { kind: "Norm"; n: 1 | 2 }
  | { kind: "Fix"; n: number }
  | { kind: "Sci"; n: number };
export type FractionFormat = "d/c" | "ab/c";
export type ComplexFormat = "a+bi" | "r∠θ";
export type TableFormat = "f(x)" | "f(x),g(x)";
export type DecimalMark = "Dot" | "Comma";
export type InsertMode = "insert" | "overwrite";

export type ErrorCode =
  | "Math ERROR"
  | "Stack ERROR"
  | "Syntax ERROR"
  | "Argument ERROR"
  | "Dimension ERROR"
  | "Variable ERROR"
  | "Can't Solve Error"
  | "Insufficient MEM Error"
  | "Time Out Error";

export type VarName = "A" | "B" | "C" | "D" | "E" | "F" | "M" | "X" | "Y";

export interface SetupState {
  displayFormat: DisplayFormat;
  angleUnit: AngleUnit;
  numberFormat: NumberFormat;
  fractionFormat: FractionFormat;
  complexFormat: ComplexFormat;
  statFreq: boolean;
  tableFormat: TableFormat;
  rdec: boolean;
  decimalMark: DecimalMark;
  contrast: number;
}

export type Atom =
  | { t: "num"; s: string }
  | { t: "op"; op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" | "∠" | "=" }
  | { t: "frac"; num: Atom[]; den: Atom[] }
  | { t: "mixed"; whole: Atom[]; num: Atom[]; den: Atom[] }
  | { t: "sqrt"; inner: Atom[] }
  | { t: "cbrt"; inner: Atom[] }
  | { t: "nthrt"; n: Atom[]; inner: Atom[] }
  | { t: "pow"; base: Atom[]; exp: Atom[] }
  | { t: "logb"; base: Atom[]; arg: Atom[] }
  | { t: "sexagesimal"; deg: Atom[]; min: Atom[]; sec: Atom[] }
  | { t: "call"; name: string; args: Atom[][]; closed: boolean }
  | { t: "group"; inner: Atom[]; closed: boolean }
  | { t: "var"; name: VarName }
  | { t: "sym"; name: "pi" | "e" | "ans" | "preAns" | "i" }
  | { t: "post"; op: "sq" | "cube" | "inv" | "fact" | "pct" | "dms"; inner: Atom[] }
  | { t: "neg"; inner: Atom[] }
  | { t: "abs"; inner: Atom[] }
  | { t: "angle"; unit: "°" | "r" | "g"; inner: Atom[] }
  | { t: "colon" }
  | { t: "comma" }
  | { t: "placeholder" }
  | { t: "cplxfmt"; fmt: ComplexFormat };

export interface Cursor {
  /** Path of slot indices from the root slot. */
  path: number[];
  /** Number of atoms before the cursor in the current slot. */
  index: number;
  /** Character boundary within the number at index-1; null means an atom boundary. */
  offset: number | null;
}

export interface EditorState {
  root: Atom[];
  cursor: Cursor;
  insertMode: InsertMode;
  /** Natural-display SHIFT+DEL: the range to wrap on the next supported function key. */
  argumentCapture?: { path: number[]; start: number; end: number; offset: number | null };
}

export type NaturalKind = "decimal" | "fraction" | "mixed" | "sqrt" | "pi" | "complex" | "polar";

export interface ResultValue {
  approx: string;
  display: string;
  naturalKind: NaturalKind;
  fraction?: { mixed?: string; num: string; den: string; /** Signed improper numerator retained for format changes. */ improper?: string };
  pi?: { num: string; den: string };
  sqrt?: string;
  sexagesimal?: string;
  /** Rectangular parts as decimal strings. Present when the value is (or was) complex. */
  complex?: { re: string; im: string };
  /** Fifteen-digit calculator value retained independently of the LCD format. */
  internal?: { re: string; im?: string; x?: string; y?: string };
  /** ENG key offset in triples of three (0 = standard engineering). */
  engOffset?: number;
  engActive?: boolean;
  remainder?: { quot: string; rem: string };
  polRec?: { X: string; Y: string; kind: "pol" | "rec" };
}

export interface HistoryEntry {
  expression: Atom[];
  result: ResultValue;
  /** BASE-N keeps a linear token stream instead of a COMP Atom[] expression. */
  baseN?: BaseNState;
}

export interface CalcSession {
  source: Atom[];
  statements: Atom[][];
  promptVars: VarName[];
  promptIndex: number;
  statementIndex: number;
  assignmentTarget: VarName | null;
  phase: "prompt" | "result";
}

export interface MultiStatementSession {
  source: Atom[];
  statements: Atom[][];
  statementIndex: number;
}

export interface SolveSession {
  source: Atom[];
  left: Atom[];
  right: Atom[];
  target: VarName;
  promptVars: VarName[];
  promptIndex: number;
  phase: "parameters" | "initial" | "solution" | "continue";
  initialGuess: string;
  repeating: boolean;
  solution?: string;
  residual?: string;
}

export type MenuState =
  | { kind: "none" }
  | { kind: "mode"; page: number }
  | { kind: "setup"; page: number }
  | { kind: "hyp"; page: 0 | 1 }
  | { kind: "clr" }
  | { kind: "confirm"; action: "setup" | "memory" | "all" }
  | { kind: "sto" }
  | { kind: "rcl" }
  | { kind: "drg" }
  | { kind: "mthio" }
  | { kind: "fix" }
  | { kind: "sci" }
  | { kind: "norm" }
  | { kind: "cmplx-fmt" }
  | { kind: "stat-fmt" }
  | { kind: "table-fmt" }
  | { kind: "rdec" }
  | { kind: "disp" }
  | { kind: "contrast" }
  | { kind: "base-op"; page: number }
  | { kind: "cmplx-op" }
  | { kind: "stat-op" }
  | { kind: "stat-editor" }
  | { kind: "stat-edit" }
  | { kind: "stat-sum"; page: number }
  | { kind: "stat-var"; page: number }
  | { kind: "stat-reg" }
  | { kind: "stat-distr" }
  | { kind: "stat-minmax" }
  | { kind: "comp-fn" }
  | { kind: "const-entry"; digits: string }
  | { kind: "conv-entry"; digits: string }
  | { kind: "matrix-op" }
  | { kind: "vector-op" };

export type Screen =
  | { kind: "input" }
  | { kind: "result" }
  | { kind: "error"; code: ErrorCode; expression: Atom[]; errorIndex: number }
  | { kind: "replay"; historyIndex: number }
  | { kind: "off" }
  | { kind: "table-view" };

export type TablePhase = "fx" | "start" | "end" | "step" | "view";

export interface TableRow {
  xApprox: string;
  xDisplay: string;
  fxApprox: string | null;
  fxDisplay: string | null;
  fxError: ErrorCode | null;
}

export type BaseNRadix = 2 | 8 | 10 | 16;

export type BaseNOp = "+" | "-" | "×" | "÷" | "and" | "or" | "xor" | "xnor";

/** Linear BASE-N tokens. Not COMP decimal `Atom[]`. */
export type BaseNToken =
  | { t: "num"; digits: string; suffix: BaseNRadix | null; prefix?: boolean }
  | { t: "op"; op: BaseNOp }
  | { t: "not" }
  | { t: "negfn" }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "unary" }
  | { t: "ans" };

/** Additive BASE-N session. Integer domain is independent of COMP `Atom[]`. */
export interface BaseNState {
  radix: BaseNRadix;
  tokens: BaseNToken[];
  cursor: number;
  /** Canonical signed integer (decimal string), or null if no result yet. */
  value: string | null;
}

/** Official STAT calculation types (TARGET-OFFICIAL-DOC). */
export type StatType = "1-VAR" | "A+BX" | "_+CX2" | "ln X" | "e^X" | "A•B^X" | "A•X^B" | "1/X";

export type StatPhase = "type" | "editor" | "calc";

export type StatCol = "x" | "y" | "freq";

/** One Statistics Editor row. Cell strings are decimal literals, not COMP Atom[]. */
export interface StatRow {
  x: string | null;
  y: string | null;
  freq: string | null;
}

/**
 * Additive STAT session. Dataset lives here — never in COMP `Atom[]`.
 * Transient `input` is the current cell buffer (not persisted).
 */
export interface StatSession {
  type: StatType | null;
  phase: StatPhase;
  typePage: 0 | 1;
  rows: StatRow[];
  rowIndex: number;
  col: StatCol;
  input: string;
  editing: boolean;
}

/** Official EQN families (TARGET-OFFICIAL-DOC). */
export type EqnType = "lin2" | "lin3" | "quad" | "cubic";

export type EqnPhase = "type" | "editor" | "solutions" | "message";

export type EqnMessage = "no-solution" | "infinite";

/**
 * One EQN unknown or root. `sym` is the mathematical value (may be `cplx`).
 * LCD text is a projection — never the only copy of the solution.
 */
export interface EqnSolution {
  label: string;
  sym: Sym;
}

/** Committed coefficient cell. Empty `atoms` means the default 0. */
export interface EqnCoeff {
  atoms: Atom[];
  sym: Sym;
}

/**
 * Additive EQN session. Structured coefficient solver — not a COMP Atom[] polynomial.
 * Transient; not persisted (D-020).
 */
export interface EqnSession {
  type: EqnType | null;
  phase: EqnPhase;
  coeffIndex: number;
  coeffs: EqnCoeff[];
  solutions: EqnSolution[];
  solutionIndex: number;
  message: EqnMessage | null;
  /** After committing the last coefficient, the next `=` solves. */
  readyToSolve: boolean;
}

export type MatReg = "A" | "B" | "C" | "Ans";

export type MatrixDim = 1 | 2 | 3;

export type MatrixPhase =
  | "dim-reg"
  | "dim-size"
  | "data-reg"
  | "editor"
  | "calc"
  | "matans"
  | "sto-dest";

/**
 * Structured matrix value. Cells are existing `Sym` scalars — not `number[][]`,
 * not COMP `Atom[]`, and not a second floating-point system.
 */
export interface MatrixValue {
  rows: MatrixDim;
  cols: MatrixDim;
  cells: Sym[][];
}

/**
 * Additive MATRIX session. Register contents live here — never as COMP Atom[] matrices.
 * Transient; not persisted (D-021).
 */
export interface MatrixSession {
  phase: MatrixPhase;
  dimTarget: "A" | "B" | "C" | null;
  editorReg: MatReg | null;
  row: number;
  col: number;
  registers: {
    A: MatrixValue | null;
    B: MatrixValue | null;
    C: MatrixValue | null;
    Ans: MatrixValue | null;
  };
}

export type VctReg = "A" | "B" | "C" | "Ans";

export type VectorDim = 2 | 3;

export type VectorPhase =
  | "dim-reg"
  | "dim-size"
  | "data-reg"
  | "editor"
  | "calc"
  | "vctans"
  | "sto-dest";

/**
 * Structured vector value. Cells are existing `Sym` scalars — not `number[]`,
 * not COMP `Atom[]`, and not `MatrixValue`.
 */
export interface VectorValue {
  dim: VectorDim;
  cells: Sym[];
}

/**
 * Additive VECTOR session. Register contents live here — never as COMP Atom[] vectors.
 * Transient; not persisted (D-022).
 */
export interface VectorSession {
  phase: VectorPhase;
  dimTarget: "A" | "B" | "C" | null;
  editorReg: VctReg | null;
  index: number;
  registers: {
    A: VectorValue | null;
    B: VectorValue | null;
    C: VectorValue | null;
    Ans: VectorValue | null;
  };
}

/** Additive TABLE session. Not a COMP Atom[] encoding of the grid. */
export interface TableSession {
  phase: TablePhase;
  fx: Atom[];
  startAtoms: Atom[];
  endAtoms: Atom[];
  stepAtoms: Atom[];
  rows: TableRow[];
  rowIndex: number;
  /** Selected result column; optional for persisted sessions written before grid selection. */
  col?: "x" | "fx";
}

export interface CalcState {
  schemaVersion: 1;
  power: "on" | "off";
  mode: CalcMode;
  setup: SetupState;
  shift: boolean;
  alpha: boolean;
  hyp: boolean;
  editor: EditorState;
  screen: Screen;
  result: ResultValue | null;
  /** Transient worker calculation state; never restored as active work. */
  calculationPending?: boolean;
  /** AC revealed an expression after LCD overflow; cleared by navigation or first entry. */
  pendingInputRecall?: boolean;
  resultDecimal: boolean;
  ans: string;
  preAns: string;
  /** Imaginary part of Ans as a decimal string. `"0"` when Ans is real. Optional on persist. */
  ansIm: string;
  /** Imaginary part of PreAns. `"0"` when PreAns is real. Optional on persist. */
  preAnsIm: string;
  variables: Record<VarName, string>;
  memoryM: string;
  history: HistoryEntry[];
  /** Transient CALC prompt/result context; serialized states restore the source expression. */
  calcSession: CalcSession | null;
  /** Transient stepwise result for colon-separated expressions. */
  multiStatement: MultiStatementSession | null;
  /** Transient Newton SOLVE operation. */
  solveSession: SolveSession | null;
  menu: MenuState;
  lastActivityMs: number;
  rngSeed: number;
  baseN: BaseNState;
  table: TableSession | null;
  /** Additive STAT session. `null` outside STAT. Dataset is not COMP `Atom[]`. */
  stat: StatSession | null;
  /** Additive EQN session. `null` outside EQN. Coefficients are not a COMP polynomial AST. */
  eqn: EqnSession | null;
  /** Additive MATRIX session. `null` outside MATRIX. Register cells are not COMP Atom[]. */
  matrix: MatrixSession | null;
  /** Additive VECTOR session. `null` outside VECTOR. Components are not COMP Atom[]. */
  vector: VectorSession | null;
}

export interface DispatchOptions {
  nowMs?: number;
  random?: () => number;
}

export type ReduceFn = (state: CalcState, event: KeyEvent) => CalcState;

export const VAR_NAMES: VarName[] = ["A", "B", "C", "D", "E", "F", "M", "X", "Y"];

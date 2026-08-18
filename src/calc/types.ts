import type { KeyEvent } from "./keys.ts";

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
  | { t: "op"; op: "+" | "-" | "×" | "÷" | "÷R" | "nPr" | "nCr" }
  | { t: "frac"; num: Atom[]; den: Atom[] }
  | { t: "mixed"; whole: Atom[]; num: Atom[]; den: Atom[] }
  | { t: "sqrt"; inner: Atom[] }
  | { t: "cbrt"; inner: Atom[] }
  | { t: "nthrt"; n: Atom[]; inner: Atom[] }
  | { t: "pow"; base: Atom[]; exp: Atom[] }
  | { t: "logb"; base: Atom[]; arg: Atom[] }
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
  | { t: "placeholder" };

export interface Cursor {
  /** Path of slot indices from the root slot. */
  path: number[];
  /** Index in the current slot (cursor sits before this atom, or at end). */
  index: number;
  /** If the atom at index-1 is a number, offset into its string. */
  offset: number | null;
}

export interface EditorState {
  root: Atom[];
  cursor: Cursor;
  insertMode: InsertMode;
}

export type NaturalKind = "decimal" | "fraction" | "mixed" | "sqrt" | "pi";

export interface ResultValue {
  approx: string;
  display: string;
  naturalKind: NaturalKind;
  fraction?: { mixed?: string; num: string; den: string };
  pi?: { num: string; den: string };
  sqrt?: string;
  sexagesimal?: string;
}

export interface HistoryEntry {
  expression: Atom[];
  result: ResultValue;
}

export type MenuState =
  | { kind: "none" }
  | { kind: "mode"; page: number }
  | { kind: "setup"; page: number }
  | { kind: "hyp" }
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
  | { kind: "contrast" };

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

/** Additive TABLE session. Not a COMP Atom[] encoding of the grid. */
export interface TableSession {
  phase: TablePhase;
  fx: Atom[];
  startAtoms: Atom[];
  endAtoms: Atom[];
  stepAtoms: Atom[];
  rows: TableRow[];
  rowIndex: number;
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
  resultDecimal: boolean;
  ans: string;
  preAns: string;
  variables: Record<VarName, string>;
  memoryM: string;
  history: HistoryEntry[];
  menu: MenuState;
  lastActivityMs: number;
  rngSeed: number;
  baseN: { radix: 2 | 8 | 10 | 16 };
  table: TableSession | null;
}

export interface DispatchOptions {
  nowMs?: number;
  random?: () => number;
}

export type ReduceFn = (state: CalcState, event: KeyEvent) => CalcState;

export const VAR_NAMES: VarName[] = ["A", "B", "C", "D", "E", "F", "M", "X", "Y"];

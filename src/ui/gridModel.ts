import type { CalcState } from "../calc/types.ts";
import { atomsToLinear } from "../calc/editor.ts";
import { effectiveDisplayFormat, resultFromSym, formatBySetup } from "../calc/format.ts";
import { parseCalcNumber } from "../calc/numeric.ts";
import { columnsFor, statEditorValue } from "../calc/stat.ts";
import { eqnEditorValue } from "../calc/eqn.ts";
import { formatEqnValue } from "../calc/eqnSolve.ts";
import { matrixEditorValue } from "../calc/matrix.ts";
import { vectorEditorValue } from "../calc/vector.ts";

export type LcdGridKind = "stat" | "eqn" | "matrix" | "vector" | "table";

export interface LcdGridCell {
  value: string;
  label?: string;
  selected: boolean;
}

export interface LcdGridRow {
  index: number;
  label?: string;
  cells: LcdGridCell[];
}

export interface LcdGridModel {
  kind: LcdGridKind;
  title?: string;
  headers: string[];
  rows: LcdGridRow[];
  selectedValue: string;
  bracketed: boolean;
}

const GRID_ROWS = 3;

function windowStart(active: number, count: number, visible = GRID_ROWS): number {
  return Math.min(Math.max(0, active - visible + 1), Math.max(0, count - visible));
}

function formatStatCell(value: string | null, state: CalcState): string {
  if (value == null || value === "") {
    return "";
  }
  try {
    return formatBySetup(parseCalcNumber(value), state.setup);
  } catch {
    return value;
  }
}

function statGrid(state: CalcState): LcdGridModel | null {
  const stat = state.stat;
  if (!stat || stat.phase !== "editor" || !stat.type) {
    return null;
  }
  const columns = columnsFor(stat.type, state.setup.statFreq);
  const start = windowStart(stat.rowIndex, stat.rows.length);
  const rows = stat.rows.slice(start, start + GRID_ROWS).map((row, rowOffset) => {
    const index = start + rowOffset;
    return {
      index,
      label: String(index + 1),
      cells: columns.map((column) => {
        const value = row[column];
        return {
          value:
            index === stat.rowIndex && column === stat.col && stat.editing
              ? statEditorValue(stat)
              : formatStatCell(value, state),
          selected: index === stat.rowIndex && column === stat.col,
        };
      }),
    };
  });
  const selectedRow = stat.rows[stat.rowIndex];
  const selectedValue = stat.editing
    ? statEditorValue(stat)
    : formatStatCell(selectedRow?.[stat.col] ?? null, state);
  return {
    kind: "stat",
    headers: columns.map((column) => (column === "freq" ? "FREQ" : column.toUpperCase())),
    rows,
    selectedValue,
    bracketed: false,
  };
}

function equationShape(type: NonNullable<NonNullable<CalcState["eqn"]>["type"]>): { rows: number; cols: number } {
  switch (type) {
    case "lin2":
      return { rows: 2, cols: 3 };
    case "lin3":
      return { rows: 3, cols: 4 };
    case "quad":
      return { rows: 1, cols: 3 };
    case "cubic":
      return { rows: 1, cols: 4 };
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

function eqnGrid(state: CalcState): LcdGridModel | null {
  const eqn = state.eqn;
  if (!eqn || eqn.phase !== "editor" || !eqn.type) {
    return null;
  }
  const shape = equationShape(eqn.type);
  const selectedCol = eqn.coeffIndex % shape.cols;
  const firstCol = windowStart(selectedCol, shape.cols, 3);
  const visibleCols = Array.from(
    { length: Math.min(3, shape.cols) },
    (_, index) => firstCol + index,
  );
  const headers = visibleCols.map((col) => String.fromCharCode(97 + col));
  const rows = Array.from({ length: shape.rows }, (_, rowIndex) => ({
    index: rowIndex,
    label: String(rowIndex + 1),
    cells: visibleCols.map((colIndex) => {
      const index = rowIndex * shape.cols + colIndex;
      const coeff = eqn.coeffs[index];
      return {
        value:
          index === eqn.coeffIndex && state.editor.root.length > 0
            ? eqnEditorValue(state)
            : coeff
              ? formatEqnValue(coeff.sym, state.setup, true).display
              : "0",
        selected: index === eqn.coeffIndex,
      };
    }),
  }));
  return {
    kind: "eqn",
    headers,
    rows,
    selectedValue: eqnEditorValue(state),
    bracketed: true,
  };
}

function matrixGrid(state: CalcState): LcdGridModel | null {
  const session = state.matrix;
  if (!session || (session.phase !== "editor" && session.phase !== "matans") || !session.editorReg) {
    return null;
  }
  const matrix = session.registers[session.editorReg];
  if (!matrix) {
    return null;
  }
  const setup = { ...state.setup, displayFormat: effectiveDisplayFormat(state.mode, state.setup.displayFormat) };
  const displayState = { ...state, setup };
  const start = windowStart(session.row, matrix.rows);
  const rows = matrix.cells.slice(start, start + GRID_ROWS).map((values, rowOffset) => {
    const index = start + rowOffset;
    return {
      index,
      cells: values.map((sym, col) => ({
        value:
          index === session.row && col === session.col && state.editor.root.length > 0
            ? atomsToLinear(state.editor.root, setup.displayFormat)
            : resultFromSym(sym, setup).display,
        selected: index === session.row && col === session.col,
      })),
    };
  });
  return {
    kind: "matrix",
    title: session.editorReg === "Ans" ? "Ans" : session.editorReg,
    headers: [],
    rows,
    selectedValue: matrixEditorValue(displayState),
    bracketed: true,
  };
}

function vectorGrid(state: CalcState): LcdGridModel | null {
  const session = state.vector;
  if (!session || (session.phase !== "editor" && session.phase !== "vctans") || !session.editorReg) {
    return null;
  }
  const vector = session.registers[session.editorReg];
  if (!vector) {
    return null;
  }
  const setup = { ...state.setup, displayFormat: effectiveDisplayFormat(state.mode, state.setup.displayFormat) };
  const displayState = { ...state, setup };
  return {
    kind: "vector",
    title: session.editorReg === "Ans" ? "Ans" : session.editorReg,
    headers: [],
    rows: [
      {
        index: 0,
        cells: vector.cells.map((sym, index) => ({
          value:
            index === session.index && state.editor.root.length > 0
              ? atomsToLinear(state.editor.root, setup.displayFormat)
              : resultFromSym(sym, setup).display,
          selected: index === session.index,
        })),
      },
    ],
    selectedValue: vectorEditorValue(displayState),
    bracketed: true,
  };
}

function tableGrid(state: CalcState, selectedColumn: "x" | "fx"): LcdGridModel | null {
  const table = state.table;
  if (!table || table.phase !== "view") {
    return null;
  }
  const start = windowStart(table.rowIndex, table.rows.length);
  const rows = table.rows.slice(start, start + GRID_ROWS).map((row, rowOffset) => {
    const index = start + rowOffset;
    return {
      index,
      label: String(index + 1),
      cells: [
        { value: row.xDisplay, selected: index === table.rowIndex && selectedColumn === "x" },
        {
          value: row.fxError ?? row.fxDisplay ?? "",
          selected: index === table.rowIndex && selectedColumn === "fx",
        },
      ],
    };
  });
  const selected = table.rows[table.rowIndex];
  return {
    kind: "table",
    headers: ["X", "F(X)"],
    rows,
    selectedValue:
      selectedColumn === "x"
        ? selected?.xDisplay ?? ""
        : selected?.fxError ?? selected?.fxDisplay ?? "",
    bracketed: false,
  };
}

export function lcdGridModel(state: CalcState, selectedTableColumn: "x" | "fx" = "x"): LcdGridModel | null {
  if (state.screen.kind === "error") {
    return null;
  }
  if (state.mode === "STAT") {
    return statGrid(state);
  }
  if (state.mode === "EQN") {
    return eqnGrid(state);
  }
  if (state.mode === "MATRIX") {
    return matrixGrid(state);
  }
  if (state.mode === "VECTOR") {
    return vectorGrid(state);
  }
  if (state.mode === "TABLE") {
    return tableGrid(state, selectedTableColumn);
  }
  return null;
}

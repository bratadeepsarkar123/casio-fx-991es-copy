import type { CSSProperties } from "react";
import type { LcdGridModel } from "./gridModel.ts";
import "./grid.css";

export function GridView({ model }: { model: LcdGridModel }) {
  const columns = Math.max(...model.rows.map((row) => row.cells.length), model.headers.length, 1);
  const hasRowLabels = model.kind === "stat" || model.kind === "eqn" || model.kind === "table";
  const gridColumns = `${hasRowLabels ? "1.15em " : ""}repeat(${columns}, minmax(0, 1fr))`;
  return (
    <div
      className={`lcd-grid lcd-grid-${model.kind}${model.bracketed ? " is-bracketed" : ""}`}
      data-testid="lcd-grid"
      data-grid-kind={model.kind}
      style={{ "--lcd-grid-columns": gridColumns } as CSSProperties}
    >
      {model.title ? <div className="lcd-grid-title">{model.title}</div> : null}
      {model.headers.length > 0 ? (
        <div className="lcd-grid-row lcd-grid-header" role="row">
          {hasRowLabels ? <span className="lcd-grid-row-label" aria-hidden="true" /> : null}
          {model.headers.map((header, column) => (
            <span className="lcd-grid-cell" role="columnheader" data-grid-column={column} key={header}>
              {header}
            </span>
          ))}
        </div>
      ) : null}
      <div className="lcd-grid-body" role="grid">
        {model.rows.map((row) => (
          <div className="lcd-grid-row" role="row" data-grid-row={row.index} key={row.index}>
            {hasRowLabels ? <span className="lcd-grid-row-label" role="rowheader">{row.label}</span> : null}
            {row.cells.map((cell, column) => (
              <span
                className={`lcd-grid-cell${cell.selected ? " is-selected" : ""}${cell.label ? " has-cell-label" : ""}`}
                role="gridcell"
                data-grid-column={column}
                data-selected={cell.selected ? "true" : "false"}
                aria-selected={cell.selected}
                key={`${row.index}-${column}`}
              >
                {cell.label ? <span className="lcd-grid-cell-label">{cell.label}</span> : null}
                <span className="lcd-grid-cell-value">{cell.value || "\u00a0"}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="lcd-grid-selected" data-testid="grid-selected-value" aria-live="polite">
        {model.selectedValue || "\u00a0"}
      </div>
    </div>
  );
}

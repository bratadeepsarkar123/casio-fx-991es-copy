import type { CSSProperties } from "react";
import type { CalcState } from "../calc/types.ts";
import { angleIndicator, lcdExpression, lcdResult } from "./lcdModel.ts";

interface LcdProps {
  state: CalcState;
  style: CSSProperties;
}

export function Lcd({ state, style }: LcdProps) {
  const expr = lcdExpression(state);
  const result = lcdResult(state);
  const ang = angleIndicator(state);
  const math = state.setup.displayFormat !== "LineIO";
  const contrast = 0.75 + state.setup.contrast * 0.05;

  return (
    <div
      className="lcd-panel overflow-hidden rounded-[2%] px-[3%] py-[4%] font-mono"
      style={{
        ...style,
        background: "#c5d4c7",
        color: "#1a221c",
        boxShadow: "inset 0 0 8px rgba(0,0,0,0.25)",
        filter: `contrast(${contrast})`,
        opacity: state.power === "off" ? 0.35 : 1,
      }}
      data-testid="lcd"
      aria-live="polite"
    >
      <div className="flex h-[18%] items-center gap-2 text-[0.55em] font-bold tracking-wide">
        {state.shift ? <span data-testid="ind-s">S</span> : null}
        {state.alpha ? <span data-testid="ind-a">A</span> : null}
        {state.memoryM !== "0" ? <span>M</span> : null}
        <span data-testid="ind-angle">{ang}</span>
        {math ? <span data-testid="ind-math">Math</span> : null}
        {state.setup.numberFormat.kind === "Fix" ? <span>FIX</span> : null}
        {state.setup.numberFormat.kind === "Sci" ? <span>SCI</span> : null}
        {state.mode !== "COMP" ? <span>{state.mode}</span> : null}
        {state.history.length > 0 ? <span>▲</span> : null}
      </div>
      <div
        className="h-[52%] overflow-hidden text-[0.95em] leading-tight"
        data-testid="lcd-expr"
        style={{ opacity: state.power === "off" ? 0 : 1 }}
      >
        {expr || "\u00a0"}
      </div>
      <div
        className="h-[30%] text-right text-[1.15em] font-semibold"
        data-testid="lcd-result"
      >
        {result}
      </div>
    </div>
  );
}

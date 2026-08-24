import type { CSSProperties } from "react";
import type { CalcState } from "../calc/types.ts";
import { angleIndicator, lcdExpressionParts, lcdIndicators, lcdResult } from "./lcdModel.ts";

interface LcdProps {
  state: CalcState;
  style: CSSProperties;
}

export function Lcd({ state, style }: LcdProps) {
  const parts = lcdExpressionParts(state);
  const result = lcdResult(state);
  const ang = angleIndicator(state);
  const ind = lcdIndicators(state);
  const math = ind.math;
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
        {ind.shift ? <span data-testid="ind-s">S</span> : null}
        {ind.alpha ? <span data-testid="ind-a">A</span> : null}
        {ind.hyp ? <span data-testid="ind-hyp">HYP</span> : null}
        {ind.memory ? <span data-testid="ind-m">M</span> : null}
        {ind.sto ? <span data-testid="ind-sto">STO</span> : null}
        {ind.rcl ? <span data-testid="ind-rcl">RCL</span> : null}
        <span data-testid="ind-angle">{ang}</span>
        {math ? <span data-testid="ind-math">Math</span> : null}
        {ind.fix ? <span data-testid="ind-fix">FIX</span> : null}
        {ind.sci ? <span data-testid="ind-sci">SCI</span> : null}
        {ind.mode ? <span data-testid="ind-mode">{ind.mode}</span> : null}
        {ind.baseN ? <span data-testid="ind-basen">{ind.baseN}</span> : null}
        {ind.replay ? <span data-testid="ind-replay">▲</span> : null}
      </div>
      <div
        className="h-[52%] overflow-hidden text-[0.95em] leading-tight"
        data-testid="lcd-expr"
        style={{ opacity: state.power === "off" ? 0 : 1 }}
      >
        {parts.before}
        {parts.showCaret ? <span data-testid="lcd-caret" className="lcd-caret" aria-hidden="true" /> : null}
        {parts.after}
        {!parts.before && !parts.after && !parts.showCaret ? "\u00a0" : null}
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

import type { CSSProperties } from "react";
import type { CalcState } from "../calc/types.ts";
import { angleIndicator, lcdExpressionParts, lcdIndicators, lcdResult, lcdShowsNatural } from "./lcdModel.ts";
import { NaturalExpression, NaturalResultView } from "./naturalView.tsx";
import "./lcd.css";

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
  const natural = lcdShowsNatural(state);
  const mathO = state.setup.displayFormat === "MthIO-MathO";
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
      <div className="lcd-ind">
        <div className="lcd-ind-left">
          {ind.shift ? <span data-testid="ind-s">S</span> : null}
          {ind.alpha ? <span data-testid="ind-a">A</span> : null}
          {ind.hyp ? <span data-testid="ind-hyp">HYP</span> : null}
          {ind.memory ? <span data-testid="ind-m">M</span> : null}
          {ind.sto ? <span data-testid="ind-sto">STO</span> : null}
          {ind.rcl ? <span data-testid="ind-rcl">RCL</span> : null}
          {ind.disp ? <span data-testid="ind-disp">Disp</span> : null}
        </div>
        <div className="lcd-ind-mid">
          <span className="lcd-angle" data-testid="ind-angle">
            {ang}
          </span>
          {math ? <span data-testid="ind-math">Math</span> : null}
          {ind.fix ? <span data-testid="ind-fix">FIX</span> : null}
          {ind.sci ? <span data-testid="ind-sci">SCI</span> : null}
        </div>
        <div className="lcd-ind-right">
          {ind.mode ? <span data-testid="ind-mode">{ind.mode}</span> : null}
          {ind.baseN ? <span data-testid="ind-basen">{ind.baseN}</span> : null}
          {ind.replay ? <span data-testid="ind-replay">▲</span> : null}
          {ind.exprOverflow ? (
            <span className="lcd-scroll" data-testid="ind-scroll-expr">
              &gt;
            </span>
          ) : null}
          {ind.resultOverflow ? (
            <span className="lcd-scroll" data-testid="ind-scroll-result">
              ▾
            </span>
          ) : null}
        </div>
      </div>
      <div className="lcd-expr" data-testid="lcd-expr" style={{ opacity: state.power === "off" ? 0 : 1 }}>
        <div className="lcd-expr-inner">
          {natural ? (
            <NaturalExpression
              atoms={state.editor.root}
              format={state.setup.displayFormat}
              cursor={parts.showCaret ? state.editor.cursor : null}
              showCaret={parts.showCaret}
            />
          ) : (
            <>
              {parts.before}
              {parts.showCaret ? <span data-testid="lcd-caret" className="lcd-caret" aria-hidden="true" /> : null}
              {parts.after}
              {!parts.before && !parts.after && !parts.showCaret ? "\u00a0" : null}
            </>
          )}
        </div>
      </div>
      <div className="lcd-result" data-testid="lcd-result">
        {state.result && mathO && (state.screen.kind === "result" || state.screen.kind === "replay") ? (
          <NaturalResultView result={state.result} mathO={mathO} />
        ) : (
          result
        )}
      </div>
    </div>
  );
}

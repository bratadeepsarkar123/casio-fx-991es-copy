import type { CSSProperties } from "react";
import type { CalcState } from "../calc/types.ts";
import {
  angleIndicator,
  lcdExpressionParts,
  lcdIndicators,
  lcdMenuView,
  lcdResult,
  lcdShowsMenu,
  lcdShowsNatural,
} from "./lcdModel.ts";
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
  const menu = lcdMenuView(state);
  const contrast = 0.75 + state.setup.contrast * 0.05;
  const menuOpen = lcdShowsMenu(state);
  const stackedResult =
    Boolean(state.result) &&
    mathO &&
    (state.screen.kind === "result" || state.screen.kind === "replay") &&
    (state.result?.naturalKind === "fraction" || state.result?.naturalKind === "mixed");
  const panelClass = [
    "lcd-panel",
    "overflow-hidden",
    "rounded-[2%]",
    "px-[3%]",
    "py-[3%]",
    "font-mono",
    menuOpen ? "is-menu" : "",
    stackedResult ? "has-nat-result" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={panelClass}
      style={{
        ...style,
        background: "#c3d1c4",
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
          {ind.mode ? <span data-testid="ind-mode">{ind.mode}</span> : null}
        </div>
        <div className="lcd-ind-mid">
          <span className="lcd-angle" data-testid="ind-angle">
            {ang}
          </span>
        </div>
        <div className="lcd-ind-right">
          {math ? <span data-testid="ind-math">Math</span> : null}
          {ind.fix ? <span data-testid="ind-fix">FIX</span> : null}
          {ind.sci ? <span data-testid="ind-sci">SCI</span> : null}
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
      {menu ? (
        <div className="lcd-menu" data-testid="lcd-menu" style={{ opacity: state.power === "off" ? 0 : 1 }}>
          {menu.prompt ? <div className="lcd-menu-prompt">{menu.prompt}</div> : null}
          {menu.items.length > 0 ? (
            <div className="lcd-menu-grid">
              {menu.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          <span className="lcd-menu-linear" data-testid="lcd-result">
            {result}
          </span>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

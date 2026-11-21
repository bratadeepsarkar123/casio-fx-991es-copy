import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { CalcState } from "../calc/types.ts";
import type { KeyId } from "../calc/keys.ts";
import { useCalcStore } from "../store.ts";
import {
  LCD_MIN_GLYPH_DOTS,
  LCD_SCREEN_DOTS,
  naturalFormulaHeightLines,
  naturalFormulaHeightScreens,
} from "../calc/naturalHeight.ts";
import { effectiveDisplayFormat } from "../calc/format.ts";
import {
  angleIndicator,
  lcdExpressionParts,
  lcdIndicators,
  lcdInputByteWarning,
  lcdMenuView,
  lcdResult,
  lcdResultRows,
  lcdShowsMenu,
  lcdShowsNatural,
} from "./lcdModel.ts";
import type { LcdResultRow } from "./lcdModel.ts";
import { NaturalExpression, NaturalResultView } from "./naturalView.tsx";
import { GridView } from "./GridView.tsx";
import { lcdGridModel } from "./gridModel.ts";
import "./lcd.css";

function LineResultRows(props: { rows: LcdResultRow[] }) {
  return (
    <div className="lcd-line-result" data-testid="lcd-line-result">
      {props.rows.map((row, index) => (
        <div className="lcd-line-result-row" data-testid={`lcd-line-result-row-${index}`} key={index}>
          <span className="lcd-line-result-label" data-testid={`lcd-line-result-label-${index}`}>
            {row.label}
          </span>
          <span className="lcd-line-result-value" data-testid={`lcd-line-result-value-${index}`}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface LcdProps {
  state: CalcState;
  style: CSSProperties;
}

export function Lcd({ state, style }: LcdProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const expressionViewport = useRef<HTMLDivElement>(null);
  const resultViewport = useRef<HTMLDivElement>(null);
  const [expressionHiddenSides, setExpressionHiddenSides] = useState({ left: false, right: false });
  const [resultHiddenSides, setResultHiddenSides] = useState({ left: false, right: false });
  const [naturalMinimumGlyphPx, setNaturalMinimumGlyphPx] = useState(0);
  const parts = lcdExpressionParts(state);
  const result = lcdResult(state);
  const lineResultRows = lcdResultRows(state);
  const ang = angleIndicator(state);
  const ind = lcdIndicators(state);
  const math = ind.math;
  const natural = lcdShowsNatural(state);
  const mathO = effectiveDisplayFormat(state.mode, state.setup.displayFormat) === "MthIO-MathO";
  const solveResult = state.solveSession?.phase === "solution" ? state.solveSession : null;
  const menu = lcdMenuView(state);
  const grid = lcdGridModel(state, state.table?.col ?? "x");
  const contrast = 0.75 + state.setup.contrast * 0.05;
  const menuOpen = lcdShowsMenu(state);
  const poweredOff = state.power === "off";
  const inputByteWarning = lcdInputByteWarning(state);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const measure = () => {
      const next = panel.getBoundingClientRect().height / LCD_SCREEN_DOTS * LCD_MIN_GLYPH_DOTS;
      setNaturalMinimumGlyphPx((current) => Math.abs(current - next) < 0.1 ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  const showInputOverflow = (state.screen.kind === "input" || state.screen.kind === "result" || state.screen.kind === "replay") && !menuOpen && !grid;
  const stackedResult =
    Boolean(state.result) &&
    mathO &&
    (state.screen.kind === "result" || state.screen.kind === "replay") &&
    (state.result?.naturalKind === "fraction" || state.result?.naturalKind === "mixed");
  const panelClass = [
    "lcd-panel",
    state.screen.kind === "input" ? "is-input-screen" : "",
    "overflow-hidden",
    "rounded-[2%]",
    "px-[3%]",
    "py-[3%]",
    "font-mono",
    menuOpen ? "is-menu" : "",
    stackedResult ? "has-nat-result" : "",
    poweredOff ? "is-off" : "",
    inputByteWarning ? "is-byte-warning" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const updateExpressionHiddenSides = (viewport = expressionViewport.current) => {
    const inner = viewport?.querySelector<HTMLElement>(".lcd-expr-inner");
    const viewportRect = viewport?.getBoundingClientRect();
    const innerRect = inner?.getBoundingClientRect();
    const next = viewport && showInputOverflow && viewportRect && innerRect
      ? {
          left: innerRect.left < viewportRect.left - 0.5,
          right: innerRect.right > viewportRect.right + 0.5,
        }
      : { left: false, right: false };
    setExpressionHiddenSides((current) =>
      current.left === next.left && current.right === next.right ? current : next,
    );
  };

  const updateResultHidden = (viewport = resultViewport.current) => {
    if (!viewport) {
      setResultHiddenSides({ left: false, right: false });
      return;
    }
    // Result markers report horizontal continuation only. Natural fractions
    // can be taller than one line without having hidden horizontal content.
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const next = {
      left: maxScroll > 0.5 && viewport.scrollLeft > 0.5,
      right: maxScroll > 0.5 && viewport.scrollLeft < maxScroll - 0.5,
    };
    setResultHiddenSides((current) =>
      current.left === next.left && current.right === next.right ? current : next,
    );
  };

  useLayoutEffect(() => {
    const viewport = expressionViewport.current;
    if (!viewport) {
      updateExpressionHiddenSides(null);
      return;
    }

    const caret = viewport.querySelector<HTMLElement>('[data-testid="lcd-caret"]');
    if (!caret) {
      if (state.screen.kind === "result" || state.screen.kind === "replay") {
        viewport.scrollLeft = 0;
      }
      updateExpressionHiddenSides(viewport);
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const caretRect = caret.getBoundingClientRect();
    const inset = 4;
    if (caretRect.top < viewportRect.top + inset) {
      viewport.scrollTop -= viewportRect.top + inset - caretRect.top;
    } else if (caretRect.bottom > viewportRect.bottom - inset) {
      viewport.scrollTop += caretRect.bottom - (viewportRect.bottom - inset);
    }
    if (caretRect.left < viewportRect.left + inset) {
      viewport.scrollLeft -= viewportRect.left + inset - caretRect.left;
    } else if (caretRect.right > viewportRect.right - inset) {
      viewport.scrollLeft += caretRect.right - (viewportRect.right - inset);
    }
    updateExpressionHiddenSides(viewport);
  }, [natural, parts.after, parts.before, state.editor.cursor, state.editor.root, state.power, state.screen.kind]);

  useLayoutEffect(() => {
    const viewport = resultViewport.current;
    if (viewport) {
      viewport.scrollLeft = 0;
      updateResultHidden(viewport);
    }
  }, [lineResultRows, result, state.power, state.screen.kind, state.solveSession?.phase]);

  useEffect(() => {
    const onResultScroll = (event: Event) => {
      const keyId = (event as CustomEvent<KeyId>).detail;
      if (keyId !== "left" && keyId !== "right") {
        return;
      }
      const current = useCalcStore.getState().state;
      if ((current.screen.kind !== "result" && current.screen.kind !== "replay") || current.menu.kind !== "none") {
        return;
      }
      const viewport = resultViewport.current;
      if (!viewport || viewport.scrollWidth <= viewport.clientWidth + 1) {
        return;
      }
      if (!useCalcStore.getState().recordActivity(Date.now())) {
        return;
      }

      const content = viewport.querySelector<HTMLElement>("[data-testid='lcd-result-content']");
      const textNode = content ? document.createTreeWalker(content, NodeFilter.SHOW_TEXT).nextNode() : null;
      let characterWidth = 0;
      if (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        range.setEnd(textNode, Math.min(1, textNode.textContent?.length ?? 0));
        characterWidth = range.getBoundingClientRect().width;
      }
      if (characterWidth <= 0) {
        characterWidth = Number.parseFloat(getComputedStyle(viewport).fontSize) * 0.6;
      }
      viewport.scrollLeft += keyId === "right" ? characterWidth : -characterWidth;
      event.preventDefault();
    };
    const onAcContext = (event: Event) => {
      const current = useCalcStore.getState().state;
      if (
        (current.screen.kind !== "result" && current.screen.kind !== "replay") ||
        current.menu.kind !== "none" ||
        current.shift
      ) {
        return;
      }
      const result = resultViewport.current;
      const expression = expressionViewport.current;
      const resultContinues = Boolean(result && result.scrollWidth > result.clientWidth + 1);
      const minimumVisibleGlyph = panelRef.current
        ? panelRef.current.getBoundingClientRect().height / LCD_SCREEN_DOTS * LCD_MIN_GLYPH_DOTS
        : naturalMinimumGlyphPx;
      const naturalInputIsClipped = Boolean(
        lcdShowsNatural(current) && expression && (
          expression.scrollWidth > expression.clientWidth + 1 ||
          expression.scrollHeight - expression.clientHeight > minimumVisibleGlyph
        ),
      );
      if (resultContinues || naturalInputIsClipped) {
        event.preventDefault();
      }
    };
    window.addEventListener("calculator-result-scroll", onResultScroll);
    window.addEventListener("calculator-ac-context", onAcContext);
    return () => {
      window.removeEventListener("calculator-result-scroll", onResultScroll);
      window.removeEventListener("calculator-ac-context", onAcContext);
    };
  }, []);

  const screenContent = poweredOff ? null : (
    <>
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
          {ind.replayDown ? <span data-testid="ind-replay-down">▼</span> : null}
          {ind.menuUp ? <span data-testid="ind-menu-up">▲</span> : null}
          {ind.menuDown ? <span data-testid="ind-menu-down">▼</span> : null}
        </div>
      </div>
      {state.screen.kind === "error" ? (
        <div className="lcd-error" data-testid="lcd-error">
          <div className="lcd-error-title" data-testid="lcd-error-title">{state.screen.code}</div>
          <div className="lcd-error-options">[AC] :Cancel</div>
          <div className="lcd-error-options">[◀][▶]:Goto</div>
        </div>
      ) : menu ? (
        <div className="lcd-menu" data-testid="lcd-menu">
          {menu.prompt ? <div className="lcd-menu-prompt">{menu.prompt}</div> : null}
          {menu.items.length > 0 ? (
            <div className="lcd-menu-grid">
              {menu.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          {menu.entry ? (
            <span className="lcd-menu-entry" data-testid="lcd-menu-entry">
              {menu.entry}
            </span>
          ) : null}
          <span className="lcd-menu-linear" data-testid="lcd-result">
            {result}
          </span>
        </div>
      ) : grid ? (
        <GridView model={grid} />
      ) : (
        <>
          <div className={[
            "lcd-expr-row",
            expressionHiddenSides.right && !expressionHiddenSides.left ? "has-hidden-right-only" : "",
          ].filter(Boolean).join(" ")}>
            {showInputOverflow && expressionHiddenSides.left ? (
              <span className="lcd-expression-marker" data-testid="ind-scroll-expr-left" aria-label="Earlier input is hidden to the left">&#9665;</span>
            ) : null}
            <div
              className="lcd-expr"
              data-testid="lcd-expr"
              data-natural-formula-height-lines={naturalFormulaHeightLines(state.editor.root, state.editor.cursor)}
              data-natural-formula-height-screens={naturalFormulaHeightScreens(state.editor.root, state.editor.cursor)}
              ref={expressionViewport}
              onScroll={(event) => updateExpressionHiddenSides(event.currentTarget)}
            >
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
            {showInputOverflow && expressionHiddenSides.right ? (
              <span className="lcd-expression-marker" data-testid="ind-scroll-expr-right" aria-label="More input is hidden to the right">&#9655;</span>
            ) : null}
          </div>
          <div className={[
            "lcd-result-frame",
            solveResult ? "is-solve-result" : "",
            stackedResult ? "is-natural-result" : "",
            resultHiddenSides.right && !resultHiddenSides.left ? "has-hidden-right-only" : "",
          ].filter(Boolean).join(" ")}>
            {resultHiddenSides.left ? (
              <span className="lcd-result-marker lcd-result-marker-left" data-testid="ind-scroll-result-left" aria-label="Earlier result is hidden to the left">&#9664;</span>
            ) : null}
            <div
              className={[
                "lcd-result",
                resultHiddenSides.left || resultHiddenSides.right ? "is-result-overflow" : "",
                resultHiddenSides.left ? "has-hidden-left" : "",
                resultHiddenSides.right ? "has-hidden-right" : "",
              ].filter(Boolean).join(" ")}
              data-testid="lcd-result"
              ref={resultViewport}
              onScroll={(event) => updateResultHidden(event.currentTarget)}
            >
              <div className="lcd-result-content" data-testid="lcd-result-content">
                {solveResult ? (
                  <div
                    data-testid="solve-result"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      justifyContent: "flex-end",
                      gap: "0.1em",
                      width: "100%",
                      height: "100%",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div data-testid="solve-value" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span data-testid="solve-value-label">{solveResult.target}=</span>
                      <span data-testid="solve-value-number">{solveResult.solution ?? solveResult.initialGuess}</span>
                    </div>
                    <div data-testid="solve-residual" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span data-testid="solve-residual-label">{"L\u2212R="}</span>
                      <span data-testid="solve-residual-number">{solveResult.residual ?? "0"}</span>
                    </div>
                  </div>
                ) : lineResultRows ? (
                  <LineResultRows rows={lineResultRows} />
                ) : state.result && mathO && (state.screen.kind === "result" || state.screen.kind === "replay") ? (
                  <span className="lcd-result-text">
                  <NaturalResultView result={{ ...state.result, display: state.result.display.replace(/,\s*\u03b8=/g, ",\u03b8=") }} mathO={mathO} />
                  </span>
                ) : (
                  <span className="lcd-result-text">{result.replace(/,\s*\u03b8=/g, ",\u03b8=")}</span>
                )}
              </div>
            </div>
            {resultHiddenSides.right ? (
              <span className="lcd-result-marker lcd-result-marker-right" data-testid="ind-scroll-result-right" aria-label="More result is hidden to the right">&#9654;</span>
            ) : null}
          </div>
        </>
      )}
    </>
  );

  return (
    <div
      ref={panelRef}
      className={panelClass}
      aria-busy={state.calculationPending ? "true" : "false"}
      style={{
        ...style,
        "--lcd-natural-min-glyph": `${naturalMinimumGlyphPx}px`,
        background: "#c3d1c4",
        color: "#1a221c",
        boxShadow: "inset 0 0 8px rgba(0,0,0,0.25)",
        filter: `contrast(${contrast})`,
      } as CSSProperties}
      data-testid="lcd"
      data-power={state.power}
      aria-live="polite"
    >
      {screenContent}
    </div>
  );
}

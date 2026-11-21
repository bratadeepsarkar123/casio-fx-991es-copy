import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import { Lcd } from "./Lcd.tsx";

describe("selected-guide SOLVE LCD", () => {
  it("renders E-21's solution and L-R on separate visible rows", () => {
    let state = dispatchKeys(
      createInitialState(0),
      [
        "alpha", "sd", "alpha", "calc", "alpha", "neg", "alpha", "rparen", "square", "add", "alpha", "dms", "shift", "calc",
        "0", "equals", "1", "equals", "neg", "2", "equals", "1", "equals",
      ],
      0,
    );
    expect(state.solveSession?.phase).toBe("solution");

    const html = renderToStaticMarkup(<Lcd state={state} style={{ width: 300, height: 110 }} />);
    expect(html).toContain('data-testid="solve-result"');
    expect(html).toContain('data-testid="solve-value"');
    expect(html).toContain('data-testid="solve-value-label"');
    expect(html).toContain('data-testid="solve-value-number"');
    expect(html).toContain('data-testid="solve-residual"');
    expect(html).toContain('data-testid="solve-residual-label"');
    expect(html).toContain('data-testid="solve-residual-number"');
    expect(html).toContain(">X=</span><span data-testid=\"solve-value-number\">1.414213562</span>");
    expect(html).toContain(`>L−R=</span><span data-testid="solve-residual-number">${state.solveSession?.residual}</span>`);
  });
});

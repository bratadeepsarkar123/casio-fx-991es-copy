import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState, dispatchKeys } from "../calc/machine.ts";
import { Lcd } from "./Lcd.tsx";
import { lcdGridModel } from "./gridModel.ts";

describe("mode-grid error display", () => {
  it("replaces a matrix grid with the E-40 error title and recovery keys", () => {
    const state = dispatchKeys(
      createInitialState(0),
      ["mode", "6", "1", "1", "1", "div", "0", "equals"],
      0,
    );
    expect(state.screen.kind).toBe("error");
    if (state.screen.kind !== "error") {
      return;
    }
    expect(state.screen.code).toBe("Math ERROR");
    expect(state.matrix?.phase).toBe("editor");
    expect(lcdGridModel(state)).toBeNull();

    const markup = renderToStaticMarkup(<Lcd state={state} style={{ width: 320, height: 120 }} />);
    expect(markup).toContain("data-testid=\"lcd-error-title\">Math ERROR</div>");
    expect(markup).toContain("[AC] :Cancel");
    expect(markup).toContain("[◀][▶]:Goto");
    expect(markup).not.toContain("lcd-grid");
    expect(markup).not.toContain("data-testid=\"lcd-expr\"");
  });
});

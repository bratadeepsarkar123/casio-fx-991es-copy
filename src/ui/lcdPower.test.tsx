import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState } from "../calc/machine.ts";
import { Lcd } from "./Lcd.tsx";

describe("powered-off LCD", () => {
  it("renders a blank display with no status indicators or caret", () => {
    const state = {
      ...createInitialState(0),
      alpha: true,
      shift: true,
      power: "off" as const,
      screen: { kind: "off" as const },
    };
    const markup = renderToStaticMarkup(<Lcd state={state} style={{ width: 320, height: 120 }} />);

    expect(markup).toMatch(/data-power="off"/);
    expect(markup).not.toContain("data-testid=\"ind-");
    expect(markup).not.toContain("lcd-caret");
    expect(markup.match(/<div[^>]*data-testid="lcd"[^>]*>(.*?)<\/div>/s)?.[1]).toBe("");
  });
});

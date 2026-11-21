import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";
import { lcdExpression } from "../ui/lcdModel.ts";

describe("selected guide PDF p. 44 / E-43 function-parenthesis FAQ", () => {
  it("closes sin(30) before adding 15 to obtain 15.5", () => {
    const state = dispatchKeys(
      createInitialState(0),
      ["sin", "3", "0", "rparen", "add", "1", "5", "equals"],
      0,
    );
    expect(state.screen.kind).toBe("result");
    expect(state.result?.approx).toBe("15.5");
    expect(lcdExpression(state)).toBe("sin(30)+15");
  });

  it("shows the different result when the function's closing parenthesis is omitted", () => {
    const state = dispatchKeys(createInitialState(0), ["sin", "3", "0", "add", "1", "5", "equals"], 0);
    expect(state.screen.kind).toBe("result");
    expect(state.result?.approx).toBe("0.7071067812");
    expect(lcdExpression(state)).toBe("sin(30+15");
  });
});

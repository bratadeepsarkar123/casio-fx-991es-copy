import { describe, expect, it } from "vitest";
import { createInitialState, dispatchKeys } from "./machine.ts";

describe("state machine latches", () => {
  it("SHIFT toggles and is consumed", () => {
    let s = createInitialState();
    s = dispatchKeys(s, ["shift"]);
    expect(s.shift).toBe(true);
    s = dispatchKeys(s, ["sin"]);
    expect(s.shift).toBe(false);
  });

  it("ON turns power on", () => {
    let s = createInitialState();
    s = dispatchKeys(s, ["shift", "ac"]);
    expect(s.power).toBe("off");
    s = dispatchKeys(s, ["on"]);
    expect(s.power).toBe("on");
  });
});

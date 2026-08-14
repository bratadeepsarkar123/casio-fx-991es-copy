import { describe, expect, it } from "vitest";
import { createInitialState } from "./machine.ts";
import { deserializeState, serializeState } from "./persist.ts";

describe("persist schema v1", () => {
  it("rejects the wrong schema version", () => {
    expect(deserializeState({ schemaVersion: 2, state: createInitialState(0) })).toBeNull();
    expect(deserializeState(null)).toBeNull();
    expect(deserializeState({ schemaVersion: 1 })).toBeNull();
  });

  it("round-trips a COMP result including PreAns", () => {
    const s = createInitialState(0);
    const filled = {
      ...s,
      ans: "5",
      preAns: "3",
      memoryM: "8",
      screen: { kind: "result" as const },
      result: { approx: "5", display: "5", naturalKind: "decimal" as const },
    };
    const env = serializeState(filled);
    expect(env.schemaVersion).toBe(1);
    const back = deserializeState(JSON.parse(JSON.stringify(env)), 99);
    expect(back?.ans).toBe("5");
    expect(back?.preAns).toBe("3");
    expect(back?.memoryM).toBe("8");
    expect(back?.power).toBe("on");
    expect(back?.lastActivityMs).toBe(99);
  });
});

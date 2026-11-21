import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTO_OFF_MS, createInitialState, dispatchKeys, reduce } from "./calc/machine.ts";
import { lcdIndicators, lcdResult } from "./ui/lcdModel.ts";
import { useCalcStore } from "./store.ts";
import type { CalcState } from "./calc/types.ts";

interface Request {
  id: number;
  state: CalcState;
  event: Parameters<typeof reduce>[1];
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  request: Request | null = null;
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(request: Request) {
    this.request = request;
  }

  terminate() {
    this.terminated = true;
  }

  complete() {
    if (!this.request) throw new Error("No calculation request was posted");
    const { id, state, event } = this.request;
    const result = reduce(state, event);
    this.onmessage?.({ data: { id, ok: true, state: result } } as MessageEvent);
  }
}

function sigmaInput() {
  return dispatchKeys(createInitialState(0), [
    "shift", "logab", "alpha", "rparen", "add", "1", "right", "1", "right", "5",
  ], 0);
}

describe("cancellable numerical calculation dispatch", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
    useCalcStore.setState({ state: createInitialState(0) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useCalcStore.setState({ state: createInitialState(0) });
  });

  it("runs the canonical equals reducer in the worker and preserves SHIFT= formatting", () => {
    useCalcStore.setState({ state: sigmaInput() });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 1 });
    expect(useCalcStore.getState().state.calculationPending).toBe(true);
    FakeWorker.instances.at(-1)?.complete();
    expect(lcdResult(useCalcStore.getState().state)).toBe("20");
    expect(useCalcStore.getState().state.history).toHaveLength(1);
    expect(useCalcStore.getState().state.ans).toBe("20");

    useCalcStore.getState().dispatch({ keyId: "shift", source: "test", nowMs: 2 });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 3 });
    FakeWorker.instances.at(-1)?.complete();
    expect(useCalcStore.getState().state.resultDecimal).toBe(true);
    expect(lcdResult(useCalcStore.getState().state)).toBe("20");
  });

  it("keeps multi-statement progression and Disp while evaluating in the worker", () => {
    const sigma = sigmaInput().editor.root[0];
    if (!sigma) throw new Error("Missing Σ input");
    const state = {
      ...createInitialState(0),
      editor: { ...sigmaInput().editor, root: [sigma, { t: "colon" }, { t: "num", s: "1" }] },
    } as CalcState;
    useCalcStore.setState({ state });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 1 });
    FakeWorker.instances.at(-1)?.complete();
    expect(lcdResult(useCalcStore.getState().state)).toBe("20");
    expect(useCalcStore.getState().state.multiStatement).not.toBeNull();
    expect(lcdIndicators(useCalcStore.getState().state).disp).toBe(true);

    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 2 });
    FakeWorker.instances.at(-1)?.complete();
    expect(lcdResult(useCalcStore.getState().state)).toBe("1");
    expect(useCalcStore.getState().state.multiStatement).toBeNull();
    expect(lcdIndicators(useCalcStore.getState().state).disp).toBe(false);
  });

  it("AC cancels an in-flight worker, ignores ordinary keys and discards late results", () => {
    const input = sigmaInput();
    useCalcStore.setState({ state: input });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 1 });
    const worker = FakeWorker.instances.at(-1);
    expect(worker?.terminated).toBe(false);

    useCalcStore.getState().dispatch({ keyId: "9", source: "test", nowMs: 2 });
    expect(worker?.terminated).toBe(false);
    expect(useCalcStore.getState().state.editor.root).toEqual(input.editor.root);
    expect(useCalcStore.getState().state.calculationPending).toBe(true);

    useCalcStore.getState().dispatch({ keyId: "ac", source: "test", nowMs: 3 });
    expect(worker?.terminated).toBe(true);
    const afterCancel = useCalcStore.getState().state;
    expect(afterCancel.editor.root).toEqual([]);
    expect(afterCancel.calculationPending).toBe(false);
    worker?.complete();
    expect(useCalcStore.getState().state).toEqual(afterCancel);
  });

  it("does not offload an active menu and lets a late equals trigger idle power-off", () => {
    useCalcStore.setState({ state: { ...sigmaInput(), menu: { kind: "setup", page: 0 } } });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 1 });
    expect(FakeWorker.instances).toHaveLength(0);

    useCalcStore.setState({ state: { ...sigmaInput(), lastActivityMs: 0 } });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: AUTO_OFF_MS + 1 });
    expect(useCalcStore.getState().state.power).toBe("off");
    expect(useCalcStore.getState().state.screen.kind).toBe("off");
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("returns Time Out Error instead of running unbounded calculus on the UI thread without workers", () => {
    vi.stubGlobal("Worker", undefined);
    useCalcStore.setState({ state: sigmaInput() });
    useCalcStore.getState().dispatch({ keyId: "equals", source: "test", nowMs: 1 });
    expect(useCalcStore.getState().state.screen).toMatchObject({ kind: "error", code: "Time Out Error" });
    expect(FakeWorker.instances).toHaveLength(0);
  });
});

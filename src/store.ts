import { create } from "zustand";
import { applyIdleTimeout, AUTO_OFF_MS, commitEqualsError, createInitialState, reduce } from "./calc/machine.ts";
import { containsNumericalCall } from "./calc/calculus.ts";
import { loadPersisted, savePersisted } from "./calc/persist.ts";
import type { KeyEvent } from "./calc/keys.ts";
import type { CalcState, ErrorCode } from "./calc/types.ts";

export interface CalcStore {
  state: CalcState;
  dispatch: (event: KeyEvent) => void;
  recordActivity: (nowMs?: number) => boolean;
  tick: (nowMs?: number) => void;
  hydrate: () => void;
}

let nextCalculationId = 1;
let pendingCalculation: { id: number; worker: Worker } | null = null;

function cancelPendingCalculation(): void {
  if (pendingCalculation) {
    pendingCalculation.worker.terminate();
    pendingCalculation = null;
  }
}

function shouldUseCalculationWorker(state: CalcState, event: KeyEvent): boolean {
  const isSubmit = event.keyId === "equals" || (event.keyId === "calc" && !state.shift && !state.alpha && !state.calcSession);
  const source = state.calcSession?.source ?? state.multiStatement?.source ?? state.editor.root;
  return isSubmit &&
    !state.pendingInputRecall &&
    state.power === "on" &&
    state.mode === "COMP" &&
    state.menu.kind === "none" &&
    (state.screen.kind === "input" || state.screen.kind === "result" || state.screen.kind === "replay") &&
    !state.solveSession &&
    containsNumericalCall(source);
}

export const useCalcStore = create<CalcStore>((set, get) => ({
  state: createInitialState(Date.now()),
  recordActivity: (nowMs = Date.now()) => {
    const current = get().state;
    if (current.power !== "on") {
      return false;
    }
    const timedOut = applyIdleTimeout(current, nowMs);
    if (timedOut !== current) {
      set({ state: timedOut });
      savePersisted(timedOut);
      return false;
    }
    const next = { ...current, lastActivityMs: nowMs };
    set({ state: next });
    savePersisted(next);
    return true;
  },
  hydrate: () => {
    cancelPendingCalculation();
    set({ state: loadPersisted(Date.now()) });
  },
  dispatch: (event) => {
    const nowMs = event.nowMs ?? Date.now();
    const current = get().state;
    if (pendingCalculation && current.power === "on" && nowMs - current.lastActivityMs >= AUTO_OFF_MS) {
      cancelPendingCalculation();
      const next = applyIdleTimeout({ ...current, calculationPending: false }, nowMs);
      set({ state: next });
      savePersisted(next);
      return;
    }
    if (pendingCalculation && event.keyId !== "ac" && event.keyId !== "on") {
      return;
    }
    cancelPendingCalculation();
    const ready = current.calculationPending ? { ...current, calculationPending: false } : current;
    const dispatched = { ...event, nowMs };
    if (nowMs - ready.lastActivityMs < AUTO_OFF_MS && shouldUseCalculationWorker(ready, dispatched)) {
      if (typeof Worker === "undefined") {
        const next = commitEqualsError(ready, "Time Out Error");
        set({ state: next });
        savePersisted(next);
        return;
      }
      const id = nextCalculationId++;
      const snapshot: CalcState = {
        ...ready,
        lastActivityMs: nowMs,
        calculationPending: false,
      };
      const pending = {
        ...snapshot,
        screen: { kind: "input" as const },
        result: null,
        resultDecimal: false,
        calculationPending: true,
      };
      try {
        const worker = new Worker(new URL("./calc/calculation.worker.ts", import.meta.url), { type: "module" });
        pendingCalculation = { id, worker };
        set({ state: pending });
        savePersisted(pending);
        worker.onmessage = (message: MessageEvent<{ id: number; ok: true; state: CalcState } | { id: number; ok: false; code: ErrorCode }>) => {
          if (pendingCalculation?.id !== message.data.id) {
            return;
          }
          pendingCalculation.worker.terminate();
          pendingCalculation = null;
          const latest = get().state;
          if (!latest.calculationPending) {
            return;
          }
          const next = message.data.ok
            ? { ...message.data.state, calculationPending: false }
            : commitEqualsError(ready, message.data.code);
          set({ state: next });
          savePersisted(next);
        };
        worker.onerror = () => {
          if (pendingCalculation?.id !== id) {
            return;
          }
          pendingCalculation.worker.terminate();
          pendingCalculation = null;
          const latest = get().state;
          if (!latest.calculationPending) {
            return;
          }
          const next = commitEqualsError(ready, "Time Out Error");
          set({ state: next });
          savePersisted(next);
        };
        worker.postMessage({ id, state: snapshot, event: dispatched });
        return;
      } catch {
        cancelPendingCalculation();
        const next = commitEqualsError(ready, "Time Out Error");
        set({ state: next });
        savePersisted(next);
        return;
      }
    }
    const next = reduce(ready, dispatched);
    set({ state: next });
    savePersisted(next);
  },
  tick: (nowMs = Date.now()) => {
    const current = get().state;
    const next = applyIdleTimeout(current, nowMs);
    if (next !== current) {
      cancelPendingCalculation();
      const settled = next.calculationPending ? { ...next, calculationPending: false } : next;
      set({ state: settled });
      savePersisted(settled);
    }
  },
}));

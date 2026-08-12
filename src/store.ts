import { create } from "zustand";
import { createInitialState, reduce } from "./calc/machine.ts";
import { loadPersisted, savePersisted } from "./calc/persist.ts";
import type { KeyEvent } from "./calc/keys.ts";
import type { CalcState } from "./calc/types.ts";

export interface CalcStore {
  state: CalcState;
  dispatch: (event: KeyEvent) => void;
  hydrate: () => void;
}

export const useCalcStore = create<CalcStore>((set, get) => ({
  state: createInitialState(Date.now()),
  hydrate: () => {
    set({ state: loadPersisted(Date.now()) });
  },
  dispatch: (event) => {
    const next = reduce(get().state, { ...event, nowMs: event.nowMs ?? Date.now() });
    set({ state: next });
    savePersisted(next);
  },
}));

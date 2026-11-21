import { AUTO_OFF_MS } from "./calc/machine.ts";
import type { CalcState } from "./calc/types.ts";

export interface IdleTimerScheduler {
  setTimeout: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

/** Arms a real idle deadline and rechecks state when a throttled tab resumes. */
export function armIdleTimeout(
  readState: () => CalcState,
  onTimeout: (nowMs: number) => void,
  now: () => number = Date.now,
  scheduler: IdleTimerScheduler = globalThis,
): () => void {
  let cancelled = false;
  let handle: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (cancelled) {
      return;
    }
    const state = readState();
    if (state.power !== "on") {
      return;
    }
    const remaining = state.lastActivityMs + AUTO_OFF_MS - now();
    handle = scheduler.setTimeout(() => {
      const current = readState();
      if (current.power !== "on") {
        return;
      }
      const currentNow = now();
      if (currentNow - current.lastActivityMs >= AUTO_OFF_MS) {
        onTimeout(currentNow);
      } else {
        schedule();
      }
    }, Math.max(0, remaining));
  };

  schedule();
  return () => {
    cancelled = true;
    if (handle !== undefined) {
      scheduler.clearTimeout(handle);
    }
  };
}

import { reduce } from "./machine.ts";
import type { KeyEvent } from "./keys.ts";
import type { CalcState, ErrorCode } from "./types.ts";

interface CalculationRequest {
  id: number;
  state: CalcState;
  event: KeyEvent;
}

type CalculationResponse =
  | { id: number; ok: true; state: CalcState }
  | { id: number; ok: false; code: ErrorCode };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<CalculationRequest>) => void) | null;
  postMessage: (message: CalculationResponse) => void;
};

workerScope.onmessage = ({ data }) => {
  try {
    const state = reduce(data.state, data.event);
    workerScope.postMessage({ id: data.id, ok: true, state: { ...state, calculationPending: false } });
  } catch (error) {
    const candidate = (error as { code?: string }).code;
    const code: ErrorCode = candidate === "Syntax ERROR" || candidate === "Argument ERROR" || candidate === "Time Out Error"
      ? candidate
      : "Math ERROR";
    workerScope.postMessage({ id: data.id, ok: false, code });
  }
};

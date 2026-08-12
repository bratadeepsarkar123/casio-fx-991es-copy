import type { CalcState } from "./types.ts";
import { createInitialState } from "./machine.ts";

export const PERSIST_KEY = "fx991es-plus2/v1";
export const SCHEMA_VERSION = 1;

export interface PersistEnvelope {
  schemaVersion: 1;
  savedAt: number;
  state: CalcState;
}

export function serializeState(state: CalcState): PersistEnvelope {
  return { schemaVersion: SCHEMA_VERSION, savedAt: Date.now(), state };
}

export function deserializeState(raw: unknown, nowMs = 0): CalcState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const env = raw as Partial<PersistEnvelope>;
  if (env.schemaVersion !== 1 || !env.state) {
    return null;
  }
  const s = env.state;
  if (s.schemaVersion !== 1) {
    return null;
  }
  return { ...s, lastActivityMs: nowMs, power: "on", screen: s.power === "off" ? { kind: "input" } : s.screen };
}

export function loadPersisted(nowMs = 0): CalcState {
  try {
    const raw = globalThis.localStorage?.getItem(PERSIST_KEY);
    if (!raw) {
      return createInitialState(nowMs);
    }
    const parsed: unknown = JSON.parse(raw);
    return deserializeState(parsed, nowMs) ?? createInitialState(nowMs);
  } catch {
    return createInitialState(nowMs);
  }
}

export function savePersisted(state: CalcState): void {
  try {
    globalThis.localStorage?.setItem(PERSIST_KEY, JSON.stringify(serializeState(state)));
  } catch {
    // memory-only fallback
  }
}

export function clearPersisted(): void {
  try {
    globalThis.localStorage?.removeItem(PERSIST_KEY);
  } catch {
    // ignore
  }
}

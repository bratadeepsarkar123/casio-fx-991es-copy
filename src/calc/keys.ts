/** Physical key identifiers. Must match public/keymap.json `id` values. */
export const KEY_IDS = [
  "shift",
  "alpha",
  "up",
  "down",
  "left",
  "right",
  "mode",
  "on",
  "calc",
  "integral",
  "xinv",
  "logab",
  "frac",
  "sqrt",
  "square",
  "power",
  "log",
  "ln",
  "neg",
  "dms",
  "hyp",
  "sin",
  "cos",
  "tan",
  "rcl",
  "eng",
  "lparen",
  "rparen",
  "sd",
  "mplus",
  "7",
  "8",
  "9",
  "del",
  "ac",
  "4",
  "5",
  "6",
  "mul",
  "div",
  "1",
  "2",
  "3",
  "add",
  "sub",
  "0",
  "dot",
  "exp10",
  "ans",
  "equals",
] as const;

export type KeyId = (typeof KEY_IDS)[number];

export function isKeyId(value: string): value is KeyId {
  return (KEY_IDS as readonly string[]).includes(value);
}

export type KeySource = "pointer" | "keyboard" | "a11y" | "test" | "system";

export interface KeyEvent {
  keyId: KeyId;
  source: KeySource;
  /** Wall-clock ms; injected so tests do not read system time. */
  nowMs?: number;
}

export const OPTIONAL_KEYBOARD_MAP: Record<string, KeyId> = {
  Enter: "equals",
  "=": "equals",
  Escape: "ac",
  Backspace: "del",
  Delete: "del",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "(": "lparen",
  ")": "rparen",
  ".": "dot",
  "^": "power",
  s: "sin",
  c: "cos",
  t: "tan",
  l: "log",
  n: "ln",
  p: "exp10",
};

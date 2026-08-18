import type { KeyEvent, KeyId } from "./keys.ts";
import type {
  BaseNOp,
  BaseNRadix,
  BaseNState,
  BaseNToken,
  CalcState,
  ErrorCode,
} from "./types.ts";
import {
  addSat,
  BaseNMathError,
  BaseNSyntaxError,
  bitAnd,
  bitNeg,
  bitNot,
  bitOr,
  bitXnor,
  bitXor,
  divTrunc,
  formatBaseNResult,
  interpretMagnitude,
  isValidDigit,
  mulSat,
  parseAnsInteger,
  parseUnsignedDigits,
  subSat,
  wordBits,
} from "./baseNNumeric.ts";

export function emptyBaseN(radix: BaseNRadix = 10): BaseNState {
  return { radix, tokens: [], cursor: 0, value: null };
}

const HEX_LETTER: Partial<Record<KeyId, string>> = {
  neg: "A",
  dms: "B",
  hyp: "C",
  sin: "D",
  cos: "E",
  tan: "F",
};

const RADIX_KEY: Partial<Record<KeyId, BaseNRadix>> = {
  square: 10,
  power: 16,
  log: 2,
  ln: 8,
};

const SUFFIX_LETTER: Record<BaseNRadix, string> = {
  2: "b",
  8: "o",
  10: "d",
  16: "h",
};

export function radixLabel(radix: BaseNRadix): "BIN" | "OCT" | "DEC" | "HEX" {
  switch (radix) {
    case 2:
      return "BIN";
    case 8:
      return "OCT";
    case 10:
      return "DEC";
    case 16:
      return "HEX";
    default: {
      const _never: never = radix;
      return _never;
    }
  }
}

export function formatBaseNExpression(tokens: BaseNToken[]): string {
  return tokens.map(tokenToLinear).join("");
}

function tokenToLinear(tok: BaseNToken): string {
  switch (tok.t) {
    case "num":
      return tok.suffix === null ? tok.digits : `${tok.digits}${SUFFIX_LETTER[tok.suffix]}`;
    case "op":
      return tok.op;
    case "not":
      return "Not(";
    case "negfn":
      return "Neg(";
    case "lparen":
      return "(";
    case "rparen":
      return ")";
    case "unary":
      return "(-)";
    case "ans":
      return "Ans";
    default: {
      const _never: never = tok;
      return _never;
    }
  }
}

function clearLatches(state: CalcState): CalcState {
  return { ...state, shift: false, alpha: false, hyp: false };
}

function withBase(state: CalcState, patch: Partial<BaseNState>, screen: CalcState["screen"] = { kind: "input" }): CalcState {
  return {
    ...clearLatches(state),
    baseN: { ...state.baseN, ...patch },
    screen,
    result: null,
  };
}

function lastNumIndex(tokens: BaseNToken[]): number {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i]?.t === "num") {
      return i;
    }
  }
  return -1;
}

function insertToken(state: CalcState, tok: BaseNToken): CalcState {
  const base = beginBaseInput(state);
  const tokens = base.baseN.tokens.slice(0, base.baseN.cursor);
  const rest = base.baseN.tokens.slice(base.baseN.cursor);
  tokens.push(tok);
  return withBase(base, { tokens: [...tokens, ...rest], cursor: tokens.length, value: null });
}

function beginBaseInput(state: CalcState): CalcState {
  if (state.screen.kind === "result") {
    return {
      ...state,
      baseN: { ...state.baseN, tokens: [], cursor: 0 },
      screen: { kind: "input" },
      result: null,
    };
  }
  return state;
}

function continueBaseFromResult(state: CalcState): CalcState {
  if (state.screen.kind !== "result" || state.baseN.value === null) {
    return state;
  }
  return {
    ...state,
    baseN: {
      ...state.baseN,
      tokens: [{ t: "ans" }],
      cursor: 1,
    },
    screen: { kind: "input" },
    result: null,
  };
}

function appendDigit(state: CalcState, ch: string): CalcState {
  const base = beginBaseInput(state);
  const tokens = base.baseN.tokens.slice();
  const cur = base.baseN.cursor;
  const prev = tokens[cur - 1];
  if (prev?.t === "num" && prev.suffix === null) {
    const next = { ...prev, digits: prev.digits + ch };
    tokens[cur - 1] = next;
    return withBase(base, { tokens, cursor: cur, value: null });
  }
  tokens.splice(cur, 0, { t: "num", digits: ch, suffix: null });
  return withBase(base, { tokens, cursor: cur + 1, value: null });
}

function applySuffix(state: CalcState, suffix: BaseNRadix): CalcState {
  const tokens = state.baseN.tokens.slice();
  const idx = lastNumIndex(tokens);
  if (idx < 0) {
    return clearLatches(state);
  }
  const tok = tokens[idx];
  if (!tok || tok.t !== "num") {
    return clearLatches(state);
  }
  tokens[idx] = { ...tok, suffix };
  return withBase(state, { tokens, value: null });
}

export function evaluateBaseN(state: CalcState): bigint {
  const bits = wordBits(state.baseN.radix);
  const parser = new Parser(state.baseN.tokens, state.baseN.radix, parseAnsInteger(state.ans), bits);
  const value = parser.parseExpr();
  parser.expectEnd();
  if (value < -(1n << BigInt(bits - 1)) || value > (1n << BigInt(bits - 1)) - 1n) {
    throw new BaseNMathError();
  }
  return value;
}

class Parser {
  i = 0;

  constructor(
    readonly tokens: BaseNToken[],
    readonly radix: BaseNRadix,
    readonly ans: bigint,
    readonly bits: number,
  ) {}

  peek(): BaseNToken | undefined {
    return this.tokens[this.i];
  }

  eat(): BaseNToken {
    const tok = this.tokens[this.i];
    if (!tok) {
      throw new BaseNSyntaxError();
    }
    this.i += 1;
    return tok;
  }

  expectEnd(): void {
    if (this.i < this.tokens.length) {
      throw new BaseNSyntaxError();
    }
  }

  parseExpr(): bigint {
    return this.parseOr();
  }

  parseOr(): bigint {
    let v = this.parseAnd();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.op === "or" || t.op === "xor" || t.op === "xnor")) {
        this.eat();
        const r = this.parseAnd();
        if (t.op === "or") {
          v = bitOr(v, r, this.bits);
        } else if (t.op === "xor") {
          v = bitXor(v, r, this.bits);
        } else {
          v = bitXnor(v, r, this.bits);
        }
      } else {
        break;
      }
    }
    return v;
  }

  parseAnd(): bigint {
    let v = this.parseAdd();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && t.op === "and") {
        this.eat();
        v = bitAnd(v, this.parseAdd(), this.bits);
      } else {
        break;
      }
    }
    return v;
  }

  parseAdd(): bigint {
    let v = this.parseMul();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.op === "+" || t.op === "-")) {
        this.eat();
        const r = this.parseMul();
        v = t.op === "+" ? addSat(v, r, this.bits) : subSat(v, r, this.bits);
      } else {
        break;
      }
    }
    return v;
  }

  parseMul(): bigint {
    let v = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.op === "×" || t.op === "÷")) {
        this.eat();
        const r = this.parseUnary();
        v = t.op === "×" ? mulSat(v, r, this.bits) : divTrunc(v, r, this.bits);
      } else {
        break;
      }
    }
    return v;
  }

  parseUnary(): bigint {
    const t = this.peek();
    if (t?.t === "unary") {
      this.eat();
      const inner = this.parseUnary();
      return subSat(0n, inner, this.bits);
    }
    if (t?.t === "not") {
      this.eat();
      const inner = this.parseUnary();
      this.eatOptionalRparen();
      return bitNot(inner, this.bits);
    }
    if (t?.t === "negfn") {
      this.eat();
      const inner = this.parseUnary();
      this.eatOptionalRparen();
      return bitNeg(inner, this.bits);
    }
    return this.parsePrimary();
  }

  eatOptionalRparen(): void {
    if (this.peek()?.t === "rparen") {
      this.eat();
    }
  }

  parsePrimary(): bigint {
    const t = this.peek();
    if (!t) {
      throw new BaseNSyntaxError();
    }
    if (t.t === "num") {
      this.eat();
      const src = t.suffix ?? this.radix;
      return interpretMagnitude(parseUnsignedDigits(t.digits, src), src);
    }
    if (t.t === "ans") {
      this.eat();
      return this.ans;
    }
    if (t.t === "lparen") {
      this.eat();
      const v = this.parseExpr();
      this.eatOptionalRparen();
      return v;
    }
    throw new BaseNSyntaxError();
  }
}

function baseError(state: CalcState, code: ErrorCode): CalcState {
  return {
    ...clearLatches(state),
    screen: { kind: "error", code, expression: [], errorIndex: 0 },
    result: null,
  };
}

function setRadix(state: CalcState, radix: BaseNRadix): CalcState {
  if (state.screen.kind === "result" && state.baseN.value !== null) {
    try {
      const signed = BigInt(state.baseN.value);
      const display = formatBaseNResult(signed, radix);
      return {
        ...clearLatches(state),
        baseN: { ...state.baseN, radix, tokens: [], cursor: 0, value: signed.toString() },
        screen: { kind: "result" },
        result: { approx: signed.toString(), display, naturalKind: "decimal" },
      };
    } catch (err) {
      const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
      return baseError({ ...state, baseN: { ...state.baseN, radix } }, code);
    }
  }
  return withBase(state, { radix });
}

function onBaseEquals(state: CalcState): CalcState {
  try {
    const tokens = state.baseN.tokens;
    if (tokens.length === 0) {
      const display = formatBaseNResult(0n, state.baseN.radix);
      return {
        ...clearLatches(state),
        baseN: { ...state.baseN, value: "0" },
        screen: { kind: "result" },
        result: { approx: "0", display, naturalKind: "decimal" },
        ans: "0",
      };
    }
    const signed = evaluateBaseN(state);
    const display = formatBaseNResult(signed, state.baseN.radix);
    const approx = signed.toString();
    return {
      ...clearLatches(state),
      baseN: { ...state.baseN, value: approx },
      screen: { kind: "result" },
      result: { approx, display, naturalKind: "decimal" },
      ans: approx,
    };
  } catch (err) {
    const code = (err as { code?: ErrorCode }).code ?? "Math ERROR";
    return baseError(state, code);
  }
}

function insertOp(state: CalcState, op: BaseNOp): CalcState {
  const base = continueBaseFromResult(state);
  return insertToken(base, { t: "op", op });
}

function deleteLeft(state: CalcState): CalcState {
  const base = state.screen.kind === "result" ? beginBaseInput(state) : state;
  const tokens = base.baseN.tokens.slice();
  const cur = base.baseN.cursor;
  if (cur <= 0) {
    return withBase(base, { value: null });
  }
  const prev = tokens[cur - 1];
  if (prev?.t === "num" && prev.digits.length > 1) {
    tokens[cur - 1] = { ...prev, digits: prev.digits.slice(0, -1), suffix: null };
    return withBase(base, { tokens, cursor: cur, value: null });
  }
  tokens.splice(cur - 1, 1);
  return withBase(base, { tokens, cursor: cur - 1, value: null });
}

export function reduceBaseNError(state: CalcState, event: KeyEvent): CalcState {
  if (event.keyId === "ac") {
    if (state.shift) {
      return { ...state, power: "off", screen: { kind: "off" }, shift: false, alpha: false, hyp: false };
    }
    return withBase(state, { tokens: [], cursor: 0, value: null });
  }
  if (event.keyId === "left" || event.keyId === "right") {
    return {
      ...clearLatches(state),
      screen: { kind: "input" },
      result: null,
    };
  }
  return state;
}

/**
 * BASE-N-owned reducer. Returns null when mode is not BASE-N.
 * Otherwise consumes the key (does not fall through into COMP editing).
 */
export function reduceBaseN(state: CalcState, event: KeyEvent): CalcState | null {
  if (state.mode !== "BASE-N") {
    return null;
  }
  const keyId = event.keyId;

  if (keyId === "mode") {
    return null;
  }
  if (keyId === "ac") {
    if (state.shift) {
      return null;
    }
    return withBase(state, { tokens: [], cursor: 0, value: null });
  }
  if (keyId === "shift" || keyId === "alpha") {
    return null;
  }

  if (keyId === "equals") {
    return onBaseEquals(state);
  }

  const nextRadix = RADIX_KEY[keyId];
  if (nextRadix !== undefined && !state.shift && !state.alpha) {
    return setRadix(state, nextRadix);
  }

  if (state.shift && keyId === "3") {
    return { ...clearLatches(state), menu: { kind: "base-op", page: 0 } };
  }

  if (keyId === "del") {
    return deleteLeft(state);
  }

  if (keyId === "ans" && !state.shift) {
    return insertToken(beginBaseInput(state), { t: "ans" });
  }

  if (keyId === "add" && !state.shift) {
    return insertOp(state, "+");
  }
  if (keyId === "sub" && !state.shift) {
    return insertOp(state, "-");
  }
  if (keyId === "mul" && !state.shift) {
    return insertOp(state, "×");
  }
  if (keyId === "div" && !state.shift) {
    return insertOp(state, "÷");
  }

  if (keyId === "lparen" && !state.shift) {
    return insertToken(beginBaseInput(state), { t: "lparen" });
  }
  if (keyId === "rparen" && !state.shift && !state.alpha) {
    return insertToken(state.screen.kind === "result" ? beginBaseInput(state) : state, { t: "rparen" });
  }

  const hexLetter = HEX_LETTER[keyId];
  if (hexLetter && (state.baseN.radix === 16 || state.alpha)) {
    return appendDigit(beginBaseInput(state), hexLetter);
  }

  if (keyId === "neg" && !state.alpha && state.baseN.radix !== 16) {
    return insertToken(beginBaseInput(state), { t: "unary" });
  }

  const digits: KeyId[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  if ((digits as string[]).includes(keyId) && !state.shift) {
    return appendDigit(state, keyId);
  }

  if (keyId === "left") {
    const cur = Math.max(0, state.baseN.cursor - 1);
    return { ...clearLatches(state), baseN: { ...state.baseN, cursor: cur }, screen: { kind: "input" } };
  }
  if (keyId === "right") {
    const cur = Math.min(state.baseN.tokens.length, state.baseN.cursor + 1);
    return { ...clearLatches(state), baseN: { ...state.baseN, cursor: cur }, screen: { kind: "input" } };
  }

  return clearLatches(state);
}

export function applyBaseOpMenu(state: CalcState, keyId: KeyId): CalcState {
  const menu = state.menu;
  if (menu.kind !== "base-op") {
    return state;
  }
  if (keyId === "down") {
    return { ...state, menu: { kind: "base-op", page: 1 } };
  }
  if (keyId === "up") {
    return { ...state, menu: { kind: "base-op", page: 0 } };
  }
  if (menu.page === 0) {
    switch (keyId) {
      case "1":
        return insertOp({ ...state, menu: { kind: "none" } }, "and");
      case "2":
        return insertOp({ ...state, menu: { kind: "none" } }, "or");
      case "3":
        return insertOp({ ...state, menu: { kind: "none" } }, "xor");
      case "4":
        return insertOp({ ...state, menu: { kind: "none" } }, "xnor");
      case "5":
        return insertToken(beginBaseInput({ ...state, menu: { kind: "none" } }), { t: "not" });
      case "6":
        return insertToken(beginBaseInput({ ...state, menu: { kind: "none" } }), { t: "negfn" });
      default:
        return state;
    }
  }
  switch (keyId) {
    case "1":
      return applySuffix({ ...state, menu: { kind: "none" } }, 10);
    case "2":
      return applySuffix({ ...state, menu: { kind: "none" } }, 16);
    case "3":
      return applySuffix({ ...state, menu: { kind: "none" } }, 2);
    case "4":
      return applySuffix({ ...state, menu: { kind: "none" } }, 8);
    default:
      return state;
  }
}

export { isValidDigit, formatBaseNResult };

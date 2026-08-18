import type { BaseNRadix } from "./types.ts";

/** TARGET-OFFICIAL-DOC: BIN is 16-bit; DEC/HEX/OCT are 32-bit. */
export function wordBits(radix: BaseNRadix): number {
  return radix === 2 ? 16 : 32;
}

export function signedMin(bits: number): bigint {
  return -(1n << BigInt(bits - 1));
}

export function signedMax(bits: number): bigint {
  return (1n << BigInt(bits - 1)) - 1n;
}

export function unsignedMax(bits: number): bigint {
  return (1n << BigInt(bits)) - 1n;
}

export function maskToWidth(n: bigint, bits: number): bigint {
  return n & unsignedMax(bits);
}

/** Two's-complement signed interpretation of a w-bit word. */
export function toSigned(n: bigint, bits: number): bigint {
  const m = maskToWidth(n, bits);
  const sign = 1n << BigInt(bits - 1);
  return (m & sign) !== 0n ? m - (1n << BigInt(bits)) : m;
}

export function fitsSigned(n: bigint, bits: number): boolean {
  return n >= signedMin(bits) && n <= signedMax(bits);
}

export function fitsUnsignedWord(n: bigint, bits: number): boolean {
  return n >= 0n && n <= unsignedMax(bits);
}

export class BaseNSyntaxError extends Error {
  readonly code = "Syntax ERROR" as const;
  constructor() {
    super("Syntax ERROR");
  }
}

export class BaseNMathError extends Error {
  readonly code = "Math ERROR" as const;
  constructor() {
    super("Math ERROR");
  }
}

const DIGITS = "0123456789ABCDEF";

export function digitValue(ch: string): number {
  return DIGITS.indexOf(ch.toUpperCase());
}

export function isValidDigit(ch: string, radix: BaseNRadix): boolean {
  const v = digitValue(ch);
  return v >= 0 && v < radix;
}

/**
 * Parse a digit string in `radix` to an unsigned bigint.
 * Does not use Number/parseInt as semantic authority.
 */
export function parseUnsignedDigits(digits: string, radix: BaseNRadix): bigint {
  if (digits.length === 0) {
    throw new BaseNSyntaxError();
  }
  let n = 0n;
  const r = BigInt(radix);
  for (const ch of digits) {
    const d = digitValue(ch);
    if (d < 0 || d >= radix) {
      throw new BaseNSyntaxError();
    }
    n = n * r + BigInt(d);
  }
  return n;
}

/**
 * Interpret a parsed unsigned magnitude for BIN/OCT/HEX as a signed word,
 * or a decimal magnitude as a non-negative signed integer.
 */
export function interpretMagnitude(raw: bigint, sourceRadix: BaseNRadix): bigint {
  const bits = wordBits(sourceRadix);
  if (sourceRadix === 10) {
    // Allow 2^(w-1) so unary minus can form the signed minimum (e.g. −2147483648).
    if (raw < 0n || raw > signedMax(bits) + 1n) {
      throw new BaseNMathError();
    }
    return raw;
  }
  if (!fitsUnsignedWord(raw, bits)) {
    throw new BaseNMathError();
  }
  return toSigned(raw, bits);
}

export function formatUnsigned(n: bigint, radix: BaseNRadix, bits: number, pad: boolean): string {
  const u = maskToWidth(n, bits);
  if (radix === 10) {
    return toSigned(u, bits).toString();
  }
  if (radix === 16) {
    const s = u.toString(16).toUpperCase();
    return pad ? s.padStart(8, "0") : s;
  }
  if (radix === 2) {
    const s = u.toString(2);
    return pad ? s.padStart(16, "0") : s;
  }
  const s = u.toString(8);
  return pad ? s.padStart(11, "0") : s;
}

/** Result display: padded BIN/OCT/HEX; signed decimal with ASCII minus. */
export function formatBaseNResult(signed: bigint, radix: BaseNRadix): string {
  const bits = wordBits(radix);
  if (!fitsSigned(signed, bits)) {
    throw new BaseNMathError();
  }
  if (radix === 10) {
    return signed.toString();
  }
  return formatUnsigned(fromSigned(signed, bits), radix, bits, true);
}

export function fromSigned(signed: bigint, bits: number): bigint {
  return maskToWidth(signed, bits);
}

export function addSat(a: bigint, b: bigint, bits: number): bigint {
  const r = a + b;
  if (!fitsSigned(r, bits)) {
    throw new BaseNMathError();
  }
  return r;
}

export function subSat(a: bigint, b: bigint, bits: number): bigint {
  const r = a - b;
  if (!fitsSigned(r, bits)) {
    throw new BaseNMathError();
  }
  return r;
}

export function mulSat(a: bigint, b: bigint, bits: number): bigint {
  const r = a * b;
  if (!fitsSigned(r, bits)) {
    throw new BaseNMathError();
  }
  return r;
}

/** Integer division; fractional part cut off toward zero. TARGET-OFFICIAL-DOC. */
export function divTrunc(a: bigint, b: bigint, bits: number): bigint {
  if (b === 0n) {
    throw new BaseNMathError();
  }
  const r = a / b;
  if (!fitsSigned(r, bits)) {
    throw new BaseNMathError();
  }
  return r;
}

export function bitAnd(a: bigint, b: bigint, bits: number): bigint {
  return toSigned(maskToWidth(a, bits) & maskToWidth(b, bits), bits);
}

export function bitOr(a: bigint, b: bigint, bits: number): bigint {
  return toSigned(maskToWidth(a, bits) | maskToWidth(b, bits), bits);
}

export function bitXor(a: bigint, b: bigint, bits: number): bigint {
  return toSigned(maskToWidth(a, bits) ^ maskToWidth(b, bits), bits);
}

export function bitXnor(a: bigint, b: bigint, bits: number): bigint {
  return toSigned(maskToWidth(~(maskToWidth(a, bits) ^ maskToWidth(b, bits)), bits), bits);
}

export function bitNot(a: bigint, bits: number): bigint {
  return toSigned(maskToWidth(~maskToWidth(a, bits), bits), bits);
}

/** Two's complement of a within the current word. TARGET-OFFICIAL-DOC Neg(. */
export function bitNeg(a: bigint, bits: number): bigint {
  return toSigned(maskToWidth(-a, bits), bits);
}

export function parseAnsInteger(ans: string): bigint {
  const trimmed = ans.trim();
  if (trimmed.length === 0) {
    return 0n;
  }
  const neg = trimmed.startsWith("-");
  const body = neg ? trimmed.slice(1) : trimmed;
  const intPart = body.split(/[.]/, 1)[0] ?? "0";
  if (!/^\d+$/.test(intPart)) {
    throw new BaseNSyntaxError();
  }
  let n = 0n;
  for (const ch of intPart) {
    n = n * 10n + BigInt(ch.charCodeAt(0) - 48);
  }
  return neg ? -n : n;
}

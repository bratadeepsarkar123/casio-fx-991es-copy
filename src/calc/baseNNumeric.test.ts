import { describe, expect, it } from "vitest";
import {
  addSat,
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
  signedMax,
  signedMin,
  subSat,
  wordBits,
  BaseNMathError,
  BaseNSyntaxError,
} from "./baseNNumeric.ts";

describe("BASE-N numeric domain (TARGET-OFFICIAL-DOC widths)", () => {
  it("BIN is 16-bit; DEC/HEX/OCT are 32-bit", () => {
    expect(wordBits(2)).toBe(16);
    expect(wordBits(8)).toBe(32);
    expect(wordBits(10)).toBe(32);
    expect(wordBits(16)).toBe(32);
  });

  it("accepts valid digits and rejects invalid digits per radix", () => {
    expect(isValidDigit("1", 2)).toBe(true);
    expect(isValidDigit("2", 2)).toBe(false);
    expect(isValidDigit("7", 8)).toBe(true);
    expect(isValidDigit("8", 8)).toBe(false);
    expect(isValidDigit("A", 16)).toBe(true);
    expect(isValidDigit("G", 16)).toBe(false);
  });

  it("parses unsigned digits without Number/parseInt", () => {
    expect(parseUnsignedDigits("11", 2)).toBe(3n);
    expect(parseUnsignedDigits("1F", 16)).toBe(31n);
    expect(parseUnsignedDigits("10", 8)).toBe(8n);
    expect(() => parseUnsignedDigits("2", 2)).toThrow(BaseNSyntaxError);
  });

  it("interprets HEX FFFFFFFF as signed −1", () => {
    expect(interpretMagnitude(parseUnsignedDigits("FFFFFFFF", 16), 16)).toBe(-1n);
  });

  it("interprets BIN 1000000000000000 as signed minimum", () => {
    expect(interpretMagnitude(parseUnsignedDigits("1000000000000000", 2), 2)).toBe(signedMin(16));
  });

  it("rejects magnitudes wider than the source word", () => {
    expect(() => interpretMagnitude(parseUnsignedDigits("10000", 16) << 32n, 16)).toThrow(BaseNMathError);
    expect(() => parseUnsignedDigits("10000000000000000", 2)).not.toThrow();
    expect(() => interpretMagnitude(parseUnsignedDigits("10000000000000000", 2), 2)).toThrow(BaseNMathError);
  });

  it("formats padded BIN/HEX/OCT and signed DEC", () => {
    expect(formatBaseNResult(12n, 2)).toBe("0000000000001100");
    expect(formatBaseNResult(32n, 16)).toBe("00000020");
    expect(formatBaseNResult(8n, 8)).toBe("00000000010");
    expect(formatBaseNResult(-1n, 10)).toBe("-1");
    expect(formatBaseNResult(-1n, 16)).toBe("FFFFFFFF");
  });

  it("zero, max positive, min negative", () => {
    expect(formatBaseNResult(0n, 2)).toBe("0000000000000000");
    expect(formatBaseNResult(signedMax(16), 2)).toBe("0111111111111111");
    expect(formatBaseNResult(signedMin(16), 2)).toBe("1000000000000000");
    expect(formatBaseNResult(signedMax(32), 10)).toBe("2147483647");
    expect(formatBaseNResult(signedMin(32), 10)).toBe("-2147483648");
  });

  it("arithmetic overflow is Math ERROR (no invented wrap for +/−/×)", () => {
    expect(() => addSat(signedMax(32), 1n, 32)).toThrow(BaseNMathError);
    expect(() => subSat(signedMin(32), 1n, 32)).toThrow(BaseNMathError);
    expect(() => mulSat(signedMin(32), -1n, 32)).toThrow(BaseNMathError);
    expect(addSat(2n, 3n, 32)).toBe(5n);
  });

  it("division cuts the fractional part toward zero and errors on ÷0", () => {
    expect(divTrunc(5n, 2n, 32)).toBe(2n);
    expect(divTrunc(-5n, 2n, 32)).toBe(-2n);
    expect(() => divTrunc(1n, 0n, 32)).toThrow(BaseNMathError);
  });

  it("bitwise AND/OR/XOR/XNOR/NOT/Neg use the current word", () => {
    expect(bitAnd(0b1010n, 0b1100n, 16)).toBe(0b1000n);
    expect(bitOr(0b1011n, 0b11010n, 16)).toBe(0b11011n);
    expect(bitXor(0b1010n, 0b1100n, 16)).toBe(0b0110n);
    expect(formatBaseNResult(bitXnor(0b1111n, 0b101n, 16), 2)).toBe("1111111111110101");
    expect(formatBaseNResult(bitNot(0b1010n, 16), 2)).toBe("1111111111110101");
    expect(formatBaseNResult(bitNeg(0b101101n, 16), 2)).toBe("1111111111010011");
  });

  it("cuts a fractional Ans string to its integer part", () => {
    expect(parseAnsInteger("1.166666667")).toBe(1n);
    expect(parseAnsInteger("-9")).toBe(-9n);
  });
});

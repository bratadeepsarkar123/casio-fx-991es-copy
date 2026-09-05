import { describe, expect, it } from "vitest";
import { DEFAULT_VITE_BASE, normalizeViteBase } from "./viteBase.ts";

describe("normalizeViteBase", () => {
  it("keeps the default Pages path", () => {
    expect(normalizeViteBase(undefined)).toBe(DEFAULT_VITE_BASE);
    expect(normalizeViteBase("")).toBe(DEFAULT_VITE_BASE);
    expect(normalizeViteBase("  ")).toBe(DEFAULT_VITE_BASE);
  });

  it("adds a trailing slash so index.html is not glued on", () => {
    expect(normalizeViteBase("/casio-fx-991es-copy")).toBe("/casio-fx-991es-copy/");
    expect(`${normalizeViteBase("/foo")}index.html`).toBe("/foo/index.html");
  });

  it("adds a leading slash when missing", () => {
    expect(normalizeViteBase("casio-fx-991es-copy")).toBe("/casio-fx-991es-copy/");
  });

  it("preserves relative ./ bases", () => {
    expect(normalizeViteBase("./")).toBe("./");
    expect(normalizeViteBase("./app")).toBe("./app/");
  });
});

import type { Atom, Cursor } from "./types.ts";
import { childPath, pathsEqual, type SlotField } from "./editor.ts";

/**
 * The selected guide states a 62-dot (2 × 31-dot) Natural formula limit.
 * Renderer measurements use the CSS LCD panel as the 31-dot reference.
 * Casio's exact character raster and nesting thresholds are not available.
 */
export const NATURAL_FORMULA_MAX_SCREENS = 2;
export const LCD_SCREEN_DOTS = 31;
export const LCD_PANEL_FONT_SCALE = 0.14;
export const NATURAL_EXPRESSION_FONT_SCALE = 1.65;
export const NATURAL_EXPRESSION_LINE_HEIGHT = 1.05;
export const LCD_MIN_GLYPH_DOTS = 7;

// The first level of fraction children is sized to a seven-dot cell. Deeper
// children use an absolute CSS-pixel floor measured from the LCD frame.
export const naturalFractionMinimumScale = LCD_MIN_GLYPH_DOTS /
  (LCD_SCREEN_DOTS * LCD_PANEL_FONT_SCALE * NATURAL_EXPRESSION_FONT_SCALE);

// The .08em total margins plus .045em fraction bar in lcd.css.
const fractionBarAndMargins = 0.125;

/** Formula height in root-expression baseline units, including an active empty-slot caret. */
export function naturalFormulaHeightLines(atoms: Atom[], cursor?: Cursor): number {
  const slot = (xs: Atom[], scale: number, path: number[]): number => {
    const emptySlotScale = cursor && xs.length === 0 && pathsEqual(path, cursor.path) ? 0.95 : 0.7;
    return Math.max(scale * emptySlotScale, ...xs.map((value, index) => atom(value, scale, path, index)));
  };

  const atom = (value: Atom, scale: number, path: number[], index: number): number => {
    const nested = (field: SlotField, items: Atom[], childScale = scale) =>
      slot(items, childScale, childPath(path, index, field));
    switch (value.t) {
      case "frac": {
        const childScale = Math.max(scale * 0.72, naturalFractionMinimumScale);
        return nested("num", value.num, childScale) + nested("den", value.den, childScale) + fractionBarAndMargins * scale;
      }
      case "mixed": {
        const childScale = Math.max(scale * 0.72, naturalFractionMinimumScale);
        const fraction = nested("num", value.num, childScale) + nested("den", value.den, childScale) + fractionBarAndMargins * scale;
        return Math.max(nested("whole", value.whole), fraction);
      }
      case "sexagesimal":
        return Math.max(nested("whole", value.deg), nested("num", value.min), nested("den", value.sec));
      case "sqrt":
      case "cbrt":
        return Math.max(scale, 0.92 * nested("inner", value.inner));
      case "nthrt":
        return Math.max(scale, 0.55 * nested("n", value.n), 0.92 * nested("inner", value.inner));
      case "pow":
        return Math.max(nested("base", value.base), 0.62 * nested("exp", value.exp, scale * 0.62) + 0.15 * scale);
      case "logb":
        return Math.max(scale, 0.58 * nested("base", value.base, scale * 0.58) + 0.2 * scale, 0.58 * nested("arg", value.arg, scale * 0.58) + 0.2 * scale);
      case "call": {
        if (value.name === "int" || value.name === "\u03a3") {
          return Math.max(
            1.16 * scale,
            ...value.args.map((arg, argIndex) => nested(`args${argIndex}` as SlotField, arg)),
            1.16 * scale + 0.52 * (nested("args1", value.args[1] ?? []) + nested("args2", value.args[2] ?? [])),
          );
        }
        if (value.name === "diff") {
          return Math.max(1.3 * scale, nested("args0", value.args[0] ?? []), 0.62 * nested("args1", value.args[1] ?? [], scale * 0.62) + 0.25 * scale);
        }
        return Math.max(scale, ...value.args.map((arg, argIndex) => nested(`args${argIndex}` as SlotField, arg)));
      }
      case "post":
        return Math.max(nested("inner", value.inner), 0.88 * scale);
      case "neg":
      case "abs":
      case "angle":
      case "group":
        return Math.max(scale, nested("inner", value.inner));
      case "num":
      case "op":
      case "var":
      case "sym":
      case "colon":
      case "comma":
      case "placeholder":
      case "cplxfmt":
        return scale;
    }
  };

  return slot(atoms, 1, []);
}

/** Two 31-dot LCD heights expressed in root-expression baseline units. */
export function naturalFormulaMaxHeightLines(): number {
  const lineHeightAsPanelFraction =
    LCD_PANEL_FONT_SCALE * NATURAL_EXPRESSION_FONT_SCALE * NATURAL_EXPRESSION_LINE_HEIGHT;
  return NATURAL_FORMULA_MAX_SCREENS / lineHeightAsPanelFraction;
}

/** Estimated formula height divided by the 31-dot LCD height. */
export function naturalFormulaHeightScreens(atoms: Atom[], cursor?: Cursor): number {
  return naturalFormulaHeightLines(atoms, cursor) *
    LCD_PANEL_FONT_SCALE * NATURAL_EXPRESSION_FONT_SCALE * NATURAL_EXPRESSION_LINE_HEIGHT;
}

# Numeric native-float audit (`src/calc`)

Classification:

1. **safe control-flow/UI** — key IDs, menu pages, cursor clamps, contrast, history index
2. **bounded integer/control-value** — 32-bit LCG state, digit keys `0`–`9`
3. **calculator-semantic** — values that affect displayed results (forbidden unless justified)
4. **test-only** — assertions and unused helpers

Hardware tie-rounding is **not** established. Clone policy remains `Decimal.ROUND_HALF_UP` (`NEEDS-HUMAN-REVIEW` vs hardware).

## After this pass

| Location | Construct | Class | Notes |
| --- | --- | --- | --- |
| `numeric.ts` `createUint32Rng` | `Math.imul` + `>>>` | 2 | 32-bit LCG control state. Not IEEE-754 calculator math. Hardware Ran# algorithm unspecified (`INFERRED`). |
| `numeric.ts` `seededRng` | `/ 0x100000000` | 4 | Unused by the evaluator. Prefer `createUint32Rng`. |
| `numeric.ts` `factorial` / `nPr` / `nCr` | Decimal loops | — | Native `.toNumber()` loops **removed**. |
| `numeric.ts` `ranHash` / `ranInt` | `D(u).mod(...)` | — | Native `Math.floor` / `.toNumber()` span **removed**. |
| `evaluate.ts` special angles | `specialTrigFromSym` | — | Native `toNumber() % 360` and `1e-10` epsilon **removed**. Exact rat/π/gra only. |
| `evaluate.ts` Ran# / RanInt | `ranHash` / `ranInt` | — | Semantic float **removed**. |
| `symbolic.ts` `symPow` | Decimal countdown | — | `Number(ed.toFixed(0))` **removed**. Exact rational nth-root added. |
| `format.ts` `formatSci` | `D(expRaw)` | — | `Number(expRaw)` / `Math.abs` **removed**. |
| `format.ts` `tryPiForm` | `D(d.toString())` | — | `Number(d)` **removed**. Helper currently unused by COMP eval. |
| `machine.ts` setup page / contrast / replay | `Math.min` / `Math.max` | 1 | UI/control indices. |
| `machine.ts` Fix/Sci | `Number(keyId)` | 2 | `keyId` is `"0"`…`"9"` only. |
| `editor.ts` `editorFromAtoms` | `Math.min` / `Math.max` | 1 | Cursor clamp. |

## Remaining calculator-semantic native float

**None** in `src/calc` evaluation/formatting after this pass.

`src/ui/*` still uses `Math.*` for layout (object-fit, font size, hit-testing). That is class 1 and must not feed `reduce()`.

BASE-N (`src/calc/baseNNumeric.ts`, `src/calc/baseN.ts`) uses signed `bigint` with explicit 16/32-bit mask/sign. `bigint.toString(2|8|16)` is integer conversion, not IEEE-754. Cursor clamps use `Math.min`/`Math.max` (class 1). `BigInt(baseN.value)` only re-parses the canonical signed decimal string written by the same domain. See `docs/BASE_N.md`.

CMPLX (`src/calc/symbolic.ts` `cplx`, `src/calc/complex.ts`) uses real `Sym` parts. `atan`/`sin`/`cos` for arg/polar go through decimal.js (`Dec.atan`, `toRad(...).sin()`), not IEEE-754 `Math.*`. `toDec` of a non-real throws. Integer-to-`BigInt` via `toFixed(0)` is only for exact integer degree args. See `docs/CMPLX.md`.

STAT (`src/calc/statNumeric.ts`) uses decimal.js for weighted sums, OLS, quadratic 3×3 elimination, and an erf Maclaurin series for Φ(t). Loop indices `n` converted with `D(2 * n + 1)` are class 2 (bounded integers). No `Math.*` on STAT results. See `docs/STAT.md`.

EQN (`src/calc/eqnSolve.ts`) uses existing `Sym` arithmetic (Gaussian elimination, quadratic formula, `symSqrt` / `packCplx`) and decimal.js Newton only as a cubic fallback when no rational root exists. `BigInt(v.toFixed(0))` is only for exact integer coefficient factorisation (class 2). No `Math.*` on solver results. See `docs/EQN.md`.

MATRIX (`src/calc/matrixNumeric.ts`) uses existing `Sym` cells. Loop indices over 1–3 dimensions are class 1. `matrixFromInts` accepts test `bigint` literals (and integer `number` only as a test helper, converted with `BigInt`). No `Math.*` on matrix results. mathjs is unused. See `docs/MATRIX.md`.

VECTOR (`src/calc/vectorNumeric.ts`) uses existing `Sym` cells. Loop indices over dim 2 or 3 are class 1. Magnitude uses `symSqrt` of the sum of squares. Cross/dot/add/scale use `symAdd`/`symMul`/`symNeg`. `vectorFromInts` accepts test `bigint` literals (and integer `number` only as a test helper, converted with `BigInt`). No `Math.*` on vector results. mathjs is unused. See `docs/VECTOR.md`.

## Policy notes (not hardware claims)

- Internal digits 15, display 10+2, range ±1e-99 … ±9.999999999e99: `CROSS-MODEL-SOURCE` SRC-P97; overlapping range also in target precision pages (`CONFIRMED` as a specification class, not by physical measurement).
- π / e internal strings: SRC-P36 `CROSS-MODEL-SOURCE`; used because target COMP function pages exist (`CONFIRMED` that π/e are present, strings from 115/C).
- Underflow → 0, overflow → Math ERROR: SRC-P97 + tests.
- Negative zero → +0: `INFERRED` (display never shows −0).
- Exact special-angle shortcuts are Natural Display behavior, not a substitute for nearby floats (see `special-angles.test.ts`).

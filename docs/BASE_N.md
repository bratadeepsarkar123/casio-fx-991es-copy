# BASE-N numeric domain (D-017)

This document is the Layer-3 contract for BASE-N. It is **not** a target printed manual. Passing clone tests is **not** `TARGET-MANUAL` and is **not** hardware verification.

Official target HTML (class `TARGET-OFFICIAL-DOC`):

https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/base-n_calculations.html

The supplied 115/C PDF (`SRC-P66–69`) remains `CROSS-MODEL-SOURCE` and must not be promoted to `TARGET-MANUAL`.

---

## Why a separate domain exists

```
KeyEvent → reduce()
            ├─ COMP   Atom[]        → evaluateAtoms  → decimal.js / rationals
            ├─ TABLE  TableSession  → evaluateAtoms  → same COMP scalars (X overlay)
            └─ BASE-N BaseNToken[]  → evaluateBaseN  → w-bit signed bigint
                         ↓
                      lcdModel → Lcd
```

BASE-N is **not** “COMP decimal → format as hex”. Mixing those domains would make overflow, two’s complement, and bitwise ops depend on `decimal.js` display rounding. The shared reducer orchestrates mode/latches/menus/persist; it does not implement BASE-N arithmetic.

CMPLX (next additive mode, not started here) should follow the same pattern: new value type, not a COMP display trick.

---

## Canonical representation

| Item | Clone |
| --- | --- |
| Semantic value | signed `bigint` |
| Storage on `CalcState.baseN.value` | decimal ASCII of that signed integer, or `null` |
| Width | **16-bit in BIN**, **32-bit in DEC/HEX/OCT** (`TARGET-OFFICIAL-DOC`) |
| Interpretation | two’s complement (`TARGET-OFFICIAL-DOC` range tables) |
| Authority | `src/calc/baseNNumeric.ts` — digit loop + mask/sign. **Not** `Number` / `parseInt` / IEEE-754 |

JavaScript `bigint` is arbitrary-width. The clone **masks and range-checks** to `w` bits. Using `bigint` alone is not a hardware claim.

Pipeline:

```
raw digits → parseUnsignedDigits (radix loop)
           → interpretMagnitude (unsigned word → signed, or DEC magnitude)
           → operation on signed bigint
           → fitsSigned(w) for + − × ÷ ; maskToWidth(w) then toSigned for bitwise
           → formatBaseNResult
```

---

## Radix modes

| Mode | Key (unshifted, `EMPIRICAL` chassis legends) | Width | Display |
| --- | --- | --- | --- |
| DEC | `x²` (`square`) | 32 | signed ASCII minus |
| HEX | `^` (`power`) | 32 | 8 uppercase hex digits, zero-padded |
| BIN | `log` | 16 | 16 binary digits, zero-padded |
| OCT | `ln` | 32 | 11 octal digits, zero-padded |

MODE `4` enters BASE-N in **DEC** (`TARGET-OFFICIAL-DOC`).

Official ranges (`TARGET-OFFICIAL-DOC`):

| Base | Positive | Negative |
| --- | --- | --- |
| Binary | `0000000000000000` … `0111111111111111` | `1000000000000000` … `1111111111111111` |
| Octal | `00000000000` … `17777777777` | `20000000000` … `37777777777` |
| Decimal | −2147483648 … 2147483647 | (ASCII minus) |
| Hexadecimal | `00000000` … `7FFFFFFF` | `80000000` … `FFFFFFFF` |

---

## Input grammar (`BaseNToken[]`)

Linear tokens, **not** COMP `Atom[]`.

Valid digits at the **current** radix (`INFERRED` reject-on-key; eval still validates suffix radix):

| Radix | Digits |
| --- | --- |
| BIN | `0–1` |
| OCT | `0–7` |
| DEC | `0–9` |
| HEX | `0–9`, `A–F` (uppercase display) |

A–F keys (`(-)` … `tan`) insert unshifted in HEX (`TARGET-OFFICIAL-DOC` that those keys exist). Outside HEX they require ALPHA (`INFERRED`; **NEEDS-HUMAN-REVIEW** vs hardware). SHIFT does **not** insert A–F (`INFERRED`).

Supported tokens: unsigned digit groups; optional `d`/`h`/`b`/`o` suffix on a group; `+ − × ÷`; `and or xor xnor`; `Not(` / `Neg(`; parentheses; unary `(-)`; `Ans`.

Unsupported in this phase (rejected / not in grammar):

| Form | Handling | Evidence |
| --- | --- | --- |
| Fractions, exponents, `.` | not in BASE-N grammar; keys consumed as no-ops | `TARGET-OFFICIAL-DOC` (“not supported”) |
| Bit shifts | **DEFERRED** — not stubbed as COMP ops | Official BASE-N page does not list them |
| COMP calls (`sin`, `√`, `Pol`, …) | not inserted; HEX uses those keys as D/E/F | domain isolation |
| Invalid current-radix digit | ignored at keypress | `INFERRED` **NHR** |
| Digit illegal for a **suffix** (e.g. `2b`) | Syntax ERROR at `=` | `INFERRED` |

---

## Operations

| Op | Semantics | Overflow / domain | Evidence |
| --- | --- | --- | --- |
| `+ − ×` | exact signed `bigint` | result outside signed `w`-bit range → **Math ERROR** (no silent wrap) | range table `TARGET-OFFICIAL-DOC`; wrap vs error **NHR** |
| `÷` | integer; fractional part cut off | ÷0 → Math ERROR; toward-zero is `INFERRED` **NHR** | cut-off `TARGET-OFFICIAL-DOC` |
| `and or xor xnor` | bitwise on current word | mask then signed interpret | `TARGET-OFFICIAL-DOC` examples |
| `Not(` | bitwise complement of current word | 16-bit BIN examples | `TARGET-OFFICIAL-DOC` |
| `Neg(` | two’s complement of current word | BIN example | `TARGET-OFFICIAL-DOC` |
| unary `(-)` | `0 − x` with the same +/− overflow rule | DEC minus sign on output | DEC minus `TARGET-OFFICIAL-DOC`; key vs `Neg(` **NHR** |
| radix convert | same signed value, new `formatBaseNResult` | out of destination signed range → Math ERROR | convert keys `TARGET-OFFICIAL-DOC` |
| mixed suffixes | `10d+10h+10b+10o` → `36` in DEC | — | `TARGET-OFFICIAL-DOC` |

Bitwise ops use **the current radix’s word**, so BIN `Not(1010)` is 16-bit (`1111111111110101`), matching the official examples.

Logical-op menu: SHIFT+`3` (BASE) page 0 = `1:and 2:or 3:xor 4:xnor 5:Not 6:Neg`. Digit mapping is `CROSS-MODEL-SOURCE` (115/C FAQ overlap) plus official op names. Suffix page (`1:d 2:h 3:b 4:o` after ▼) is `INFERRED` layout; the **commands** are `TARGET-OFFICIAL-DOC`.

---

## Display

```
signed bigint → formatBaseNResult(radix) → result.display → lcdResult
tokens        → formatBaseNExpression     → lcdExpression
```

- BIN/OCT/HEX: two’s-complement **bit pattern**, zero-padded (`TARGET-OFFICIAL-DOC` examples).
- DEC: ASCII minus, no padding (`TARGET-OFFICIAL-DOC`).
- Indicators: `ind-mode=BASE-N`, `ind-basen=DEC|HEX|BIN|OCT`. Math indicator off (`INFERRED` **NHR**).
- Hex letters: uppercase (`EMPIRICAL` from official `0000022B` / `FFFFFFFF`).
- One-line LCD vs hardware BASE-N screen: **NEEDS-HUMAN-REVIEW** (clone uses the existing two-line HTML LCD; not a pixel claim).

---

## Errors

| Trigger | Code | After error | Recovery | Evidence |
| --- | --- | --- | --- | --- |
| Empty `=` | result `0` in current radix | result screen | — | `INFERRED` |
| Suffix/digit illegal at eval | Syntax ERROR | error screen; tokens kept | AC clears input; ◀/▶ return to input | names `CROSS-MODEL-SOURCE` SRC-P92; trigger `INFERRED` |
| ÷0 | Math ERROR | same | same | overlapping SRC-P92; trigger `INFERRED` |
| + − × result outside signed word | Math ERROR | same | same | range table official; error vs wrap **NHR** |
| Convert to a radix whose signed range cannot hold the value | Math ERROR | same | same | `INFERRED` |
| Unimplemented BASE-N token | cannot be inserted | — | — | architecture |
| Bit shift | not offered | — | — | **DEFERRED** |

Error codes reuse the existing `ErrorCode` strings because the target error catalog uses the same names (`CROSS-MODEL-SOURCE` overlap). That is **not** a claim that BASE-N recovery glyphs match hardware.

---

## Mode entry / exit / shared state

| Event | Clone | Evidence |
| --- | --- | --- |
| MODE `4` | BASE-N, DEC, empty tokens | `TARGET-OFFICIAL-DOC` default DEC |
| MODE `1` | COMP; Ans kept as signed decimal string | memories survive mode change: `TARGET-OFFICIAL-DOC`. Writing Ans as decimal: `INFERRED` **NHR** |
| Variables A–F, M, X, Y | unchanged by BASE-N eval | memories survive: `TARGET-OFFICIAL-DOC` |
| COMP replay history | cleared on any MODE change (existing COMP rule); BASE-N `=` does not append COMP history | mode-change clear: SRC-P31 `CROSS-MODEL-SOURCE` |
| PreAns | reset to `"0"` on leaving COMP (existing MODE handler) | `INFERRED` **NHR** |
| SHIFT / ALPHA | same latches as COMP; `reduceBaseN` consumes BASE-N keys | architecture |
| Persist | schema v1; **radix kept**; tokens/value stripped | `INFERRED` **NHR** vs hardware power-off |

---

## Files

| Path | Role |
| --- | --- |
| `src/calc/baseNNumeric.ts` | width, parse, mask, ops, format |
| `src/calc/baseN.ts` | tokens, parser, `reduceBaseN` |
| `src/calc/machine.ts` | orchestrates; does not evaluate BASE-N |
| `src/ui/lcdModel.ts` | expression/result/indicators |
| `src/calc/persist.ts` | strip tokens/value |

---

## Unresolved (do not treat as hardware)

- +/−/× overflow: Math ERROR vs wrap
- ÷ toward-zero vs other cut-off
- A–F vs `(-)` when radix is not HEX
- BASE menu page order for `d/h/b/o`
- Whether invalid current-radix keys are ignored or queued
- Persist of the BASE-N expression across power-off
- Exact LCD glyphs / padding on a physical unit
- Bit shifts (DEFERRED, not guessed)

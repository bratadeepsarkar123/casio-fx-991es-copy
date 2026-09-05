# STAT Mode — Statistics Domain (D-019)

Evidence classes follow `docs/EVIDENCE_CLASSES.md`. The 115/C PDF is **`CROSS-MODEL-SOURCE` only**. Official target HTML is **`TARGET-OFFICIAL-DOC`**.

Official source: [Using Calculation Modes — Statistical Calculations](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/stat.html)
(`fx-570ES PLUS / fx-991ES PLUS`).

---

## 1. Why STAT is a separate domain

COMP/CMPLX/BASE-N transform **expression → value**. TABLE transforms **expression + X overlay → rows**. STAT introduces a **persistent dataset** that statistical commands operate on:

```text
dataset  →  statistical operation  →  derived result
```

The dataset is **not** a COMP `Atom[]`, not a TABLE session, and not a serialized expression. It lives in `CalcState.stat: StatSession | null`.

```text
KeyEvent → reduce() → reduceStat / STAT menus
                 ↓
           StatSession (rows, type, editor/calc)
                 ↓
           statNumeric (decimal.js)
                 ↓
           evaluateAtoms STAT commands → ResultValue
                 ↓
           lcdModel → LCD
```

`reduce()` remains the orchestrator. STAT does not fall through into COMP while the Statistics Editor is open.

---

## 2. Entering STAT — type selection

| Item | Evidence | Class | Target confirm |
|------|----------|-------|----------------|
| MODE `3` enters STAT | Official HTML; existing `MODE_BY_DIGIT` | TARGET-OFFICIAL-DOC | YES |
| Type menu 1–8 | Official HTML (labels). Key numbers from 115/C p.E-22 | TARGET-OFFICIAL-DOC + CROSS-MODEL-SOURCE numbering | YES labels; numbering NHR |
| `1` 1-VAR | Official | TARGET-OFFICIAL-DOC | YES |
| `2` A+BX  y=A+Bx | Official | TARGET-OFFICIAL-DOC | YES |
| `3` _+CX2  y=A+Bx+Cx² | Official | TARGET-OFFICIAL-DOC | YES |
| `4` ln X  y=A+B ln x | Official | TARGET-OFFICIAL-DOC | YES |
| `5` e^X  y=A e^{Bx} | Official | TARGET-OFFICIAL-DOC | YES |
| `6` A•B^X  y=AB^x | Official | TARGET-OFFICIAL-DOC | YES |
| `7` A•X^B  y=A x^B | Official | TARGET-OFFICIAL-DOC | YES |
| `8` 1/X  y=A+B/x | Official | TARGET-OFFICIAL-DOC | YES |

Selecting a type opens the **Statistics Editor**.

---

## 3. Dataset limits

| Limit | Official target | 115/C (do not use) | Class |
|-------|-----------------|--------------------|-------|
| X only (FREQ off) | 80 | 40 | TARGET-OFFICIAL-DOC |
| X+FREQ or X+Y | 40 | 20 | TARGET-OFFICIAL-DOC |
| X+Y+FREQ | 26 | 26 | TARGET-OFFICIAL-DOC |

Exceeding the limit: **Insufficient MEM Error** (115/C p.E-56 lists this for STAT; clone uses the same error string). Class: **CROSS-MODEL-SOURCE** for the exact message; official HTML documents the numeric caps.

---

## 4. Frequency (Stat Format)

| Behavior | Evidence | Class |
|----------|----------|-------|
| SETUP Stat Format FreqOn / FreqOff | Official HTML; existing `setup.statFreq` | TARGET-OFFICIAL-DOC |
| Default FreqOff | Official default + clone default `false` | TARGET-OFFICIAL-DOC |
| FREQ column appears when ON | Official | TARGET-OFFICIAL-DOC |
| n = Σ FREQ | Official examples (Ex2 n=9 = 1+2+3+2+1) | TARGET-OFFICIAL-DOC |
| Changing Stat Format deletes all STAT editor data | Official HTML | TARGET-OFFICIAL-DOC |
| FREQ must be a positive integer | Not stated on target HTML | **INFERRED** (Argument ERROR if not) |
| FREQ = 0 | Not illustrated | **INFERRED** skip-or-error; clone treats ≤0 as Argument ERROR |

---

## 5. Data deletion / survival

| Event | Official | Clone |
|-------|----------|-------|
| Exit STAT Mode | All editor data deleted | `stat: null` |
| Switch 1-VAR ↔ paired | All data deleted | Wipe on type confirm |
| Change Stat Format | All data deleted | Wipe `stat.rows` |
| AC in editor | Statistics Calculation Screen (data kept) | `phase: "calc"` |
| AC on calc screen | Clear expression (COMP-like) | Existing AC |
| MODE away from STAT | Data deleted (exit STAT) | `stat: null` |
| Refresh / persist | Not specified | **Do not persist** STAT session (INFERRED; matches TABLE). Schema stays **v1**. |
| Hardware power-off STAT data | Unknown | **NEEDS-HUMAN-REVIEW** |
| CLR Memory vs STAT data | Unknown | **NEEDS-HUMAN-REVIEW** |

COMP variables A–F, X, Y, M, Ans survive MODE change (`TARGET-OFFICIAL-DOC` memories section). STAT **must not** overwrite them to compute statistics.

---

## 6. Statistics Editor

| Action | Official / 115/C | Class |
|--------|------------------|-------|
| Move cursor; overwrite cell; `=` | Official | TARGET-OFFICIAL-DOC |
| DEL deletes the **line** | Official | TARGET-OFFICIAL-DOC |
| STAT → Edit → Ins | Official | TARGET-OFFICIAL-DOC |
| STAT → Edit → Del-A | Official | TARGET-OFFICIAL-DOC |
| Editor does not support M−, STO, Pol, Rec, multi-statement | Official | TARGET-OFFICIAL-DOC |
| `=` after a value moves to next row, same column | 115/C p.E-24 | CROSS-MODEL-SOURCE |
| Left/right change column | Typical Casio STAT | **INFERRED** |
| Up/down change row | Typical Casio STAT | **INFERRED** |
| Cell contents are numeric literals (not COMP AST) | Architectural | INFERRED (official examples are numeric) |

---

## 7. STAT menu on calculation screen

SHIFT+`1` is chassis **STAT** (`EMPIRICAL` keymap). Official: STAT menu items insert a **command** into the calculation, then `=` executes it.

Menu numbering is **not** on the official HTML (it dropped key numbers). Numbers below are **115/C p.E-25** → **CROSS-MODEL-SOURCE**, confirmation **NEEDS-HUMAN-REVIEW**.

### Always

| Key | Item |
|-----|------|
| 1 | Type |
| 2 | Data (return to editor) |
| 3 | Sum |
| 4 | Var |
| 5 | Reg (paired) / Distr (1-VAR) |
| 6 | MinMax |

### 1-VAR Sum / Var / MinMax / Distr

| Menu | Commands | Class |
|------|----------|-------|
| Sum | Σx², Σx | TARGET-OFFICIAL-DOC |
| Var | n, x̄, σx, sx | TARGET-OFFICIAL-DOC |
| MinMax | minX, maxX | TARGET-OFFICIAL-DOC (no Q1/Med/Q3 on target HTML) |
| Distr | P(, Q(, R(, t | TARGET-OFFICIAL-DOC names; **P and t** illustrated (Ex5) |

Q1/Med/Q3 appear only in 115/C → **UNSUPPORTED-BY-HARDWARE** for this target (do not implement as target STAT).

### Paired Sum / Var / Reg / MinMax

| Menu | Commands | Class |
|------|----------|-------|
| Sum | Σx² Σx Σy² Σy Σxy Σx³ Σx²y Σx⁴ | TARGET-OFFICIAL-DOC |
| Var | n x̄ σx sx ȳ σy sy | TARGET-OFFICIAL-DOC |
| Linear / log / exp / … Reg | A B r x̂ ŷ | TARGET-OFFICIAL-DOC |
| Quadratic Reg | A B C x̂1 x̂2 ŷ | TARGET-OFFICIAL-DOC |
| MinMax | minX maxX minY maxY | TARGET-OFFICIAL-DOC |

`x̂` / `ŷ` / `x̂1` / `x̂2` are **commands that take the immediately preceding value as argument** (official Ex4: `-130` then x̂).

---

## 8. Official worked examples (must match)

### Ex2 — 1-VAR, FreqOn

`{x;freq} = {1;1, 2;2, 3;3, 4;2, 5;1}`

- x̄ = `3`
- σx = `1.154700538`

### Ex3 — A+BX then ln X, FreqOff, Fix 3

Points `(20,3150), (110,7310), (200,8800), (290,9310)`

- Linear r = `0.923`
- ln X: r = `0.998`, A = `-3857.984`, B = `2357.532`

### Ex4 — after Ex3 log regression

y = `-130` then x̂ → `4.861` (Fix 3)

### Ex5 — 1-VAR FreqOn, Fix 3, Distr

FREQ data `{0;1 … 10;1}` as published; x=`3` then t → `-0.762`; then P(t) → `0.223`

Implies **P(t) = Φ(t)** (standard normal CDF), not the 0-to-t integral. **Q** and **R** are not numerically illustrated → implement from 115/C definitions as **INFERRED**.

---

## 9. Numerical policy

- **decimal.js only** for STAT results. No IEEE-754 `Math.*` on the result path.
- Population σx uses `n` in the denominator (Casio textbook / Ex2 checks: n=9, Σx=27, Σx²=93 → σx = √(4/3) = 1.154700538…).
- Sample sx uses `n(n−1)`.
- Linear / transformed regressions: ordinary least squares on the transformed pairs.
- Quadratic: 3×3 normal equations, Decimal Gaussian elimination.
- No third-party statistics library as source of truth.

Formulas (1-VAR, FREQ expanded as repeated observations):

```text
n    = Σ f
Σx   = Σ f·x
Σx²  = Σ f·x²
x̄    = Σx / n
σx   = √( (n·Σx² − (Σx)²) / n² )
sx   = √( (n·Σx² − (Σx)²) / (n·(n−1)) )
```

Errors:

| Condition | Result | Class |
|-----------|--------|-------|
| n = 0 for mean / σ | Math ERROR | INFERRED |
| n < 2 for sx or r | Math ERROR | INFERRED |
| n < 3 quadratic | Math ERROR | INFERRED |
| ln/exp domain (x≤0 or y≤0 as required) | Math ERROR | INFERRED |
| x̂ with B=0 | Math ERROR | INFERRED |
| FREQ not a positive integer | Argument ERROR | INFERRED |

---

## 10. COMP / STAT boundary

| Question | Answer | Class |
|----------|--------|-------|
| Entering STAT preserve COMP variables? | Yes | TARGET-OFFICIAL-DOC |
| Dataset entry write Ans? | No | INFERRED (like TABLE) |
| STAT calc `=` write Ans? | Yes (via existing `onEquals`) | INFERRED |
| Exiting STAT preserve dataset? | No | TARGET-OFFICIAL-DOC |
| AC in editor | Calc screen, data kept | TARGET-OFFICIAL-DOC |
| MODE change delete STAT data? | Yes (exit) | TARGET-OFFICIAL-DOC |
| Persist STAT across refresh? | No (clone) | INFERRED |
| STAT mutate A–F/X/Y to compute? | **Forbidden** | Architecture |

---

## 11. Display model

STAT semantic state → result → `lcdModel` → LCD.

Screens:

- Type select (2 pages of 4)
- Editor: `Xn=` / `Yn=` / `FREQn=` plus current input
- Calc screen: COMP-like expression + STAT indicators
- STAT submenus

Not a spreadsheet UI.

---

## 12. Scope

| Capability | Bucket |
|------------|--------|
| 8 type selections, editor, FREQ, row limits | REQUIRED-COMPLETE-CLONE |
| 1-VAR n, Σ, mean, σ, s, min, max | REQUIRED-COMPLETE-CLONE |
| Linear + all 6 other paired models A,B,r,x̂,ŷ | REQUIRED-COMPLETE-CLONE |
| Quadratic A,B,C,x̂1,x̂2,ŷ | REQUIRED-COMPLETE-CLONE |
| Distr t, P | REQUIRED-COMPLETE-CLONE (official Ex5) |
| Distr Q, R | OPTIONAL-V1 / INFERRED |
| Q1/Med/Q3 | UNSUPPORTED-BY-HARDWARE (115/C only) |
| Normal probability *as a separate DIST mode* | UNSUPPORTED-BY-HARDWARE |
| Physical LCD glyph parity for x̄ σ | NEEDS-HUMAN-REVIEW |

---

## 13. Architecture stress (pre-implementation intent)

1. COMP semantics: no change except STAT-only `evalCall` names when `ctx.stat` is present.
2. AST: additive Call names only (`stat-n`, `stat-meanX`, …). No dataset-as-AST.
3. BASE-N: untouched.
4. CMPLX values: untouched.
5. New domain: `StatSession`.
6. Dataset independent of the expression editor: yes.
7. `reduce()` stays the orchestrator.
8. `CalcState` gains one optional field (`stat`), same pattern as `table` / `baseN`.
9. Dataset stored once in `stat.rows`.
10. EQN/MATRIX/VECTOR can follow the same session-domain pattern; STAT must not force a rewrite.

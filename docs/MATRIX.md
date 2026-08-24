# MATRIX Mode — Matrix Register Domain (D-021)

Evidence classes follow `docs/EVIDENCE_CLASSES.md`. The 115/C PDF is **`CROSS-MODEL-SOURCE` only**. Official target HTML is **`TARGET-OFFICIAL-DOC`**. There is no `TARGET-MANUAL` in this repository. VECTOR is **not** in this phase.

Official source: [Using Calculation Modes — Matrix Calculations](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/matrix.html)
(`fx-570ES PLUS / fx-991ES PLUS`).

Official errors: [Technical Information — Errors](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/errors.html)
(Casio’s URL spelling `informatoin` is unchanged).

The supplied 115/C guide (printed p.73–75) and the 115/C HTML (which adds Ref / Rref examples) are **not** the target manual.

---

## 1. Why MATRIX is a separate domain

COMP/CMPLX transform **expression → scalar**. TABLE is an **X-grid of COMP evaluations**. STAT is a **dataset**. EQN is a **coefficient solver**. MATRIX is a **named register of structured arrays**:

```text
register + dimension  →  cell editor  →  matrix expression  →  MatrixValue | scalar
```

A matrix is **not** a COMP `Atom[]`, not `number[][]`, not an expression string such as `[[1,2],[3,4]]`, and not a second floating-point type. It lives in `CalcState.matrix: MatrixSession | null`.

```text
KeyEvent → reduce() → reduceMatrix
                 ↓
           MatrixSession (registers, phase, editor cursor)
                 ↓
           matrixNumeric (Sym cells; no mathjs)
                 ↓
           MatrixValue | Sym
                 ↓
           lcdModel → LCD
```

`reduce()` remains the orchestrator. Matrix algebra lives in `src/calc/matrixNumeric.ts`. Expression walking for MatA/det/Trn lives in `src/calc/matrixEval.ts`. The COMP editor is reused only as the **current cell** (entry) or as a MATRIX-mode expression of `mat-*` call tokens (calculation). Those tokens are not COMP AST encodings of the matrix contents.

---

## 2. Scope from official target HTML

| Item | Evidence | Class |
| --- | --- | --- |
| MODE → MATRIX (clone: MODE `6`) | Official; existing `MODE_BY_DIGIT` | TARGET-OFFICIAL-DOC |
| Registers **MatA, MatB, MatC** plus **MatAns** | Official | TARGET-OFFICIAL-DOC |
| Maximum size **3×3** | Official | TARGET-OFFICIAL-DOC |
| Create: pick register → pick dimension → enter elements | Official Ex1 | TARGET-OFFICIAL-DOC |
| Blank element treated as **0** | Official | TARGET-OFFICIAL-DOC |
| AC from editor → calculation screen | Official (glyph dropped); STAT-like | **INFERRED** / **NEEDS-HUMAN-REVIEW** |
| MATRIX menu: Dim, Data, MatA/B/C/Ans, det, Trn | Official names; numbering from 115/C | names: TARGET-OFFICIAL-DOC; numbers: **CROSS-MODEL-SOURCE** / **NHR** |
| Chassis MATRIX key is SHIFT+`4` | `public/keymap.json` | **EMPIRICAL** |
| Dimension menu 1–9 = 1×1 … 3×3 | Standard Casio / 115/C | **CROSS-MODEL-SOURCE** / **NHR** |
| Results of matrix ops stored in **MatAns** and shown on MatAns screen | Official | TARGET-OFFICIAL-DOC |
| From MatAns, `+ − × ÷` and `x²` / `x³` continue with MatAns | Official | TARGET-OFFICIAL-DOC |
| Inverse uses **x⁻¹**, not `^` | Official Ex6 note | TARGET-OFFICIAL-DOC |
| Square/cube use **x² / x³**, not the general power key | Official Ex8 note | TARGET-OFFICIAL-DOC |
| Abs(Mat) is **element-wise** | Official Ex7 | TARGET-OFFICIAL-DOC |
| Copy displayed matrix to MatA/B/C via STO | Official | TARGET-OFFICIAL-DOC |
| Matrix Editor unsupported: M−, STO (COMP vars), Pol, Rec, multi-statements | Official | TARGET-OFFICIAL-DOC |
| **Dimension ERROR**: MATRIX/VECTOR only; unspecified dimension or incompatible dims | Official errors page | TARGET-OFFICIAL-DOC |
| Complex entries | Official MATRIX page does not mention `i` | **INFERRED** reject (`Math ERROR`) |
| Ref / Rref | 115/C HTML Ex9–Ex10 only; **absent** from target HTML | **UNSUPPORTED-BY-HARDWARE** on this target (115/C-only) |
| VECTOR operations | Separate mode | **not this phase** |

---

## 3. Official worked examples (must-test)

Element lists survive in the official HTML; printed matrices were dropped. Reconstructed matrices:

**Ex1** MatA = `[[2,1],[1,1]]`, MatB = `[[2,1],[1,2]]`

- MatA×MatB = `[[5,4],[3,3]]`
- MatA+MatB = `[[4,2],[2,3]]`

**Ex2** MatC 2×3: `1 0 1 / 0 1 1` → `[[1,0,1],[0,1,1]]`

**Ex3** `3×MatA` → `[[6,3],[3,3]]`

**Ex4** `det(MatA)` → `1` (scalar; not a MatAns matrix)

**Ex5** `Trn(MatC)` → `[[1,0],[0,1],[1,1]]`

**Ex6** `MatA⁻¹` → `[[1,-1],[-1,2]]`

**Ex7** `Abs(MatB)` → same as MatB (all positive)

**Ex8** `MatA²` = `[[5,3],[3,2]]`; `MatA³` = `[[13,8],[8,5]]`

---

## 4. Representation

```text
MatrixValue
  rows, cols ∈ {1,2,3}
  cells: Sym[][]     // existing scalar architecture; not number[][]
```

- `null` register = dimension not specified → **Dimension ERROR** if used.
- Authoritative copy is `MatrixSession.registers`. LCD strings are a projection.
- Do **not** add `Sym.mat` (would contaminate COMP).

---

## 5. Session / phases

```text
dim-reg → dim-size → editor → (AC) calc
                ↘ data-reg → editor
calc → (=) matans | scalar result
matans → (STO) sto-dest
```

| Phase | Role |
| --- | --- |
| `dim-reg` | Pick MatA/B/C to assign dimension |
| `dim-size` | Keys 1–9 pick 1×1 … 3×3 |
| `data-reg` | Open editor on an already-dimensioned register |
| `editor` | One cell at a time; COMP editor is the current cell only |
| `calc` | Insert MatA/det/Trn; `=` runs `evaluateMatrixExpr` |
| `matans` | Navigate MatAns cells |
| `sto-dest` | Copy displayed matrix to MatA/B/C |

---

## 6. Operations (implemented)

| Op | Rule | Error |
| --- | --- | --- |
| + / − | Same shape | Dimension ERROR |
| × (matrix) | Inner dims match | Dimension ERROR |
| Scalar × matrix | Either side scalar | — |
| Matrix ÷ scalar | Scale by 1/s | Math ERROR if s=0 (**INFERRED**) |
| Matrix ÷ matrix | Not in official examples | Dimension ERROR (**INFERRED**) |
| Matrix + scalar | Not official | Dimension ERROR (**INFERRED**) |
| det | Square 1×1 / 2×2 / 3×3 | Dimension ERROR if non-square |
| inverse | Square; det≠0 | Math ERROR if singular (**INFERRED**; official does not name Dimension ERROR) |
| Trn | Any 1–3 dim | — |
| x² / x³ | Via matrix multiply | Dimension ERROR if non-square |
| Abs | Element-wise | — |
| General `^` / real exponents | Official forbids; use x²/x³ | Syntax ERROR (**INFERRED**) |
| Ref / Rref | 115/C only | Not implemented |

---

## 7. Persistence / CLR / MODE

Official MATRIX page is silent on power-off of MatA/B/C.

| Behavior | Clone | Class |
| --- | --- | --- |
| Schema stays **v1** | yes | — |
| Serialize `matrix: null` | yes | **INFERRED** (same as TABLE/STAT/EQN) |
| Reload while mode is MATRIX | empty `dim-reg` | **INFERRED** |
| Leave MATRIX | `matrix: null` | **INFERRED** / **NHR** vs hardware |
| CLR Setup / All | `matrix: null`, mode COMP | TARGET-OFFICIAL-DOC (All clears memory) + existing CLR |
| CLR Memory | wipe MatA/B/C/Ans if session exists | **INFERRED** |
| AC | does not wipe registers | **INFERRED** |
| Cursor / menus / MatAns view | not persisted | **INFERRED** |

Hardware power-off of matrix registers remains **NEEDS-HUMAN-REVIEW**.

---

## 8. Display

Two-line clone LCD (not a spreadsheet, not a hardware dot-matrix claim):

- Dim: `MATRIX` / `1:MatA 2:MatB 3:MatC`
- Size: two-line 1–6 sizes; keys 7–9 still accepted (**NHR** vs hardware scroll)
- Editor: `A11=` / cell value
- MatAns: `Ans11=` / cell value
- Calc: COMP linearization with `mat-*` relabeled `MatA`, `det`, `Trn`, …

Hardware matrix-grid LCD is **NEEDS-HUMAN-REVIEW**.

---

## 9. Errors

| Trigger | Code | Recovery | Class |
| --- | --- | --- | --- |
| Use MatA before Dim | Dimension ERROR | AC → calc | TARGET-OFFICIAL-DOC |
| Incompatible dims | Dimension ERROR | AC → calc | TARGET-OFFICIAL-DOC |
| Non-square det/inv/x²/x³ | Dimension ERROR | AC → calc | **INFERRED** from dim rules |
| Singular inverse | Math ERROR | AC → calc | **INFERRED** (illegal op / ÷0) |
| Complex / `i` in a cell | Math ERROR | AC → editor/calc | **INFERRED** |
| Overflow / range | Math ERROR | AC | existing scalar policy |
| Unknown COMP call in MATRIX expr | Syntax ERROR | AC | existing evaluator |

Not used for MATRIX: Can't Solve, Variable ERROR (SOLVE-only).

---

## 10. Scope

| Capability | Priority | Impl | Ver |
| --- | --- | --- | --- |
| MODE `6`, Dim, Data, MatA/B/C/Ans | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (docs + keys; not hardware) |
| 1×1 … 3×3 including rectangular | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (source-derived) |
| Ex1–Ex8 arithmetic / det / Trn / inv / Abs / powers | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (source-derived; not hardware) |
| Dimension ERROR / singular inverse | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (clone); singular class **INFERRED** |
| Complex matrix entries | — | rejected | **INFERRED** |
| Ref / Rref | UNSUPPORTED-BY-HARDWARE | UNSUPPORTED | N/A (115/C) |
| VECTOR | — | not this phase | — |
| Physical differential | — | — | N/A |
| Live PWA | — | — | BLOCKED |

---

## 11. Architecture stress

1. COMP semantics: no change.
2. TABLE: no change.
3. BASE-N: no change.
4. CMPLX: no change (complex matrix entries rejected; no second complex type).
5. STAT: no change.
6. EQN: no change.
7. `MatrixSession` independent of COMP AST for **contents**: yes. Calc-screen uses `mat-*` call tokens, not nested `Atom[]` matrices.
8. Elements use existing `Sym` / decimal.js: yes.
9. Algebra separated from reducer: yes (`matrixNumeric.ts` / `matrixEval.ts`).
10. `CalcState` gains one optional field (`matrix`), same pattern as `table` / `stat` / `eqn`.
11. Session domains remain separate (STAT dataset, EQN coeffs, MATRIX registers).
12. VECTOR can follow the same register + session pattern without a rewrite.

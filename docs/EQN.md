# EQN Mode — Equation Solver Domain (D-020)

Evidence classes follow `docs/EVIDENCE_CLASSES.md`. The 115/C PDF is **`CROSS-MODEL-SOURCE` only**. Official target HTML is **`TARGET-OFFICIAL-DOC`**. There is no `TARGET-MANUAL` in this repository.

Official source: [Using Calculation Modes — Equation Calculations](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/equation_calculations.html)
(`fx-570ES PLUS / fx-991ES PLUS`). Path is `equation_calculations.html`.

Official errors: [Technical Information — Errors](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/errors.html)
(Casio’s URL spelling `informatoin` is unchanged).

The supplied 115/C guide (printed p.70–72) is **not** the target manual. INEQ and 4-unknown systems from other Casio families are **not** on this target.

---

## 1. Why EQN is a separate domain

COMP/CMPLX transform **expression → value**. TABLE transforms **f(x) + X overlay → rows**. STAT holds a **dataset**. BASE-N is an **integer word**. EQN is a **structured coefficient-entry solver**:

```text
equation type  →  coefficient cells  →  EQN solver  →  SolutionSet
```

The equation is **not** a COMP `Atom[]` polynomial, a STAT dataset, or scattered `CalcState` fields. It lives in `CalcState.eqn: EqnSession | null`.

```text
KeyEvent → reduce() → reduceEqn
                 ↓
           EqnSession (type, phase, coeffs, solutions)
                 ↓
           eqnSolve (decimal.js + existing Sym / Sym.cplx)
                 ↓
           SolutionSet (label + Sym per root/unknown)
                 ↓
           lcdModel → LCD
```

`reduce()` remains the orchestrator. Solver mathematics lives in `src/calc/eqnSolve.ts`, not inside `reduce()`. The current coefficient uses the COMP **editor** as a value slot (TABLE pattern). That is coefficient evaluation, not encoding the equation as a COMP AST.

---

## 2. Entering EQN — type selection

MODE `5` (`TARGET-OFFICIAL-DOC`; existing `MODE_BY_DIGIT`).

| Key | Family | Form | Coeff count | Order |
| --- | --- | --- | --- | --- |
| `1` | Simultaneous 2 unknowns | `anX + bnY = cn` | 6 | a1, b1, c1, a2, b2, c2 |
| `2` | Simultaneous 3 unknowns | `anX + bnY + cnZ = dn` | 12 | a1, b1, c1, d1, a2, …, d3 |
| `3` | Quadratic | `aX² + bX + c = 0` | 3 | a, b, c |
| `4` | Cubic | `aX³ + bX² + cX + d = 0` | 4 | a, b, c, d |

**Not on this target (`UNSUPPORTED-BY-HARDWARE`):** 4-unknown systems, quartic, INEQ. 115/C quadratic **vertex min/max** (X-Value Minimum / Y-Value Minimum) is **not** in the official HTML examples → **not implemented**; class **CROSS-MODEL-SOURCE** / **NEEDS-HUMAN-REVIEW**, not target VERIFIED.

Selecting a type opens the Coefficient Editor with **all coefficients 0** (`TARGET-OFFICIAL-DOC`: changing equation type zeros coefficients).

---

## 3. Coefficient Editor

| Behavior | Evidence | Class |
| --- | --- | --- |
| Structured cells, not free equation parsing | Official | TARGET-OFFICIAL-DOC |
| Change a cell: cursor + new input + `=` | Official | TARGET-OFFICIAL-DOC |
| AC in editor zeros **all** coefficients | Official | TARGET-OFFICIAL-DOC |
| Changing type zeros all coefficients | Official | TARGET-OFFICIAL-DOC |
| Unsupported: M−, STO, Pol, Rec, multi-statements | Official | TARGET-OFFICIAL-DOC |
| After values are as wanted, `=` solves | Official | TARGET-OFFICIAL-DOC |
| Fractions and √ in a cell (Ex3, Ex4) | Official examples | TARGET-OFFICIAL-DOC |
| Default displayed coefficient | 0 | TARGET-OFFICIAL-DOC (type change → 0) |
| Extra `=` after the last coefficient to solve | 115/C worked sequences (`2 =- 3 =- 6 ==`) | CROSS-MODEL-SOURCE |
| Clone: `=` commits and advances unless already on the last cell; `=` on last commits and stays; a further `=` with no new input solves | Fills the extra-`=` sequences | **INFERRED** |
| Arrow keys move between cells (one-at-a-time LCD) | Official “cursor keys”; clone is not a spreadsheet | **INFERRED** / **NEEDS-HUMAN-REVIEW** vs hardware grid |
| Coefficients are real scalars (`i` → Math ERROR) | EQN is not CMPLX mode | **INFERRED** |

Clone LCD (two lines, not a matrix): prompt `a1=` / `b=` / … on the expression line; current input or stored value on the result line.

---

## 4. Solving and solutions

| Behavior | Evidence | Class |
| --- | --- | --- |
| Further `=` shows the next solution | Official | TARGET-OFFICIAL-DOC |
| `=` on the **last** solution returns to the Coefficient Editor | Official | TARGET-OFFICIAL-DOC |
| Scroll solutions with up/down | Official HTML glyphs dropped (“A and D keys”); 115/C `c`/`f` | CROSS-MODEL-SOURCE; confirmation **NEEDS-HUMAN-REVIEW** |
| AC on any solution returns to the Coefficient Editor (coeffs kept) | Official | TARGET-OFFICIAL-DOC |
| Simultaneous linear solutions are **never** shown with √, even in MathO | Official | TARGET-OFFICIAL-DOC |
| ENG conversion is **not** available on the solution screen | Official | TARGET-OFFICIAL-DOC |
| SETUP CMPLX format (`a+bi` / `r∠θ`) applies to EQN solutions | Official setup chapter | TARGET-OFFICIAL-DOC |
| Solutions do **not** write Ans / A–F / X / Y / M | Official EQN page is silent | **INFERRED**; hardware **NEEDS-HUMAN-REVIEW** |
| Repeated quadratic root uses a single `X=` (not X1/X2) | Official Ex4 | TARGET-OFFICIAL-DOC |

Structured `SolutionSet`: `{ label, sym }[]` plus `solutionIndex`. Display is a projection. Do not store the only copy of a root as an LCD string.

---

## 5. Official worked examples (must-test)

HTML dropped many minus/fraction/√ glyphs. Signs follow equation text + 115/C key sequences. Glyph parity is **NEEDS-HUMAN-REVIEW**.

| ID | Family | Input | Result | Class |
| --- | --- | --- | --- | --- |
| Ex1 | lin2 | x+2y=3, 2x+3y=4 | X=`-1`, Y=`2` | TARGET-OFFICIAL-DOC |
| Ex2 | lin3 | x−y+z=2, x+y−z=0, −x+y+z=4 | X=`1`, Y=`2`, Z=`3` | TARGET-OFFICIAL-DOC (minuses from 115/C keys / equation text) |
| Ex3 | quad, MthIO-MathO | x²+x+3/4=0 | X1=`-1/2+(√2/2)i`, X2=`-1/2-(√2/2)i` (clone rectangular format) | TARGET-OFFICIAL-DOC |
| Ex4 | quad, MthIO-MathO | x²−2√2 x+2=0 | single `X=` `√2` | TARGET-OFFICIAL-DOC |
| Ex5 | cubic | x³−2x²−x+2=0 | X1=`-1`, X2=`2`, X3=`1` | TARGET-OFFICIAL-DOC |

Ex5 order is **not** sorted numerically. Clone cubic search tries rational roots by increasing magnitude, **negative first** at each magnitude, then the deflated quadratic with `(−b+√D)/(2a)` then `(−b−√D)/(2a)`. That reproduces Ex5. Other cubics: **NEEDS-HUMAN-REVIEW** vs hardware order.

---

## 6. Solver algorithms (not a CAS)

| Family | Algorithm | Domain | Degenerate |
| --- | --- | --- | --- |
| lin2 / lin3 | Gaussian elimination on `Sym` (exact rationals when inputs are rational) | Real coefficients | Inconsistent → `no-solution`. Dependent → `infinite`. |
| quad | `x = (−b ± √(b²−4ac)) / (2a)` via existing `symSqrt` / `packCplx` | `a ≠ 0` | `a=0` → Math ERROR (**INFERRED**). `D=0` → one `X=`. `D<0` → complex conjugate pair, X1 has `+√` imag. |
| cubic | Rational-root theorem (integer/rational coeffs) then deflate to quadratic. Else Newton on decimal.js then deflate. | `a ≠ 0` | `a=0` → Math ERROR (**INFERRED**). |

mathjs is **not** used. Complex roots reuse `Sym.cplx` (D-018). No second complex implementation. No silent JavaScript `Number` on solver results.

Linear display forces non-√ formatting even when a coefficient involved a surd (`TARGET-OFFICIAL-DOC`).

---

## 7. Errors

| Trigger | Clone result | Recovery | Class |
| --- | --- | --- | --- |
| Can't Solve Error / Variable ERROR | **Not used** (SOLVE feature only on official errors page) | n/a | TARGET-OFFICIAL-DOC |
| Inconsistent linear system | message `No Solution` | AC or `=` → editor | CROSS-MODEL-SOURCE (115/C E-36); official HTML omitted → **NEEDS-HUMAN-REVIEW** wording |
| Dependent linear system | message `Infinitely Many` | AC or `=` → editor | same |
| Zero leading polynomial `a` | Math ERROR | AC → editor | **INFERRED** / **NEEDS-HUMAN-REVIEW** vs hardware |
| Coefficient Syntax ERROR | Syntax ERROR | AC → same cell | COMP eval reuse |
| Coefficient overflow | Math ERROR | AC → editor | overlapping SRC-P97 range |
| `i` in a coefficient | Math ERROR | AC | **INFERRED** (real editor) |

Do not map every solver failure to Math ERROR.

---

## 8. MODE / AC / CLR / persist

| Event | Clone | Class |
| --- | --- | --- |
| MODE `5` | `eqn = emptyEqnSession()`, phase `type` | TARGET-OFFICIAL-DOC entry |
| Leave EQN | `eqn: null` | **INFERRED** (session is mode-scoped) |
| AC in type menu | stay on type | **INFERRED** |
| AC in editor | zero all coefficients, index 0 | TARGET-OFFICIAL-DOC |
| AC on solutions / message | return to editor, keep coeffs | TARGET-OFFICIAL-DOC / 115/C E-36 |
| CLR Setup / All | COMP; `eqn: null` | existing CLR |
| Persist | **Do not persist** EQN session. Schema stays **v1**. Reload in EQN → type select | **INFERRED** (same as TABLE/STAT). Hardware power-off **NEEDS-HUMAN-REVIEW** |
| SETUP from EQN | existing SETUP; CMPLX format applies to solutions | TARGET-OFFICIAL-DOC |

---

## 9. Display model

```text
EqnSession / SolutionSet  →  lcdModel  →  LCD
```

Screens: type list; coefficient prompt + value; solution label + value; no-solution / infinite messages; errors.

Not a desktop equation editor. Not a spreadsheet.

---

## 10. Scope

| Capability | Priority | Impl (this phase) | Ver |
| --- | --- | --- | --- |
| MODE `5` type 1–4 | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (docs + keys; not hardware) |
| lin2 / lin3 / quad / cubic official examples | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (source-derived; not hardware) |
| Complex quadratic pair via `Sym.cplx` | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | VERIFIED (Ex3 clone format) |
| CMPLX format on EQN solutions | REQUIRED-COMPLETE-CLONE | IMPLEMENTED | UNVERIFIED vs hardware polar |
| Vertex min/max | — | UNSUPPORTED | N/A (not on official HTML examples) |
| 4-UNK / quartic / INEQ | UNSUPPORTED-BY-HARDWARE | UNSUPPORTED | N/A |
| Physical differential | — | — | N/A |
| Live PWA | — | — | BLOCKED |

---

## 11. Architecture stress

1. COMP semantics: no change.
2. TABLE: no change.
3. BASE-N: no change.
4. CMPLX: reuse `Sym.cplx` / `resultFromSym` / `setup.complexFormat` only.
5. Dedicated `EqnSession`: yes.
6. Solver separate from reducer: yes (`eqnSolve.ts`).
7. Solutions structural (`label` + `Sym`): yes.
8. Complex solutions via existing `Sym.cplx`: yes.
9. `CalcState` gains one optional field (`eqn`), same pattern as `table` / `stat`.
10. STAT vs EQN: both session domains; STAT is a dataset, EQN is coefficients + solver. Not merged.
11. MATRIX/VECTOR can still follow the same additive session pattern.

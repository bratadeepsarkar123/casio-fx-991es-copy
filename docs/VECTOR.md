# VECTOR mode (fx-991ES PLUS 2nd edition)

**Decision:** D-022  
**Status:** IMPLEMENTED clone (2026-08-24)  
**Evidence authority:** `TARGET-OFFICIAL-DOC` Casio support HTML for fx-570ES PLUS / fx-991ES PLUS  
https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/vector_calculations.html  
Errors: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/errors.html  

**CROSS-MODEL-SOURCE (not the target printed book):** fx-115ES PLUS / 991ES PLUS C HTML + manualsdir PDF (E-41–E-43).  
**Do not** treat the 115/C PDF as the target manual.

**Physical hardware:** N/A. No `TARGET-MANUAL` / `EMPIRICAL` VECTOR claims.  
**GitHub Pages / PWA:** BLOCKED (unchanged).

VECTOR is an **additive register domain**, analogous to MATRIX (D-021), not a rewrite of MATRIX, COMP, TABLE, BASE-N, CMPLX, STAT, or EQN.

---

## 1. Target scope (`TARGET-OFFICIAL-DOC`)

Official VECTOR mode supports **2-dimensional and 3-dimensional** vectors only.

| Register | Role |
| --- | --- |
| VctA, VctB, VctC | User vectors |
| VctAns | Last vector result |

A register with no assigned dimension is **undefined**. Using it is **Dimension ERROR**.

### 1.1 Entry

1. `MODE` → VECTOR (clone: digit `8`; chassis SHIFT+`5` also selects VECTOR — `EMPIRICAL` keymap).
2. First assign: pick VctA/B/C → dimension `2` or `3` → enter components.
3. Later: VECTOR menu **Dim** (assign/change dimension) or **Data** (edit existing).
4. `AC` leaves the Vector Editor for the **vector calculation screen** (glyph dropped from HTML; clone uses COMP-like `Atom[]` with VECTOR tokens — `INFERRED` / `NEEDS-HUMAN-REVIEW` vs hardware).

### 1.2 Official examples (must-test)

| Ex | Content | Official result |
| --- | --- | --- |
| 1 | VctA=(1,2), VctB=(3,4), VctA+VctB | (4, 6) — printed vector dropped; reconstructed from 1+3, 2+4 |
| 2 | VctC=(2,−1,2) | stored |
| 3 | 3×VctA then 3×VctA−VctB via VctAns | (3,6) then (0,2) |
| 4 | VctA • VctB (Dot) | **11** (scalar) |
| 5 | VctA × VctB (cross; both 2D) | printed result dropped — see §4.2 |
| 6 | Abs(VctC) | **3** (Euclidean magnitude, **not** element-wise) |
| 7 | Angle via `cos⁻¹((A·B)/(|A||B|))`, Deg, Fix 3 | **10.305** |

### 1.3 VECTOR menu (`CROSS-MODEL-SOURCE` / `NEEDS-HUMAN-REVIEW` numbering)

115/C printed menu:

```text
1:Dim  2:Data  3:VctA  4:VctB  5:VctC  6:VctAns  7:Dot
```

After Dim/Data register pick, dimension:

```text
2 → 2D
3 → 3D
```

There is **no 1D** option. Do not treat key `1` as 2D.

### 1.4 Copy (`TARGET-OFFICIAL-DOC`)

Copy a displayed vector (editor or VctAns) with **STO** (SHIFT+RCL) to VctA/B/C. Not COMP letter STO.

### 1.5 VctAns (`TARGET-OFFICIAL-DOC`)

Vector results open the VctAns screen and store VctAns. From VctAns, `+ − × ÷` start a new calculation with VctAns and that operator (`CROSS-MODEL-SOURCE` names the four arithmetic keys).

### 1.6 Editor restrictions (`TARGET-OFFICIAL-DOC`)

Unsupported in Vector Editor: M−, STO (as COMP sto), Pol, Rec, multi-statements. 115/C also lists ÷R.

### 1.7 Angle (`TARGET-OFFICIAL-DOC`)

There is **no dedicated VECTOR Angle command**. Ex7 is a **user formula** on the calculation screen using Dot, Abs, division, and `cos⁻¹`. Zero-vector angle via that formula is **÷0 → Math ERROR**. Clone does **not** invent an Angle menu item.

### 1.8 Complex / MATRIX (`INFERRED` from silence)

Official VECTOR page does not mention `i` or matrices. Clone:

- rejects complex components (`Math ERROR`);
- does not mix MATRIX and VECTOR values.

---

## 2. Architecture

```text
KeyEvent
  → reduce()
       → VECTOR  VectorSession
                    ↓
                  vectorNumeric.ts   (Sym cells; no mathjs)
                    ↓
                  VectorValue | scalar Sym
                    ↓
                  lcdModel → LCD
```

| Must | Must not |
| --- | --- |
| Dedicated `VectorSession` / `VectorValue` | COMP `Atom[]` as the vector |
| Cells: `Sym[]` | `number[]` as authority |
| Algebra outside `reduce()` | Duplicate registers in LCD / persist |
| 2D and 3D only | Arbitrary JS-array length |
| Isolated from `MatrixSession` | Shared matrix/vector blob |

`reduce()` orchestrates. `vectorNumeric.ts` is the algebra. `vectorEval.ts` walks VECTOR calc expressions.

---

## 3. `VectorValue`

```ts
export type VectorDim = 2 | 3;
export type VctReg = "A" | "B" | "C" | "Ans";

export interface VectorValue {
  dim: VectorDim;
  cells: Sym[]; // length === dim
}
```

Empty cell in the editor means **0** (same as MATRIX / EQN).

---

## 4. Operations

All scalar arithmetic uses existing `Sym` / decimal.js (`add`, `sub`, `mul`, `div`, `abs`, `symSqrt`). **No** `Math.*` as calculator authority. **No** VECTOR-specific float policy.

| Op | Rule | Output | Evidence |
| --- | --- | --- | --- |
| + − | Same dimension | vector | TARGET-OFFICIAL-DOC Ex1 |
| scalar × vector | Scale every cell | vector | TARGET-OFFICIAL-DOC Ex3 |
| vector × vector | Cross product | vector | TARGET-OFFICIAL-DOC Ex5 |
| Dot | Same dimension; Σ aᵢbᵢ | **scalar** | TARGET-OFFICIAL-DOC Ex4 |
| Abs(vector) | √(Σ aᵢ²) | **scalar** | TARGET-OFFICIAL-DOC Ex6 |
| vector ÷ scalar | Scale by 1/s | vector | INFERRED |
| vector ÷ vector | | Dimension ERROR | INFERRED |
| mixed 2D/3D + − Dot | | Dimension ERROR | TARGET-OFFICIAL-DOC |
| vector + scalar | | Dimension ERROR | INFERRED |
| Complex cell | | Math ERROR | INFERRED |
| MATRIX mixing | | not implemented | INFERRED isolation |

### 4.1 Cross product 3D×3D (`TARGET-OFFICIAL-DOC` intent / standard)

```text
(a2 b3 − a3 b2,  a3 b1 − a1 b3,  a1 b2 − a2 b1)
```

### 4.2 Cross product 2D×2D (`INFERRED` / `NEEDS-HUMAN-REVIEW`)

Official Ex5 result vector is **dropped from HTML**. Clone embeds 2D vectors as (a1,a2,0) and returns the 3D result:

```text
VctA=(1,2), VctB=(3,4)  →  (0, 0, −2)
```

Mixed 2D×3D → **Dimension ERROR**. Confirm on hardware before promoting to VERIFIED.

### 4.3 Not implemented

- Dedicated angle command
- Vector powers
- Element-wise Abs (MATRIX does that; VECTOR Abs is magnitude)
- 1D / nD>3
- Complex components
- MATRIX↔VECTOR ops

---

## 5. `VectorSession`

```ts
export type VectorPhase =
  | "dim-reg"
  | "dim-size"
  | "data-reg"
  | "editor"
  | "calc"
  | "vctans"
  | "sto-dest";

export interface VectorSession {
  phase: VectorPhase;
  dimTarget: "A" | "B" | "C" | null;
  editorReg: VctReg | null;
  index: number; // 0-based component
  registers: {
    A: VectorValue | null;
    B: VectorValue | null;
    C: VectorValue | null;
    Ans: VectorValue | null;
  };
}
```

`CalcState.vector: VectorSession | null` — `null` outside VECTOR.

---

## 6. Persistence (`INFERRED`)

Official VECTOR page is silent. Clone **strips** `vector` on save (schema **v1**), same as TABLE / STAT / EQN / MATRIX. Reload in VECTOR → empty Dim menu.

CLR Setup/All → `vector: null`. CLR Memory → wipe VctA/B/C/Ans (`INFERRED`). Leave VECTOR → `vector: null` (`INFERRED` / `NEEDS-HUMAN-REVIEW` vs hardware).

---

## 7. Errors

| Error | Trigger | Recovery | Evidence |
| --- | --- | --- | --- |
| Dimension ERROR | undefined register; dim mismatch; vector used without Dim | AC | TARGET-OFFICIAL-DOC errors page (MATRIX/VECTOR only) |
| Math ERROR | ÷0 (incl. zero-vector in user angle formula); complex cell | AC | TARGET-OFFICIAL-DOC / INFERRED |
| Syntax ERROR | unknown calc atom; editor STO/Pol/Rec | AC | INFERRED |

Stack ERROR (“matrix or vector stack”) is **not** invented as a clone Insufficient MEM path.

---

## 8. Display

2-line LCD projection:

- Dim/Data menus: `1:VctA 2:VctB 3:VctC`
- Size: `2:2  3:3` (no `1`)
- Editor: `A1=` / component (or `Ans1=` on VctAns)
- Calc: `VctA`, `VctB`, `VctC`, `VctAns`, `Dot` (relabel of `vct-*` atoms)
- VECTOR menu: `1:Dim 2:Data 3:VctA 4:VctB 5:VctC 6:VctAns 7:Dot`

Hardware 7-row VctAns grid: `NEEDS-HUMAN-REVIEW`.

---

## 9. Architecture stress (VECTOR)

| Question | Answer |
| --- | --- |
| Did VECTOR require COMP rewrite? | No. Calc-screen atoms reuse COMP editor; equals intercepted. |
| TABLE / BASE-N / CMPLX / STAT / EQN / MATRIX rewrite? | No. |
| `VectorSession` independent? | Yes. |
| `VectorValue` ≠ `MatrixValue`? | Yes (`cells: Sym[]` vs `Sym[][]`). |
| Elements use existing `Sym`? | Yes. |
| Algebra outside `reduce()`? | Yes (`vectorNumeric.ts`). |
| Duplicated state? | No. LCD projects session. Persist strips. |
| CalcState unreasonably large? | One optional `vector` field, same pattern as `matrix`. |
| Domain pattern? | Expression (COMP/CMPLX), numeric (BASE-N), data (TABLE/STAT), solver (EQN), structured algebra (MATRIX + VECTOR). |

---

## 10. Verification

| Item | Status |
| --- | --- |
| Official Ex1–Ex7 math | VERIFIED vs official numbers / reconstructed Ex1 sum (Ex5 2D-cross INFERRED) |
| 2D cross (0,0,−2) | NEEDS-HUMAN-REVIEW (HTML dropped the vector) |
| Physical hardware | N/A |
| GitHub Pages / PWA | BLOCKED |
| COMP/TABLE/BASE-N/CMPLX/STAT/EQN/MATRIX | green (Vitest 336 / Playwright 33) |

Capability: VECTOR mode **REQUIRED-COMPLETE-CLONE** / **IMPLEMENTED** / **VERIFIED** for official Ex1–Ex4, Ex6, Ex7 (source-derived, not hardware). Ex5 2D-cross + persistence + VctAns layout remain NHR.

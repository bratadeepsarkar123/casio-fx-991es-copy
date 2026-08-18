# CMPLX numeric domain (D-018)

This document is the Layer-3 contract for CMPLX. Passing clone tests is **not** `TARGET-MANUAL` and is **not** hardware verification.

Official target HTML (`TARGET-OFFICIAL-DOC`):

https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/cmplx.html

The supplied 115/C PDF (`SRC-P56–57`) remains `CROSS-MODEL-SOURCE`. Menu item **numbering** (SHIFT+`2` → 1:arg 2:Conjg 3:r∠θ 4:a+bi) is taken from that overlap and is **not** promoted to `TARGET-MANUAL`.

---

## Architecture question

| Question | Answer |
| --- | --- |
| Where does a mathematical value live? | `Sym` in `src/calc/symbolic.ts`, then `ResultValue` for display/Ans |
| Exact vs approximate? | `rat` / `quad` / `pi` exact; `real` is decimal.js; complex parts reuse those |
| Where does complex enter? | New `Sym` variant `{ k: "cplx"; re; im }`. Not a COMP display hack. Not BASE-N. |
| Layers that must know complex | evaluator, `Sym` arithmetic, formatter, Ans (`ans`+`ansIm`), CMPLX menu |
| Layers unchanged | COMP AST/editor model (reuse `i` token + implied mul); TABLE overlay; BASE-N bigint; Zustand; `decimal.js` as real scalars |

**Did CMPLX require rewriting COMP?** No. COMP still throws Math ERROR on `i`. Complex arithmetic is used only when a `cplx` value exists, which COMP evaluation does not produce.

```
KeyEvent → reduce()
            ├─ COMP   Atom[] → evaluateAtoms → real Sym (i → Math ERROR)
            ├─ TABLE  same evaluator, mode ≠ CMPLX → i still Math ERROR
            ├─ BASE-N BaseNToken[] → bigint
            └─ CMPLX  same Atom[] / editor → evaluateAtoms with complexOk
                         ↓
                      Sym including cplx
                         ↓
                      formatter a+bi / r∠θ → Lcd
```

---

## Representation

```
Sym =
  | rat | quad | pi | real     ← existing real domain
  | { k: "cplx"; re: Sym; im: Sym }   ← rectangular; parts are real Sym
```

- Canonical form: **rectangular** `re + im·i`
- `im === 0` packs back to a real `Sym` (so `(1+i)²+(1-i)²` is `0`, not `0+0i`)
- JavaScript `Number` / `Math.*` are not the semantic authority
- `toDec(cplx)` with nonzero imag throws (does **not** coerce to a real)

Polar is a **display/input** of that rectangular value, not a second stored type.

---

## Input (reuse COMP AST)

| Input | How | Evidence |
| --- | --- | --- |
| `i` | ALPHA+ENG (`EMPIRICAL` chassis). Token `{ t: "sym", name: "i" }` already existed | Official examples use (i) |
| `3i` | existing implied multiplication (`3 × i`) | COMP implied-mul rules |
| `2+3i` | `2 + (3 × i)` | same |
| `2∠45` | SHIFT+`(-)` inserts binary `∠` (`EMPIRICAL` legend). In CMPLX: `r(cosθ + i sinθ)` | `TARGET-OFFICIAL-DOC` |
| `∠` in COMP | Math ERROR | `INFERRED` (CMPLX-only polar input) |

No CMPLX-only parser.

---

## Arithmetic (`TARGET-OFFICIAL-DOC` identities)

```
(a+bi)+(c+di) = (a+c)+(b+d)i
(a+bi)-(c+di) = (a-c)+(b-d)i
(a+bi)(c+di)  = (ac−bd)+(ad+bc)i
(a+bi)/(c+di) = ((ac+bd)+(bc−ad)i)/(c²+d²)
```

÷0 (including `0+0i`) → Math ERROR.

Integer powers and `x⁻¹` use the same operations (official `(1−i)⁻¹`, `(1+i)²`).

---

## Functions

| Function | CMPLX | COMP | Evidence |
| --- | --- | --- | --- |
| + − × ÷, `x²`, `x³`, `x⁻¹` | yes | real only | official examples |
| Abs (`SHIFT` hyp) | modulus `√(a²+b²)` | absolute value | official Abs(1+i)=√2 |
| arg | `atan2(b,a)` in current angle unit; −180° < θ ≤ 180° | Math ERROR (no complex) | official arg(1+i)=45 |
| Conjg | `a−bi` | n/a | official Conjg(2+3i)=2−3i |
| sin/cos/tan/log/ln/√ of non-real | **Math ERROR** | unchanged | not on official CMPLX page → **DEFERRED** |
| √ of negative real | Math ERROR (even in CMPLX) | Math ERROR | **INFERRED**; do not invent `√(−1)=i` without evidence |
| Pol/Rec/∫/Σ | Syntax ERROR (existing unimplemented) | same | — |

Do not coerce a complex argument through `toDec` into a real trig call.

---

## Display

Internal `cplx` → `formatComplex` → `ResultValue.display`. Formatter does not change the stored `Sym`.

Rectangular (`a+bi`, default SETUP):

| Value | Display |
| --- | --- |
| `2+3i` | `2+3i` |
| `3-i` | `3-i` |
| `5i` | `5i` |
| `-4i` | `-4i` |
| `i` / `-i` | `i` / `-i` |
| real | existing COMP format |

Polar (`r∠θ` SETUP or override command): `r∠θ` with θ in the current angle unit.

Linear Display “a and bi on separate lines”: **NEEDS-HUMAN-REVIEW**. Clone keeps the two-line HTML LCD (`expr` / `result`).

Abs templates keep infix `+` inside the absolute-value argument (so Abs(1+i) is `|1+i|`, not `|1|+i`). This is a small COMP-editor alignment; no prior COMP golden asserted the old exit-on-`+` behavior.

---

## Mode / memory / persist

| Event | Clone | Evidence |
| --- | --- | --- |
| MODE `2` | CMPLX; same editor as COMP | `TARGET-OFFICIAL-DOC` |
| MODE `1` | COMP; `i` again Math ERROR | official CMPLX-only |
| SETUP CMPLX | `1:a+bi` `2:r∠θ` (already existed) | `TARGET-OFFICIAL-DOC` |
| SHIFT+`2` in CMPLX | menu arg / Conjg / r∠θ / a+bi | commands official; numbering `CROSS-MODEL-SOURCE` **NHR** |
| Ans | `ans` = real part string; `ansIm` = imag part (`"0"` if real) | memories survive mode change: official. Split fields: `INFERRED` **NHR** |
| Variables | real strings; complex STO with nonzero imag → Math ERROR this phase | **PARTIAL** / **INFERRED** |
| Persist | schema v1; `ansIm` / `preAnsIm` optional, default `"0"` | documented default, not a version bump |

---

## Unresolved

- Complex STO/RCL of A–F
- Complex trig/log/sqrt
- LineIO two-line a / bi layout
- S⇔D vs polar/rect toggle
- PreAns imag across COMP
- Exact menu glyph/order vs hardware

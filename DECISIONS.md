# DECISIONS.md

Verification token for ICM session rules was acknowledged; this project is an autonomous clone build, not an ICM staged pipeline with human gates between phases.

## D-001 — Target variant vs supplied PDF

**Decision:** Implement **FX-991ESPLUS-2 / fx-991ES PLUS 2nd edition (417 functions)**. Use the supplied PDF for overlapping numerical/COMP behavior only where the target official ToC independently confirms the capability. Do **not** implement 115/C-only modes INEQ, VERIF, DIST.

**Why:** Hardware lock + official 570/991 2nd edition ToC. Supplied PDF cover is fx-115ES PLUS / fx-991ES PLUS C. Evidence classes: `docs/EVIDENCE_CLASSES.md`.

**Status:** Recorded. See `TARGET_SPEC.md`.

## D-002 — Editable math input: custom AST + cursor, not MathLive

**Decision:** Custom expression AST + path cursor (`src/calc/editor.ts`). MathLive was evaluated and rejected for v1.

**Why:** Input is exclusively calculator keys. MathLive’s editing model would become a competing source of semantics. KaTeX is not used as an editor. LCD rendering is structured HTML from the display model.

**MathLive self-hosting:** N/A (not used).

## D-003 — Numerical core: decimal.js only for scalars

**Decision:** `decimal.js` 10.6.0 is the only scalar numeric type that affects display. mathjs is a pinned dependency and is **not** used for COMP, CMPLX, STAT, EQN, MATRIX, or VECTOR evaluation. MATRIX and VECTOR cells are existing `Sym` values. Complex numbers are a first-class `Sym` variant (`k: "cplx"`), not mathjs.

**Internal digits:** 15 (SRC-P97). Display: 10+2. Range: ±1e-99 … ±9.999999999e99 (SRC-P97).
**π internal:** 3.14159265358980 (SRC-P36). **e internal:** 2.71828182845904 (SRC-P36).
**Rounding:** `ROUND_HALF_UP`. Tie-breaking vs hardware is `NEEDS HUMAN REVIEW` (manual says “rounded off” without a tie rule).

## D-004 — State: framework-independent reducer + Zustand view store

**Decision:** `reduce(state, KeyEvent) => CalcState` in `src/calc/machine.ts` is the source of truth. Zustand (`src/store.ts`) only holds and persists that state. Vitest exercises `reduce` without React.

## D-005 — LCD rendering: crisp HTML, not dot-matrix simulation

**Decision:** Vector/HTML Natural-ish rendering over the photographic LCD rectangle. **No claim of pixel-perfect dot-matrix authenticity** (Non-Goal).

## D-006 — Chassis photo + keymap.json

**Decision:** Official Casio FX-991ESPLUS-2BU product photo, cropped. Hit-zones in `public/keymap.json` as **percent of source image**. Shared `containedImageRect` for hit-testing and `?debug=true` overlay.

**Calibration status:** `NEEDS HUMAN REVIEW` (geometric fit; chat-attached original binary was not on disk).

## D-007 — TABLE default f(x) not f(x),g(x)

**Decision:** Target 991ES PLUS-2 TABLE follows official “from a Function” ToC; default `f(x)`. Supplied 115/C PDF initializes TABLE to `f(x),g(x)` — recorded as a variant conflict, not silently copied.

## D-008 — PWA base path

**Decision:** Vite `base` = `/casio-fx-991es-copy/` from Git remote `bratadeepsarkar123/casio-fx-991es-copy`.

## D-009 — Optional physical keyboard

**Decision:** Implemented as OPTIONAL-V1. `repeat === true` ignored. Map in `OPTIONAL_KEYBOARD_MAP`.

## D-010 — P1 modes

STAT/EQN/MATRIX/VECTOR: mode **entry** is implemented (MODE menu). TABLE f(x) is implemented (D-016). BASE-N integer domain is implemented (D-017). CMPLX extended numeric domain is implemented (D-018). STAT dataset + statistics domain is implemented (D-019). EQN coefficient solver is implemented (D-020). MATRIX register domain is implemented (D-021). VECTOR register domain is implemented (D-022). COMP P0 is the v1 floor.

## D-011 — Integration / Σ / SOLVE

Classified P2. Integration call token exists; Gauss-Kronrod fidelity is not VERIFIED. Chassis demo integral is presentation-only on the photo.

## D-012 — PreAns is cross-model, not target-confirmed

**Decision:** Keep PreAns **memory + evaluation** in the COMP engine (Fibonacci-style Ans+PreAns). Entry is **ALPHA+Ans** (`INFERRED`): SHIFT+Ans is DRG▶ on this chassis (`EMPIRICAL` keymap). Official target memory chapter lists Ans / variables / M only — **no PreAns**. 115/C SRC-P32–33 documents PreAns (`CROSS-MODEL-SOURCE`). TargetConfirm = `UNCONFIRMED`. Verification status `NEEDS-HUMAN-REVIEW`. Priority `OPTIONAL-V1`, not part of the functional-v1 VERIFIED floor.

## D-013 — No calculator-semantic IEEE-754 in `src/calc`

**Decision:** Remove `Number` / `.toNumber()` / `Math.*` from evaluation, roots, nPr/nCr, Ran#, special-angle reduction, and sci exponent formatting. Remaining `Math.min` / `Number(keyId)` / `Math.imul` are control-flow or 32-bit LCG state. See `docs/NUMERIC_AUDIT.md`.

## D-014 — M+ / STO execute the current expression

**Decision:** M+ / M− / STO evaluate the input expression when not already on a result, then update M or the variable, matching target official memory examples (`TARGET-OFFICIAL-DOC` 10×5 M+ → 50).

## D-015 — COMP-core freeze; mode work is additive

**Decision:** The COMP-core architecture is the baseline for later mode work and must **not** be replaced:

- `reduce` in `src/calc/machine.ts`
- custom AST + path cursor in `src/calc/editor.ts`
- `decimal.js` scalar policy (`src/calc/numeric.ts` / `symbolic.ts`)
- Zustand as a view/persist holder only (`src/store.ts`)

Future modes (TABLE first — see `docs/ARCHITECTURE.md` §12) must be **additive**: mode-owned screens/stores/handlers orchestrated by `reduce`. Do not introduce MathLive, a second parser, a second React source of truth, or IEEE-754 scalars.

**Persist:** `deserializeState` rejects nested state that fails the schema-v1 structural check (`isPersistedCalcState`). Corrupt localStorage falls back to `createInitialState`. New fields later bump `schemaVersion` or document a default.

**Why:** Architecture audit of the working COMP core found no P0 rewrite blocker. The remaining P1 risks (unbounded `call.name`, dual M, large `reduce` switch) are solvable inside this architecture. Replacing the core would discard golden coverage without enabling modes.

**Status:** Recorded. See `docs/ARCHITECTURE.md`.

## D-016 — TABLE is additive f(x) only; evaluate with a temporary X overlay

**Decision:** Implement TABLE as a `TableSession` on `CalcState` (`src/calc/table.ts`), orchestrated by `reduce` via `reduceTable`. Do **not** encode the grid as COMP `Atom[]`.

- **f(x) only.** Official 570/991 2nd-edition TABLE page and setup init list describe a single `f(x)` (no `f(x),g(x)`). Default Start=1, End=5, Step=1. `g(x)` is not implemented (SETUP item remains a 115/C leftover; D-007).
- **Reuse COMP AST + `evaluateAtoms`.** Row evaluation passes `{ X: x.toString() }` as a **temporary overlay**. Persistent `variables.X` is written only after a successful generation, to the last X (`TARGET-OFFICIAL-DOC`: generation changes X). **Ans is not modified** by generating a table (`INFERRED`).
- **End inclusive; Step > 0; End > Start.** Inclusive End is in the official example (−1 ≦ x ≦ 1). Zero/negative Step and End ≤ Start are **Argument ERROR** (`INFERRED` from “increment” + “End always greater than Start”; **NEEDS-HUMAN-REVIEW** vs hardware).
- **Max 30 X-values.** Official 570/991 TABLE page: more than 30 X-values “causes an error” (`TARGET-OFFICIAL-DOC`). The clone uses **Insufficient MEM Error**, the name in SRC-P92 / 115/C error catalog for this condition (`CROSS-MODEL-SOURCE`). Not `TARGET-MANUAL`.
- **AC on the table view** returns to the f(x) input (`TARGET-OFFICIAL-DOC`). Clone shows **one row at a time** on the existing two-line LCD (`INFERRED`; not a hardware pixel layout claim).
- **Per-row Math ERROR** keeps the table and shows the error in that row (`NEEDS-HUMAN-REVIEW`).
- **Persist:** TABLE session/rows are **not** saved. Schema stays v1; `table` is optional/null. Reload in TABLE mode returns an empty f(x) prompt. Hardware power-off TABLE behavior is **NEEDS-HUMAN-REVIEW**.
- **Forbidden in f(x):** Pol, Rec, ∫, d/dx, Σ (`TARGET-OFFICIAL-DOC`) → Syntax ERROR. This is TABLE-only, not a COMP `call.name` rewrite.

**Status:** Recorded.

## D-017 — BASE-N is a fixed-width integer domain, not COMP decimals

**Decision:** Implement BASE-N as an additive `BaseNState` (`src/calc/baseN.ts`, `src/calc/baseNNumeric.ts`) orchestrated by `reduce` via `reduceBaseN`. Do **not** display COMP `decimal.js` values as hex/bin/oct.

- **Domain:** signed two's-complement integers. **16-bit in BIN**, **32-bit in DEC/HEX/OCT** (`TARGET-OFFICIAL-DOC`). Canonical value is a signed `bigint`; display formats that word. JavaScript `Number` / `parseInt` are not the semantic authority.
- **Default:** MODE 4 enters DEC (`TARGET-OFFICIAL-DOC`). Chassis DEC/HEX/BIN/OCT keys (`x²` / `^` / `log` / `ln`) switch radix **without ALPHA** (`TARGET-OFFICIAL-DOC` + `EMPIRICAL` legends).
- **A–F:** unshifted in HEX; ALPHA+key otherwise (`INFERRED`; **NEEDS-HUMAN-REVIEW** vs hardware when HEX is not the current radix).
- **Grammar:** linear `BaseNToken[]`, not COMP `Atom[]`. No fractions/exponents (`TARGET-OFFICIAL-DOC`). Invalid **current-radix** digits are ignored at keypress (`INFERRED`). Digits illegal for a **suffix** (e.g. `2b`) → Syntax ERROR at `=`.
- **Arithmetic + − ×:** exact signed `bigint`; out of signed word range → Math ERROR. **Not** silent wrap. (**NEEDS-HUMAN-REVIEW** vs hardware wrap.)
- **÷:** integer, fractional part cut off toward zero (`TARGET-OFFICIAL-DOC` cut-off; toward-zero `INFERRED`).
- **Bitwise and/or/xor/xnor, Not, Neg:** mask to the **current** word width (`TARGET-OFFICIAL-DOC` examples). SHIFT+`3` (BASE) page 0 = logical ops (`CROSS-MODEL-SOURCE` FAQ 2=or); page 1 = d/h/b/o suffixes (`INFERRED` layout; commands `TARGET-OFFICIAL-DOC`).
- **Result display:** BIN 16-digit, OCT 11-digit, HEX 8-digit uppercase padded; DEC signed ASCII minus (`TARGET-OFFICIAL-DOC` examples).
- **Ans:** signed decimal string so COMP can reuse it after MODE 1 (`INFERRED`; memories survive mode change `TARGET-OFFICIAL-DOC`). BASE-N does not write COMP replay history.
- **Persist:** schema stays v1. Radix is kept; tokens/value stripped. Reload in BASE-N → empty input. **NEEDS-HUMAN-REVIEW** vs hardware power-off.
- **Shifts:** not on the official BASE-N page → **DEFERRED**, not stubbed as COMP operations.

**Status:** Recorded.

## D-018 — CMPLX is an extended numeric domain on `Sym`, not a COMP special case

**Decision:** Implement CMPLX by adding `{ k: "cplx"; re: Sym; im: Sym }` to `Sym` (`src/calc/symbolic.ts`, `src/calc/complex.ts`). Reuse the COMP AST/editor. Do **not** create a CMPLX-only parser, replace `decimal.js`, merge with BASE-N, or coerce complex values through `toDec` into `Math.*`.

- **Domain:** rectangular `a+bi`. Zero imag packs to a real `Sym`. Polar `r∠θ` is input (`polarToRect`) and display of that value, not a second stored type.
- **Entry:** MODE `2` (`TARGET-OFFICIAL-DOC`). ALPHA+ENG inserts existing `{ t: "sym", name: "i" }` (`EMPIRICAL` chassis). `3i` is implied multiplication (existing COMP rule). SHIFT+`(-)` inserts binary `∠` (`EMPIRICAL` legend).
- **COMP isolation:** `complexOk` is `state.mode === "CMPLX"`. COMP and TABLE still Math ERROR on `i` and `∠`.
- **Arithmetic:** + − × ÷, integer powers, `x⁻¹` on `Sym` parts (`TARGET-OFFICIAL-DOC` examples). ÷0 → Math ERROR.
- **Functions implemented:** Abs (modulus), arg, Conjg. SHIFT+`2` menu numbering `1:arg 2:Conjg 3:r∠θ 4:a+bi` is `CROSS-MODEL-SOURCE` (115/C) **NEEDS-HUMAN-REVIEW**.
- **Functions deferred:** sin/cos/tan/log/ln/√ of non-real → Math ERROR. √ of a negative real stays Math ERROR even in CMPLX (`INFERRED`; do not invent `√(−1)=i`).
- **Display:** formatter only; `2+3i`, `3-i`, `5i`, `-4i`, `i`/`-i`. Polar `r∠θ` with −180° < θ ≤ 180°. LineIO separate a/bi lines **NEEDS-HUMAN-REVIEW**.
- **Memory:** `ans`/`ansIm` and `preAns`/`preAnsIm`. Complex STO/M+ of nonzero imag → Math ERROR this phase (**PARTIAL**).
- **Persist:** schema stays v1. `ansIm`/`preAnsIm` optional, default `"0"`.
- **Did CMPLX rewrite COMP?** No.

**Status:** Recorded. See `docs/CMPLX.md`.

## D-019 — STAT is a dedicated dataset domain, not COMP AST

**Decision:** Implement STAT as an additive `StatSession` on `CalcState` (`src/calc/stat.ts`, `src/calc/statNumeric.ts`) orchestrated by `reduce` via `reduceStat`. Do **not** encode the dataset as COMP `Atom[]`, a TABLE session, or a serialized expression.

- **Types:** MODE `3` then 1–8: 1-VAR, A+BX, _+CX2, ln X, e^X, A•B^X, A•X^B, 1/X (`TARGET-OFFICIAL-DOC`).
- **Limits:** 80 X-only; 40 X+FREQ or X+Y; 26 X+Y+FREQ (`TARGET-OFFICIAL-DOC`). Do not copy 115/C 40/20/26.
- **FREQ:** SETUP Stat Format (`setup.statFreq`). Changing it deletes STAT data (`TARGET-OFFICIAL-DOC`). Empty FREQ defaults to 1 (official Ex2). Non-integer / ≤0 FREQ is Argument ERROR (`INFERRED`).
- **Editor:** numeric cell buffer; `=` commits and moves down the same column (`CROSS-MODEL-SOURCE`); DEL deletes the line; STAT Edit Ins / Del-A (`TARGET-OFFICIAL-DOC`). Not the COMP AST editor.
- **Wipe:** exit STAT, 1-VAR ↔ paired, Stat Format change (`TARGET-OFFICIAL-DOC`). Same-family type change (A+BX → ln X) keeps data (official Ex3).
- **Calc screen:** AC from editor (`TARGET-OFFICIAL-DOC`). SHIFT+`1` STAT menu inserts commands; `=` uses existing `evaluateEquals`. Dataset entry does not write Ans (`INFERRED`).
- **Numeric:** decimal.js only. σx uses n in the denominator (Ex2). OLS / transformed OLS / 3×3 quadratic. P(t)=Φ(t) via erf series (Ex5). Q/R from 115/C diagrams (`INFERRED`).
- **Persist:** schema stays v1. STAT session stripped. Reload in STAT → type select. Hardware power-off **NEEDS-HUMAN-REVIEW**.
- **Unsupported on this target:** Q1/Med/Q3 (115/C only). Separate DIST mode remains `UNSUPPORTED-BY-HARDWARE`.
- **Did STAT rewrite COMP / TABLE / BASE-N / CMPLX?** No.

**Status:** Recorded. See `docs/STAT.md`.

## D-020 — EQN is a dedicated coefficient solver, not COMP evaluation

**Decision:** Implement EQN as an additive `EqnSession` on `CalcState` (`src/calc/eqn.ts`, `src/calc/eqnSolve.ts`) orchestrated by `reduce` via `reduceEqn`. Do **not** encode the equation as a COMP `Atom[]` polynomial, merge it into COMP evaluation, or use `Can't Solve Error` (SOLVE-only on the official errors page).

- **Types:** MODE `5` then 1–4: 2-UNK, 3-UNK, quadratic, cubic (`TARGET-OFFICIAL-DOC`). No 4-UNK, quartic, INEQ, or 115/C vertex min/max.
- **Editor:** structured coefficient cells. COMP editor is the current cell only (fractions / √ required by official Ex3/Ex4). AC zeros all coefficients. STO / Pol / Rec / M+ / colon ignored.
- **Solve:** extra `=` after the last coefficient (`CROSS-MODEL-SOURCE` sequences; **INFERRED** `readyToSolve`).
- **Solutions:** `{ label, sym }[]` plus index. Linear never uses √ display. Quadratic/cubic may be real or `Sym.cplx`. CMPLX format applies. Repeated quadratic root is a single `X=`.
- **Numeric:** existing `Sym` / decimal.js / `packCplx`. Linear Gaussian elimination. Quadratic formula. Cubic rational-root (negative-first) then deflate; Newton fallback.
- **Errors:** inconsistent → `No Solution`; dependent → `Infinitely Many` (115/C E-36; wording **NHR**). Leading `a=0` → Math ERROR (**INFERRED**).
- **Ans/vars:** solutions do not write Ans or A–F/X/Y (**INFERRED** / **NHR**).
- **Persist:** schema stays v1. EQN session stripped. Reload in EQN → type select. Hardware power-off **NEEDS-HUMAN-REVIEW**.
- **Did EQN rewrite COMP / TABLE / BASE-N / CMPLX / STAT?** No.

**Status:** Recorded. See `docs/EQN.md`.

## D-021 — MATRIX is a dedicated register domain, not COMP AST

**Decision:** Implement MATRIX as an additive `MatrixSession` on `CalcState` (`src/calc/matrix.ts`, `src/calc/matrixNumeric.ts`, `src/calc/matrixEval.ts`) orchestrated by `reduce` via `reduceMatrix`. Do **not** encode matrices as COMP `Atom[]`, `number[][]`, expression strings, `Sym.mat`, or mathjs values. Do **not** implement VECTOR, Ref, or Rref in this phase.

- **Registers:** MatA, MatB, MatC, MatAns (`TARGET-OFFICIAL-DOC`). Max **3×3**, including rectangular 1×n / n×1 / 2×3 / 3×2.
- **Enter:** MODE `6` then Dim register + size 1–9 (`CROSS-MODEL-SOURCE` numbering / **NHR**). SHIFT+`4` is the MATRIX key (`EMPIRICAL` keymap).
- **Editor:** one cell at a time; COMP editor is the current cell. Blank = 0. AC → calc (keep registers; **INFERRED** / **NHR**).
- **Calc:** insert MatA/B/C/Ans, det, Trn via MATRIX menu. `=` runs `evaluateMatrixExpr`. Matrix results open MatAns; det is a scalar.
- **Numeric:** existing `Sym` / decimal.js. Explicit add/sub/mul/scale/det/inverse/transpose/x²/x³/Abs. mathjs unused.
- **Errors:** unspecified dim / incompatible dims → Dimension ERROR (`TARGET-OFFICIAL-DOC`). Singular inverse → Math ERROR (**INFERRED**). Complex entries rejected.
- **Persist:** schema stays v1. MATRIX session stripped. Reload in MATRIX → dim-reg. Hardware power-off **NEEDS-HUMAN-REVIEW**.
- **Unsupported on this target:** Ref/Rref (115/C HTML only). VECTOR is a separate domain (D-022), not part of MATRIX.
- **Did MATRIX rewrite COMP / TABLE / BASE-N / CMPLX / STAT / EQN?** No.

**Status:** Recorded. See `docs/MATRIX.md`.

## D-022 — VECTOR is a dedicated register domain, not COMP AST and not MATRIX

**Decision:** Implement VECTOR as an additive `VectorSession` on `CalcState` (`src/calc/vector.ts`, `src/calc/vectorNumeric.ts`, `src/calc/vectorEval.ts`) orchestrated by `reduce` via `reduceVector`. Do **not** encode vectors as COMP `Atom[]`, `number[]`, expression strings, `Sym.vec`, `MatrixValue`, or mathjs values. Do **not** implement a dedicated Angle command, vector powers, or MATRIX↔VECTOR mixing.

- **Registers:** VctA, VctB, VctC, VctAns (`TARGET-OFFICIAL-DOC`). Dimensions **2 and 3 only**.
- **Enter:** MODE `8` then Dim register + size `2`/`3` (`CROSS-MODEL-SOURCE` numbering / **NHR**). SHIFT+`5` opens the VECTOR menu while already in VECTOR (`EMPIRICAL` chassis legend; not a global COMP mode-switch).
- **Editor:** one component at a time; COMP editor is the current cell. Blank = 0. AC → calc (keep registers; **INFERRED** / **NHR**).
- **Calc:** insert VctA/B/C/Ans and Dot via VECTOR menu. `×` of two vectors is **cross product**. Abs(vector) is **Euclidean magnitude**. `=` runs `evaluateVectorExpr`. Vector results open VctAns; Dot/Abs/angle-formula are scalars (update Comp Ans).
- **Numeric:** existing `Sym` / decimal.js. Explicit add/sub/scale/dot/cross/abs. mathjs unused. 2D×2D cross → `(0,0,a1b2−a2b1)` (**INFERRED** / **NHR**; official Ex5 printed vector dropped).
- **Angle:** user formula `cos⁻¹((A·B)/(|A||B|))` with global Deg/Rad/Gra. No VECTOR Angle menu item.
- **Errors:** unspecified dim / incompatible dims → Dimension ERROR (`TARGET-OFFICIAL-DOC`). Complex components → Math ERROR (**INFERRED**).
- **Persist:** schema stays v1. VECTOR session stripped. Reload in VECTOR → dim-reg. Hardware power-off **NEEDS-HUMAN-REVIEW**.
- **MATRIX / CMPLX:** isolated. No matrix-vector ops. No `i` in components.
- **Did VECTOR rewrite COMP / TABLE / BASE-N / CMPLX / STAT / EQN / MATRIX?** No.

**Status:** Recorded. See `docs/VECTOR.md`.

## Risk register

See `RISK_REGISTER.md`.

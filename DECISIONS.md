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

**Decision:** `decimal.js` 10.6.0 is the only scalar numeric type that affects display. mathjs is a pinned dependency for possible matrix/complex structure later and is **not** used for COMP scalar evaluation.

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

STAT/EQN/MATRIX/VECTOR/CMPLX: mode **entry** is implemented (MODE menu). Full subsystem editors remain `PARTIAL` / not VERIFIED. TABLE f(x) is implemented (D-016). BASE-N integer domain is implemented (D-017). COMP P0 is the v1 floor.

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

## Risk register

See `RISK_REGISTER.md`.

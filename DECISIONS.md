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

STAT/EQN/MATRIX/VECTOR/CMPLX/BASE-N/TABLE: mode **entry** is implemented (MODE menu). Full subsystem editors are `PARTIAL` / not VERIFIED. COMP P0 is the v1 floor.

## D-011 — Integration / Σ / SOLVE

Classified P2. Integration call token exists; Gauss-Kronrod fidelity is not VERIFIED. Chassis demo integral is presentation-only on the photo.

## D-012 — PreAns is cross-model, not target-confirmed

**Decision:** Keep PreAns **memory + evaluation** in the COMP engine (Fibonacci-style Ans+PreAns). Entry is **ALPHA+Ans** (`INFERRED`): SHIFT+Ans is DRG▶ on this chassis (`EMPIRICAL` keymap). Official target memory chapter lists Ans / variables / M only — **no PreAns**. 115/C SRC-P32–33 documents PreAns (`CROSS-MODEL-SOURCE`). TargetConfirm = `UNCONFIRMED`. Verification status `NEEDS-HUMAN-REVIEW`. Priority `OPTIONAL-V1`, not part of the functional-v1 VERIFIED floor.

## D-013 — No calculator-semantic IEEE-754 in `src/calc`

**Decision:** Remove `Number` / `.toNumber()` / `Math.*` from evaluation, roots, nPr/nCr, Ran#, special-angle reduction, and sci exponent formatting. Remaining `Math.min` / `Number(keyId)` / `Math.imul` are control-flow or 32-bit LCG state. See `docs/NUMERIC_AUDIT.md`.

## D-014 — M+ / STO execute the current expression

**Decision:** M+ / M− / STO evaluate the input expression when not already on a result, then update M or the variable, matching target official memory examples (`TARGET-OFFICIAL-DOC` 10×5 M+ → 50).

## Risk register

See `RISK_REGISTER.md`.

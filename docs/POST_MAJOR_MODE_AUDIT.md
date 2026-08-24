# Post-major-mode architecture and conformance audit

**Phase:** post-implementation audit, not a feature phase.  
**Target:** FX-991ESPLUS-2 / fx-991ES PLUS 2nd edition.  
**Supplied PDF:** fx-115ES PLUS / fx-991ES PLUS C — evidence class `CROSS-MODEL-SOURCE`, never `TARGET-MANUAL`.  
**Decision recorded:** D-023.

This audit answers: now that all seven major target modes exist, is the architecture coherent, are the verification claims honest, and what should be done next?

**Framing (non-negotiable):**

> All seven major target modes are implemented and source-verified; hardware differential verification, visual sign-off, and live PWA verification remain outstanding.

Do **not** read `REQUIRED-COMPLETE-CLONE 7/7 VERIFIED` as “100% hardware clone”.

| Label | Status |
| --- | --- |
| Major-mode source verification | **7/7** (COMP floor + TABLE, BASE-N, CMPLX, STAT, EQN, MATRIX, VECTOR) |
| Hardware differential verification | **N/A** |
| Target-manual verification | **limited by source availability** (`TARGET-MANUAL` = none of the supplied PDF) |
| Visual verification | **NEEDS-HUMAN-REVIEW** |
| Live deployment verification | **BLOCKED** (`C-P0-PWA`) |

---

## 1. Current architecture

The calculator is a **pure `reduce(state, KeyEvent) → CalcState` machine** with a React/PWA projection. Zustand holds one `CalcState`, injects `Date.now()`, and writes localStorage. React does not own semantics.

```
INPUT (pointer / optional keyboard / tests)
  → KEY/EVENT NORMALIZATION (KeyId)
  → STATE ORCHESTRATION (reduce)
  → DOMAIN DISPATCH (mode / menu)
  → DOMAIN STATE / SESSION
  → DOMAIN EVALUATION
  → SHARED NUMERICAL/VALUE SYSTEMS (Sym, decimal.js, bigint)
  → DISPLAY MODEL (lcdModel)
  → PERSISTENCE (schema v1 envelope)
  → REACT / LCD / CHASSIS UI
```

**Frozen core (D-015), still in force:**

- `reduce` in `src/calc/machine.ts`
- custom AST + path cursor in `src/calc/editor.ts`
- `decimal.js` scalars + `Sym` in `src/calc/numeric.ts` / `symbolic.ts`
- Zustand as view/persist holder only (`src/store.ts`)

Modes were added **additively**. No domain replaced the core.

mathjs is pinned and **unused** in `src/`. Do not start using it for deferred functions.

---

## 2. Domain map

Layer table (files, authority, React?, headless-testable?). Full file-level map also lives in `docs/ARCHITECTURE.md` §14.

| Layer | Source files | Responsibility | Authoritative state | Depends on | React? | Headless-testable? |
| --- | --- | --- | --- | --- | --- | --- |
| Input | `src/App.tsx`, `src/ui/Chassis.tsx`, `src/calc/keys.ts`, `public/keymap.json` | Pointer/keyboard → `KeyId` | none (events only) | keymap percents | yes (chassis) | keymap/coords tests; e2e overlay |
| Key/event normalization | `src/calc/keys.ts` | `KeyEvent { keyId, source, nowMs? }` | event object | none | no | yes |
| State orchestration | `src/calc/machine.ts` `reduce` | power, auto-off, latches, menus, MODE, memory, when to eval | `CalcState` | domain handlers | no | yes (`dispatchKeys`) |
| Domain dispatch | `reduce` + `handleMenu` | route by `mode` / `menu.kind`; null = fall through | `CalcState.mode`, `menu` | domain modules | no | yes |
| Domain state / session | `types.ts` + `table.ts` / `baseN.ts` / `stat.ts` / `eqn.ts` / `matrix.ts` / `vector.ts` | phase, local data, cursor | session fields on `CalcState` | editor for current slot where reused | no | yes |
| Domain evaluation | `evaluate.ts`, `baseNNumeric.ts`, `statNumeric.ts`, `eqnSolve.ts`, `matrixEval.ts`, `matrixNumeric.ts`, `vectorEval.ts`, `vectorNumeric.ts`, `table.ts` (X overlay) | compute values / errors | `Sym` / bigint / `ResultValue` / structured values | numeric + symbolic | no | yes |
| Shared numerical/value | `numeric.ts`, `symbolic.ts`, `complex.ts`, `format.ts`, `specialTrig.ts` | decimal.js, Rat, `Sym`, range, errors | `Dec` / `Sym` | decimal.js | no | yes |
| Display model | `src/ui/lcdModel.ts` (+ domain `*Text` helpers) | strings + indicators from `CalcState` | none (derived) | `CalcState` | no | yes |
| Persistence | `src/calc/persist.ts` | envelope serialize/deserialize | localStorage `fx991es-plus2/v1` | `CalcState` shape | no | yes |
| React / LCD / chassis | `src/store.ts`, `src/App.tsx`, `src/ui/Lcd.tsx`, `src/ui/Chassis.tsx`, `src/ui/feedback.ts`, `src/main.tsx` | paint + hitboxes + sound | store copy of `CalcState` | lcdModel, keymap | yes | e2e only |

### Domain comparison

| Domain | State | Parser/editor | Numeric representation | Evaluator | Display | Persistence |
| --- | --- | --- | --- | --- | --- | --- |
| COMP | `editor` + `result` / `ans` | COMP `Atom[]` + path cursor | `Sym` + decimal.js | `evaluate.ts` | `atomsToLinear` / `result.display` | keep editor/result/history |
| TABLE | `TableSession` | COMP editor for f(x)/range | COMP `Sym` + temporary X overlay | COMP `evaluateAtoms` | one-row `table-view` | **strip** session |
| BASE-N | `BaseNState` (always present) | `BaseNToken[]` (not `Atom[]`) | signed `bigint` 16/32-bit | `baseNNumeric.ts` | padded BIN/OCT/HEX/DEC | keep **radix**; strip tokens/value |
| CMPLX | same COMP editor | COMP `Atom[]` + `i` / `∠` | `Sym.cplx` rectangular | `evaluate.ts` `complexOk` | `a+bi` / `r∠θ` formatter | keep editor; `ansIm`/`preAnsIm` |
| STAT | `StatSession` | cell **strings**, not AST | decimal.js dataset | `statNumeric` via `stat-*` | editor cells + calc labels | **strip** session |
| EQN | `EqnSession` | COMP editor as **current coeff only** | `Sym` / `cplx` | `eqnSolve.ts` | structured `{label,sym}` | **strip** session |
| MATRIX | `MatrixSession` | COMP editor as **current cell** | `MatrixValue` (`Sym[][]`) | `matrixNumeric` / `matrixEval` | one-cell LCD | **strip** session |
| VECTOR | `VectorSession` | COMP editor as **current component** | `VectorValue` (`Sym[]`, dim 2\|3) | `vectorNumeric` / `vectorEval` | one-cell LCD | **strip** session |

### Legitimate commonality

- `KeyEvent` / `reduce` orchestration / MODE menu
- COMP editor reused as the **current slot** (TABLE f(x), EQN coeff, MATRIX cell, VECTOR component)
- Shared error **codes** (`Math ERROR`, `Syntax ERROR`, `Dimension ERROR`, …)
- Display model + LCD projection
- Persist envelope + schema-v1 shape check
- Test convention: `dispatchKeys` + goldens with `evidenceClass`

### Legitimate specialization (keep)

- BASE-N `bigint` (must not be decimal.js hex)
- STAT dataset rows
- EQN solver (not COMP polynomial AST)
- MATRIX `MatrixValue` vs VECTOR `VectorValue` (different dims, ops, registers)
- CMPLX `complexOk` gate on the same AST

### Suspicious duplication (do not merge unless stated)

| Item | Verdict |
| --- | --- |
| `BaseNSyntaxError` / `BaseNMathError` vs `CalcSyntaxError` / `CalcMathError` | **P2.** Recovery uses `.code`. Leave. |
| MATRIX vs VECTOR session/editor/menu shape | **Intentional.** Similar UX, different algebra. No `SessionBase`. |
| `matrixEval.ts` vs `vectorEval.ts` | **Intentional.** Parallel expression walkers over different value types. Consolidation would couple domains. |
| Domain `*Text` helpers used by `lcdModel` | **Harmless.** Display projection, not a second evaluator. |

### Suspicious coupling

| Item | Class | Action this phase |
| --- | --- | --- |
| VECTOR imported `CalcDimensionError` from `matrixNumeric.ts` | **P1** dependency | **Fixed:** class moved to `numeric.ts`; MATRIX/VECTOR re-export |
| STAT commands evaluated inside COMP `evalCall` | **Intentional** with gate (`isStatCallName` + `statType`) | Leak tests added |
| `mat-*` / `vct-*` are free `call.name` strings | **P1** type risk; key-driven leak blocked by MODE wipe | Documented; injection tests added; **no typed-union refactor** |
| EQN/MATRIX/VECTOR reuse COMP editor for the current cell | **Intentional** | Keep. Cells are not nested COMP matrices/vectors |
| UI mutating domain state | **None found** | Store calls `reduce` only |

---

## 3. State audit (`CalcState`)

Authoritative type: `src/calc/types.ts`. One object. ~30 fields. Large but **not incoherent**: globals + nullable sessions + UI latches.

### A. Persistent / global calculator state

`schemaVersion`, `power`, `mode`, `setup`, `ans`/`preAns`/`ansIm`/`preAnsIm`, `variables`, `memoryM`, `history` (COMP/CMPLX), `rngSeed`, `baseN.radix`.

### B. Domain-local transient sessions

`table`, `stat`, `eqn`, `matrix`, `vector` (nullable; stripped on serialize). `baseN.tokens` / `baseN.value` (stripped; radix kept). Current-slot `editor` in TABLE/BASE-N/STAT/EQN/MATRIX/VECTOR (stripped on serialize).

### C. UI / display-only state

`shift` / `alpha` / `hyp`, `menu`, `screen`, `resultDecimal` (S⇔D latch), `lastActivityMs`. LCD strings are **not** stored.

### D. Derived

`lcdExpression` / `lcdResult` / `lcdIndicators`. Must not be persisted separately. They are not.

### Duplication classification

| Pair | Class | Notes |
| --- | --- | --- |
| `ans` vs `result` | **intentional** | `ans` is memory (formatted 10-digit approx); `result` is last display value; AC clears `result`, keeps `ans` |
| `resultDecimal` vs `result.naturalKind` | **intentional** | S⇔D toggle tracking |
| `ansIm` / `preAnsIm` vs `result.complex` | **intentional** | memory vs last result |
| `memoryM` vs `variables.M` | **intentional / P1 hygiene** | dual-written on M+/STO/CLR (D-013/D-014). Not must-fix |
| domain session + `result` | **intentional** | MatAns/VctAns/EQN solutions keep semantic values in the session; `result` is the current cell projection |
| display strings on `ResultValue` | **intentional** | formatter output, not a second calculator |
| `screen.kind === "result"` with `result === null` | **risky** (type-allowed impossible state) | persist shape check does not forbid it; not observed from `reduce` |
| `shift && alpha` | **harmless** | handlers clear the other latch; persist could set both |

**Must-fix duplications:** none found.

`CalcState` is large because the product is large. Splitting into a nested `domains` object would be cosmetic. **Do not split in this phase.**

---

## 4. Reducer audit

`src/calc/machine.ts` is **1049** lines. `reduce()` starts at line 595. `handleMenu()` is ~270 lines of SETUP/MODE/CLR/STO/RCL.

**Pattern is still:**

```
reduce()
  → power / auto-off
  → handleMenu (delegates STAT/MATRIX/VECTOR/BASE-N menus)
  → latches
  → mode handlers (null = fall through)
  → shared COMP key switch
```

Mode-owned handlers: `reduceTable`, `reduceBaseN`, `reduceStat`, `reduceEqn`, `reduceMatrix`, `reduceVector`. BASE-N does not fall through into COMP editing. TABLE/EQN/MATRIX/VECTOR fall through for MODE / some COMP keys by design.

**Hidden side effects inside `reduce`:** none. Time is `event.nowMs`. RNG is `rngSeed`. Persistence is the store.

**Duplicated event handling:** AC / MODE / SHIFT+AC appear in domain handlers (return `null` to let `reduce` own them). That is the fall-through contract, not a bug.

**Can one more deferred feature be added without making `reduce()` significantly harder?**

**Yes**, if it is:

- a new `evalCall` case (Σ, d/dx, ∫ tokens already insert), or
- a new additive session following the existing `return null` pattern.

**No rewrite.** `reduce` is large because COMP keys live there. Splitting the COMP key switch into `reduceComp` is optional **P2** and not required before deferred evalCall work.

Minimum refactor if COMP key-switch pain becomes real: extract `reduceCompKeys(state, event)` and keep a single `reduce` entry. Do **not** introduce a plugin registry.

---

## 5. Numerical audit

Policy: D-003, D-013, `docs/NUMERIC_AUDIT.md`. Re-audited after VECTOR.

**Authorities:**

| Domain | Authority |
| --- | --- |
| COMP / TABLE / CMPLX / EQN / MATRIX cells / VECTOR cells | `Sym` + decimal.js |
| STAT | decimal.js only |
| BASE-N | signed `bigint`, explicit width |
| Complex | `Sym.cplx` rectangular; polar is input/display |

**Calculator-semantic `Number` / `.toNumber()` / `parseFloat` / `Math.*` in eval:** **none** found.

Remaining classified uses:

| Use | Class |
| --- | --- |
| `Math.min` / `Math.max` cursor, menu page, contrast, replay | 1 UI/control |
| `Number(keyId)` Fix/Sci digits | 2 bounded |
| `Math.imul` LCG | 2 bounded integer control |
| `matrixFromInts` / `vectorFromInts` `Number.isInteger` | 2/4 test helpers |
| `src/ui` layout `Math.*` | 1 must not feed `reduce` |

`symbolic.ts` / `complex.ts` throw generic `Error("math"|"div0")`. `evaluateAtoms` maps those to `CalcMathError`. **P2**, not a float leak.

**`call.name` numerical leak:** injected `mat-*` / `vct-*` / `stat-*` in COMP → Syntax ERROR (tests in `src/calc/call-name-gate.test.ts`). STAT names that pass `isStatCallName` still require `statType` + `statRows`.

**`Sym` after all modes:** still a **shared scalar** (`rat` \| `quad` \| `pi` \| `real` \| `cplx`). Not a catch-all: matrices/vectors/STAT rows are **not** `Sym` variants. Verdict: **A. clean shared value representation.** Do not add `Sym.mat` / `Sym.vec`.

---

## 6. Structured-domain audit

| Session | phase | local data | cursor | calc |
| --- | --- | --- | --- | --- |
| `TableSession` | fx/start/end/step/view | f(x) atoms + rows | `rowIndex` | COMP eval overlay |
| `StatSession` | type/editor/calc | `rows[]` strings | row/col + `input` | `stat-*` via COMP eval |
| `EqnSession` | type/editor/solutions/message | `coeffs[]` + `solutions[]` | `coeffIndex` / `solutionIndex` | `eqnSolve` |
| `MatrixSession` | dim/data/editor/calc/matans/sto | registers A/B/C/Ans | `row`/`col` | `matrixEval` |
| `VectorSession` | dim/data/editor/calc/vctans/sto | registers A/B/C/Ans | `index` | `vectorEval` |
| `BaseNState` | (no phase enum) | tokens + radix + value | token index | `evaluateBaseN` |

Similarities are **semantic** (Casio multi-screen modes) more than accidental copy-paste. MATRIX and VECTOR are the closest pair; they must stay separate (dims, cross vs mul, Mat vs Vct names, no mix ops).

**Share:** error codes, COMP slot editor, persist-strip convention, `reduceX` null fall-through, Dimension ERROR class (now in `numeric.ts`).

**Do not share:** a `SessionBase` class, a generic grid widget, MATRIX↔VECTOR algebra.

---

## 7. Persistence audit

Envelope `{ schemaVersion: 1, savedAt, state }` at `fx991es-plus2/v1`. `isPersistedCalcState` is a **shape** check (required fields, known `mode`, setup enums). It does **not** deep-validate `Atom` trees. Old COMP envelopes that omit `table`/`stat`/`eqn`/`matrix`/`vector` still load. Missing `ansIm`/`preAnsIm` default `"0"`. Corrupt → `createInitialState`. Deserialize **overwrites** sessions from `mode` (injected blobs do not survive).

Web refresh always powers **on** and strips domain sessions (`INFERRED`; hardware power-off **NHR**).

| State | AC | MODE | Refresh (clone) | Power-off (in-session) | CLR Memory | CLR All |
| --- | --- | --- | --- | --- | --- | --- |
| Ans | keep | keep | keep | keep (SHIFT+AC) | zero | zero |
| Variables | keep | keep | keep | keep | zero | zero |
| M | keep | keep | keep | keep | zero | zero |
| PreAns | keep | zero except COMP/CMPLX | keep | keep | zero | zero |
| History | keep | clear | keep (COMP) | keep | keep | clear (via CLR Setup) |
| Setup | keep | keep | keep | keep | keep | reset + COMP |
| TABLE | return to f(x) (`TARGET-OFFICIAL-DOC`) | new empty session | **strip** (`INFERRED` / NHR) | keep until reload | **keep session** (NHR) | drop (mode→COMP) |
| STAT | editor→calc (`TARGET-OFFICIAL-DOC`) | new type-select | **strip** (NHR) | keep until reload | **keep session** (NHR) | drop |
| EQN | zeros coeffs (`INFERRED`) | new type-select | **strip** (NHR) | keep until reload | **keep session** (NHR) | drop |
| MATRIX | calc, keep registers (`INFERRED` / NHR) | new empty session | **strip** (NHR) | keep until reload | **wipe registers** (`INFERRED`) | drop |
| VECTOR | calc, keep registers (`INFERRED` / NHR) | new empty session | **strip** (NHR) | keep until reload | **wipe registers** (`INFERRED`) | drop |
| BASE-N tokens | clear input | new DEC | strip tokens; keep radix | keep until reload | keep radix (`INFERRED`) | DEC + COMP |

**Do not invent hardware behavior** to make this table uniform. CLR Memory wiping MATRIX/VECTOR registers but not STAT/EQN/TABLE is **P1 NHR** — document, do not “fix” without source/hardware.

Serialization cannot currently resurrect a stripped session on load. Schema stays v1.

---

## 8. Error audit

| Error | Where defined | Who throws |
| --- | --- | --- |
| `CalcMathError` | `numeric.ts` | COMP/CMPLX/STAT/EQN/MATRIX/VECTOR |
| `CalcSyntaxError` | `numeric.ts` | COMP eval default; TABLE forbidden calls; BASE-N via own class `.code` |
| `CalcArgumentError` | `numeric.ts` | TABLE range; RanInt; STAT FREQ (`INFERRED`) |
| `CalcStackError` | `numeric.ts` | reserved |
| `CalcDimensionError` | **`numeric.ts` (D-023)** | MATRIX + VECTOR |
| `BaseNSyntaxError` / `BaseNMathError` | `baseNNumeric.ts` | BASE-N only; same `.code` strings |
| EQN `No Solution` / `Infinitely Many` | `eqn.ts` messages (not `ErrorCode`) | EQN only; **not** `Can't Solve Error` (SOLVE-only) |

Recovery: AC clears; left/right restore `errorIndex`. Domain handlers intercept error screens first.

**Do not move Base-N classes** for aesthetics. Generic `Error("math")` in `symbolic.ts` is **P2** (already mapped).

---

## 9. Display audit

Pipeline holds:

```
domain state → semantic result (Sym / MatrixValue / VectorValue / ResultValue)
  → lcdModel strings → Lcd.tsx
```

No calculations in `Lcd.tsx`. `lcdModel` relabels `stat-*` / `mat-*` / `vct-*` for LCD text only. S⇔D toggles stored `ResultValue`; it does not re-evaluate.

Mode-specific DOM: none. Chassis is one overlay. Contrast is CSS filter.

MATRIX/VECTOR one-cell LCD vs hardware grid: **NHR** (not a semantic bug).

---

## 10. Testing audit

| Kind | What it proves | Gap |
| --- | --- | --- |
| Unit numeric | domain algebra (decimal.js / bigint / Sym) | none material |
| Reducer/state | KeyEvent → session/mode | COMP `call.name` injection now covered |
| Golden JSON (25 fixtures) | key sequences + semantic expected + evidence fields | COMP bulk goldens are inline `SRC-P*` in `golden/acceptance.test.ts`, not JSON |
| E2E Playwright | Chromium / Pixel 7 / iPad-**sized** Chromium | **not** iOS Safari; **not** live Pages |
| Persist | strip/migrate/reject | Atom trees still unchecked |

**Duplication:** JSON goldens are also asserted in domain `golden/*.test.ts` and `golden/fixtures.test.ts`. Harmless; do not delete.

**Brittle:** LCD string equality for Natural Display. Acceptable when paired with semantic fields (TABLE rows, MatAns grid, EQN labels).

**Implementation-detail tests:** editor path codes, LCG. Keep.

**Do not inflate count.** High-value addition this phase: COMP domain-token gate (not more goldens of the same examples).

---

## 11. Evidence audit

JSON fixtures (25) generally record `id`, `sourceEvidenceId`, `evidenceClass`, `targetConfirm`, `keys`, and expected semantic state. Mode official examples cite the Casio HTML URL. COMP `GT-P22-EX1` is `CROSS-MODEL-SOURCE` with `CONFIRMED` overlap.

BASE-N JSON fixtures have `evidenceClass` / `targetConfirm` but **no HTML `source` URL** (documentation gap, **P2**).

COMP `golden/acceptance.test.ts` titles cite `SRC-P*` — that is provenance in the test name, not a structured field. A passing test is **clone behavior**, not `TARGET-MANUAL`, not physical hardware.

`VERIFIED` in `CAPABILITY_MATRIX.md` means Impl `IMPLEMENTED` **and** Ver `VERIFIED` against **source** (official HTML and/or overlapping 115/C pages with target ToC confirmation). It does **not** mean hardware.

---

## 12. Capability audit

### A. Major target modes (source-verified implementations)

COMP (functional-v1 floor) + TABLE, BASE-N, CMPLX, STAT, EQN, MATRIX, VECTOR.

`REQUIRED-COMPLETE-CLONE` rows: **7/7 VERIFIED as source-derived**.

### B. Deferred functions (do not implement this phase)

| ID | Capability | Impl | Class |
| --- | --- | --- | --- |
| C-P2-INT | ∫ | PARTIAL (token) | HIGH RISK numeric |
| C-P2-DIFF | d/dx | PARTIAL (token) | HIGH RISK numeric |
| C-P2-SUM | Σ / Π | PARTIAL (Σ token) | HIGH RISK numeric / template |
| C-P2-SOLVE | CALC/SOLVE | UNSUPPORTED | NEEDS ARCHITECTURAL PREP |
| (BASE-N) | bit shifts | not stubbed | LOW PRIORITY |
| (CMPLX) | non-real trig/log/√ | Math ERROR | HIGH RISK / LOW PRIORITY |
| (CMPLX) | complex STO A–F | PARTIAL | READY small, NHR |
| (TABLE) | g(x) | not on this target | LOW PRIORITY |

### C. Unsupported-by-hardware

INEQ, VERIFY, DIST, STAT Q1/Med/Q3, MATRIX Ref/Rref, 4-UNK / quartic EQN.

### D. Human verification

Visual keymap, rounding ties, power-off persistence of sessions, menu numbering, VECTOR 2D×2D cross printed result, EQN wording, LineIO a/bi layout, PreAns on target chassis.

---

## 13. Deferred-feature inventory

Do **not** implement these here.

| Capability | Target evidence | Architectural dependencies | Complexity | Numerical risk | Fits now? | Should implement? | Class |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Σ | ToC + 115/C SRC-P42; `CROSS-MODEL-SOURCE` + CONFIRMED capability | `evalCall("Σ")`; Natural Display template already inserted | Medium | Overflow, integer bounds, display vs hardware | evalCall only | Yes, as its own phase after a numeric policy note | **NEEDS ARCHITECTURAL PREP** (template/eval) / **HIGH RISK** display |
| d/dx | ToC + SRC-P41 | `evalCall("diff")`; step-size policy | Medium–high | Finite difference vs hardware | evalCall | Separate phase; write policy first | **HIGH RISK** |
| ∫ | ToC + SRC-P39 | `evalCall("int")`; quadrature | High | Gauss-Kronrod fidelity **UNVERIFIED** | token exists | Only after numeric design | **HIGH RISK** |
| Π | grouped with SUM in matrix | may need new token | Medium | similar to Σ | unclear chassis | Only if target ToC independently lists it | **LOW PRIORITY** until confirmed |
| CALC/SOLVE | ToC + SRC-P47–51 | new interactive session (not EQN) | High | solver + Can't Solve | EQN pattern reusable as **inspiration only** | Later phase | **NEEDS ARCHITECTURAL PREP** |
| BASE-N shifts | not on official BASE-N page | `BaseNToken` | Low | wrap vs error | yes | Optional | **LOW PRIORITY** / **NHR** |
| Complex STO | memories survive; no CMPLX STO example | machine STO path | Low | imag in A–F | yes | Small follow-up | **READY** with **NHR** |
| Non-real trig | deferred D-018 | `Sym.cplx` | High | branch cuts | yes numerically, no evidence | No | **HIGH RISK** / **LOW PRIORITY** |

---

## 14. Deployment status

Local (this architecture): Vite `base` `/casio-fx-991es-copy/`; PWA plugin `registerType: "prompt"`; `start_url`/`scope` = base; Workbox `navigateFallback` `${base}index.html`; relative assets (`keymap.json`, `assets/…`); `registerSW({ immediate: true })` in `src/main.tsx`; CI workflow builds and **would** deploy `dist/` from `main` when Pages exists.

**Live origin:** `GET /repos/bratadeepsarkar123/casio-fx-991es-copy/pages` → **404**.

**`C-P0-PWA = BLOCKED`** until the actual deployed origin is tested (install, offline, update prompt). Do not claim GitHub Pages is live. Runtime self-host via `npm run preview` is local-only evidence.

---

## 15. Visual-verification status

`public/keymap.json`: 50 keys, percent-of-source-image, boxes in 0–100%, shared `containedImageRect` for overlay and hit-test, allowed d-pad overlaps only. `?debug=true` outlines boxes.

**`C-NHR-CAL = NEEDS-HUMAN-REVIEW`.** The original chat-attached photo binary is not on disk. Geometric tests are **not** visual sign-off against the hardware or the original overlay photo.

---

## 16. Architecture scorecard

| Area | Status | Severity | Explanation |
| --- | --- | --- | --- |
| State architecture | **GREEN** | — | One `CalcState`; sessions isolated; duplications classified intentional |
| Reducer architecture | **YELLOW** | P2 | Large orchestrator; still mode-dispatch; extract COMP keys later if needed |
| AST/editor | **YELLOW** | P1 | Solid cursor model; `call.name` remains a free `string` |
| Numerical engine | **GREEN** | — | No semantic IEEE-754 leak found; `Sym` still scalar-only |
| Domain isolation | **GREEN** | — | After moving `CalcDimensionError`; MATRIX ⊭ VECTOR algebra |
| Structured sessions | **GREEN** | — | Intentional parallel pattern; no `SessionBase` |
| Persistence | **YELLOW** | P1 NHR | Shape check; Atom trees unchecked; CLR Memory policy not uniform across sessions |
| Errors | **GREEN** | P2 leftover | Shared codes; Base-N duplicate classes harmless |
| Display | **GREEN** | — | Projection only |
| Evidence/provenance | **YELLOW** | process | Classes exist; 7/7 easy to misread; COMP goldens mostly inline |
| Testing | **GREEN** | — | Gate proves source behavior; not hardware |
| Deployment | **RED** | P0 product | Live PWA **BLOCKED** (Pages not enabled) — not an architecture defect |
| Maintainability | **YELLOW** | P2 | Large files (`machine`/`stat`/`matrix`/`vector`); coherent enough for additive work |

RED is **deployment verification**, not a reason to redesign the calculator core.

---

## 17. P0 / P1 / P2 findings

### P0

- **None in the calculator architecture.**
- **Product P0:** live PWA verification remains **BLOCKED** (cannot be fixed in code).

### P1 (fixed this phase)

- VECTOR → MATRIX import of `CalcDimensionError`. **Fixed:** class lives in `numeric.ts`.
- Unbounded `call.name` with no COMP injection tests. **Mitigated with tests**, type still free (see open P1).

### P1 (open; document, do not broad-refactor)

- `call.name: string` — a typed union is **not** low-risk enough this phase (touches editor, evaluate, STAT/MATRIX/VECTOR insert, goldens). MODE wipe + eval default Syntax ERROR + leak tests are the current gate.
- Persist does not deep-validate `Atom` trees.
- CLR Memory wipes MATRIX/VECTOR registers but not STAT/EQN/TABLE (`INFERRED` / **NHR**). Do not unify without evidence.
- Dual `memoryM` / `variables.M` hygiene (keep dual-write).

### P2

- Duplicate BASE-N error classes
- Generic `Error("math")` in `symbolic.ts`
- `reduce` COMP key-switch extraction
- BASE-N golden fixtures missing HTML `source` URL
- `atomsToLinear` living in `editor.ts`
- Chassis click path vs `hitTest` (tests/debug)
- ENG `void shifted`

### NHR / INFERRED (selected)

Listed in `RISK_REGISTER.md` and capability rows. Unchanged: rounding ties, visual keymap, session persist vs hardware power-off, VECTOR Ex5 2D cross, menu numbering, PreAns on target.

---

## 18. Final decision gate

> **Is the current architecture stable enough to begin implementing deferred functions without a major redesign?**

### YES — ready

Conditions (already true):

1. Follow D-015: do not replace `reduce`, AST, decimal.js, `Sym`, `MatrixValue`, `VectorValue`.
2. New COMP functions extend `evalCall` (or a dedicated session if they are not COMP expressions).
3. Write a numeric policy note **before** ∫ / d/dx / Σ, matching `docs/NUMERIC_AUDIT.md`.
4. Do not treat free `call.name` as a long-term API — gate names in the evaluator; consider a typed union in a later hygiene phase.
5. Do not start with live-PWA or visual-calibration claims as prerequisites for Σ.

### Ranked next three deferred candidates (do not implement now)

Scored by value × source confidence × implementation risk × architectural fit × testing difficulty (lower risk / better fit ranks higher).

1. **Σ (summation)** — High educational value; target ToC confirms the capability; token already inserts; fits `evalCall`; testing can follow official examples. Risk: Natural Display template + integer bounds vs hardware (**HIGH RISK** numeric/display, not a redesign).
2. **d/dx** — Same insertion path; official examples exist; needs an explicit step-size/rounding policy before code. Higher numerical risk than Σ.
3. **∫** — Same insertion path; highest numerical risk (quadrature vs hardware). Implement only after a written integration policy. **Do not** silently use mathjs.

**Not #1–3:** CALC/SOLVE (new session UX), Π until independently confirmed on this target, complex non-real trig, BASE-N shifts.

---

## 19. Recommended next phases

1. **Human / ops (parallel, not code):** enable GitHub Pages and perform live PWA checks; visual keymap sign-off if the reference image is available; optional hardware differential if a unit appears.
2. **Deferred COMP functions phase:** Σ first, with numeric policy + goldens + evidence classes. Then d/dx. Then ∫.
3. **Hygiene (optional, after a function or before SOLVE):** typed `call.name` union; optional `reduceCompKeys` extract; persist Atom-tree validation if injection becomes a threat model.
4. **CALC/SOLVE phase:** new session, reuse EQN lessons, do not overload EQN.

**Do not:** merge MATRIX/VECTOR, replace `Sym`, introduce mathjs evaluation, implement 115/C-only modes, or claim hardware equivalence.

---

## Primary questions (explicit answers)

1. Domain architecture coherent? **Yes.**
2. `CalcState` too large/incoherent? **Large, coherent. Do not split now.**
3. `reduce()` unmaintainable? **Heavy, still the right orchestrator.**
4. Semantics separated from UI? **Yes.**
5. `call.name` a real correctness risk? **Yes, P1 type risk; key-driven leak blocked; injection tests added.**
6. Error definitions appropriate? **Yes after D-023 move.**
7. Numerical semantics centralized? **Yes.**
8. Persistence coherent? **Mostly; session CLR policy is NHR-inconsistent.**
9. Sessions follow a pattern? **Yes, intentional, not a base class.**
10. Scalar domains separated? **Yes (COMP decimal, BASE-N bigint, CMPLX `cplx`).**
11. `Sym` still right? **Yes, as shared scalar.**
12. MATRIX vs VECTOR separate? **Yes, correctly.**
13. Duplicated abstractions to share? **Dimension ERROR class (done). Not algebra.**
14. Look reusable but must stay separate? **MATRIX/VECTOR eval; BASE-N tokens; STAT rows.**
15. Evidence vs counts consistent? **Yes if 7/7 is labeled source-verified.**
16. “7/7 complete-clone” honest? **Only as source verification of major modes; this doc forbids hardware-clone reading.**
17. Tests prove claims? **They prove clone source behavior, not hardware.**
18. Hidden cross-mode regression? **MODE wipe + domain isolation; remaining risk is free `call.name` + persist atoms.**
19. Ready for deferred functions? **Yes, without major redesign.**
20. Ready for deployment? **Code/PWA artifacts yes; live origin no (`BLOCKED`).**
21. Next engineering phase? **Σ (with policy), not a rewrite; Pages enablement is ops.**

---

## Gate (this audit revision, actually run)

| Suite | Result |
| --- | --- |
| `npm ci` | pass |
| Vitest | **353 passed** (31 files); includes 17 new `call-name-gate` tests; `persist.test.ts` 17 passed; COMP goldens 30 passed |
| `tsc --noEmit` | pass |
| production build | pass — Workbox precache **15**; manifest scope `/casio-fx-991es-copy/` |
| Playwright | **33 passed** (Chromium / Pixel 7 / iPad-sized Chromium — **not** iOS Safari) |
| GitHub Pages | **404** — `C-P0-PWA` remains BLOCKED |

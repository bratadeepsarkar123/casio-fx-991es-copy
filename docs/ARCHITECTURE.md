# Architecture (COMP-core baseline)

This document describes the **current** fx-991ES PLUS 2nd edition clone as a system. It is an audit of the working COMP-core, not a redesign proposal.

**Target:** FX-991ESPLUS-2 / fx-991ES PLUS 2nd edition.
**Supplied PDF:** fx-115ES PLUS / fx-991ES PLUS C 2nd-edition guide — evidence class `CROSS-MODEL-SOURCE`, never `TARGET-MANUAL`. See `docs/EVIDENCE_CLASSES.md`.

**Frozen core (D-015):** `reduce` + custom AST/cursor editor + decimal.js scalars + Zustand as a view/persist holder. Do not replace these to start later modes.

TABLE domain contract: D-016. BASE-N domain contract: `docs/BASE_N.md` (D-017). CMPLX domain contract: `docs/CMPLX.md` (D-018). STAT domain contract: `docs/STAT.md` (D-019). EQN domain contract: `docs/EQN.md` (D-020). MATRIX domain contract: `docs/MATRIX.md` (D-021). VECTOR domain contract: `docs/VECTOR.md` (D-022).

Post-major-mode conformance audit (all seven modes present): `docs/POST_MAJOR_MODE_AUDIT.md` (D-023). That document is the architecture/evidence scorecard. It is **not** a complete-clone or hardware-equivalence claim.

---

## 1. System overview

The calculator is a **pure state machine** with a React/PWA shell.

```
pointer / optional keyboard / test
        ↓  KeyEvent { keyId, source, nowMs? }
   reduce(state, event)     src/calc/machine.ts   ← sole semantic authority
        ↓
        ├─ COMP: editor AST → evaluateAtoms → real Sym (`i` → Math ERROR)
        ├─ TABLE: TableSession + COMP evaluator (X overlay; `i` still Math ERROR)
        ├─ BASE-N: BaseNToken[] → evaluateBaseN → w-bit bigint
        ├─ CMPLX: same Atom[] / editor → evaluateAtoms with complexOk → Sym including cplx
        ├─ STAT: StatSession dataset → statNumeric / STAT evalCall names → ResultValue
        ├─ EQN: EqnSession coefficients → eqnSolve → SolutionSet (`Sym` / `Sym.cplx`)
        ├─ MATRIX: MatrixSession registers → matrixNumeric / matrixEval → MatrixValue | Sym
        └─ VECTOR: VectorSession registers → vectorNumeric / vectorEval → VectorValue | Sym
        ↓
   lcdModel → Lcd.tsx / Chassis.tsx
```

TABLE reuses `evaluateAtoms`; it is not a third numeric domain. BASE-N does **not** reuse COMP decimals. CMPLX reuses the COMP AST/editor and extends `Sym`; it does **not** rewrite COMP. STAT does **not** store the dataset as COMP `Atom[]`; the Statistics Editor is a dedicated cell buffer. STAT calc-screen commands are additive `call.name` values evaluated only when `mode === "STAT"`. EQN does **not** encode the equation as a COMP polynomial AST; the COMP editor is reused only as the current coefficient slot. MATRIX does **not** encode registers as COMP `Atom[]` or `number[][]`; calc-screen `mat-*` tokens name registers, they are not nested matrix ASTs. VECTOR does **not** encode registers as COMP `Atom[]`, `number[]`, or `MatrixValue`; calc-screen `vct-*` tokens name registers.

Zustand (`src/store.ts`) holds one `CalcState`, injects `Date.now()` into events, and writes localStorage. React does not implement calculator semantics.

**What this clone is:** a hardened COMP-mode foundation plus **TABLE f(x)**, **BASE-N** (integer domain), **CMPLX** (extended numeric domain), **STAT** (dataset + statistics domain), **EQN** (coefficient-entry solver), **MATRIX** (register + dimension editor), and **VECTOR** (2D/3D register + dimension editor). All major target modes in the official ToC (COMP…VECTOR) are implemented.
**What this clone is not:** a complete clone of every optional/deferred function. Live PWA install/offline is **UNVERIFIED** (origin now serves `dist/`). Visual keymap D-pad signed off 2026-08-24. Physical hardware equivalence is **N/A**.

---

## 2. Layer responsibilities

| Layer | Authority | Must not |
| --- | --- | --- |
| Input | Translate pointer/keyboard to `KeyId` | Compute results, mutate AST, persist |
| State machine | `reduce`: latches, menus, power, mode, memory, when to edit/eval | Format LCD HTML, read `Date.now()` internally (time is injected) |
| Editor / AST | Insert/delete/move; `Atom[]` + path cursor | Evaluate, format Norm/Fix, know React |
| Evaluator | Walk AST → `Sym`; range/error; `complexOk` only in CMPLX | Paint UI; persist |
| Numerical / symbolic | decimal.js + bigint rationals + exact special-angle table + rectangular `cplx` | IEEE-754 `Number`/`Math.*` on displayed values; coercing `cplx` through `toDec` |
| Display model | `lcdExpression` / `lcdResult` / `lcdIndicators` from `CalcState` | Dispatch keys; calculate |
| UI | Chassis hitboxes, LCD HTML, click sound | Own a second `CalcState` |
| Persistence | Serialize/deserialize envelope; reject corrupt shapes | Change COMP arithmetic |

**Leakage found (classified, not mass-refactored):**

| Finding | Class | Notes |
| --- | --- | --- |
| UI `Math.*` in `coords.ts` / `Lcd.tsx` / `Chassis.tsx` | not a leak | Layout only; must not feed `reduce` |
| Golden tests import `lcdModel` | not a leak | Pure projection; no DOM |
| Chassis click uses positioned `<button>`s, `hitTest()` is tests/debug | P2 | Two paths to the same percent math |
| `atomsToLinear` lives in `editor.ts` | P2 | Display helper next to the editor |
| Unimplemented `call.name` tokens (`Pol`, `Rec`, `int`, `diff`, `Σ`) | P1 | Insert now; eval → Syntax ERROR |
| ALPHA ENG inserts `i`; COMP eval → Math ERROR; CMPLX eval → `cplxI()` | P1 closed for CMPLX (D-018); COMP unchanged | Token reused; value type is `Sym.cplx` |
| `memoryM` dual-written with `variables.M` | P1 hygiene | Synced on M+/STO/CLR |
| Persist previously spread unchecked nested state | P1, **fixed this pass** | `isPersistedCalcState` |
| `reduce` is one large key switch | P1 for mode work | Keep as orchestrator; add mode-owned handlers later — do not split now |
| ENG key computes a shift then `void shifted` | P2 | Reformats Sci n=4 only |

No P0 layer-leakage that would force a COMP-core rewrite.

---

## 3. State model

Authoritative type: `CalcState` in `src/calc/types.ts`.

### Authoritative fields

| Field | Role |
| --- | --- |
| `schemaVersion` | Persist contract (currently `1`) |
| `power` | `"on"` \| `"off"` |
| `mode` | COMP plus seven target modes (TABLE, BASE-N, CMPLX, STAT, EQN, MATRIX, VECTOR implemented) |
| `setup` | Angle, I/O, Fix/Sci/Norm, fraction, CMPLX/STAT/TABLE format, Rdec, decimal mark, contrast |
| `shift`, `alpha`, `hyp` | Latches. SHIFT and ALPHA clear each other. HYP is sticky until a consuming key |
| `editor` | `root: Atom[]`, `cursor`, `insertMode` |
| `screen` | `input` \| `result` \| `error` \| `replay` \| `off` \| `table-view` |
| `result` | Last `ResultValue` or `null` (cleared by AC) |
| `resultDecimal` | Tracks S⇔D natural vs decimal |
| `ans`, `preAns` | Independent memories (strings of formatted approx). Real part of Ans. |
| `ansIm`, `preAnsIm` | Imaginary parts as decimal strings. `"0"` when real. Optional on persist (default `"0"`). |
| `variables` | A–F, M, X, Y as decimal strings |
| `memoryM` | Independent M (also mirrored into `variables.M`) |
| `history` | Up to 40 `{ expression, result }` replay entries |
| `menu` | SETUP/MODE/CLR/STO/RCL/… overlay; `{ kind: "none" }` when idle |
| `lastActivityMs` | Auto-off clock |
| `rngSeed` | Deterministic Ran# / RanInt |
| `baseN` | Additive BASE-N session: `radix`, linear `tokens`, `cursor`, canonical signed `value`. Not COMP `Atom[]`. |
| `table` | Additive TABLE session (`null` outside TABLE). Grid is **not** COMP `Atom[]`. |
| `stat` | Additive STAT session (`null` outside STAT). Dataset rows are decimal **strings**, not COMP `Atom[]`. |
| `eqn` | Additive EQN session (`null` outside EQN). Coefficient cells + structured solutions. Not a COMP polynomial AST. |
| `matrix` | Additive MATRIX session (`null` outside MATRIX). MatA/B/C/Ans as `MatrixValue` (`Sym` cells). Not COMP `Atom[]`. |
| `vector` | Additive VECTOR session (`null` outside VECTOR). VctA/B/C/Ans as `VectorValue` (`Sym` cells, dim 2\|3). Not COMP `Atom[]`, not `MatrixValue`. |

### Derived (never persist separately)

`lcdExpression`, `lcdResult`, `lcdIndicators` — functions of `CalcState`.

### Persisted

The entire `CalcState` inside envelope `{ schemaVersion: 1, savedAt, state }` at localStorage key `fx991es-plus2/v1`.

On load: nested state must pass `isPersistedCalcState`; `power` is forced `"on"`; `lastActivityMs` is reset; if the saved `power` was `"off"`, `screen` becomes `{ kind: "input" }`. **TABLE session/rows are stripped on serialize** (D-016). **BASE-N tokens/value are stripped; radix is kept** (D-017). **STAT session/rows are stripped** (D-019). **EQN session is stripped** (D-020). **MATRIX session/registers are stripped** (D-021). **VECTOR session/registers are stripped** (D-022). Missing `ansIm` / `preAnsIm` default to `"0"` (D-018; schema stays v1). A saved TABLE mode rehydrates to an empty f(x) prompt. A saved BASE-N mode rehydrates to an empty integer input in the saved radix. A saved STAT mode rehydrates to the type-select screen. A saved EQN mode rehydrates to the type-select screen. A saved MATRIX mode rehydrates to Dim register select. A saved VECTOR mode rehydrates to Dim register select. COMP envelopes that omit `table` / `stat` / `eqn` / `matrix` / `vector` or use radix-only `baseN` still load.

### Transient

SHIFT/ALPHA/HYP, open `menu`, `nowMs` on the event, click audio/haptic. `DispatchOptions.random` exists on the type and is **unused** (RNG is `rngSeed` + `createUint32Rng`).

### Must not be duplicated

- Do not store LCD strings on `CalcState`.
- Do not keep a React copy of the editor.
- `ans` vs `result.approx`: related but not the same. `ans` survives AC; `result` does not. `ans` is the 10-digit formatted approx, not the exact rational.

### Determinism

`reduce(state, event)` is pure given `event.nowMs` and `rngSeed`. Hidden I/O exists only in the store: `Date.now()`, `localStorage`. Tests inject `nowMs`.

Same state + same event ⇒ same next state.

### Impossible states the type still allows

- `screen.kind === "result"` with `result === null`
- Non-COMP `mode` still carrying a COMP `editor.root` (MODE currently clears the editor; corrupt persist could reintroduce this — shape check does not deep-validate atoms)
- `shift && alpha` (key handlers clear the other latch; persist could set both)
- `menu.kind === "hyp"` while HYP is actually the `hyp` boolean latch

These are not COMP rewrite blockers. Persist now rejects missing required fields and unknown `mode` strings (including 115/C-only `"INEQ"`).

---

## 4. Event flow

Physical overlay: `public/keymap.json` percent boxes → `Chassis` absolutely positioned buttons → `App.onKey` (sound/haptic) → `store.dispatch({ keyId, source: "pointer" })`.

Optional keyboard: `OPTIONAL_KEYBOARD_MAP` in `App` (`repeat === true` ignored) → `source: "keyboard"`. Unverified vs a physical keyboard (`C-OPT-KBD`).

Store:

```
next = reduce(state, { ...event, nowMs: event.nowMs ?? Date.now() })
set({ state: next })
savePersisted(next)
```

`reduce` outline:

1. Power off: ignore all keys except `on`.
2. Auto-off if `nowMs - lastActivityMs > 10 minutes` (except `on`).
3. Stamp `lastActivityMs`.
4. If a menu is open, `handleMenu` (unmatched keys typically leave state unchanged).
5. SHIFT / ALPHA / HYP latches.
6. Error-screen recovery: AC clears; left/right restore the expression at `errorIndex`.
7. If `mode === "TABLE"`, `reduceTable` may consume the key (prompts, generation, row nav). Unhandled keys fall through.
8. If `mode === "BASE-N"`, `reduceBaseN` consumes the key (does not fall through into COMP editing), except MODE / SHIFT+AC.
9. If `mode === "STAT"`, `reduceStat` consumes editor/type keys.
10. If `mode === "EQN"`, `reduceEqn` consumes type/editor/solution keys; coefficient digits fall through to the COMP editor.
11. Otherwise key-specific insert / eval / memory / SETUP.

### FLOW A — `7 ÷ 6 =`

Keys: `7`, `div`, `6`, `equals`. Default setup: COMP, Deg, MthIO-MathO, Norm 1.

| Step | KeyEvent | State transition | Editor / AST | Eval / numeric | Display |
| --- | --- | --- | --- | --- | --- |
| 1 | `{ keyId: "7" }` | `insertDigit` | `{ t: "num", s: "7" }`, cursor index 1 | none | expr `"7"`, result empty, screen `input` |
| 2 | `{ keyId: "div" }` | `withBinaryOp` → `prepareForBinaryOp` → `insertOp(..., "÷")` | `[num 7, op ÷]` | none | `"7÷"` |
| 3 | `{ keyId: "6" }` | `insertDigit` | `[num 7, op ÷, num 6]` | none | `"7÷6"` |
| 4 | `{ keyId: "equals" }` | `onEquals` → `evaluateEquals` | AST **unchanged** | `evalSlot` → `evalExpr` → `symDiv(symRat(7), symRat(6))` → `{ k: "rat", r: { n: 7n, d: 6n } }`. `assertRange(toDec(sym))`. `resultFromSym` because MathO keeps the fraction | `result.display = "7/6"`, `naturalKind = "fraction"`, `approx = "1.166666667"` (10-digit Norm, `ROUND_HALF_UP` — **not** a hardware-tie claim). `screen: result`. `ans = approx`. `preAns` ← previous `ans` (`"0"`). History +1. Latches cleared. Replay indicator on. |

LCD reads `result.display` (`lcdResult`) and `atomsToLinear(editor.root)` (`lcdExpression` still `"7÷6"`).

Evidence: overlapping COMP fraction/LineIO behavior is `CROSS-MODEL-SOURCE` (SRC-P21/P22) with target ToC confirmation that COMP fractions exist. Passing this sequence is **not** `TARGET-MANUAL`.

### FLOW B — `SHIFT → SIN → 3 → 0 → =`

This sequence is **inverse sine of 30**, not sin(30). SHIFT+SIN maps to `asin` (`trigName`). `|30| > 1` ⇒ Math ERROR. Runtime dump of the current engine:

| Step | KeyEvent | State | Editor | Eval | Display |
| --- | --- | --- | --- | --- | --- |
| 1 | `shift` | `shift: true`, `alpha: false` | empty | none | indicator S |
| 2 | `sin` | latches cleared; `insertCall(..., "asin")` | `{ t: "call", name: "asin", args: [[]], closed: false }`, cursor path `[0, 8]` (`args0`) | none | `"asin("` |
| 3 | `3`, `0` | digits into the open call | `args[0] = [{ t: "num", s: "30" }]` | none | `"asin(30"` |
| 4 | `equals` | `onEquals` catch | AST unchanged | `evalCall("asin", …)` → `specialTrigFromSym` misses (30 is not an exact inverse argument) → `evalTrig` → `x.abs().gt(1)` → `CalcMathError` | `screen: error`, code `"Math ERROR"`, `lcdResult` `"Math ERROR"`, `errorIndex` 0 (`guessErrorIndex` only looks for ÷0 patterns) |

**Correct Natural Display sin 30° path** (unshifted): `sin`, `3`, `0`, `equals` → `specialTrigFromSym("sin", rat 30, Deg)` → `{ k: "rat", 1/2 }` → display `"1/2"`, approx `"0.5"`. Golden: GT-P36-EX1 (`CROSS-MODEL-SOURCE` SRC-P36).

**Correct inverse path:** `shift`, `sin`, `0`, `dot`, `5`, `equals` → display `"30"`. Golden: GT-P36-EX2.

Do not “fix” FLOW B to mean sin(30). The SHIFT mapping is the product behavior.

---

## 5. AST / editor model

`Atom` is a tagged union (`src/calc/types.ts`). Cursor is a path of `(index, fieldCode)` pairs plus `index`/`offset` in the current slot.

### Currently required (COMP)

Numbers; `+ − × ÷ ÷R nPr nCr`; unary `neg`; `frac` / `mixed`; `sqrt` / `cbrt` / `nthrt`; `pow`; `logb`; `call` (trig, hyp, log, ln, exp, Ran#, RanInt, Rnd, abs, arg, conjg); `group`; variables; `sym` pi/e/ans/preAns/i; postfix sq/cube/inv/fact/pct/dms; `abs`; `angle`; binary `∠`; suffix `cplxfmt`; `colon`; `comma`; `placeholder`; insert/overwrite; DEL; replay from history.

The AST **must not evaluate**. Evaluation is `evaluate.ts`. Formatting is `format.ts`.

### Future requirement (do not implement here)

| Need | Where it belongs |
| --- | --- |
| `i` as a value | **Implemented:** `Sym` variant `{ k: "cplx"; re; im }` (D-018). COMP still Math ERROR on `i`. |
| EQN coefficient screens | **Implemented:** `EqnSession` cells + `eqnSolve.ts`. COMP editor is the current coefficient slot only. |
| Matrices / vectors | **MATRIX implemented:** `MatrixSession` + `matrixNumeric.ts` (D-021). **VECTOR implemented:** `VectorSession` + `vectorNumeric.ts` (D-022). Isolated from each other. **Not** nested COMP `Atom[]`. |
| TABLE grid | **Implemented:** `TableSession` + `screen.kind === "table-view"`; f(x) reuses COMP `Atom[]` + X overlay |
| BASE-N digit alphabets / bitwise | **Implemented:** `BaseNToken[]` + w-bit `bigint` (D-017). Do not reuse COMP decimal `num` strings as hex. |

**Trap:** `call.name` is a free `string`. That is the COMP extension point and the way unimplemented ops already leak in. Before/with the first new mode, gate names by mode or close the set.

**Currently vs future:** COMP does not need matrix or vector nodes. MATRIX uses `mat-*` call names on the calc screen only; VECTOR uses `vct-*`. Register contents stay in `MatrixSession` / `VectorSession`. Do not add `Sym.mat` or `Sym.vec`.

---

## 6. Evaluation pipeline

`evaluateEquals` → `evaluateAtoms(editor.root)`:

1. `ctxFromState`: angle, `D(ans)`/`D(ansIm)`, `D(preAns)`/`D(preAnsIm)`, `D(variables.*)`, `D(memoryM)`, RNG, `complexOk: mode === "CMPLX"`.
2. `evalSlot`: split on `colon`; last statement wins.
3. `evalExpr`: values + operators; implied multiplication; shunting-yard by precedence; suffix `cplxfmt` sets a format override.
4. `evalAtom` / `evalCall`: structure → `Sym`. `i` is `cplxI()` only when `complexOk`.
5. Complex arithmetic is `symAdd`/`symMul`/`symDiv` on rectangular parts. Polar input `∠` is `polarToRect`.
6. Special angles: `specialTrigFromSym` (exact rat/π/gra only; nearby floats do not shortcut).
7. Else decimal.js trig/log/pow. Non-real arguments to those functions → Math ERROR (not coerced through `toDec`).
8. `assertRange` on real results, or on both parts of `cplx` (±1e-99 … ±9.999999999e99; underflow 0; overflow Math ERROR).
9. `resultFromSym(sym, setup, format)` → `ResultValue` (`a+bi` or `r∠θ`).

Errors become `screen.kind === "error"` in `onEquals`. M+ / STO call the same evaluator when not already on a result (D-014).

TABLE rows call the same `evaluateAtoms` with a **temporary** `{ X }` overlay (D-016). Persistent `variables.X` is written only after a successful generation.

BASE-N equals calls `evaluateBaseN` on `BaseNToken[]` (D-017). Word width is 16-bit BIN / 32-bit otherwise. Canonical value is a signed `bigint`. COMP `evaluateAtoms` is not used.

CMPLX equals uses the same `evaluateAtoms` with `complexOk`. **Did CMPLX require rewriting COMP?** No. COMP still throws Math ERROR on `i` and on `∠`. `cplx` arithmetic runs only when a complex `Sym` exists, which COMP evaluation does not produce.

STAT calc-screen `=` uses the same `evaluateAtoms`. STAT command names (`stat-n`, `stat-meanX`, `stat-xhat`, …) resolve from `ctx.statRows` via `statNumeric.ts` (decimal.js). They are Syntax ERROR outside STAT. Dataset entry does not call `evaluateAtoms`. **Did STAT require rewriting COMP?** No. COMP AST, BASE-N, and CMPLX value semantics are unchanged.

EQN `=` is `reduceEqn` → `eqnSolve`. Coefficient cells use `evaluateToSym` (current slot only). **Did EQN require rewriting COMP?** No.

MATRIX calc-screen `=` is `reduceMatrix` → `evaluateMatrixExpr` (`matrixEval.ts`) → `matrixNumeric.ts`. Register cells use `evaluateToSym` for the current slot. `mat-*` names are Syntax ERROR in COMP. **Did MATRIX require rewriting COMP?** No. mathjs is still unused.

`i` throws Math ERROR in COMP by design.

---

## 7. Numerical policy

**Do not replace decimal.js.** Policy: D-003, D-013, `docs/NUMERIC_AUDIT.md`.

- Scalars that affect display: `decimal.js` 10.6.0 (`Dec` / `D()`).
- Exact rationals / π coefficients / nested radicals: `Sym` (`rat` \| `quad` \| `pi` \| `real`) with bigint `Rat`.
- Complex: `Sym` `{ k: "cplx"; re; im }` with real parts. Zero imag packs back to a real. `toDec` of a non-real throws. Polar is display/input of that rectangular value (`src/calc/complex.ts`).
- Internal 15 digits, display 10+2, π/e internal strings: `CROSS-MODEL-SOURCE` SRC-P97/P36 with target capability confirmation, **not** physical measurement.
- Rounding: `Decimal.ROUND_HALF_UP`. Hardware ties: **NEEDS-HUMAN-REVIEW**. Do not claim hardware rounding.
- Special angles: exact table only (`specialTrig.ts`). Conservative: 30.001° is not 1/2.
- Ran#: decimal thousandths from uint32 LCG (`Math.imul` is 32-bit control state, not IEEE calculator math). Algorithm vs hardware: `INFERRED`.
- mathjs is pinned and **unused** (D-003, D-021). Complex numbers are `Sym.cplx`, not mathjs. MATRIX algebra is explicit `Sym` cell ops in `matrixNumeric.ts`.
- BASE-N integers: `bigint` with explicit width mask/sign (`src/calc/baseNNumeric.ts`). Not IEEE-754 and not COMP `decimal.js`.
- STAT: decimal.js weighted sums / OLS / erf series (`src/calc/statNumeric.ts`). No statistics library as source of truth.
- MATRIX: existing `Sym` cells; add/mul/det/inverse/transpose implemented explicitly. No `number[][]`. No mathjs.

**Legitimate non-semantic `Number`/`Math.*`:** array indices, Fix/Sci digit `Number(keyId)`, `Math.min`/`max` for contrast/replay, layout in `src/ui`.

**Not calculator-semantic failures:** those control uses.

Ans for 7÷6 is `"1.166666667"` because Ans stores the **formatted** 10-digit approx, while MathO display keeps `"7/6"`. That is a display/memory split, not a float leak.

---

## 8. Display pipeline

1. `ResultValue` already contains `display`, `approx`, `naturalKind`, optional fraction/π/sqrt/sexagesimal/`complex`.
2. `lcdResult(state)`: error code, off empty, MODE/SETUP menus as text, else `result.display` on result/replay screens.
3. `lcdExpression(state)`: `atomsToLinear` of editor (or error expression).
4. `lcdIndicators`: S/A/HYP/M/D|R|G/Math/FIX/SCI/mode/replay/STO/RCL.
5. `Lcd.tsx` paints those strings. Contrast is CSS `filter` from `setup.contrast`. Power off dims the panel.

S⇔D (`sd` key) toggles `toggleDecimal` on the stored `ResultValue`. It does not re-evaluate.

SETUP page-2 item numbering / glyphs: **NEEDS-HUMAN-REVIEW** (not visually signed off).

---

## 9. Persistence boundary

| | |
| --- | --- |
| Key | `fx991es-plus2/v1` |
| Envelope | `{ schemaVersion: 1, savedAt, state }` |
| `savedAt` | `Date.now()` at serialize (I/O at the persist boundary, not inside `reduce`) |
| Reject | wrong envelope version; nested state failing `isPersistedCalcState` |
| Fallback | `createInitialState` |
| Hydrate | `store.hydrate()` from `App` mount |

Shape check is **structural** (required fields, known `mode`, setup enums, editor/cursor, screen kinds). It does **not** deep-validate `Atom` trees. Adding fields later either bumps `schemaVersion` or documents a default.

Persistence must not implement arithmetic. It currently does not.

---

## 10. UI boundary

- `Chassis.tsx`: object-fit contain via `containedImageRect`; LCD and keys via `percentToLocal`. Clicks dispatch `keyId` only.
- `hitTest` is for unit tests and reasoning about overlap; production clicks do not call it.
- Red hit-zone overlay is off by default (`?debug=true` shows it). User signed off D-pad 2026-08-24.
- No React Router. Vite `base` `/casio-fx-991es-copy/`. Asset URLs are relative (`keymap.json`, `assets/…`).
- Feedback (`playKeyClick`, `haptic`) is outside `reduce`.

---

## 11. Testing architecture

| Layer | Suite | What it actually tests |
| --- | --- | --- |
| A Numeric | `src/calc/numeric.test.ts`, `src/calc/baseNNumeric.test.ts`, `src/calc/complex.test.ts`, `src/calc/statNumeric.test.ts`, `src/calc/eqnSolve.test.ts`, `src/calc/matrixNumeric.test.ts` | decimal.js range; BASE-N 16/32-bit bigint; rectangular complex arithmetic; STAT official Ex2–Ex5; EQN official Ex1–Ex5; MATRIX official Ex1–Ex8 |
| A Special angles | `src/calc/special-angles.test.ts` | exact shortcuts vs nearby floats |
| B Editor | `src/calc/editor.test.ts` | cursor, DEL, operator-exit, nth-root template, replay edit |
| C State | `src/calc/state-transitions.test.ts`, `machine.test.ts`, `table-state.test.ts`, `baseN-state.test.ts`, `cmplx-state.test.ts`, `stat-state.test.ts`, `eqn-state.test.ts`, `matrix-state.test.ts` | AC/MODE/SETUP/CLR/power; TABLE; BASE-N; CMPLX; STAT; EQN; MATRIX |
| D Golden keys | `golden/acceptance.test.ts`, `golden/fixtures.test.ts`, `golden/table.test.ts`, `golden/baseN.test.ts`, `golden/cmplx.test.ts`, `golden/stat.test.ts`, `golden/eqn.test.ts`, `golden/matrix.test.ts` | key sequences → display + mode-specific state |
| E Persist | `src/calc/persist.test.ts`, `e2e/persist.spec.ts` | schema reject/round-trip; TABLE/BASE-N/STAT/EQN/MATRIX stripped; `ansIm` default |
| F UI overlay | `src/ui/coords.test.ts`, `e2e/overlay.spec.ts` | 50 keys, 0–100% boxes, debug overlay, pointer |
| G PWA/build | `npm run build` + Workbox in CI | precache locally; **not** live origin |

Calculator-semantic tests dispatch `KeyId` through `reduce` — they do not click React, except e2e overlay/persist.

**Golden contract (intent vs reality):**

A golden should specify starting state, key sequence, expected display/state, source, evidence class, target confidence.

Reality: most COMP goldens are inline Vitest `it(...)` with `SRC-P*` in the title, default `createInitialState(0)`, and `lcdResult` assertions. Structured fixtures: `golden/fixtures/GT-P22-EX1.json`, `golden/fixtures/GT-TBL-XSQ-DEFAULTS.json`, `golden/fixtures/GT-BN-OFFICIAL-EX1.json`, `golden/fixtures/GT-CX-OFFICIAL-EX1.json`, `golden/fixtures/GT-ST-OFFICIAL-EX2.json`. **A passing golden is clone behavior, not `TARGET-MANUAL`.** File header in `acceptance.test.ts` states that.

**Gaps (quality, do not inflate count):**

- Most COMP goldens still lack an `evidenceClass` field.
- TABLE goldens assert mode/phase/rows/rowIndex, not only LCD strings.
- STAT goldens assert dataset rows + result, not only LCD strings.
- EQN goldens assert type/phase/solution labels + values, not only LCD strings.
- Unimplemented COMP tokens (`Pol`, `int`) still eval to Syntax ERROR; TABLE additionally **rejects** them in f(x) before eval.
- `C-OPT-KBD` unverified.
- `guessErrorIndex` is weakly tested beyond ÷0.

---

## 12. Future-mode readiness

TABLE f(x), BASE-N, CMPLX, STAT, and EQN are implemented additively. Remaining modes must still not rewrite COMP.

| Mode | Clean fit? | Reuse | New abstraction | Rewrite trap | P0/P1 blocker |
| --- | --- | --- | --- | --- | --- |
| **TABLE** | **Implemented (f(x))** | COMP editor; `evaluateAtoms(..., { X })`; `TableSession` | One-row LCD view; Start/End/Step prompts | Encoding the grid as COMP `Atom[]` | g(x) not in scope. Dual SETUP TABLE format is unused. |
| **BASE-N** | **Implemented** | MODE entry; error codes; SHIFT/ALPHA latches; persist envelope | `BaseNToken[]` + 16/32-bit `bigint` (`baseNNumeric.ts`) | Using decimal.js hex as if it were COMP `num` | Bit shifts deferred. Arithmetic overflow vs wrap NHR. |
| **CMPLX** | **Implemented** | COMP `Atom[]` / editor; `evaluateAtoms`; `complexFormat`; ALPHA `i`; SHIFT+`(-)` `∠` | `Sym.cplx` + `src/calc/complex.ts`; `ansIm`/`preAnsIm` | Making complex a COMP special-case; mathjs scalars; a second parser | Complex STO **PARTIAL**. Trig/log/√ of non-real **DEFERRED**. LineIO two-line a/bi **NHR**. |
| **STAT** | **Implemented** | MODE; SETUP `statFreq`; calc-screen COMP eval for STAT commands; persist envelope | `StatSession` rows + `statNumeric.ts` | STAT lists inside COMP `editor.root`; a statistics library as source of truth | Menu numbering **NHR**. Q/R **INFERRED**. Hardware power-off dataset **NHR**. Q1/Med/Q3 unsupported on target. |
| **EQN** | **Implemented** | MODE; COMP editor as coefficient slot; `evaluateToSym`; `Sym.cplx` / `resultFromSym` | `EqnSession` + `eqnSolve.ts` + structured `SolutionSet` | Parsing a COMP polynomial as EQN; a CAS; a second complex type; Can't Solve for EQN | Extra `=` to solve **INFERRED**. No-solution wording **NHR**. Cubic order beyond Ex5 **NHR**. Vertex min/max not implemented. |
| **MATRIX** | **Implemented** | MODE; COMP editor as current cell / calc expression; `evaluateToSym`; `Sym` cells; `Dimension ERROR` | `MatrixSession` + `matrixNumeric.ts` + `matrixEval.ts` | Nested `Atom[]` matrices; `number[][]`; `Sym.mat`; mathjs as source of truth | Menu numbering **NHR**. Dim 7–9 off first LCD page **NHR**. Singular inverse class **INFERRED**. Persist **INFERRED**. Hardware grid LCD **NHR**. Ref/Rref unsupported on this target. |
| **VECTOR** | **Implemented** | MODE; COMP editor as current component / calc expression; `evaluateToSym`; `Sym` cells; `Dimension ERROR` | `VectorSession` + `vectorNumeric.ts` + `vectorEval.ts` | Nested `Atom[]` vectors; `number[]`; merging into MATRIX; `Sym.vec`; mathjs | Menu numbering **NHR**. 2D×2D cross `(0,0,a1b2−a2b1)` **INFERRED**/ **NHR**. Persist **INFERRED**. VctAns one-cell LCD vs hardware grid **NHR**. No dedicated Angle command. Complex components rejected. MATRIX isolated. |

All **major target modes** (COMP, TABLE, BASE-N, CMPLX, STAT, EQN, MATRIX, VECTOR) are implemented additively. Remaining work is deferred functions (INT/DIFF/SUM/SOLVE), optional items, and hardware/PWA verification — not another major mode.

`call.name` is still a free string in COMP. TABLE only rejects Pol/Rec/int/diff/Σ inside **f(x)**. BASE-N does not use `call.name`. CMPLX adds `arg` / `conjg` via the existing call node. STAT adds `stat-*` names that Syntax ERROR outside STAT. EQN blocks Pol/Rec/STO/M+/colon in the coefficient editor. MATRIX adds `mat-*` names that Syntax ERROR outside MATRIX. VECTOR adds `vct-*` names that Syntax ERROR outside VECTOR. Broad COMP gating remains a follow-up P1.

---

## 13. Known architectural risks

| Risk | Class | Status |
| --- | --- | --- |
| 115/C PDF treated as target manual | provenance | Mitigated by evidence classes; keep labeling |
| Golden tests become “target truth” | provenance | Titles cite SRC-P*; passing ≠ TARGET-MANUAL |
| Persist injection of impossible state | P1 | Shape check added; atoms still unchecked |
| Unbounded `call.name` | P1 | TABLE rejects Pol/int/Σ in f(x) only; STAT `stat-*` names Syntax ERROR outside STAT; MATRIX `mat-*` names Syntax ERROR outside MATRIX; VECTOR `vct-*` names Syntax ERROR outside VECTOR; COMP still free-string. COMP injection + MODE-wipe tests: `src/calc/call-name-gate.test.ts` (D-023). Typed union deferred. |
| Dual `memoryM` / `variables.M` | P1 hygiene | Keep dual-write until a mode needs a split |
| `reduce` god-function | P1 for scale | Split by mode later, keep single `reduce` entry |
| ENG shift discarded (`void shifted`) | P2 | Documented; not COMP-core |
| `menu.kind === "hyp"` dead | P2 | HYP is a latch |
| Live PWA unverified | UNVERIFIED | Origin serves hashed `dist/`; install/offline not tested |
| Visual keymap vs missing original photo | VERIFIED (user sign-off) | overlay off by default; `?debug=true` shows |
| Hardware rounding ties | NHR | HALF_UP policy only |
| PreAns on target chassis | NHR / UNCONFIRMED | D-012 |
| Playwright “tablet” is Chromium | honesty | Not iOS Safari |
| No physical differential testing | accepted | N/A |

**P0 architecture blockers for further modes:** none. TABLE f(x), BASE-N, CMPLX, STAT, EQN, MATRIX, and VECTOR are in. Do not start unrelated advanced functions after VECTOR.

---

## 14. Post-major-mode domain map (D-023)

This section is a developer map of the **complete** system after all seven major target modes. Historical FLOW A/B and COMP-core freeze above still apply. Full scorecard: `docs/POST_MAJOR_MODE_AUDIT.md`.

```
INPUT LAYER          App.tsx, Chassis.tsx, keys.ts, public/keymap.json
        ↓
KEY/EVENT            KeyEvent { keyId, source, nowMs? }     — no React in tests
        ↓
STATE ORCHESTRATION  machine.ts reduce()                    — sole semantic authority
        ↓
DOMAIN DISPATCH      mode + menu.kind → reduceX | handleMenu
        ↓
DOMAIN STATE         CalcState sessions (nullable except baseN)
        ↓
DOMAIN EVALUATION    evaluate / baseNNumeric / statNumeric / eqnSolve / matrixEval / vectorEval
        ↓
SHARED VALUES        numeric.ts (Dec, errors) + symbolic.ts (Sym) + bigint (BASE-N only)
        ↓
DISPLAY MODEL        ui/lcdModel.ts  (derived; no arithmetic)
        ↓
PERSISTENCE          persist.ts envelope v1  (Zustand save only)
        ↓
REACT / LCD / UI     store.ts, Lcd.tsx, Chassis.tsx, feedback.ts
```

| Layer | Files | Authoritative state | React in the layer? | Testable without DOM? |
| --- | --- | --- | --- | --- |
| Input | `App.tsx`, `Chassis.tsx`, `keys.ts`, `keymap.json` | none | yes (chassis) | coords + e2e overlay |
| Event | `keys.ts` | `KeyEvent` | no | yes |
| Orchestration | `machine.ts` | `CalcState` | no | yes |
| Dispatch | `reduce` / `handleMenu` | `mode`, `menu` | no | yes |
| Sessions | `table.ts`, `baseN.ts`, `stat.ts`, `eqn.ts`, `matrix.ts`, `vector.ts`, `types.ts` | session fields | no | yes |
| Evaluation | `evaluate.ts`, `*Numeric.ts`, `*Eval.ts`, `eqnSolve.ts`, `complex.ts` | `Sym` / bigint / structured values | no | yes |
| Shared numeric | `numeric.ts`, `symbolic.ts`, `format.ts`, `specialTrig.ts` | `Dec`, `Sym`, error classes | no | yes |
| Display | `lcdModel.ts` + domain `*Text` helpers | none (derived) | no | yes |
| Persist | `persist.ts` | localStorage envelope | no | yes |
| UI shell | `store.ts`, `Lcd.tsx`, `Chassis.tsx`, `main.tsx` | store copy of `CalcState` | yes | e2e |

| Domain | State | Editor | Numeric | Evaluator | Display | Persist |
| --- | --- | --- | --- | --- | --- | --- |
| COMP | editor + ans/result | `Atom[]` | `Sym` + decimal.js | `evaluate.ts` | lcdModel | keep |
| TABLE | `TableSession` | COMP f(x) | COMP + X overlay | `evaluateAtoms` | table-view row | strip |
| BASE-N | `BaseNState` | `BaseNToken[]` | signed bigint | `baseNNumeric.ts` | padded integer | radix only |
| CMPLX | COMP editor | `Atom[]` + i/∠ | `Sym.cplx` | `evaluate.ts` `complexOk` | a+bi / r∠θ | keep + ansIm |
| STAT | `StatSession` | cell strings | decimal.js | `stat-*` in evalCall | labels | strip |
| EQN | `EqnSession` | current coeff slot | `Sym` / cplx | `eqnSolve.ts` | `{label,sym}` | strip |
| MATRIX | `MatrixSession` | current cell | `MatrixValue` | `matrixEval` / `matrixNumeric` | one cell | strip |
| VECTOR | `VectorSession` | current component | `VectorValue` | `vectorEval` / `vectorNumeric` | one cell | strip |

**Isolation rules still in force:** no `Sym.mat` / `Sym.vec`; no MATRIX↔VECTOR mix; no STAT dataset in `Atom[]`; no BASE-N via decimal.js; UI never calls evaluators except through `reduce`.

`CalcDimensionError` is defined in `src/calc/numeric.ts` (D-023) so VECTOR algebra does not import MATRIX algebra. MATRIX and VECTOR still re-export the class for existing imports.

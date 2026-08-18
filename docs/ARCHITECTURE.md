# Architecture (COMP-core baseline)

This document describes the **current** fx-991ES PLUS 2nd edition clone as a system. It is an audit of the working COMP-core, not a redesign proposal.

**Target:** FX-991ESPLUS-2 / fx-991ES PLUS 2nd edition.
**Supplied PDF:** fx-115ES PLUS / fx-991ES PLUS C 2nd-edition guide — evidence class `CROSS-MODEL-SOURCE`, never `TARGET-MANUAL`. See `docs/EVIDENCE_CLASSES.md`.

**Frozen core (D-015):** `reduce` + custom AST/cursor editor + decimal.js scalars + Zustand as a view/persist holder. Do not replace these to start later modes.

---

## 1. System overview

The calculator is a **pure state machine** with a React/PWA shell.

```
pointer / optional keyboard / test
        ↓  KeyEvent { keyId, source, nowMs? }
   reduce(state, event)     src/calc/machine.ts   ← sole semantic authority
        ↓  CalcState
   editor AST + cursor      src/calc/editor.ts    ← structure only
        ↓  on = / M+ / STO
   evaluator                src/calc/evaluate.ts
        ↓  Sym
   numeric + symbolic       src/calc/numeric.ts, symbolic.ts, specialTrig.ts
        ↓  ResultValue
   display model            src/ui/lcdModel.ts    ← pure projection
        ↓
   Lcd.tsx / Chassis.tsx    layout + painting only
```

Zustand (`src/store.ts`) holds one `CalcState`, injects `Date.now()` into events, and writes localStorage. React does not implement calculator semantics.

**What this clone is:** a hardened COMP-mode foundation plus **TABLE f(x)** (additive `TableSession`). MODE *entry* remains for CMPLX / STAT / BASE-N / EQN / MATRIX / VECTOR.
**What this clone is not:** a complete clone. Live PWA install/offline is **BLOCKED** until GitHub Pages is enabled. Visual keymap vs the original chat photo is **NEEDS-HUMAN-REVIEW**.

---

## 2. Layer responsibilities

| Layer | Authority | Must not |
| --- | --- | --- |
| Input | Translate pointer/keyboard to `KeyId` | Compute results, mutate AST, persist |
| State machine | `reduce`: latches, menus, power, mode, memory, when to edit/eval | Format LCD HTML, read `Date.now()` internally (time is injected) |
| Editor / AST | Insert/delete/move; `Atom[]` + path cursor | Evaluate, format Norm/Fix, know React |
| Evaluator | Walk AST → `Sym`; range/error | Paint UI; persist |
| Numerical / symbolic | decimal.js + bigint rationals + exact special-angle table | IEEE-754 `Number`/`Math.*` on displayed values |
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
| ALPHA ENG inserts `i`; eval → Math ERROR | P1 for CMPLX, OK for COMP | Token exists before the value type |
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
| `mode` | COMP plus seven target modes (entry only except COMP) |
| `setup` | Angle, I/O, Fix/Sci/Norm, fraction, CMPLX/STAT/TABLE format, Rdec, decimal mark, contrast |
| `shift`, `alpha`, `hyp` | Latches. SHIFT and ALPHA clear each other. HYP is sticky until a consuming key |
| `editor` | `root: Atom[]`, `cursor`, `insertMode` |
| `screen` | `input` \| `result` \| `error` \| `replay` \| `off` |
| `result` | Last `ResultValue` or `null` (cleared by AC) |
| `resultDecimal` | Tracks S⇔D natural vs decimal |
| `ans`, `preAns` | Independent memories (strings of formatted approx) |
| `variables` | A–F, M, X, Y as decimal strings |
| `memoryM` | Independent M (also mirrored into `variables.M`) |
| `history` | Up to 40 `{ expression, result }` replay entries |
| `menu` | SETUP/MODE/CLR/STO/RCL/… overlay; `{ kind: "none" }` when idle |
| `lastActivityMs` | Auto-off clock |
| `rngSeed` | Deterministic Ran# / RanInt |
| `baseN.radix` | Placeholder for BASE-N (no editor yet) |
| `table` | Additive TABLE session (`null` outside TABLE). Grid is **not** COMP `Atom[]`. |

### Derived (never persist separately)

`lcdExpression`, `lcdResult`, `lcdIndicators` — functions of `CalcState`.

### Persisted

The entire `CalcState` inside envelope `{ schemaVersion: 1, savedAt, state }` at localStorage key `fx991es-plus2/v1`.

On load: nested state must pass `isPersistedCalcState`; `power` is forced `"on"`; `lastActivityMs` is reset; if the saved `power` was `"off"`, `screen` becomes `{ kind: "input" }`. **TABLE session/rows are stripped on serialize** (D-016). A saved TABLE mode rehydrates to an empty f(x) prompt. COMP envelopes that omit `table` still load (`table: null`).

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
7. Otherwise key-specific insert / eval / memory / SETUP.

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

Numbers; `+ − × ÷ ÷R nPr nCr`; unary `neg`; `frac` / `mixed`; `sqrt` / `cbrt` / `nthrt`; `pow`; `logb`; `call` (trig, hyp, log, ln, exp, Ran#, RanInt, Rnd, abs); `group`; variables; `sym` pi/e/ans/preAns; postfix sq/cube/inv/fact/pct/dms; `abs`; `angle`; `colon`; `comma`; `placeholder`; insert/overwrite; DEL; replay from history.

The AST **must not evaluate**. Evaluation is `evaluate.ts`. Formatting is `format.ts`.

### Future requirement (do not implement here)

| Need | Where it belongs |
| --- | --- |
| `i` as a value | New `Sym` variant or CMPLX value type — **not** stuffing complex arithmetic into `Atom` |
| Matrices / vectors | Parallel stores + mode editors — **not** nested COMP `Atom[]` encoding of arrays |
| STAT lists / frequencies | Parallel list store |
| BASE-N digit alphabets / bitwise | Mode-gated integer editor; do not reuse COMP decimal `num` strings as hex without a gate |
| EQN coefficient screens | Dedicated screens, not a COMP polynomial parser |
| TABLE grid | New `screen` kind + range (start/end/step); `f(x)` can reuse COMP `Atom[]` + `variables.X` |

**Trap:** `call.name` is a free `string`. That is the COMP extension point and the way unimplemented ops already leak in. Before/with the first new mode, gate names by mode or close the set.

**Currently vs future:** COMP does not need matrix nodes. Adding them “just in case” would couple the editor to P1 modes. Do not.

---

## 6. Evaluation pipeline

`evaluateEquals` → `evaluateAtoms(editor.root)`:

1. `ctxFromState`: angle, `D(ans)`, `D(preAns)`, `D(variables.*)`, `D(memoryM)`, RNG.
2. `evalSlot`: split on `colon`; last statement wins.
3. `evalExpr`: values + operators; implied multiplication; shunting-yard by precedence.
4. `evalAtom` / `evalCall`: structure → `Sym`.
5. Special angles: `specialTrigFromSym` (exact rat/π/gra only; nearby floats do not shortcut).
6. Else decimal.js trig/log/pow.
7. `assertRange` (±1e-99 … ±9.999999999e99; underflow 0; overflow Math ERROR).
8. `resultFromSym(sym, setup)` → `ResultValue`.

Errors become `screen.kind === "error"` in `onEquals`. M+ / STO call the same evaluator when not already on a result (D-014).

`i` throws Math ERROR in COMP by design until CMPLX exists.

---

## 7. Numerical policy

**Do not replace decimal.js.** Policy: D-003, D-013, `docs/NUMERIC_AUDIT.md`.

- Scalars that affect display: `decimal.js` 10.6.0 (`Dec` / `D()`).
- Exact rationals / π coefficients / nested radicals: `Sym` (`rat` \| `quad` \| `pi` \| `real`) with bigint `Rat`.
- Internal 15 digits, display 10+2, π/e internal strings: `CROSS-MODEL-SOURCE` SRC-P97/P36 with target capability confirmation, **not** physical measurement.
- Rounding: `Decimal.ROUND_HALF_UP`. Hardware ties: **NEEDS-HUMAN-REVIEW**. Do not claim hardware rounding.
- Special angles: exact table only (`specialTrig.ts`). Conservative: 30.001° is not 1/2.
- Ran#: decimal thousandths from uint32 LCG (`Math.imul` is 32-bit control state, not IEEE calculator math). Algorithm vs hardware: `INFERRED`.
- mathjs is pinned and **unused** for COMP scalars (D-003). Recommendation for later structure, not a current rewrite.

**Legitimate non-semantic `Number`/`Math.*`:** array indices, Fix/Sci digit `Number(keyId)`, `Math.min`/`max` for contrast/replay, layout in `src/ui`.

**Not calculator-semantic failures:** those control uses.

Ans for 7÷6 is `"1.166666667"` because Ans stores the **formatted** 10-digit approx, while MathO display keeps `"7/6"`. That is a display/memory split, not a float leak.

---

## 8. Display pipeline

1. `ResultValue` already contains `display`, `approx`, `naturalKind`, optional fraction/π/sqrt/sexagesimal.
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
- `?debug=true` outlines keymap boxes. **Not** visual sign-off.
- No React Router. Vite `base` `/casio-fx-991es-copy/`. Asset URLs are relative (`keymap.json`, `assets/…`).
- Feedback (`playKeyClick`, `haptic`) is outside `reduce`.

---

## 11. Testing architecture

| Layer | Suite | What it actually tests |
| --- | --- | --- |
| A Numeric | `src/calc/numeric.test.ts` | decimal.js range, factorial, nPr/nCr, Ran#, ROUND_HALF_UP **policy** |
| A Special angles | `src/calc/special-angles.test.ts` | exact shortcuts vs nearby floats |
| B Editor | `src/calc/editor.test.ts` | cursor, DEL, operator-exit, nth-root template, replay edit |
| C State | `src/calc/state-transitions.test.ts`, `machine.test.ts` | AC/MODE/SETUP/CLR/power/auto-off/latches/LCD indicators |
| D Golden keys | `golden/acceptance.test.ts`, `golden/fixtures.test.ts` | key sequences → `lcdResult` / some state fields |
| E Persist | `src/calc/persist.test.ts`, `e2e/persist.spec.ts` | schema reject/round-trip; reload in Chromium |
| F UI overlay | `src/ui/coords.test.ts`, `e2e/overlay.spec.ts` | 50 keys, 0–100% boxes, debug overlay, pointer |
| G PWA/build | `npm run build` + Workbox in CI | precache locally; **not** live origin |

Calculator-semantic tests dispatch `KeyId` through `reduce` — they do not click React, except e2e overlay/persist.

**Golden contract (intent vs reality):**

A golden should specify starting state, key sequence, expected display/state, source, evidence class, target confidence.

Reality: most goldens are inline Vitest `it(...)` with `SRC-P*` in the title, default `createInitialState(0)`, and `lcdResult` assertions. Only `golden/fixtures/GT-P22-EX1.json` is a structured fixture (`sourceEvidenceId`). **A passing golden is clone behavior, not `TARGET-MANUAL`.** File header in `acceptance.test.ts` states that.

**Gaps (quality, do not inflate count):**

- Most goldens lack an `evidenceClass` field.
- First new mode must not rely only on LCD string coincidence; assert mode-specific state.
- Unimplemented tokens (`Pol`, `int`) are not explicitly tested as Syntax ERROR.
- `C-OPT-KBD` unverified.
- `guessErrorIndex` is weakly tested beyond ÷0.

---

## 12. Future-mode readiness

TABLE f(x) is implemented additively (`src/calc/table.ts`, D-016). Remaining modes must still not rewrite COMP.

| Mode | Clean fit? | Reuse | New abstraction | Rewrite trap | P0/P1 blocker |
| --- | --- | --- | --- | --- | --- |
| **TABLE** | **Implemented (f(x))** | COMP editor; `evaluateAtoms(..., { X })`; `TableSession` | One-row LCD view; Start/End/Step prompts | Encoding the grid as COMP `Atom[]` | g(x) not in scope. Dual SETUP TABLE format is unused. |
| **BASE-N** | Yes if gated | `baseN.radix`; MODE entry | Integer editor, A–F digits, bitwise ops, integer display | Using decimal.js hex as if it were COMP `num` | No P0. P1: parallel integer domain |
| **CMPLX** | Yes with a value type | `complexFormat`; ALPHA `i` token; ErrorCode | `Sym` complex (or mathjs **structure only**, D-003) | Treating `i` as Math ERROR forever, or switching the scalar engine | No P0. P1: `i` must become a value; close `call.name` |
| **STAT** | Additive | `statFreq`; MODE | List/frequency store, STAT menus | STAT lists inside COMP `editor.root` | No P0. P1: new store |
| **EQN** | Additive | MODE; ErrorCode `Can't Solve` | Coefficient screens + solver UI | Parsing a COMP polynomial AST as simultaneous EQN | No P0. P1: dedicated UI |
| **MATRIX** | Additive | MODE; `Dimension ERROR` | Matrix registers + dim editor | Nested `Atom[]` matrices; replacing decimal.js | No P0. P1: new store. mathjs optional later |
| **VECTOR** | Same as MATRIX | MODE | Vector registers | Same trap | No P0. P1: new store |

**Recommended next mode: BASE-N** (closed integer domain, existing `baseN.radix`) or **CMPLX** (`i` token already inserts).

`call.name` is still a free string in COMP. TABLE only rejects Pol/Rec/int/diff/Σ inside **f(x)**. Broad COMP gating remains a follow-up P1.

---

## 13. Known architectural risks

| Risk | Class | Status |
| --- | --- | --- |
| 115/C PDF treated as target manual | provenance | Mitigated by evidence classes; keep labeling |
| Golden tests become “target truth” | provenance | Titles cite SRC-P*; passing ≠ TARGET-MANUAL |
| Persist injection of impossible state | P1 | Shape check added; atoms still unchecked |
| Unbounded `call.name` | P1 | TABLE rejects Pol/int/Σ in f(x) only; COMP still free-string |
| Dual `memoryM` / `variables.M` | P1 hygiene | Keep dual-write until a mode needs a split |
| `reduce` god-function | P1 for scale | Split by mode later, keep single `reduce` entry |
| ENG shift discarded (`void shifted`) | P2 | Documented; not COMP-core |
| `menu.kind === "hyp"` dead | P2 | HYP is a latch |
| Live PWA unverified | BLOCKED | Pages not enabled |
| Visual keymap vs missing original photo | NHR | `?debug=true`; no fake sign-off |
| Hardware rounding ties | NHR | HALF_UP policy only |
| PreAns on target chassis | NHR / UNCONFIRMED | D-012 |
| Playwright “tablet” is Chromium | honesty | Not iOS Safari |
| No physical differential testing | accepted | N/A |

**P0 architecture blockers for further modes:** none identified for BASE-N/CMPLX as additive work. TABLE f(x) is in.

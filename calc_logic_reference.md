# calc_logic_reference.md

Citations refer to **printed page numbers** in `sources/supplied/FX991ESPLUS2_user_manual.pdf` (105 pages). That file is **fx-115ES PLUS / fx-991ES PLUS C**, evidence class `CROSS-MODEL-SOURCE`. It is **not** `TARGET-MANUAL`. Target confirmation uses `TARGET-OFFICIAL-DOC` (570/991 2nd edition ToC). Extracted text is imperfect (key glyphs often dropped). Diagram-only sequences: `NEEDS-HUMAN-REVIEW`.

Legend on important rules below: `[class; target: CONFIRMED|UNCONFIRMED|CONFLICT|N/A]`.

## SRC-P4 Initializing `[CROSS-MODEL-SOURCE; target: CONFIRMED — TGT-TOC initializing]`

CLR → All → Yes initializes mode and setup and **clears all memory**. Sample operations assume initial default setup.

## SRC-P6 Power `[CROSS-MODEL-SOURCE; target: CONFIRMED — ON/OFF/APO on target family]`

ON turns the calculator on. SHIFT AC (OFF) turns it off. Auto power-off after **approximately 10 minutes**.

## SRC-P6–8 Keys and indicators

SHIFT / ALPHA select alternate key markings (gold / red). Indicators: S, A, M, STO, RCL, STAT, CMPLX, MAT, VCT, D/R/G, FIX, SCI, Math. Replay ▲▼ when history exists.

## SRC-P10 Modes (115/C list) `[CROSS-MODEL-SOURCE; INEQ/VERIF/DIST = CONFLICT vs target]`

COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR, **INEQ, VERIF, DIST**. Default COMP.

**Target FX-991ESPLUS-2:** official 570/991 2nd edition ToC stops at VECTOR (no INEQ/VERIF/DIST). See D-001.

## SRC-P11–16 Setup

MthIO-MathO (default), MthIO-LineO, LineIO. Deg (default), Rad, Gra. Fix 0–9, Sci 0–9, Norm 1 (default) / Norm 2.  
Norm 1: \(10^{-2}>|x|\) or \(|x|\ge 10^{10}\). Norm 2: \(10^{-9}>|x|\) or \(|x|\ge 10^{10}\).  
ab/c vs d/c (default d/c). CMPLX a+bi (default). STAT FREQ OFF. TABLE: 115/C default f(x),g(x) — **not copied** to target (D-007). Rdec ON (115/C). Disp Dot. Contrast via SETUP CONT.

CLR Setup → Yes: COMP, MthIO-MathO, Deg, Norm 1, d/c, a+bi, STAT OFF, Rdec ON, Dot (plus 115/C table default).

## SRC-P17–20 Input

Up to **99 bytes**. Implied multiplication before `(`, functions, Ran#, variables, constants, π, e. Closing `)` immediately before `=` may be omitted. Closing `)` **required** for sin and similar before other operators (SRC-P18 note *1). Natural Display templates for fractions, roots, powers, log□□, Abs, ∫, d/dx, Σ, Π. Linear overwrite via SHIFT INS. DEL deletes left (insert) or under cursor (overwrite). AC clears expression.

## SRC-P18 √ form

At most two terms. Coefficient ranges 1≤a<100, 1<b<1000, etc. Example: 10√2 + 15×3√3 → 45√3+10√2.

## SRC-P21 S⇔D

Toggles fraction / √ / π form vs decimal (MathO). LineIO toggles decimal ↔ fraction.

## SRC-P22 Fractions

2/3+1/2=7/6. Mixed 4−3 1/2=1/2. Results reduced. Mixed conversion SHIFT S⇔D (ab/c ↔ d/c).

## SRC-P23 Percent

150×20%=30. 660÷880%=75. Increase/decrease examples.

## SRC-P24 Multi-statement

`:` executes left to right. Example 3+3:3×3 → 6 then 9. ENG notation examples.

## SRC-P25 ÷R

Quotient stored in Ans. Large operands fall back to normal division.

## SRC-P31–32 History / Replay

COMP/CMPLX/BASE-N remember ~200 bytes. ▲▼ scroll. Replay: left/right from result to edit. History cleared by ON? Manual: cleared on **mode change, display format change, CLR Setup/All** (not by AC). Example 4×3+2=14 then replay to 4×3−7=5.

## SRC-P32–35 Memory `[CROSS-MODEL-SOURCE; Ans/vars/M target: CONFIRMED; PreAns target: UNCONFIRMED]`

Ans last result; PreAns previous (COMP only; cleared when leaving COMP) — **115/C**. Target official memory page does **not** list PreAns. Clone entry: ALPHA+Ans (`INFERRED`; chassis Ans ALPHA legend is empty; SHIFT+Ans = DRG▶). Variables A,B,C,D,E,F,M,X,Y. Independent M via M+/M− (M+ evaluates the current expression — `TARGET-OFFICIAL-DOC`). Ans/M/variables **survive AC, mode change, power off**. CLR Memory Yes clears all memories. Encoded in `state-transitions.test.ts`, not only in this paragraph.

## SRC-P36 Functions `[CROSS-MODEL-SOURCE; target: CONFIRMED that trig/hyp/π/e exist]`

π internal 3.14159265358980; e internal 2.71828182845904. sin 30°=0.5; sin⁻¹ 0.5=30° (Deg, LineIO). sinh 1=1.175201194.

## SRC-P37–38

DRG conversions. e^5×2 Sci 3 → 2.97×10². log 1000=3; log₂16=4. 1.2×10³=1200. (1+1)^(2+2)=16. (5²)³=15625. ⁵√32=2.

## SRC-P39–43 Calculus

∫ Gauss-Kronrod; COMP only. Example ∫₁ᵉ ln x dx = 1. d/dx, Σ, Π documented. **P2 / not VERIFIED.**

## SRC-P92–94 Errors

Math ERROR, Stack ERROR, Syntax ERROR, Argument ERROR, Dimension ERROR, Variable ERROR, Can't Solve Error, Insufficient MEM Error, Time Out Error. Left/right from error shows location; AC clears calculation.

## SRC-P96 Priority

1 parens 2 prefix functions with `)` 3 postfix (x²,x³,x⁻¹,x!,°′″,°,r,g,%,t), powers, roots 4 fractions 5 unary (−), base-n 6 conversions/STAT estimates 7 implied mul 8 nPr nCr ∠ 9 dot 10 × ÷ ÷R 11 + − 12 and 13 or/xor/xnor.  
(−)2² = −4; ((−)2)² = 4.

## SRC-P97–100 Ranges

Internal 15 digits. Display precision ±1 at 10th digit typical. Function domains as tabulated (sin Deg |x|<9e9, x! 0–69, etc.). π form |x|<10⁶.

## SRC-P100 Specs (combined 115/C)

11.1×77×161.5 mm, 95 g, solar+LR44. Matches official 991ES PLUS-2 mechanical spec.

## SRC-P76–78 / TGT-TOC TABLE `[TARGET-OFFICIAL-DOC for f(x) flow; SRC-P76 CROSS-MODEL-SOURCE for 115/C extras]`

Official 570/991 2nd-edition TABLE page: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/creating_number.html

| Behavior | Clone | Evidence |
| --- | --- | --- |
| Enter TABLE | MODE `7` | `TARGET-OFFICIAL-DOC` |
| f(x) input | COMP editor; X via ALPHA+`)` | `TARGET-OFFICIAL-DOC` |
| g(x) | **Not implemented.** Target official TABLE is f(x) only. SETUP `f(x),g(x)` leftover is ignored | `TARGET-OFFICIAL-DOC` (scope); SETUP leftover `CROSS-MODEL-SOURCE` |
| Start? / End? / Step? | `=` advances; defaults 1 / 5 / 1 prefilled | `TARGET-OFFICIAL-DOC` |
| x generation | Start, Start+Step, … last x ≤ End | `TARGET-OFFICIAL-DOC` (increment until End) |
| End inclusive | Official example −1 ≦ x ≦ 1 step 0.5 → 5 rows | `TARGET-OFFICIAL-DOC` |
| Row order | Increasing X | `TARGET-OFFICIAL-DOC` |
| Negative Step | Argument ERROR | `INFERRED` from “increment” + “End always greater than Start”; **NEEDS-HUMAN-REVIEW** |
| Step = 0 | Argument ERROR | `INFERRED`; **NEEDS-HUMAN-REVIEW** |
| End ≤ Start | Argument ERROR | `TARGET-OFFICIAL-DOC` (“End always greater than Start”); exact error name **NEEDS-HUMAN-REVIEW** |
| Invalid Start/End/Step expression | existing Syntax/Math/Argument ERROR | Reuses COMP evaluator (`INFERRED` routing) |
| Max rows | 30 X-values | `TARGET-OFFICIAL-DOC` |
| Error when >30 | Insufficient MEM Error | Cap: `TARGET-OFFICIAL-DOC`. **Name:** `CROSS-MODEL-SOURCE` (SRC-P92 / 115/C). Target page says only “an error”. |
| Precision / formatting | `resultFromSym` + current SETUP | Same evaluator (`INFERRED` reuse). Natural/Linear switch **deletes** f(x): `TARGET-OFFICIAL-DOC` |
| Angle unit | Current SETUP Deg/Rad/Gra | Same evaluator (`INFERRED` reuse) |
| Navigation | Up/down one row; clone LCD shows one row | Keys: `INFERRED`. One-row LCD: `INFERRED`; **NEEDS-HUMAN-REVIEW** vs hardware table screen |
| Table is view-only | Digits/edit swallowed in `view` | `TARGET-OFFICIAL-DOC` |
| AC on table view | Return to f(x), function kept | `TARGET-OFFICIAL-DOC` |
| AC on Start/End/Step prompts | Clears the current editor (COMP AC) | `INFERRED`; **NEEDS-HUMAN-REVIEW** |
| EXIT | No dedicated EXIT. MODE 1 → COMP; SHIFT+AC power off | `INFERRED` |
| Shares X with COMP | Generation writes last X to `variables.X` | `TARGET-OFFICIAL-DOC` |
| Shares Ans | **Not** updated by generation | `INFERRED`; **NEEDS-HUMAN-REVIEW** |
| Row eval | `evaluateAtoms(fx, state, rng, { X })` overlay; persistent X unchanged until success | Overlay: implementation. Persistent-X-after-success: `TARGET-OFFICIAL-DOC` |
| Pol/Rec/∫/d/dx/Σ in f(x) | Syntax ERROR (TABLE-only scan) | `TARGET-OFFICIAL-DOC` |
| Per-row Math ERROR | Keep table; show error on that row | `INFERRED`; **NEEDS-HUMAN-REVIEW** |
| Persist TABLE grid | **Not** saved (schema v1; `table` stripped) | `INFERRED`; hardware power-off **NEEDS-HUMAN-REVIEW** |

Target official setup init does **not** list a TABLE f(x)/g(x) format. 115/C dual-function TABLE is not copied.

## SRC-P56–57 / TGT-TOC CMPLX `[TARGET-OFFICIAL-DOC for examples; SRC-P56 CROSS-MODEL-SOURCE for 115/C overlap]`

Official 570/991 2nd-edition CMPLX page: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/cmplx.html

| Behavior | Clone | Evidence |
| --- | --- | --- |
| Enter CMPLX | MODE `2`; same COMP editor | `TARGET-OFFICIAL-DOC` |
| `i` | ALPHA+ENG | `EMPIRICAL` chassis alpha `"i"` |
| `3i` | implied mul `3 × i` | existing COMP evalExpr |
| `∠` | SHIFT+`(-)` binary polar | `EMPIRICAL` chassis shift `"∠"` |
| `(2+6i)÷(2i)` | `3-i` | `TARGET-OFFICIAL-DOC` |
| `2∠45` Deg a+bi | `√2+√2i` | `TARGET-OFFICIAL-DOC` |
| `√2+√2i` with SETUP r∠θ | `2∠45` | `TARGET-OFFICIAL-DOC` |
| `(1-i)⁻¹` | `1/2+1/2i` | `TARGET-OFFICIAL-DOC` |
| `(1+i)²+(1-i)²` | `0` (packs to real) | `TARGET-OFFICIAL-DOC` |
| Conjg(2+3i) | `2-3i` | `TARGET-OFFICIAL-DOC` |
| Abs(1+i) | `√2` | `TARGET-OFFICIAL-DOC` |
| arg(1+i) Deg | `45` | `TARGET-OFFICIAL-DOC` |
| Override `r∠θ` / `a+bi` suffix | SHIFT+`2` then 3/4 | Commands `TARGET-OFFICIAL-DOC`. Menu numbering `CROSS-MODEL-SOURCE` **NHR** |
| `i` / `∠` in COMP | Math ERROR | Official: enter CMPLX first. `∠` in COMP: `INFERRED` |
| √(negative) even in CMPLX | Math ERROR | `INFERRED`; do not invent `√(−1)=i` |
| sin/log/√ of non-real | Math ERROR | **DEFERRED** (not on official CMPLX page) |
| Complex STO | Math ERROR if imag ≠ 0 | **PARTIAL** / `INFERRED` |
| LineIO a and bi on separate lines | not implemented; two-line HTML LCD | **NEEDS-HUMAN-REVIEW** |
| Persist | schema v1; `ansIm`/`preAnsIm` default `"0"` | documented default |

Clone (D-018): `Sym.cplx` rectangular. Not a COMP display hack. Not mathjs. Not BASE-N.

## SRC-P66–69 / TGT-TOC BASE-N `[TARGET-OFFICIAL-DOC for widths, examples, logical ops; SRC-P66 CROSS-MODEL-SOURCE for 115/C overlap]`

Official 570/991 2nd-edition BASE-N page: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/base-n_calculations.html

| Behavior | Clone | Evidence |
| --- | --- | --- |
| Enter BASE-N | MODE `4`; default DEC | `TARGET-OFFICIAL-DOC` |
| Switch radix | `x²` DEC, `^` HEX, `log` BIN, `ln` OCT (no ALPHA) | `TARGET-OFFICIAL-DOC` + `EMPIRICAL` chassis legends |
| A–F | HEX: unshifted `(-)`…`tan`. Else ALPHA+key | `TARGET-OFFICIAL-DOC` that A–F keys exist; when ALPHA is required: `INFERRED` **NHR** |
| Width | BIN 16-bit; DEC/HEX/OCT 32-bit two's complement | `TARGET-OFFICIAL-DOC` |
| Signed DEC range | −2147483648 … 2147483647 | `TARGET-OFFICIAL-DOC` |
| BIN/OCT/HEX display | two's-complement bit pattern, padded; DEC uses minus | `TARGET-OFFICIAL-DOC` |
| No fractions/exponents | keys ignored / not in grammar | `TARGET-OFFICIAL-DOC` |
| ÷ fractional part | truncated toward 0 | Cut-off: `TARGET-OFFICIAL-DOC`. Toward 0: `INFERRED` **NHR** |
| + − × overflow | Math ERROR if signed result leaves the word | `INFERRED` **NHR** (not silent wrap) |
| and/or/xor/xnor/Not/Neg | SHIFT+`3` BASE page 0; mask to current width | Ops: `TARGET-OFFICIAL-DOC`. Menu 1=and…6=Neg: `CROSS-MODEL-SOURCE` FAQ |
| d/h/b/o suffixes | SHIFT+`3` BASE page 1 (down) | Commands: `TARGET-OFFICIAL-DOC`. Page layout: `INFERRED` **NHR** |
| Mixed 10d+10h+10b+10o | 36 in DEC | `TARGET-OFFICIAL-DOC` |
| 15×37 then HEX/BIN/OCT | 555 / 0000022B / 0000001000101011 / 00000001053 | `TARGET-OFFICIAL-DOC` |
| Invalid current-radix digit | Ignored at keypress | `INFERRED` **NHR** |
| Illegal suffix digits (e.g. `2b`) | Syntax ERROR at `=` | `INFERRED` |
| Out of word / ÷0 | Math ERROR | `INFERRED` / overlapping SRC-P92 names `CROSS-MODEL-SOURCE` |
| Bit shifts | **Not implemented** | Official BASE-N page does not list them → **DEFERRED** |
| Ans | Signed decimal string; survives MODE 1 | Memories survive mode change: `TARGET-OFFICIAL-DOC`. BASE-N writes that string: `INFERRED` **NHR** |
| COMP editor | Unused in BASE-N (`BaseNToken[]`) | Architecture (D-017) |
| Persist | Radix kept; tokens/value stripped | `INFERRED` **NHR** |

Clone (D-017): `bigint` word with explicit 16/32-bit mask/sign. Not COMP `decimal.js` shown as hex.

## NEEDS HUMAN REVIEW

- Exact SETUP page-2 item numbers (glyphs dropped). `[NEEDS-HUMAN-REVIEW]`
- PreAns on FX-991ESPLUS-2: omitted from target official memory ToC; no PreAns legend on chassis Ans key. `[CROSS-MODEL-SOURCE` vs `TARGET-OFFICIAL-DOC` → UNCONFIRMED]
- Rounding-to-even vs half-up. Clone uses `ROUND_HALF_UP`. `[NEEDS-HUMAN-REVIEW]`
- Dual TABLE f,g on 991ES PLUS-2 vs 115/C (D-007). Target official TABLE page is **f(x) only**. Clone implements f(x); g(x) is not implemented. `[CONFLICT` / SETUP leftover `CROSS-MODEL-SOURCE`]
- TABLE zero/negative Step vs hardware; per-row Math ERROR policy; TABLE persist across power-off; one-row LCD vs hardware table screen. `[NEEDS-HUMAN-REVIEW]`
- BASE-N +/−/× overflow vs wrap; ÷ toward-zero; A–F vs `(-)` outside HEX; BASE menu page order for d/h/b/o; persist of BASE-N expression; invalid-digit ignore vs queued Syntax ERROR. `[NEEDS-HUMAN-REVIEW]`
- CMPLX SHIFT+`2` menu numbering vs hardware; LineIO a/bi on separate lines; S⇔D vs polar/rect; complex STO; real results in r∠θ SETUP (clone does not print `r∠0`); PreAns imag across COMP. `[NEEDS-HUMAN-REVIEW]`
- Visual keymap vs original chat binary (file not in repo). `[NEEDS-HUMAN-REVIEW]`

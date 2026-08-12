# calc_logic_reference.md

Citations refer to **printed page numbers** in `sources/supplied/FX991ESPLUS2_user_manual.pdf` (105 pages). Extracted text is imperfect (key glyphs often dropped). Rules below are only those the extractor plus ToC support. Diagram-only sequences: `NEEDS HUMAN REVIEW`.

## SRC-P4 Initializing

CLR → All → Yes initializes mode and setup and **clears all memory**. Sample operations assume initial default setup.

## SRC-P6 Power

ON turns the calculator on. SHIFT AC (OFF) turns it off. Auto power-off after **approximately 10 minutes**.

## SRC-P6–8 Keys and indicators

SHIFT / ALPHA select alternate key markings (gold / red). Indicators: S, A, M, STO, RCL, STAT, CMPLX, MAT, VCT, D/R/G, FIX, SCI, Math. Replay ▲▼ when history exists.

## SRC-P10 Modes (115/C list)

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

## SRC-P32–35 Memory

Ans last result; PreAns previous (COMP only; cleared when leaving COMP). Variables A,B,C,D,E,F,M,X,Y. Independent M via M+/M−. Ans/M/variables **survive AC, mode change, power off**. CLR Memory Yes clears all memories.

## SRC-P36 Functions

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

## NEEDS HUMAN REVIEW

- Exact SETUP page-2 item numbers (glyphs dropped).
- PreAns key sequence on this chassis (no dedicated key in overlay).
- Rounding-to-even vs half-up.
- Dual TABLE f,g on 991ES PLUS-2 vs 115/C.
- Visual keymap vs original chat binary.

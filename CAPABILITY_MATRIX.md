# CAPABILITY_MATRIX.md

Statuses: `VERIFIED` | `IMPLEMENTED` | `PARTIAL` | `UNSUPPORTED` | `BLOCKED` | `N/A`  
Priority: `REQUIRED-V1` | `OPTIONAL-V1` | `DEFERRED` | `UNSUPPORTED-BY-HARDWARE` | `NEEDS-HUMAN-REVIEW`

Legend: Impl = implementation status; Ver = verification status.

| ID | Capability | Priority | Source | Impl | Ver | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| C-P0-COMP | COMP mode arithmetic | REQUIRED-V1 | SRC-P18,P21 | IMPLEMENTED | VERIFIED | GT-P18-EX1, GT-P21-* |
| C-P0-PREC | Operator priority | REQUIRED-V1 | SRC-P96 | IMPLEMENTED | VERIFIED | GT-P96 |
| C-P0-TRIG | sin/cos/tan + inverse | REQUIRED-V1 | SRC-P36 | IMPLEMENTED | VERIFIED | GT-P36-EX1, EX2 |
| C-P0-ANG | Deg/Rad/Gra | REQUIRED-V1 | SRC-P12 | IMPLEMENTED | VERIFIED | GT-P12-RAD |
| C-P0-FRAC | Natural fractions | REQUIRED-V1 | SRC-P22 | IMPLEMENTED | VERIFIED | GT-P22-EX1 |
| C-P0-SD | S⇔D toggle | REQUIRED-V1 | SRC-P21 | IMPLEMENTED | VERIFIED | GT-P21-EX1, EX3 |
| C-P0-POW | Exponents / x² / x³ | REQUIRED-V1 | SRC-P38 | IMPLEMENTED | VERIFIED | GT-P38-EX1–3 |
| C-P0-ROOT | Square/cube/nth roots | REQUIRED-V1 | SRC-P18,P38 | IMPLEMENTED | PARTIAL | sqrt used in editor; nth-root not golden-complete |
| C-P0-EDIT | Cursor / DEL / insert | REQUIRED-V1 | SRC-P20 | IMPLEMENTED | PARTIAL | replay edit GT-P32 |
| C-P0-SHIFT | SHIFT latch consume | REQUIRED-V1 | SRC-P6,P8 | IMPLEMENTED | VERIFIED | SHIFT test |
| C-P0-ALPHA | ALPHA A–F,X,Y,M | REQUIRED-V1 | SRC-P34 | IMPLEMENTED | VERIFIED | ALPHA store/recall |
| C-P0-REPLAY | History/replay | REQUIRED-V1 | SRC-P31–32 | IMPLEMENTED | VERIFIED | GT-P32 |
| C-P0-ERR | Math/Syntax error + recover | REQUIRED-V1 | SRC-P92 | IMPLEMENTED | VERIFIED | GT-P92 |
| C-P0-ANS | Ans / PreAns | REQUIRED-V1 | SRC-P32–33 | IMPLEMENTED | PARTIAL | Ans VERIFIED; PreAns key not on chassis — PARTIAL |
| C-P0-MEM | Variables + M+ | REQUIRED-V1 | SRC-P34–35 | IMPLEMENTED | VERIFIED | ALPHA test; M+ ungolden |
| C-P0-AC | AC vs CLR Setup/All | REQUIRED-V1 | SRC-P15,P35 | IMPLEMENTED | VERIFIED | AC test; CLR menus IMPLEMENTED |
| C-P0-PERSIST | localStorage schema v1 | REQUIRED-V1 | spec §8 | IMPLEMENTED | PARTIAL | hydrate on load; no e2e refresh yet |
| C-P0-KEYS | Physical overlay + keymap.json | REQUIRED-V1 | chassis | IMPLEMENTED | PARTIAL | coords tests; visual NHR |
| C-P0-LCD | LCD display model | REQUIRED-V1 | SRC-P7–8 | IMPLEMENTED | PARTIAL | indicators + expr/result |
| C-P0-PWA | Install + offline SW | REQUIRED-V1 | spec §9 | IMPLEMENTED | BLOCKED | Pages not confirmed live |
| C-P0-LOG | log / ln / 10^x / e^x | REQUIRED-V1 | SRC-P37 | IMPLEMENTED | VERIFIED | GT-P37 |
| C-P0-PCT | Percent | REQUIRED-V1 | SRC-P23 | IMPLEMENTED | VERIFIED | GT-P23 |
| C-P0-FIX | Fix/Sci/Norm | REQUIRED-V1 | SRC-P13 | IMPLEMENTED | VERIFIED | GT-P13 Fix3 |
| C-P0-PI | π / e constants | REQUIRED-V1 | SRC-P36 | IMPLEMENTED | VERIFIED | GT-P21-EX1 |
| C-P0-HYP | hyp prefix | REQUIRED-V1 | SRC-P36 | IMPLEMENTED | PARTIAL | no golden sinh example in suite |
| C-P0-MULTI | Colon multi-statement | REQUIRED-V1 | SRC-P24 | IMPLEMENTED | PARTIAL | editor colon; no golden |
| C-OPT-KBD | Physical keyboard map | OPTIONAL-V1 | spec §5 | IMPLEMENTED | PARTIAL | repeat ignored |
| C-P1-CMPLX | CMPLX mode | REQUIRED-V1* | SRC-P56 | PARTIAL | — | mode entry only |
| C-P1-STAT | STAT mode | REQUIRED-V1* | SRC-P57 | PARTIAL | — | mode entry only |
| C-P1-BASE | BASE-N | REQUIRED-V1* | SRC-P66 | PARTIAL | — | mode entry only |
| C-P1-EQN | EQN | REQUIRED-V1* | SRC-P70 | PARTIAL | — | mode entry only |
| C-P1-MAT | MATRIX | REQUIRED-V1* | SRC-P73 | PARTIAL | — | mode entry only |
| C-P1-TBL | TABLE | REQUIRED-V1* | SRC-P76 | PARTIAL | — | mode entry only |
| C-P1-VCT | VECTOR | REQUIRED-V1* | SRC-P79 | PARTIAL | — | mode entry only |
| C-P2-INT | Numerical integration | DEFERRED | SRC-P39 | PARTIAL | — | token only |
| C-P2-DIFF | d/dx | DEFERRED | SRC-P41 | PARTIAL | — | token only |
| C-P2-SUM | Σ / Π | DEFERRED | SRC-P42–43 | PARTIAL | — | |
| C-P2-SOLVE | CALC/SOLVE | DEFERRED | SRC-P47–51 | UNSUPPORTED | — | |
| C-HW-INEQ | INEQ | UNSUPPORTED-BY-HARDWARE | 115/C PDF only | UNSUPPORTED | N/A | |
| C-HW-VERIF | VERIFY | UNSUPPORTED-BY-HARDWARE | 115/C PDF only | UNSUPPORTED | N/A | |
| C-HW-DIST | DIST | UNSUPPORTED-BY-HARDWARE | 115/C PDF only | UNSUPPORTED | N/A | |
| C-NHR-CAL | Visual keymap vs chat photo | NEEDS-HUMAN-REVIEW | chassis | IMPLEMENTED | NHR | `?debug=true` |
| C-NHR-RND | Rounding ties | NEEDS-HUMAN-REVIEW | SRC-P13 “rounded off” | IMPLEMENTED | NHR | HALF_UP |

\*P1 modes are on the target device and are inventoried as required for a *complete* clone. They are **not** part of the §15 functional-v1 floor. They are not silently omitted: they are `PARTIAL` (mode switch works; editors unverified).

## Counts (see final report)

Computed in `docs/COVERAGE_AUDIT.md`.

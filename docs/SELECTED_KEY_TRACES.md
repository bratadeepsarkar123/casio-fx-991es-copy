# Selected manual: key traces and source-backed checks

This document records selected-page expectations beside observed application reducer state. It supplements the complete page-by-page [requirement ledger](MANUAL_REQUIREMENT_LEDGER.md); a chapter heading or source-code inspection alone is not counted as a trace.

## Source and observation method

- The authority for expected app behavior is the owner-selected 46-page PDF, `SEL-FX570-991ES-2011`, SHA-256 `1d2cd62e3af88b404dbc5db87646016e9e4a927f7798db8c89112777168d2686`. The selected source names fx-570ES PLUS / fx-991ES PLUS but no edition. Its printed pages are `E-2`–`E-43`; the last two sheets (PDF 45–46) are unpaginated. Do not promote these results to physical fx-991ES PLUS-2 confirmation.
- The citations below use PDF page first, then the printed `E-` page. `OWNER-SELECTED-MANUAL` describes expected behavior. **Reducer trace** means the ordered physical `KeyId`s were passed to the current `reduce` function and the resulting LCD projection/state was read. It is an app observation, not a hardware or browser result. **Browser evidence** is identified separately and refers to the retained integration work in the checkpoint. **Untested** means no selected-source key path was executed for that cell. **Physical-only** means a web reducer cannot establish the printed hardware fact.
- Traces were run on 2026-11-21 with pinned Node 22.14.0 and the repository-installed Vite Node runner. Temporary scripts in `%TEMP%` imported `createInitialState`, `reduce`, `lcdExpression`, `lcdResult`, and `lcdIndicators`; each key was dispatched as `{source:"test"}` and captured at result/error/menu steps. No build, Vitest, or Playwright run was performed by this source-audit worker.
- `KeyId` names are the exact values in [`public/keymap.json`](../public/keymap.json) and [`src/calc/keys.ts`](../src/calc/keys.ts). The normalized key arrays are in [`examples.jsonl`](../sources/selected-manual/examples.jsonl); records with `runtime_observation` identify the trace result. The PDF page cache is local/ignored, but each citation can be opened as `sources/selected-manual/pages/pdf-NNN.md` and matched against the source render checklist.

## Historical numerical sources: PDF 38–39 / E-37–E-38

The selected source says constants are based on “CODATA recommended values (March 2007)” (PDF 38/E-37), and conversions use “NIST Special Publication 811 (1995)” (PDF 39/E-38). The reference evidence is:

| Data family | Primary reference and pages | What it establishes | Limit / interpretation |
| --- | --- | --- | --- |
| CONST 01–40 | [NIST archived CODATA 2006 complete listing](https://physics.nist.gov/cuu/pdf/all_2006.pdf), especially pp. 1–2, 4, 8; [NIST version history](https://pml.nist.gov/cuu/Reference/versioncon.shtml) | NIST says Version 5.0, dated 7 March 2007, updated values to the 2006 CODATA adjustment. The archived 2006 listing gives the values, units, and uncertainties that match the selected table entries checked here (e.g. `c0`, `ε0`, `μ0`). | The 2007 NIST version history corroborates the calculator manual’s March 2007 label. A statement that every historical presentation detail is identical to the manual remains an inference; the 2006 adjustment itself is the sourced data set. Exact defining constants (for example `c0`) are distinguishable from measured/adjusted constants with uncertainties. |
| CONV 01–40 | [NIST SP 811 (1995), DOI PDF](https://doi.org/10.6028/NIST.sp.811e1995), App. B.8 pp. 59–69 (PDF pages 59–69); temperature definitions/formulas pp. 17, 61 and 78 | B.8 states bold factors are exact and other factors are rounded. PDF p. 61 gives `1 calorie (15 °C) = 4.18580 J`; PDF p. 66 gives `1 oz avoirdupois = 2.834952E−02 kg` / `2.834952E+01 g`. PDF p. 67 gives the exact avoirdupois pound conversion `0.45359237 kg/lb` and notes that pound-containing units refer to the avoirdupois pound. Celsius temperature is `t = T − 273.15 K` (PDF p. 17); °C/°F conversion formula/factors are in the temperature entries. | Conversion coefficients in the calculator are not all exact definitions. For the manual’s `100 g → oz` output, use the printed rounded `28.34952 g/oz`: `100 / 28.34952 = 3.5273965837869565`, displayed `3.527396584`. The exact international definition `1 lb = 0.45359237 kg` and `16 oz/lb` gives `28.349523125 g/oz` and `3.527396195`; substituting this exact value does **not** reproduce the manual’s displayed example. The selected example validates the rounded archival coefficient, not an exact-factor calculation. |

The manual’s two examples are also an important evidence boundary: `5 cm → in`, `100 g → oz`, and `−31 °C → °F` are visually printed output checks; the `5 J → cal` trace below is an independent calculation from the reference factor and 15 °C condition, not a printed worked result. Exact factor status follows SP 811’s boldface convention, not the fact that an output has many digits.

### Independent check of all 40 CONST entries

I compared every row in `src/calc/scientificData.ts` with NIST's official archived CODATA 2006 [ASCII complete listing](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2006.txt) (`allascii_2006.txt`) and, for code 23, the extensive table in [all_2006.pdf](https://physics.nist.gov/cuu/pdf/all_2006.pdf). ASCII line numbers below are 1-based in the downloaded NIST file. The source manual's PDF 37/E-36 prints codes 01–32; PDF 38/E-37 prints codes 33–40 and states CODATA recommended values (March 2007). Stored decimals match all corresponding NIST value digits. For the NIST ellipsis rows 32, 33 and 37, the product retains the matching displayed prefix. Code 23 is on the official report's PDF p. 1 but is omitted as a direct row in the ASCII listing; code 38 is not a CODATA row and is an exact Celsius offset. NIST's version history identifies 7 March 2007 as Version 5.0 updated to the 2006 CODATA adjustment. This verifies the data set and dated NIST presentation, while the calculator's exact March 2007 provenance remains a source-level correspondence rather than proof of its internal source file.

The application record has no unit property, so the unit column here describes the matched NIST quantity, not a displayed unit suffix. A blank NIST unit is dimensionless. `exact` means exact equality after removing NIST's parenthesized uncertainty and normalizing digit-group spaces and powers of ten; values are compared as decimals, not binary floating point.

| Code | Manual name | NIST 2006 quantity / unit | NIST value as printed | Result |
| ---: | --- | --- | --- | --- |
| 01 | proton mass | ASCII line 268; kg | `1.672 621 637(83) e-27` | exact |
| 02 | neutron mass | ASCII line 229; kg | `1.674 927 211(84) e-27` | exact |
| 03 | electron mass | ASCII line 94; kg | `9.109 382 15(45) e-31` | exact |
| 04 | muon mass | ASCII line 201; kg | `1.883 531 30(11) e-28` | exact |
| 05 | Bohr radius | ASCII line 57; m | `0.529 177 208 59(36) e-10` | exact |
| 06 | Planck constant | ASCII line 248; J s | `6.626 068 96(33) e-34` | exact |
| 07 | nuclear magneton | ASCII line 243; J T^-1 | `5.050 783 24(13) e-27` | exact |
| 08 | Bohr magneton | ASCII line 52; J T^-1 | `927.400 915(23) e-26` | exact |
| 09 | reduced Planck constant | ASCII line 250, "Planck constant over 2 pi"; J s | `1.054 571 628(53) e-34` | exact |
| 10 | fine-structure constant | ASCII line 123; dimensionless | `7.297 352 5376(50) e-3` | exact |
| 11 | classical electron radius | ASCII line 63; m | `2.817 940 2894(58) e-15` | exact |
| 12 | electron Compton wavelength | ASCII line 64, "Compton wavelength"; m | `2.426 310 2175(33) e-12` | exact |
| 13 | proton gyromagnetic ratio | ASCII line 262; s^-1 T^-1 | `2.675 222 099(70) e8` | exact |
| 14 | proton Compton wavelength | ASCII line 258; m | `1.321 409 8446(19) e-15` | exact |
| 15 | neutron Compton wavelength | ASCII line 221; m | `1.319 590 8951(20) e-15` | exact |
| 16 | Rydberg constant | ASCII line 281; m^-1 | `10 973 731.568 527(73)` | exact |
| 17 | atomic mass constant | ASCII line 19; kg | `1.660 538 782(83) e-27` | exact |
| 18 | proton magnetic moment | ASCII line 264; J T^-1 | `1.410 606 662(37) e-26` | exact |
| 19 | electron magnetic moment | ASCII line 90; J T^-1 | `-928.476 377(23) e-26` | exact |
| 20 | neutron magnetic moment | ASCII line 226; J T^-1 | `-0.966 236 41(23) e-26` | exact |
| 21 | muon magnetic moment | ASCII line 197; J T^-1 | `-4.490 447 86(16) e-26` | exact |
| 22 | Faraday constant | ASCII line 120; C mol^-1 | `96 485.3399(24)` | exact |
| 23 | elementary charge | `all_2006.pdf`, p. 1; C | `1.602 176 487(40) x 10^-19` | exact |
| 24 | Avogadro constant | ASCII line 51; mol^-1 | `6.022 141 79(30) e23` | exact |
| 25 | Boltzmann constant | ASCII line 58; J K^-1 | `1.380 6504(24) e-23` | exact |
| 26 | molar volume of ideal gas | ASCII line 192, `(273.15 K, 101.325 kPa)`; m^3 mol^-1 | `22.413 996(39) e-3` | exact |
| 27 | molar gas constant | ASCII line 188; J mol^-1 K^-1 | `8.314 472(15)` | exact |
| 28 | speed of light in vacuum | ASCII line 300; m s^-1 | `299 792 458` | exact |
| 29 | first radiation constant | ASCII line 124; W m^2 | `3.741 771 18(19) e-16` | exact |
| 30 | second radiation constant | ASCII line 287; m K | `1.438 7752(25) e-2` | exact |
| 31 | Stefan-Boltzmann constant | ASCII line 303; W m^-2 K^-4 | `5.670 400(40) e-8` | exact |
| 32 | electric constant | ASCII line 85; F m^-1 | `8.854 187 817... e-12` | stored digits match prefix |
| 33 | magnetic constant | ASCII line 183; N A^-2 | `12.566 370 614... e-7` | stored digits match prefix |
| 34 | magnetic flux quantum | ASCII line 184; Wb | `2.067 833 667(52) e-15` | exact |
| 35 | standard acceleration of gravity | ASCII line 301; m s^-2 | `9.806 65` | exact |
| 36 | conductance quantum | ASCII line 66; S | `7.748 091 7004(53) e-5` | exact |
| 37 | characteristic impedance of vacuum | ASCII line 62; Ohm | `376.730 313 461...` | stored digits match prefix |
| 38 | Celsius temperature | no CODATA row; exact Celsius offset, K | `273.15` | defined offset; not a CODATA match |
| 39 | Newtonian constant of gravitation | ASCII line 241; m^3 kg^-1 s^-2 | `6.674 28(67) e-11` | exact |
| 40 | standard atmosphere | ASCII line 302; Pa | `101 325` | exact |

The table confirms 39 CODATA quantity/value matches, including code 23 via the report table. Code 38 is separately supported as the defined Celsius zero-point offset; it is not counted as an archival CODATA row. No numeric mismatch was found. The selected manual prints the names and symbols but no units; units above were independently taken from the NIST rows.

## Source requirements transcribed from the numerical pages

The full E-37/E-38 conversion code table below is transcribed from PDF 38–39. It is a source map, **not** a 40-code runtime verification: reducer traces in this audit cover codes 02, 22, 38, and 39 only.

| Code | Source direction | Code | Source direction |
| ---: | --- | ---: | --- |
| 01 | in → cm | 21 | oz → g |
| 02 | cm → in | 22 | g → oz |
| 03 | ft → m | 23 | lb → kg |
| 04 | m → ft | 24 | kg → lb |
| 05 | yd → m | 25 | atm → Pa |
| 06 | m → yd | 26 | Pa → atm |
| 07 | mile → km | 27 | mmHg → Pa |
| 08 | km → mile | 28 | Pa → mmHg |
| 09 | n mile → m | 29 | hp → kW |
| 10 | m → n mile | 30 | kW → hp |
| 11 | acre → m² | 31 | kgf/cm² → Pa |
| 12 | m² → acre | 32 | Pa → kgf/cm² |
| 13 | gal (US) → L | 33 | kgf·m → J |
| 14 | L → gal (US) | 34 | J → kgf·m |
| 15 | gal (UK) → L | 35 | lbf/in² → kPa |
| 16 | L → gal (UK) | 36 | kPa → lbf/in² |
| 17 | pc → km | 37 | °F → °C |
| 18 | km → pc | 38 | °C → °F |
| 19 | km/h → m/s | 39 | J → cal (15 °C) |
| 20 | m/s → km/h | 40 | cal (15 °C) → J |

PDF 39/E-38, visually checked from the render: overall result range is 0 or ±1×10⁻⁹⁹ through ±9.999999999×10⁹⁹; internal arithmetic uses 15 digits; ordinary single-calculation precision is generally ±1 at the 10th digit, with cumulative error for consecutive calculations. PDF 39/E-38 and PDF 40/E-39 list these function-domain families:

| Family | Selected manual requirement (transcribed) | Runtime status in this audit |
| --- | --- | --- |
| sin, cos | Degree: 0 ≤ |x| < 9×10⁹; radian: 0 ≤ |x| < 157079632.7; grad: 0 ≤ |x| < 1×10¹⁰. | Worked E-16/E-17 examples trace ordinary values; domain endpoints untested. |
| tan | Same mode-specific limits as sin, except singularities at |x|=(2n−1)×90° / (2n−1)×π/2 rad / (2n−1)×100 grad. | Singular/boundary inputs untested. |
| sin⁻¹, cos⁻¹ | 0 ≤ |x| ≤ 1. | Boundary ±1 untested. |
| tan⁻¹ | 0 ≤ |x| ≤ 9.999999999×10⁹⁹. | Boundary untested. |
| sinh, cosh | 0 ≤ |x| ≤ 230.2585092. | HYP numbered menu path is a reducer mismatch (E-16); numeric domain endpoints untested. |
| sinh⁻¹ | 0 ≤ |x| ≤ 4.999999999×10⁹⁹. | Untested. |
| cosh⁻¹ | 1 ≤ x ≤ 4.999999999×10⁹⁹. | HYP numbered menu path is a reducer mismatch (E-16); domain endpoints untested. |
| tanh | 0 ≤ |x| ≤ 9.999999999×10⁹⁹. | Untested. |
| tanh⁻¹ | 0 ≤ |x| ≤ 9.999999999×10⁻¹. | Untested. |
| log, ln | 0 < x ≤ 9.999999999×10⁹⁹. | Ordinary E-17 ln integral is traced; bounds untested. |
| 10ˣ | −9.999999999×10⁹⁹ ≤ x ≤ 99.99999999. | Untested. |
| eˣ | −9.999999999×10⁹⁹ ≤ x ≤ 230.2585092. | Ordinary examples traced; bounds untested. |
| √x | 0 ≤ x < 1×10¹⁰⁰. | Ordinary examples traced; bounds untested. |
| x² | |x| < 1×10⁵⁰. | Small values traced; bound untested. |
| x⁻¹ | 0 < |x| < 1×10¹⁰⁰. | Division/error cases traced elsewhere; range edge untested. |
| ³√x | |x| < 1×10¹⁰⁰. | Untested. |
| x! | Integer x, 0 ≤ x ≤ 69. | `69!` returns `1.711224524×10^98` at the printed upper bound; invalid inputs/lower boundary remain untested. |
| nPr | Integer n,r; 0 ≤ n < 1×10¹⁰; 0 ≤ r ≤ n; 1 ≤ n!/(n−r)! < 1×10¹⁰⁰. | `160 nPr 80` returns Math ERROR, consistent with the stated result/intermediate guard; other boundaries remain untested. |
| nCr | Integer n,r; 0 ≤ n < 1×10¹⁰; 0 ≤ r ≤ n; 1 ≤ n!/r! < 1×10¹⁰⁰ or 1 ≤ n!/(n−r)! < 1×10¹⁰⁰. | **Mismatch:** `160 nCr 80` returns `9.204512581×10^46`; both stated factorial ratios exceed 10^100 although the final combination fits. |
| Pol(x,y) | |x|,|y| ≤ 9.999999999×10⁹⁹; √(x²+y²) ≤ 9.999999999×10⁹⁹. | Small E-17 Pol inputs traced; bounds untested; LineIO multi-result output mismatch is above. |
| Rec(r,θ) | 0 ≤ r ≤ 9.999999999×10⁹⁹; θ has the same limit as sin x. | Small E-17 Rec input traced; bounds untested; LineIO multi-result output mismatch is above. |
| Degree/minute/second input | |a|, b, c < 1×10¹⁰⁰; 0 ≤ b,c; shown seconds may have ±1 at the second decimal place. | Untested. |
| Decimal ↔ sexagesimal | |x| < 1×10¹⁰⁰; conversion span 0°0′0″ ≤ |x| ≤ 9999999°59′59″. | Untested at limits. |
| xʸ | Positive x: −1×10¹⁰⁰ < y log x < 100; x=0 requires y>0; negative x requires the printed odd-denominator rational exponent; overflow also constrained using y log|x|. | Untested at selected-page boundary. |
| x-th root of y | Separate conditions for y>0, y=0, y<0; the negative-y case requires the printed odd root-index form; logarithmic magnitude bounds are shown on E-39. | Root-index/radicand edge untested. The extracted formula is ambiguous; retain the rendered PDF table as the exact glyph reference. |
| a b/c | Integer, numerator, and denominator total at most 10 digits, including division marks. | Untested. |
| RanInt#(a,b) | a < b; |a|,|b| < 1×10¹⁰; b−a < 1×10¹⁰. | Untested at boundaries. |

E-39 also cautions that powers, roots, factorial, nPr and nCr require consecutive internal calculation and may accumulate errors; accuracy can degrade near singular/inflection points. Natural π-form result display is available only for |x|<10⁶. These are source-inspected warnings, not claims that all corresponding limits were exercised.

## Follow-up selected traces: E-7–E-11 and E-39

The following are direct public `reduce()` KeyId traces, separate from browser or physical-calculator evidence. Sequence captures and intermediate observations have matching entries in [`examples.jsonl`](../sources/selected-manual/examples.jsonl). The selected pages were checked against the renders for PDF 8/E-7, PDF 9/E-8, PDF 10/E-9, PDF 11/E-10, PDF 12/E-11 and PDF 40/E-39.

| PDF / page | Initial state and physical KeyIds | Printed expectation | Observed reducer state / evidence |
| --- | --- | --- | --- |
| 8 / E-7 | COMP Natural; enter ASCII digit `1` 89, 90, 99, then 100 times. | Up to 99 bytes; when ≤10 bytes remain, cursor changes to the narrow form. | At 89 digits the counter is 89 (10 remain); at 99 it is 99; a 100th `1` is accepted and leaves a 100-byte expression in input state. `MAX_BYTES` and `byteCount` have no call sites; the LCD caret remains the same `showCaret` state and uses one static CSS class. **Reducer limit mismatch confirmed.** The exact rendered narrow-cursor geometry has no browser evidence in this audit. |
| 9 / E-8 | COMP Natural; press `sqrt` 30 times, then `1`. | Formula height may not exceed two display screens; input must stop beyond the limit. | Reducer accepts all 30 nested root templates and leaves an editable input tree. No reducer nesting guard is present in the inspected path. This proves acceptance by dispatch, but the 31-dot screen height was not measured in a browser; retain UI overflow as untested. |
| 10 / E-9 | COMP Natural; printed example `1+7/6`, four `LEFT`, `SHIFT DEL`, `sqrt`. | Capture the expression to the right of the cursor and use it as the next listed function's argument. | Produces `1+√((7/6))`; this pictured single-fraction case passes. The 12 listed keys were separately dispatched after a one-value capture: fraction, log-base, integral, derivative, Σ, nth root, 10^, e^, √, power, cube root and Abs all form their expected atom kind. |
| 10 / E-9 | COMP Natural; `1+2×3`, four `LEFT`, `SHIFT DEL`, then `sqrt` (or another listed wrapper). | The capture range continues right until an open parenthesis or function. With no such boundary in `2×3`, the full `2×3` expression is the right-hand argument. | **Mismatch:** the visible cursor is `1+|2×3`, but `argumentCapture` stores only the `2` atom (start 2, end 3); `sqrt` yields `1+√(2)×3`. The other listed wrappers also consume only `2` and leave `×3` outside. Unlisted square/cube/factorial/reciprocal operators affect only `2`; plain log/ln insert before it. These ordinary operations do not provide the E-9 right-expression capture range. |
| 11 / E-10 | COMP Natural; π path `SHIFT π ÷ 6 =`, `SHIFT =`, `S⇔D`; radical path `(√2+2)×√3=` and `SHIFT =`, `S⇔D`. | π/6 toggles to 0.5235987756 and back to π form. Radical expression is `√6+2√3` = 5.913591358; forced-decimal S⇔D must not restore a radical form. | π path displays `0.5235987756`, then the equivalent linear text `1π/6`; this reducer string was not visually compared with the natural LCD layout. **Mismatch:** the correct radical expression tree returns `3√3`, approx `5.196152423`, instead of `√6+2√3`, `5.913591358`. SHIFT = returns the same wrong decimal; S⇔D returns the wrong `3√3`. |
| 11 / E-10 | COMP Natural; numerator-first `2, frac, 3, RIGHT, +, 1, frac, 2, RIGHT, =`; template-first `frac,2,DOWN,3,RIGHT,+,frac,1,DOWN,2,RIGHT,=`. | Both pictured Natural entry methods for `2/3+1/2` return `7/6`. | Both sequences produce `(2/3)+(1/2)` and result `7/6`. These are reducer matches. |
| 11 / E-10 | COMP LineIO; `SHIFT MODE 2`, then `2, frac, 3, +, 1, frac, 2, =`. Also `0.5+1/2=`. | Fraction-only input returns `7┘6`; mixing decimal and fraction input returns decimal `1`. | **Mismatch:** fraction-only expression is `(2┘3)+(1┘2)` but LCD result is `1.166666667`, not `7┘6`. The mixed input `0.5+(1┘2)` returns `1`, matching the printed rule. |
| 11 / E-10 | COMP Natural; `2/3+1/2=`, then `SHIFT S⇔D` for d/c↔ab/c. Also test `12345678÷8=`, S⇔D, SHIFT S⇔D, S⇔D. | First result changes from improper `7/6` to mixed `1 1/6`. Decimal `1543209.75` must not convert to the 11-character mixed form `1543209 3/4`; it can remain improper `6172839/4`. | **Mismatch:** SHIFT S⇔D changes `setup.fractionFormat` from d/c to ab/c but leaves the displayed `7/6`. The overlength decimal path returns `1543209.75`, then `6172839/4`, not the prohibited 11-character mixed form; that length outcome matches the documented limit. |
| 11 / E-10 | COMP Natural; `4−3 1/2=` using `4,−,SHIFT frac,3,RIGHT,1,DOWN,2,=`. | `1/2` in Natural. | Result is `1/2`. Matches the pictured case. |
| 12 / E-11 | COMP Deg; all three printed percent calculations: `660÷880%`, `2500+2500×15%`, `3500−3500×25%`; percent is `SHIFT (`. | 75%, 2875, 2625. | Reducer results are 75, 2875 and 2625. Matches. |
| 12 / E-11 | COMP Deg; `2°20′30″ + 0°39′30″ =`; then `2°15′18″=` and successive DMS toggles. | Addition initially displays `3°00′00″`. Conversion example initially displays `2°15′18″`, then DMS toggles to decimal `2.255`, then back. | **Mismatch:** addition LCD displays `3`, while `result.sexagesimal` contains `3°0′0″`. For the conversion example, `=` displays decimal `2.255` immediately; first DMS displays sexagesimal and second DMS returns decimal. Initial output and toggle direction differ from the printed sequence. |
| 12 / E-11 | COMP; printed multi-statement `3+3 : 3×3 = =`; then engineering `1234 =`, `ENG`, `SHIFT ENG`. | Intermediate 6 then 9; engineering form 1.234×10^3, then the reverse ENG shift. | Multi-statement output is 6 then 9 using the printed `ALPHA,integral` colon key. ENG displays `1.234×10+03`; SHIFT ENG moves to `0.001234×10+06`. Repeated-ENG control `1234=,ENG,ENG` ends at `1234×10⁰`; printed reverse/forward `123=,SHIFT ENG,SHIFT ENG` ends at `0.000123×10⁶`. |
| 40 / E-39 | COMP; `160 SHIFT ÷ 80 =` (`nCr`); compare `160 SHIFT × 80 =` (`nPr`) and `69 SHIFT x^-1 =` (`69!`). | nCr requires both `n!/r!` and `n!/(n−r)!` below 10^100; `160 C 80` violates that guard. nPr must meet its result bound; `69!` is the allowed factorial upper bound. | **Mismatch:** nCr returns `9.204512581×10^46` despite both intermediate ratios exceeding 10^100. nPr returns Math ERROR; 69! returns `1.711224524×10^98`. The latter two match the selected constraints. |
| 40 / E-39 | COMP; `123456 SHIFT frac 7 DOWN 8 =`, then `1234567 SHIFT frac 8 DOWN 9 =`. | Mixed fraction total length, including fraction separators, is at most 10. First text `123456 7/8` has length 10 and is within the supported range; `1234567 8/9` has length 11 and is outside it. The manual does not specify a key-level or LCD response for out-of-range entry. | The 10-character value returns `987655/8`; the 11-character value is also accepted and returns `11111111/9` (approx `1234567.889`). The reducer accepts an input outside the stated range; exact expected handling is unspecified, so no particular error/rejection behavior is claimed. |

### Current-status supersession for pre-fix trace rows

The following older rows intentionally preserve the first reproductions, but their mismatch wording is no longer the current status. The replacement evidence is in the merged `examples.jsonl` records and the numbered E2–E22 crosswalk below.

| Historical row | Current replacement | Current evidence |
| --- | --- | --- |
| E-7 100-byte acceptance | 89 bytes enters the warning range; 99 is accepted; the 100th digit is rejected unchanged. | `selected-editor-conformance.test.ts`, `EX-E7-BYTE-CAP-001`. |
| E-8 parenthesized radical quotient | The current source-faithful trace is fraction-first: `frac,2,+,sqrt,2,right,right,1,+,sqrt,2,=`; the two RIGHT keys move from the radical to numerator end, then denominator. The old parenthesized array is labeled derived. | `selected-numeric.test.ts`, `EX-E8-RADICAL-QUOTIENT-001`; `editor.ts` denominator-operator fix. |
| E-9 `2×3` capture consumed only `2` | Capture now spans the complete RHS `2×3`; the wrapped result is `1+√(2×3)`. | `selected-editor-conformance.test.ts`, `EX-E9-CAPTURE-RANGE-001`. |
| E-10 radical projection / fraction display | The selected surd and Natural/LineIO fraction paths now match their printed outputs, including the d/c↔ab/c display transition and length fallback. | `selected-numeric.test.ts`, `EX-E10-SURD-001`, `EX-E10-FRACTION-DISPLAY-001`. |
| E-10 LineIO fraction rows and mixed separator | The no-RIGHT `2,frac,3,add,1,frac,2,=` path now returns `7┘6`; the printed `4,−,3,frac,1,frac,2,=` path now enters `4−3┘1┘2` and returns `1┘2`. The prior nested-denominator `−2` observation is retained only as corpus pre-fix evidence. | `selected-numeric.test.ts`, Chromium E-10 mixed-key test, `EX-E10-FRACTION-ENTRY-001`, `EX-E10-DECIMAL-INPUT-001`. |
| E-11 initial DMS output | DMS addition starts in sexagesimal and `2°15′18″` toggles through `2.255` and back. | `evaluate.ts` `post:dms` handling; `EX-E11-SEXAGESIMAL-001`. |
| E-16 numbered HYP menu | HYP item 1/5 now opens the reconstructed numbered menu and returns `sinh(1)=1.175201194` / `cosh⁻¹(1)=0`. | `selected-numeric.test.ts`, `EX-HYP-001`, `EX-HYP-002`. |
| E-17 Pol/Rec and E-18 complex LineIO one-line projections | Selected pair/component rows now retain and render the required values in the current public reducer/browser path. | `selected-numeric.test.ts`, `EX-POL-LINE-001`, `EX-REC-LINE-001`, `EX-CMPLX-LINE-001`, `EX-CMPLX-POLAR-LINE-001`. |
| E-22 final `−1×10⁻¹⁸` residual | Exact current repeated SOLVE replay returns residual `0` at X=2, X=3 and X=4. | `calc-session.test.ts`, `EX-SOLVE-REPEAT-001`; stale value preserved under `preAuditRuntimeObservation`. |
| E-39 160 nCr 80 | Both 160 nCr 80 and 160 nPr 80 now produce Math ERROR; 69! remains `1.711224524×10⁹⁸`. | `selected-numeric.test.ts`, `EX-E39-NCR-GUARD-001`. |
| E-39 other printed domain boundaries | Public keys for `10^100`, `0⁻¹` and `(10^50)^2` return Math ERROR; AST checks retain the remaining log/exp/root/Pol/Rec edge values. | `selected-numeric.test.ts`, `numeric-range.test.ts`, `EX-E39-DOMAIN-KEYS-001`. Remaining open work is only additional physical traces for unillustrated function rows and the manual-unspecified 11-character mixed-fraction response. |

## Executed selected-key traces

| PDF / printed page | Initial state and physical KeyIds | Printed expectation | Observed reducer state / evidence |
| --- | --- | --- | --- |
| 4 / E-3 | COMP defaults; `SHIFT AC` then `ON` (`shift,ac,on`) | OFF blanks the display; ON wakes it. | After `shift,ac`, power is off and LCD result is blank; `on` returns to COMP input. Reducer trace only. Ten-minute auto-off and case handling remain physical-only. |
| 6 / E-5 | COMP; `1+1 : 2+2 : 3+3 = = =`; colon is `ALPHA ∫` (`alpha,integral`) | Intermediate results 2, 4, 6; `Disp` lights for an intermediate result and clears on the last one. | LCD result sequence 2 → 4 → 6; `Disp` indicator sequence true → true → false. History receives the completed multi-statement result. Matches the selected page. |
| 7 / E-6 | COMP; select LineIO (`SHIFT MODE 2`), then Comma (`SHIFT MODE ↓ 5 2`); input `1÷2=` | Decimal mark is comma in results; input continues to use a dot. | Expression remains `1÷2`; LineIO result is `0,5`. Numeric state remains decimal-valued. Matches the selected page. |
| 7 / E-6; 18 / E-17; 18 / E-17 (printed subexample) | COMP, LineIO. Comma case: select Comma, then `SHIFT +` for `Pol`, `3 SHIFT ) 4 ) =` (`shift,add,3,shift,rparen,4,rparen,equals`). Dot case uses same keys with Dot. | Pol result has radius and angle; PDF E-6 requires semicolon between multiple results when decimal comma is selected. E-17 shows both `r` and angle for Pol, and both X/Y for Rec. | **Mismatch:** `lcdResult` is only `r=5` for `Pol(3,4)` in both Dot and Comma configurations. The result object retains `polRec={X:"5",Y:"53.13010235",kind:"pol"}`, but the second output and required comma/semicolon punctuation are absent from the LCD projection. This does not meet E-6/E-17. |
| 8 / E-7 | COMP, Deg; `4×sin(30)×(30+10×3)=` (`4,mul,sin,3,0,rparen,mul,lparen,3,0,add,1,0,mul,3,rparen,equals`) | 120. | Expression `4×sin(30)×(30+10×3)`, result 120. Matches selected worked example. |
| 9 / E-8 | COMP; `(-)2²=` (`neg,2,square,equals`) | Unary negative is outside the square: −4. | Expression `(-)2²`, result −4. Matches precedence example. |
| 12 / E-11 | COMP; `150×20%=` (record `EX-COMP-001`) | 30. | Reducer result 30. Matches. |
| 13 / E-12 | COMP; `1+1=`, `2+2=`, `3+3=`, `UP`, `UP` | History recalls 4, then 2. | First UP displays expression `2+2`, result 4; second UP displays `1+1`, result 2. Matches. History clearing on reset/display change is separately covered by implementation tests; it is not part of this direct trace. |
| 13 / E-12 | COMP, LineIO; `4×3+2.5=`, `LEFT`, `DEL×4`, `−7.1=` (`EX-REPLAY-E12-001`) | Result 14.5 is edited to `4×3−7.1`, which returns 4.9. | Reducer trace: after LEFT and four DEL presses expression is `4×3`; appending `−7.1` returns 4.9. Matches the printed replay example. This is a different path from history Up/Down. |
| 13 / E-12 | COMP; `3×4=`, then `÷30=` (`3,mul,4,equals,div,3,0,equals`) | Reuse Ans for the next calculation. | First result 12; second expression `Ans÷30`, Natural result `2/5` (numeric Ans `0.4`). Matches. |
| 14 / E-13 | COMP; enter `3+5`, `SHIFT RCL`, `ALPHA (−)` to store A; then `AC`, `ALPHA (−)×10=` | Variable storage/retrieval; 8×10=80. | `A` becomes 8; subsequent expression `A×10` returns 80. Matches this path; not all variables, memories, or reset edges are represented. |
| 17 / E-16 | COMP, Deg; printed HYP menu samples: `HYP 1`, then `1 ) =`; `HYP 5`, then `1 ) =` (`EX-HYP-001/002`) | The numbered HYP menu selects `sinh`; `sinh(1)=1.175201194`. Item 5 selects `cosh⁻¹`; `cosh⁻¹(1)=0`. | **Mismatch:** reducer HYP only lights a latch and does not open the printed numbered menu. The first literal sequence is parsed as `11()` and yields Syntax ERROR; the second as `51()` and yields Syntax ERROR. `HYP` followed by a direct `SIN` key inserts `sinh`, but that is not the page’s printed HYP-number path. |
| 18 / E-17 | COMP, Natural; `EX-INT-001`, `EX-DIFF-001`, `EX-SUM-001` | ∫ ln(x) dx from 1 to e = 1; d/dx sin(x) at π/2 in Rad = 0; Σ(x+1) from 1 to 5 = 20. | All three physical-KeyId arrays were replayed through `reduce`; results were 1, 0, and 20. These are reducer traces; a separate checkpointed browser run covers the six Natural/LineIO variants. |
| 18 / E-17 | COMP, LineIO; `EX-INT-002`, `EX-DIFF-002`, `EX-SUM-002` | Same integral, derivative and sum results using comma-form syntax. | All three physical-KeyId arrays returned 1, 0, 20. Reducer trace. |
| 18 / E-17 | COMP; `SHIFT Pol √2 , √2 =` and `SHIFT Rec √2 , 45 =` (`EX` arrays in this document’s corpus) | `r=2, θ=45`; `X=1, Y=1`. | In Natural mode, reducer result displays both values. In LineIO (PDF E-17 says paired values are on separate lines), Pol displays only `r=2` though metadata retains `θ=45`; Rec displays only `X=1` though metadata retains `Y=1`. **Confirmed LineIO multi-row omission.** |
| 19 / E-18 | COMP, LineIO, Complex format `a+bi`; `(2+6i)÷(2i)=` (`EX-CMPLX-001` keys plus `SHIFT MODE 2`) | `3−i`; LineIO displays real and imaginary components on separate lines. | Reducer yields complex `{re:"3",im:"−1"}` and `lcdResult` is one line `3-i`. Numeric answer matches, separate-line presentation is missing. |
| 19 / E-18 | CMPLX, LineIO, set complex format `r∠θ`; `2∠45=` (`mode,2`, `SHIFT MODE ↓ 3 2`, `SHIFT MODE 2`, `2 SHIFT (−) 45 =`) | Polar result; E-18 says LineIO puts `r` and `θ` on separate lines. | Reducer result `2∠45` is one line; complex metadata holds re=im≈1.414213562. Separate-line presentation is missing. |
| 19 / E-18 | COMP, LineIO, Fix 3; `10÷3×3=` and `Rnd(10÷3)×3=` (`EX-ROUND-FIX3-001`) | 10.000 without Rnd; 9.999 with Rnd. | Both literal printed sequences pass: results 10.000 and 9.999. |
| 19 / E-18; 13 / E-12 | Derived from Fix 3 and Ans continuation rules: `10÷3=`, then `×3=` (`EX-ROUND-ANS-DERIVED-001`) | Preserve internal 10/3 across continuation; final result 10.000. This exact split sequence is not printed. | **Mismatch:** first result displays 3.333 and stores `result.approx`/Ans as 3.333; next expression is `Ans×3`, result 9.999. |
| 19 / E-18; 14 / E-13 | Derived Fix 3 and variable storage case: `10÷3=`, STO A, then `A×3=` (`EX-ROUND-STO-DERIVED-001`) | If STO retains the internal 10/3 value, A×3 should be 10.000. The exact sequence is not printed. | **Mismatch:** A is stored as 3.333 and A×3 returns 9.999. The single-expression manual example still passes; the discrepancy is intermediate-result precision propagation. |
| 20–22 / E-19–E-21 | COMP CALC and SOLVE sequences `EX-CALC-001`, `EX-SOLVE-001` | CALC gives 25 then 41; SOLVE yields X≈1.414213562 and L−R=0. | Direct reducer replay reached the two CALC outputs and SOLVE output, with the expected prompts. Browser evidence for these selected cases is listed in the checkpoint and its retained captures; no physical hardware claim. |
| 23 / E-22 | COMP; `EX-SOLVE-REPEAT-001`: set Y=X²−X+1; solve successively Y=3,7,13; first initial X=1; press `=` to continue/confirm each loop. | X=2, X=3, X=4; the rendered final solution also prints L−R=0. | **Current reducer replay:** X=2/L−R=0, X=3/L−R=0, X=4/L−R=0. The next prompt reuses the previous X as the initial guess. The earlier −1×10−18 observation was a stale trace and is superseded by the exact current production key replay and assertions. |
| 23 / E-22 | STAT row limits; fill X-only to 80, X+FREQ or X+Y to 40, and X+Y+FREQ to 26. | The Stat Editor provides exactly those row counts. | Direct reducer cases with equals after every value reached 80/40/40/26 rows. This confirms the configured capacities; the manual does not specify behavior for an extra entry, so no error/rejection expectation is claimed. |
| 24 / E-23 | STAT A+BX; `EX-STAT-PAIR-001`: X=170,173,179, then printed Down, Right, then Y=66,68,75. | Pair rows `(170,66),(173,68),(179,75)`. | **Before fix:** X landed in rows 1–3 and Y in rows 5–7; cursor ended at Y8. **After fix:** the printed Down from the trailing blank wraps to row 1; Right selects Y and all three pairs align, ending at Y4. Reducer matches. |
| 24 / E-23 | STAT Editor exclusions; try M+, SHIFT M−, SHIFT STO, Pol, Rec and a multi-statement separator in the editor. | E-23 says these operations cannot be input in the Stat Editor. | Each key is swallowed without changing the selected data cell, expression tree, or variable A. Direct reducer match; no physical hardware claim. |
| 25 / E-24 | STAT FREQ 1-VAR; `EX-STAT-001`: x=1,2,3,4,5, printed Down, Right, FREQ=1,2,3,2; query x̄ and σx. | FREQ values align with X rows 1–4; empty X=5 frequency defaults to 1; mean 3 and population SD 1.154700538. | **Before fix:** the FREQ values were in rows 7–10 and σx was 1.414213562 (mean 3 coincidentally). **After fix:** FREQ rows 1–4 are 1,2,3,2 and outputs are 3 and 1.154700538. Reducer matches. |
| 24 / E-23; 25 / E-24 | STAT A+BX, Fix 3; `EX-STAT-REG-001` with the printed E-24 sequence. | Linear r=.923, then after switching to ln X: r=.998, A=−3857.984, B=2357.532. | Aligned pairs produce those four outputs. Before the DOWN wrap fix, the same printed sequence left X and Y in separate rows; the first r query returned Math ERROR. |
| 26 / E-25 | STAT ln X continuation; `AC, 160, SHIFT 1, 5, 5, =` after the printed logarithmic regression. | Estimated y at x=160 is 8106.898. | Reducer returns 8106.898. With the pre-fix unpaired rows this continuation returned Math ERROR; corrected E-24 data path supplies the required regression model. |
| 26–27 / E-25–E-26 | STAT FREQ 1-VAR; `EX-STAT-DISTR-001`; normalized variate at x=3 then P(Ans). | t=−.762 and P(t)=.223. | After Down wraps to X1 then Right selects FREQ, all x/frequency pairs align; reducer returns −.762 and P(Ans)=.223. Before fix the frequency entries occupied separate rows and t was −.537. |
| 23–27 / E-22–E-26 | `EX-STAT-ALL-TYPES-001`, `EX-STAT-REG-001`, `EX-STAT-ESTIMATE-001`, `EX-STAT-DISTR-001`, `EX-STAT-DISTR-PQR-POSITIVE-001`, and `EX-STAT-EDITOR-LIMITS-001`. | All eight type keys, paired Sum/Var/Reg/MinMax digit paths, all seven regression models (including quadratic x̂1/x̂2), ŷ(160)=8106.898, printed t/P(Ans), positive P(1)=.841344746, Q(1)=.341344746 and R(1)=.158655254, plus row editing/setup/capacity probes. | Direct reducer tests pass. The selected guide numerically illustrates P only; Q/R and negative-direction behavior are explicitly inferred/unspecified. The extra-entry `Insufficient MEM Error` probe is clone behavior because E-22 gives capacities but no overflow key response. E-27 mixed-radix ambiguity remains documented separately. |
| 25 / E-24; 38 / E-37 | STAT Fix 3; `EX-STAT-CONV-PRECISION-001`: enter 1, CONV 02 (cm→in), =; enter X2=.0012; query mean. | X1 stores 0.393700787401575 while the selected cell displays .394; mean is .197. | Direct reducer path stores the 15-digit internal value, formats the cell to .394, and shows mean .197. Reusing displayed .394 would produce .198. This is a public selected-manual conversion path, not an assumed arbitrary STAT expression. |
| 29 / E-28 | BASE-N two’s complement/Not worked examples and width edges. | Page-specific bitwise outputs. | **Current selected audit:** all six printed logical operations and signed-width endpoints are asserted through public keys; invalid-digit/overflow/error variants remain partial. |
| 30 / E-29 | EQN linear, quadratic and cubic examples. | Exact roots in the printed order. | **Current selected audit:** all five printed examples pass, including 2/3-variable linear, complex quadratic, repeated quadratic and cubic, with DOWN navigation. Failure branches remain separately partial. |
| 31–33 / E-30–E-32 | MATRIX entry/register setup and operations. | MatA×MatB/MatA+MatB plus MatC, Abs, Trn, inverse, square and cube traces. | **Current selected audit:** MatC 2×3 data/copy and all listed operations pass exact reducer grids; browser capture covers selected cell/header/readout. Other dimensions/errors remain partial. |
| 34–36 / E-33–E-35 | TABLE and VECTOR printed examples. | Full f(x)=x²+1/2 range and vector sum/scalar/dot/cross/Abs/angle outputs. | **Current selected audit:** all five TABLE rows and selected readouts/final X pass; vector sum `[4,6]`, scalar paths, dot 11, cross `[0,0,-2]`, Abs 3 and angle 10.305 pass. Additional dimensions/scroll variants remain partial. |
| 37–39 / E-36–E-38 | COMP; new examples `EX-CONST-001/002`, `EX-CONV-001–004`. | C0=299792458; 1/√(ε0μ0)=C0; 5 cm→in=1.968503937; 100 g→oz=3.527396584; −31 °C→°F=−23.8; independent 5 J→cal result uses 4.18580 J/cal at 15 °C. | Each listed key path was dispatched through the current reducer. The five printed examples match; the J→cal reference-derived result is 1.194514788. Only codes 28,32,33 and 02,22,38,39 were exercised here; the existence of a 40-row catalog does not establish every label/value or every allowed mode. |
| 41 / E-40 | COMP; `EX-ERROR-001`: `14÷0×2=`, `RIGHT`, `LEFT`, `1`, `=`. | Math ERROR; cursor repair to 14÷10×2; result 14/5. | Error occurred, four navigation/edit steps reconstructed the expression as 14÷10×2, and result was 14/5. Matches. The selected guide and same-family Casio error reference classify numeric/command and matrix/vector stack exhaustion but publish neither a capacity nor a reachable <=99-byte key reproducer; those claims remain blocked/unverified. |
| 42–43 / E-41–E-42 | Source describes Dimension/Variable/Can't Solve/Memory/Timeout errors; initialize/reset and battery replacement. | Specific diagnostics, recovery actions, and initialization. | Error types have code coverage elsewhere, but this source audit did not execute each printed diagnostic or the whole E-42 recovery procedure. Battery handling and replacement are physical-only. |
| 44 / E-43 | COMP, Deg: `sin 30 ) + 15 =` and `sin 30 + 15 =` (FAQ; public reducer trace and `selected-manual-faq.test.ts`). | 15.5 with closing `)`; 0.7071067812 without it. | Reducer gives 15.5 and 0.7071067812, respectively. Matches the page’s warning. Weight and model specs on this same page are physical/model-specific; E-43 is not wholly physical-only. |
| 45–46 / unpaginated | Manufacturer, responsible-person and publication details. | Source identification/front and closing matter. | No calculator behavior or printed E-page number; no runtime case. |

## Additional implementation-level probes (not new manual examples)

These are labelled as probes rather than manual conformance claims.

| Probe | Sequence and current observation | Source tie / status |
| --- | --- | --- |
| HYP alternate entry | `HYP`, then `SIN 30 ) =` lights HYP, inserts `sinh(30)`, and evaluates it. | This reducer path works but is not the selected manual’s E-16 HYP-number menu sample, which is the failing trace above. |
| Replay plus deletion | Selected E-12 trace is listed above. An additional `4×3+2.5=`, `UP`, four `LEFT`, then four `DEL` leaves expression `2.5`; intermediate expressions after each DEL were `4×32.5`, `4×2.5`, `42.5`, `2.5`. | Reproducible reducer observation only; not the printed E-12 key path. |
| History size | Dispatch `1=` 45 times. Stored history stops at 40 entries (the cap is visible in `machine.ts` as `.slice(-40)`). | E-12 says “up to approximately 200 bytes” rather than 40 entries. This audit did not establish a byte-for-byte equivalence or a physical boundary; capacity comparison remains open. |
| Pol/Rec pair rendering | Internal `polRec` holds both outputs, but `lcdResult` has only the first scalar string. | Same confirmed display gap as E-6/E-17 above. |

### Isolated production-preview geometry (2026-11-21)

- **E-4:** At a 390x844 viewport, a long 1+1+... expression after equals displayed the hollow continuation marker inside the .lcd-expr row. LEFT changed the visible side to the left marker and RIGHT restored the right marker. A short result had no result marker. The filled result marker now considers horizontal DOM overflow only, so a tall Natural formula cannot produce a false rightward result arrow. Simultaneous input/result overflow and AC-priority behavior remain unverified.
- **E-7:** At 89 ordinary digits the production panel had the byte-warning class; the caret was rendered as a solid block-like caret. At 99 digits the next digit was rejected unchanged.
- **E-8:** Three nested fraction templates measured 39px content in a 36px expression viewport and 53px result viewport, with no horizontal marker. This proves only renderer measurement; the source does not print the token-to-layout relation needed for reducer admission, so the two-screen admission rule remains open.

## Untested and physical-only cells to retain

- **CONST/CONV:** All 40 constant names/values were independently checked against archived CODATA 2006 (39 numeric CODATA rows match, including code 23 in the report; code 38 is the exact Celsius offset, not a CODATA row). The selected manual prints codes 01–32 on PDF 37 and 33–40 on PDF 38. This is source-data validation, not reducer coverage: only sample codes 28, 32, 33, 02, 22, 38 and 39 were dispatched. All 40 conversion directions are transcribed from PDF 38–39, but runtime values for most codes and permitted-mode boundaries remain untested; BASE-N/TABLE rejection also remains untested.
- **STAT:** Direct reducer coverage now includes all eight type keys, every paired Sum/Var/Reg/MinMax menu family, all seven regression models, quadratic x̂1/x̂2 and ŷ, row insertion/deletion/setup retention, capacity and prohibited-editor probes, plus printed t/P and positive P/Q/R checks. Q/R negative-direction behavior is not selected-manual-numerically specified; hardware LCD and physical timing remain unverified.
- **BASE-N/EQN/MATRIX/VECTOR/TABLE:** E-27’s 36 sum, E-29’s linear system, E-30’s 2×2 operations, E-33’s single-function table and vector sum do not cover the remaining bitwise/range, quadratic/cubic, shape/dimension, row/column scroll, additional table-range, or higher-dimensional cases.
- **Numerical/error edges:** E-39 domain/range boundaries beyond the executed nCr, nPr, 69! and mixed-fraction length examples remain untested. The 11-character mixed fraction is accepted even though it is outside the stated supported size; the manual does not say how such an entry must be handled. Cumulative precision, stack limits, E-41 diagnostic causes and recovery corrections, and E-42 initialization-from-error are not exhaustively traced.
- **Hardware only:** Case fit/removal, real ten-minute auto-off, battery indicators/life, physical LCD segment fidelity and all physical model specifications cannot be confirmed without the target hardware. No device is claimed by this audit. PDF 45–46 are unpaginated manufacturer/legal matter.
### E-26–E-35 audit closure (direct reducer traces)

**E-9 capture correction (2026-11-21):** The current `editor.ts` reducer and `selected-editor-conformance.test.ts` now capture the complete `2×3` span after `1+2×3`, so `sqrt` yields `1+√(2×3)`. Any earlier mismatch row above is historical pre-fix evidence and must not be read as the current status.

| PDF / printed page | Printed sequence coverage | Actual observation and provenance |
| --- | --- | --- |
| 28–29 / E-27–E-28 | BIN AND, OR, XOR, XNOR, Not and Neg; 16-bit output strings | All six printed cases pass with exact readouts `0000000000001000`, `0000000000011011`, `0000000000000110`, `1111111111110101`, `1111111111110101`, and `1111111111010011`. Exact key arrays and source citations: `EX-BASE-N-LOGICAL-001`. |
| 30 / E-29 | All five EQN examples: 2-unknown, 3-unknown, complex quadratic, repeated quadratic, cubic | Exact roots/readouts pass in printed order: `X=-1,Y=2`; `X=1,Y=2,Z=3`; `X1=-1/2+√2/2i`, `X2=-1/2-√2/2i`; repeated `X=√2`; cubic `X1=-1,X2=2,X3=1`. DOWN navigation was asserted for each multi-solution case. `EX-EQN-ALL-001`. |
| 31–33 / E-30–E-32 | MatC 2×3 data, register copy, Abs, Trn, inverse, square and cube | Exact reducer grids match the source-derived arrays in `EX-MATRIX-E31-E32-001`. A confirmed defect was fixed: SHIFT STO from a MatA/MatB/MatC editor now copies the displayed editor register rather than incorrectly looking only at MatAns. |
| 34 / E-33 | TABLE `f(x)=x²+1/2`, Start=-1, End=1, Step=.5 | All five generated rows are `[[-1,1.5],[-0.5,0.75],[0,0.5],[0.5,0.75],[1,1.5]]`; variable X ends at `1`. `EX-TABLE-FRACTION-001`. |
| 35–36 / E-34–E-35 | VctAns sum, scalar/dot, 2-D cross, Abs(VctC), Fix 3 Deg angle | Exact observations: sum `[4,6]`, dot `11`, cross `[0,0,-2]`, Abs `3`, angle `10.305`. The E-35 rendered cross diagram visibly shows the selected first zero and remaining bracket components; component storage is retained as the exact three-cell array. `EX-VECTOR-E34-E35-001`. |

These are direct reducer observations, not physical-device verification. The selected source remains authoritative by owner decision; transfer to photographed fx-991ES PLUS-2 hardware is unverified.

## Final worked-example/rule audit (merged 2026-11-21)

Current source-fidelity addendum: E-8 uses the PDF's fraction-first key array with explicit numerator-to-denominator RIGHT transitions; E-11 includes both repeated ENG controls and the ALPHA-integral multi-statement path; E-39 now includes direct key checks for 10^100, zero inverse and the 10^50 square boundary.

The latest focused reducer audit is merged directly into matching records in [`sources/selected-manual/examples.jsonl`](../sources/selected-manual/examples.jsonl); prior observations remain in `preAuditRuntimeObservation`/`preAuditTraceStatus`. Exact public physical-key traces now pass for the E-7 explicit/omitted multiplication examples, E-8 radical quotient, E-9 full RHS capture, E-10 surd and fraction examples, E-11 DMS display/toggle, E-17 Pol/Rec and LineIO pairs, E-18 complex LineIO rows, HYP 1/5 selection, and E-39 160 nCr/160 nPr guards and 69! upper bound. The E-11 fix recognizes `post:dms` atoms when decorating a calculation result; assertions require `3°0′0″`, `2°15′18″`, `2.255`, and the round trip.

The direct E-2–E-7 default/reset test now checks COMP, MthIO-MathO, Deg, Norm 1, d/c, a+bi, STAT FREQ off, and Dot at both initial state and CLR Setup. E-22’s exact current reducer trace is X=2/residual 0, X=3/residual 0, X=4/residual 0; the earlier `−1×10⁻¹⁸` report was stale and is superseded. E-39 physical boundary assertions cover the exclusive `sin(9×10⁹)` error, inclusive `69!` result `1.711224524×10⁹⁸`, and Math ERROR for both 160 nCr 80 and 160 nPr 80. This audit makes no physical-device or exact hardware-timing claim.
The earlier high-level partial-coverage bullet above is superseded for the illustrated E-27 logical cases, all five E-29 equations, the E-31/E-32 operations listed here, the full E-33 table range, and the E-34/E-35 vector operations. Remaining untested cells are limited to non-illustrated boundaries and additional dimensions/scroll/error variants.

Current E-10/E-12 source-fidelity note: PDF 11's LineIO `4,−,3,frac,1,frac,2,=` now visibly enters `4−3┘1┘2` and returns `1┘2`; before the targeted editor transition it produced `4−(3/(1/2))` and `−2`, retained as corpus pre-fix evidence. E-12's read-only `123+456=`, then `789−Ans=` probe returns `210`. These observations are separate from the passing corpus record for LineIO `2/3+1/2`.

## Numbered printed-example crosswalk: E-2 through E-22 (current status)

Each item below is an individual printed-example/rule check, with the selected PDF page citation and current evidence. “Reducer” means the public `dispatchKeys`/`reduce` path; it is not a physical-hardware claim. Historical mismatch rows earlier in this document are retained for audit history, but the current status below and the merged corpus records are authoritative.

1. **E-2 (PDF 3): initialization/defaults.** `SHIFT,9,1,=` (Setup) and `SHIFT,9,3,=` (All/Yes) are covered by reset transitions; the exact initial and post-CLR defaults are asserted as COMP, MthIO-MathO, Deg, Norm 1, d/c, a+bi, STAT FREQ off and Dot. **Reducer pass; battery/safety text physical-only.**
2. **E-3 (PDF 4): ON/OFF and contrast.** `SHIFT,AC,ON` blanks and wakes the reducer; contrast menu navigation is covered. **Reducer/browser support pass; ten-minute auto-off and case handling physical-only.**
3. **E-4 (PDF 5): expression/result scrolling and markers.** Long-input LEFT/RIGHT traces and selected LCD browser geometry are covered. **Partial browser pass; dual input/result overflow and exact physical LCD segments remain open.**
4. **E-5 (PDF 6): MODE/menu and multi-statement display.** `1,+,1,ALPHA,integral,2,+,2,ALPHA,integral,3,+,3,=` followed by `=` gives 2, 4, 6 and clears `Disp` on the last result. **Reducer pass; full physical menu/chassis parity not claimed.**
5. **E-6 (PDF 7): display setup and decimal separators.** LineIO `1,÷,2,=` gives `0,5` under Comma; Fix/Sci/Norm and Dot/Comma transitions are asserted. **Reducer pass for listed setup examples; remaining Pol/Rec presentation is covered separately.**
6. **E-7 (PDF 8): editor limit and explicit multiplication.** `4,mul,sin,3,0,right,rparen,mul,lparen,3,0,+,1,0,mul,3,rparen,=` and the omitted-mul variant both return 120; 89/99/100-byte editor cases are separately traced. **Reducer pass for these examples; Natural cursor geometry remains renderer-scoped.**
7. **E-8 (PDF 9): precedence and Natural radical quotient.** Omitted `6,÷,2,lparen,1,+,2,rparen,=` returns 1 versus explicit `mul` returning 9; the PDF’s fraction-first `frac,2,+,sqrt,2,right,right,1,+,sqrt,2,=` returns `√2` (approx `1.414213562`). Assertions cover the first RIGHT to the numerator end and second RIGHT into the denominator; the denominator `+` remains inside the fraction after the editor fix. The older parenthesized form is retained only as a labeled derived equivalent. **Printed reducer pass; two-screen Natural admission remains open.**
8. **E-9 (PDF 10): SHIFT-DEL capture.** `1,+,2,mul,3,left×4,SHIFT,DEL,sqrt` captures the full `2×3`; the pictured `1+7/6` fraction capture and listed wrappers are also traced. **Reducer pass; physical transfer not claimed.**
9. **E-10 (PDF 11): π, surd and fraction examples.** π/6 toggle, `(√2+2)×√3`, numerator-first/template-first `2/3+1/2`, LineIO exact-fraction entry, Natural `4−3 1/2`, and mixed-fraction fallback have direct evidence. The exact PDF LineIO keys `4,−,3,frac,1,frac,2,=` now enter `4−3┘1┘2` and return `1┘2`; the former nested-denominator result `4−(3/(1/2))`/`−2` is retained only as pre-fix evidence in `EX-E10-DECIMAL-INPUT-001`. **Printed reducer/browser pass.**
10. **E-11 (PDF 12): percent, sexagesimal and engineering.** Percent outputs are 75, 2875 and 2625; DMS addition starts at `3°0′0″`, conversion toggles `2°15′18″ ↔ 2.255`; the printed `1234=,ENG,SHIFT ENG` path gives `1.234×10³` then `0.001234×10⁶`, repeated ENG gives `1234×10⁰`, and `123=,SHIFT ENG,SHIFT ENG` gives `0.000123×10⁶`. The multi-statement `3+3,ALPHA,integral,3×3,=,=` path gives 6 then 9. **Reducer pass after the source-backed `post:dms` and denominator/operator fixes.**
11. **E-12 (PDF 13): history, replay and Ans.** History returns 4 then 2; replay edits 14.5 to 4.9; `3×4=`, then `÷30=` reuses Ans and returns 2/5. A read-only exact continuation `123+456=`, then `789−Ans=` returns 210. **Reducer/browser selected traces pass; exact physical history byte capacity remains open.**
12. **E-13 (PDF 14): variables and memory.** `3+5,SHIFT,STO,A`, then `ALPHA,A,mul,10,=` returns 80; M and A clear/store/retrieve paths and retained precision are tested. The selected guide lists Ans, A-F, X/Y and M, not PreAns; PreAns belongs to legacy clone persistence/state evidence. **Reducer pass for selected examples; all variable combinations not implied.**
13. **E-14 (PDF 15): integration/derivative/sum entry restrictions.** Natural and LineIO layouts for the selected calculus forms are dispatched and checked; mode/nesting rejection tests cover restrictions. **Reducer pass for printed forms; hardware timing not claimed.**
14. **E-15 (PDF 16): COMP-only functions and numerical rules.** Rad trig, tolerance floor, AC cancellation and forbidden nested/mode forms are tested by `calculus.test.ts`, `store-calculus.test.ts` and `e2e/selected-calculus.spec.ts`. **Selected analytical rules pass; physical interruption timing and unillustrated failure glyphs remain unverified.**
15. **E-16 (PDF 17): HYP, logarithm/power/root and DRG examples.** HYP numbered 1/5 now selects `sinh`/`cosh⁻¹`; direct outputs are `1.175201194` and `0`; log-base, fifth-root, exponent and angle-conversion traces pass. **Reducer pass for listed examples.**
16. **E-17 (PDF 18): calculus, Pol/Rec and function examples.** Integral/derivative/Sigma outputs are 1/0/20; Pol `(√2,√2)` gives r=2, θ=45 and Rec gives X=1,Y=1; factorial/Abs examples pass. **Reducer/browser evidence; exact physical LineIO row rendering remains unverified.**
17. **E-18 (PDF 19): CMPLX and LineIO rows.** `(2+6i)/(2i)` returns `3−i`; `2∠45`, `√2+√2i ↔ 2∠45`, `(1−i)^−1`, `(1+i)^2+(1−i)^2`, conjugate/Arg/Abs, nPr/nCr and Fix-3 Rnd examples pass in `cmplx-state.test.ts`, golden fixtures and selected traces. **Concrete remaining gap is current LineIO component-row presentation/physical segment parity; numerical examples are not blanket-partial.**
18. **E-19 (PDF 20): CALC.** `3A+B` with A=5,B=10 returns 25; the repeated prompt with A=7,B=20 returns 41. **Reducer and three-profile browser pass.**
19. **E-20 (PDF 21): complex CALC/SOLVE restrictions.** Complex substitutions (including 2∠30 and 2∠60) pass; unsupported SOLVE integral/differential/sum/Pol/Rec and missing-variable forms reject before prompting. **Reducer/browser selected pass; other prompt variants partial.**
20. **E-21 (PDF 22): quadratic SOLVE.** `Y=AX²+B` selected keys produce X=1.414213562 with L−R=0; scaled start-at-zero case reaches X=2. **Reducer and desktop/mobile/tablet browser pass.**
21. **E-22 (PDF 23): repeated SOLVE.** Exact current array from `calc-session.test.ts` produces X=2/L−R=0, then X=3/L−R=0, then X=4/L−R=0, reusing each prior X as the next initial guess. **Reducer and browser pass; prior −1×10−18 report corrected as stale.**
### E-26–E-35 corrective evidence (2026-11-21)

- E-29 repeated quadratic uses the exact source keys `1 = (-) 2 √ 2 ) = 2 = =`; no explicit `mul` key is present. Shared prefix insertion now preserves `2√2` inside `(-)`, producing one `X=√2`. Public editor regression also verifies positive adjacency `2√3` and nested `√√2`, while the selected E-9 SHIFT-DEL RHS capture still wraps the captured expression.
- E-31/E-34 `SHIFT STO` destinations use the physical keycaps `neg`→A, `dms`→B, and `hyp`→C. Reducer traces open the destination editor at the first cell (`B11=` / `B1=` in the A→B cases) and verify edits remain independent of the source register. See `EX-MATRIX-VECTOR-STO-CORRECTED-001`.
- The selected-guide [PDF page 36/E-35](https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf#page=36) visibly shows all cross-product components: selected first `0`, second `0`, third `−2`. This supersedes the older HTML omission for selected-source evidence; physical equivalence remains unverified.
### E-3–E-16 editor/LCD follow-up (2026-11-21)

| PDF / printed page | Trace | Actual observation |
| --- | --- | --- |
| 8 / E-7 | 89, then 99, then a 100th ordinary digit; delete/re-enter; TABLE shared editor path | 89 bytes switches the caret to the solid warning class; 99 is accepted; growth to 100 is rejected. Deletion and re-entry work, including LineIO overwrite and TABLE editor paths. |
| 9 / E-8 | Nested Natural roots | The selected rule is two display screens (31 dots × 2). A per-token height table is not printed; browser-measured Natural reconstruction remains open and is not replaced with an invented constant. |
| 10 / E-9 | `1+2×3`, digit split `123`, function boundary `sin(3)`, printed `1+7/6` | Capture spans the complete `2×3` run, captures the remainder `23` at a digit split, stops before the next function/group, and retains the fraction atom. |
| 5 / E-4 | Long input/result, Rad Pol dual overflow, AC then arrows | Both viewport sides are now measured from DOM rather than inferred from string length; result-screen input indicators remain available. Dual-arrow/AC priority still needs browser geometry evidence. |
| 6 / E-5; 13 / E-12; 15 / E-14; 17 / E-16 | HYP menu, replay byte budget, postfix adjacency, `(5²)³` | HYP 1/5 direct examples, approximate 200-byte replay trimming, consecutive-postfix rejection, and explicit cube result 15625 pass focused public-key traces. HYP page partition is reconstructed from generic E-5 menu rules; E-8 and E-4 browser layout remain open. |
- **E-17/E-18/E-19 editor exits:** Natural SHIFT HYP(Abs),2,−,7,RIGHT,×,2,= now exits Abs on the first RIGHT and returns 10. The analogous CMPLX rectangular √2,RIGHT,+,√2,RIGHT,ENG(i),= remains external to both roots and formats as 2∠45 under r∠θ. DRG postfix wrapping of (π÷2) returns 90 in Deg and 50 SHIFT Ans 3(g) = returns 45.
- **E-16 indexed root:** In LineIO, the printed `5 SHIFT ⁿ√ 32 ) =` now wraps the preceding 5 as the root index and routes 32 to the radicand, returning 2. Natural keeps the distinct `SHIFT ⁿ√, 5, RIGHT, 32` slot-navigation trace. See `EX-EDITOR-E16-NTHROOT-LINEIO-001`.

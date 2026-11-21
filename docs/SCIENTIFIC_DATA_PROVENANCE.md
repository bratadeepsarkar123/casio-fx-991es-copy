# CONST and CONV data provenance

This catalog implements the owner-selected 46-page guide, SHA-256 `1d2cd62e3af88b404dbc5db87646016e9e4a927f7798db8c89112777168d2686`. The relevant rules are PDF 36 / E-35 (CONST key and mode availability), PDF 37 / E-36 (C0 and the epsilon0/mu0 identity), PDF 38 / E-37 (remaining constants, conversion availability and examples), and PDF 39 / E-38 (conversion list and source dates).

## Scientific constants

The selected guide says the values use CODATA recommended values from March 2007. The constants in [`scientificData.ts`](../src/calc/scientificData.ts) are transcribed from NIST's archived 2006 CODATA ASCII table, the dated dataset corresponding to that edition:

- [NIST 2006 CODATA archive](https://physics.nist.gov/cuu/Constants/archive2006.html)
- [NIST 2006 CODATA complete ASCII table](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2006.txt)
- [NIST / CODATA 2006 recommended values report](https://www.nist.gov/system/files/documents/pml/div684/fcdc/rmp2006-2.pdf)

Each `SCIENTIFIC_CONSTANTS` entry has the guide's two-digit code and symbol, the corresponding NIST table row name, and its value. Thus the `name` field is the row-level lookup key. `scientificData.test.ts` sends every code through `SHIFT 7`, both digits and `=`, and checks the displayed result at the calculator's ten-significant-digit precision. The test also evaluates the guide's `1/sqrt(epsilon0*mu0)` example and checks actual STAT, EQN, MATRIX, TABLE and VECTOR consumers. CONST is tested in every permitted mode, with BASE-N checked as excluded.

The NIST ASCII source reports values with uncertainties; the calculator uses its published recommended central values at the precision represented by the selected guide. Exact definitions remain at their published exact precision. Code 33 uses the archived magnetic constant `12.566370614...e-7` (1.2566370614e-6), rather than adding unlisted decimal digits from a modern unit definition.

## Metric conversion commands

The selected guide cites [NIST Special Publication 811 (1995)](https://doi.org/10.6028/NIST.sp.811e1995) for its conversion formula data and specifies that J-to-cal conversion uses the 15 C calorie (PDF 39 / E-38). The historical source contains Appendix B.8 factors and Appendix B.3 instructions for reverse conversion. The `source` field on each `UNIT_CONVERSIONS` entry identifies the NIST source row or reverse rule; the odd/even pairs 01-36 retain the listed factor and its reciprocal direction. The temperature pair and calorie pair are implemented explicitly because their direction order differs from the ordinary factor pairs.

Factors keep the 1995 table's stated precision. In particular, the printed E-37 result `100 g -> oz = 3.527396584` matches division by the Appendix B.8 rounded avoirdupois-ounce factor 28.34952. The exact modern factor 28.349523125 is not substituted. Other source values include the international inch, foot, yard, mile and nautical mile; U.S. survey acre; U.S. and Imperial gallons; parsec; km/h; standard atmosphere; conventional mmHg; mechanical horsepower; kgf and lbf units; and calorie at 15 C. Each is named in the catalog's per-code `source` field.

`scientificData.test.ts` checks all 40 two-digit codes through the public reducer, pins the 18 historical linear factors independently, checks reverse-direction calculations and the two affine temperature rules, and confirms each visible conversion label. It exercises the printed 5 cm, 100 g and -31 C examples, postfix precedence after addition/multiplication, a parenthesized operand, a leading negative and a nested radical, then confirms actual STAT, EQN, MATRIX and VECTOR consumers. TABLE and BASE-N are checked as excluded. Browser checks assert the displayed C0/CONV results and repeat those commands after service-worker offline reload on desktop Chromium, Pixel 7 and iPad Mini. These are app observations; no physical calculator or hardware equivalence is claimed.

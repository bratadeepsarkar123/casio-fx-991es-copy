# PDF page 14 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
Number of Significant
Digits
 (SETUP)
 (Sci)
  -
Exponential Display
Range
(SETUP)
 (Norm)
 (Norm 1) or
(Norm 2)
Fix: The value you specify (from 0 to 9) controls the number of decimal
places for displayed calculation results. Calculation results are rounded of
f
to the specified digit before being displayed.
Example: (LineIO) 100 ÷ 7 = 14.286 (Fix 3)
14.29 (Fix 2)
Sci: The value you specify (from 0 to 9) controls the number of significant
digits for displayed calculation results. Calculation results are rounded off
to the specified digit before being displayed.
Example: (LineIO) 1 ÷ 7 = 1.4286 × 10-1 (Sci 5)
1.429 × 10-1 (Sci 4)
1.428571429 × 10-1 (Sci 0)
Norm: Selecting one of the two available settings (Norm 1, Norm 2)
determines the range in which results will be displayed in exponential
format. Outside the specified range, results are displayed using non-
exponential format.
Norm 1: 10-2 > |x|, |x| ≧ 1010
Norm 2: 10-9 > |x|, |x| ≧ 1010
Example: (LineIO) 1 ÷ 200 = 5 × 10-3 (Norm 1)
0.005 (Norm 2)
Specifying the Fraction Display Format
To specify this
fraction display
format:
Perform this key operation:
Mixed
(SETUP)
 (ab/c)
Improper
 (SETUP)
 (d/c)
13
```

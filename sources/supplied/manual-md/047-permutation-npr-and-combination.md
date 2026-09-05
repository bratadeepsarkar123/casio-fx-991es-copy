# PDF page 47 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
(Results shown here are for illustrative purposes only. Actual results will
dif
fer.)
Permutation (nPr) and Combination
(nCr)
Example: To determine the number of permutations and combinations
possible when selecting four people from a group of 10.
Permutations:   10
 (nPr) 4
 5040
Combinations:  10
 (nCr) 4
 210
Rounding Function (Rnd)
The argument of this function is made a decimal value and then rounded
in accordance with the current number of display digits setting (Norm, Fix,
or Sci).
With Norm 1 or Norm 2, the argument is rounded of
f to 10 digits.
With Fix and Sci, the argument is rounded off to the specified digit.
When Fix 3 is the display digits setting, for example, the result of 10 ÷ 3 is
displayed as 3.333, while the calculator maintains a value of
3.33333333333333 (15 digits) internally for calculation.
In the case of Rnd(10÷3) = 3.333 (with Fix 3), both the displayed value
and the calculator’s internal value become 3.333.
Because of this a series of calculations will produce different results
depending on whether Rnd is used (Rnd(10÷3) × 3 = 9.999) or not used
(10 ÷ 3 × 3 = 10.000).
Example: To perform the following calculations when Fix 3 is selected for
the number of display digits: 10 ÷ 3 × 3 and Rnd(10 ÷ 3) × 3  (LineIO)
(SETUP)
 (Fix)
10
 3
 3
 10.000
(Rnd) 10
 3
 3
 9.999
Greatest Common Divisor (GCD) and
Least Common Multiple (LCM)
Greatest Common Divisor (GCD)
GCD determines the greatest common divisor of two values.
46
```

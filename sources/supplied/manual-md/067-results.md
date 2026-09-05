# PDF page 67 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
Results:
Performing Normal Distribution Calculations
While single-variable statistical calculation is selected, you can perform
normal distribution calculation using the functions shown below from the
menu that appears when you perform the following key operation:
(STAT/DIST)
 (Distr).
P
, Q, R: These functions take the argument t and determine a probability
of standard normal distribution as illustrated below.
t: This function is preceded by the argument X, and determines the
normalized variate X
 t = X - x
σx .
Example 5: For the single variable data {xn; freqn} = {0;1, 1;2, 2;1, 3;2, 4;2,
5;2, 6;3, 7;4, 9;2, 10;1}, to determine the normalized variate (
 t) when x =
3, and P(t) at that point up to three decimal places (Fix 3).
(SETUP)
 (STAT)
 (ON)
(SETUP)
 (Fix)
(STAT)
 (1-VAR)
0
 1
 2
 3
 4
 5
 6
 7
 9
 10
1
 2
 1
 2
 2
 2
 3
 4
 2
 1
3
 (STAT/DIST)
 (Distr)
 (
 t)
(STAT/DIST)
 (Distr)
 (P()
Normalized variate (
 t): -0.762
P(t): 0.223
Base-n Calculations (BASE-N)
Press
 (BASE-N) to enter the BASE-N Mode when you want to
perform calculations using decimal, hexadecimal, binary
, and/or octal
values.
66
```

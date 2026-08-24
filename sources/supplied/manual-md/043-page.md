# PDF page 43 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
(
 ) 3
 (X)
 5
 (X)
2
 (,)
2
 (,) 1
 12
7
Differential Calculation Precautions
• Differential calculation can be performed in the COMP Mode only.
• The following cannot be used in f(x): Pol, Rec, ÷R. The following cannot
be used in f(x), a, b, or tol: ∫, d/dx, Σ, Π.
• When using a trigonometric function in f(x), specify Rad as the angle
unit.
• A smaller tol value increases precision, but it also increases calculation
time. When specifying tol, use value that is 1 × 10-14 or greater.
• If convergence to a solution cannot be found when tol input is omitted,
the tol value will be adjusted automatically to determine the solution.
• Non-consecutive points, abrupt fluctuation, extremely large or small
points, inflection points, and the inclusion of points that cannot be
dif
ferentiated, or a differential point or differential calculation result that
approaches zero can cause poor precision or error.
Σ Calculations
Function that, for a specified range of f(x), determines sum
(f(x)) = f(a) + f(a + 1) + f(a + 2) + ⋯ + f(b).
Natural Display input syntax is
 (f(x)), while Linear Display input syntax
is ∑(f(x), a, b).
a and b are integers that can be specified within the range of -1 × 1010 < a
≦ b < 1 × 1010.
Example:
 (x + 1) = 20
(MthIO-MathO)
(
 )
 (X)
 1
 1
 5
 20
(LineIO)
(
 )
 (X)
 1
 (,) 1
(,) 5
 20
42
```

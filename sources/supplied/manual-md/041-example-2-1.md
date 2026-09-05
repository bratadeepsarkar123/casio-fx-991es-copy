# PDF page 41 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
Example 2: ∫(1
x2 , 1, 5, 1 × 10-7) = 0.8  (LineIO)
1
 (X)
 (,) 1
 (,) 5
(,)
1
 7
0.8
Example 3: ∫π
0 (sin x + cos x)2 dx = π  (tol: Not specified) (MthIO-MathO)
(Angle unit: Rad)
(X)
 (X)
0
(π)
π
Integration Calculation Precautions
• Integration calculation can be performed in the COMP Mode only.
• The following cannot be used in f(x): Pol, Rec, ÷R. The following cannot
be used in f(x), a, b, or tol: ∫, d/dx, Σ, Π.
• When using a trigonometric function in f(x), specify Rad as the angle
unit.
• A smaller tol value increases precision, but it also increases calculation
time. When specifying tol, use value that is 1 × 10-14 or greater.
• Integration normally requires considerable time to perform.
• Depending on the content of f(x) and the region of integration,
calculation error that exceeds the tolerance may be generated, causing
the calculator to display an error message.
• The content of f(x), positive/negative values within the integration
interval, and the interval to be integrated can cause large error in the
resulting integration values. (Examples: When there are parts with
discontinuous points or abrupt change. When the integration interval is
too wide.) In such cases dividing the integration interval into parts and
performing the calculation may improve calculation accuracy
.
Tips for Successful Integration Calculations
When a periodic function or integration interval results in positive
and negative f(x) function values
Perform separate integrations for each cycle, or for the positive part and
the negative part, and then combine the results.
40
```

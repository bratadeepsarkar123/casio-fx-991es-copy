# PDF page 87 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
•  Any variable (A, B, C, D, E, F, X, Y, M) input into an expression is treated as a value,
using the value currently assigned to the variable.
•  ÷R, Pol and Rec functions cannot be used in an expression.
•  In the VERIFY Mode, the calculator performs a mathematical operation on the input
expression and then displays TRUE or F
ALSE based on the result. Because of this,
calculation error can occur or a mathematically correct result may not be able to be
displayed when the input calculation expression includes calculation that approaches
the singular point or inflection point of a function, or when the input expression
contains multiple calculation operations.
Expression Input Precautions
The following types of expressions cause a Syntax ERROR and cannot be
verified.
• An expression with nothing on the left side or right side (Example: =
5
√7)
• An expression in which a relational operator is inside of a fraction or
function (Example: 1=1
2 , cos (8 ≦ 9))
• An expression in which a relational operator is enclosed in parentheses
(Example: 8 < (9 < 10))
• An expression in which multiple relational operators that are not oriented
in the same direction (Example: 5 ≦ 6 ≧ 4)
• An expression that contains two of the following operators in any
combination (Example: 4 < 6
≠ 8)
• An expression that contains consecutive relational operators (Example:
5 ≧ > 9)
VERIFY Mode Calculation Examples
Example 1:
To verify log2 < log3 < log4
2
 (VERIFY)
 (<)
3
 (VERIFY)
 (<)
4
Example 2: To verify 0 < ( 8
9 )2 - 8
9   (MthIO-MathO)
0
(VERIFY)
 (<)
8
 9
 8
 9
Example 3: T o verify 52 = 25 = √625   (MthIO-MathO)
86
```

# PDF page 94 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
• Your input exceeds the allowable input range (particularly when using
functions).
• The calculation you are performing contains an illegal mathematical
operation (such as division by zero).
Action:
• Check the input values, reduce the number of digits, and try again.
• When using independent memory or a variable as the argument of a
function, make sure that the memory or variable value is within the
allowable range for the function.
Stack ERROR
Cause:
• The calculation you are performing has caused the capacity of the
numeric stack or the command stack to be exceeded.
• The calculation you are performing has caused the capacity of the
matrix or vector stack to be exceeded.
Action:
•  Simplify the calculation expression so it does not exceed the capacity
of the stack.
• Try splitting the calculation into two or more parts.
Syntax ERROR
Cause:
• There is a problem with the format of the calculation you are
performing.
Action:
• Make necessary corrections.
Argument ERROR
Cause:
• There is a problem with the argument of the calculation you are
performing.
Action:
• Make necessary corrections.
Dimension ERROR (MA
TRIX and VECTOR Modes only)
Cause:
• The matrix or vector you are trying to use in a calculation was input
without specifying its dimension.
93
```

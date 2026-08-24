# PDF page 89 of 105

Evidence class: `CROSS-MODEL-SOURCE` (fx-115ES PLUS / fx-991ES PLUS C).
Do not treat 115/C-only modes (INEQ, VERIFY, DIST) as FX-991ESPLUS-2 hardware.

```text
Note
• To change the distribution calculation type after you enter the DIST Mode, press
(STAT/DIST)
 (Type) and then select the distribution type you want.
• Distribution calculation accuracy is up to five significant digits.
V
ariables that Accept Input
The following are distribution calculation variables that accept input
values.
Normal PD ........................... x, σ, μ
Normal CD ........................... Lower, Upper, σ, μ
Inverse Normal .................... Area, σ, μ (Tail setting always left.)
Binomial PD, Binomial CD ... x (or List), N, p
Poisson PD, Poisson CD ..... x (or List), μ
x: data
σ: standard deviation (σ < 0)
μ: mean
Lower: lower boundary
Upper: upper boundary
Tail: probability value tail specification
Area: probability value (0 ≦ Area ≦ 1)
List: sample data list
N: number of trials
p: success probability (0 ≦ p ≦ 1)
List Screen (Binomial PD, Binomial CD, Poisson
PD, Poisson CD)
With Binomial PD, Binomial CD, Poisson PD, and Poisson CD, use the
List Screen for sample data input. You can input up to 25 data samples for
each variable. Calculation results are also displayed on the List Screen.
(1) Distribution calculation type
(2) V
alue at current cursor position
(3) X: Sample data
(4) Ans: Calculation results
88
```

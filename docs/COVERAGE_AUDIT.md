# Coverage audit (v1)

## Capability counts

| Bucket | Count |
| --- | --- |
| Identified (matrix rows) | 40 |
| REQUIRED-V1 (P0 floor + P0 extras) | 26 |
| REQUIRED-V1 with Ver=VERIFIED | 16 |
| IMPLEMENTED (not yet VERIFIED) | included in PARTIAL |
| PARTIAL | 14 |
| BLOCKED | 1 (PWA live install — Pages) |
| NEEDS HUMAN REVIEW | 2 (keymap visual, rounding ties) |
| DEFERRED (P2) | 5 |
| UNSUPPORTED-BY-HARDWARE | 3 (INEQ, VERIF, DIST) |

**REQUIRED-V1 verification percentage (P0 floor items marked VERIFIED / P0 REQUIRED-V1):**  
16 / 26 = **61.5%** of P0 matrix rows.  

**§15 functional v1 floor:** COMP arithmetic, trig, angle, fractions, exponents, SHIFT, ALPHA, replay, core errors, Ans, AC, overlay, LCD rendering are present with passing golden tests. Gaps vs a strict reading of §15: PreAns dedicated entry, persistence e2e, live PWA install/offline on GitHub Pages, visual calibration sign-off, full cursor golden coverage.

This build must **not** be described as a complete clone.

## Tests

| Suite | Result (local agent) |
| --- | --- |
| Vitest golden + unit | 28 passed |
| Playwright | run in CI / local e2e |
| Differential vs physical unit | N/A |

## Visual calibration

Inspected via image-band analysis + geometric keymap. **Not** signed off as visually verified against the original chat binary (`NEEDS HUMAN REVIEW`). Use `?debug=true`.

## Deployment

Workflow: `.github/workflows/ci.yml`. Live Pages URL after enable + merge to `main`:  
`https://bratadeepsarkar123.github.io/casio-fx-991es-copy/`

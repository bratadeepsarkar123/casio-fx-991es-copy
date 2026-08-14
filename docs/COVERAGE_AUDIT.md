# Coverage audit (hardening pass)

Statuses follow the three-axis model in `CAPABILITY_MATRIX.md`.
**VERIFIED** = Impl `IMPLEMENTED` and Ver `VERIFIED`.

## A. Functional-v1 floor

`REQUIRED-FUNCTIONAL-V1` rows: **26**  
VERIFIED: **25** (PWA live origin is BLOCKED)  
**25 / 26**

Not VERIFIED in this bucket:

- `C-P0-PWA` — Impl `IMPLEMENTED`, Ver `BLOCKED` (GitHub Pages not enabled; `GET /repos/.../pages` → 404). Intended URL: https://bratadeepsarkar123.github.io/casio-fx-991es-copy/

## B. Complete-clone required surface

`REQUIRED-COMPLETE-CLONE` rows: **7** (CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR)  
VERIFIED: **0**  
**0 / 7**

All seven are Impl `PARTIAL` (MODE entry only), Ver `UNVERIFIED`. This pass does **not** implement those editors.

## Other buckets (not mixed into A or B)

| Bucket | Count | IDs |
| --- | --- | --- |
| Identified (matrix rows) | 45 | |
| PARTIAL (implementation) | 10 | 7× P1 modes + INT + DIFF + SUM |
| BLOCKED (verification) | 1 | C-P0-PWA |
| NEEDS-HUMAN-REVIEW (verification) | 3 | C-P0-PREANS, C-NHR-CAL, C-NHR-RND |
| DEFERRED (priority) | 4 | C-P2-INT, DIFF, SUM, SOLVE |
| UNSUPPORTED-BY-HARDWARE | 3 | INEQ, VERIFY, DIST |
| OPTIONAL-V1 (priority, excl. NHR visual/rounding if counted above) | 4 | PREANS, KBD, NHR-CAL, NHR-RND |

This build must **not** be described as a complete clone. No physical differential testing. Playwright tablet project is Chromium with an iPad-sized viewport, **not** real iOS Safari.

## Tests (filled after the gate)

| Suite | Result |
| --- | --- |
| Vitest | 70 passed (pre-gate) |
| Playwright | pending full gate |
| `tsc --noEmit` / lint | pending full gate |
| production build + Workbox | pending full gate |
| Differential vs physical unit | N/A |

## Visual calibration

Inspected via geometric keymap. **Not** signed off against the original chat binary (`NEEDS-HUMAN-REVIEW`). Use `?debug=true`. Shared `containedImageRect` + `public/keymap.json` unchanged (no coordinate retune).

## Deployment

Workflow: `.github/workflows/ci.yml` (verify job + Pages deploy from `main`).  
Live Pages: **BLOCKED** until repository Pages is enabled.  
Intended URL: `https://bratadeepsarkar123.github.io/casio-fx-991es-copy/`

## Provenance

See `docs/EVIDENCE_CLASSES.md`, `docs/NUMERIC_AUDIT.md`, `TARGET_SPEC.md` D-012 (PreAns unconfirmed on target official memory ToC).

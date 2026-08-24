# Coverage audit (hardening pass)

Architecture/readiness map: `docs/ARCHITECTURE.md` (COMP-core freeze, FLOW A/B, future-mode readiness). Do not treat that document as a complete-clone claim.

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
VERIFIED: **5** (TABLE f(x); BASE-N; CMPLX; STAT; EQN; D-016 / D-017 / D-018 / D-019 / D-020)  
**5 / 7**

MATRIX and VECTOR remain Impl `PARTIAL` (MODE entry only), Ver `UNVERIFIED`. TABLE is Impl `IMPLEMENTED`, Ver `VERIFIED` for the official f(x) flow. BASE-N is Impl `IMPLEMENTED`, Ver `VERIFIED` for the official integer/logical flow. CMPLX is Impl `IMPLEMENTED`, Ver `VERIFIED` for official arithmetic/polar/arg/Conjg/Abs examples (not hardware). STAT is Impl `IMPLEMENTED`, Ver `VERIFIED` for official Ex2–Ex4 (and numeric Ex5 t/P); not hardware. EQN is Impl `IMPLEMENTED`, Ver `VERIFIED` for official Ex1–Ex5 (not hardware). g(x) is not implemented. Bit shifts are DEFERRED. Complex STO and non-real trig/log/√ are PARTIAL/DEFERRED. STAT Q/R are INFERRED; Q1/Med/Q3 are 115/C-only. EQN vertex min/max is not implemented.

## Other buckets (not mixed into A or B)

| Bucket | Count | IDs |
| --- | --- | --- |
| Identified (matrix rows) | 44 | |
| PARTIAL (implementation) | 5 | 2× remaining P1 modes + INT + DIFF + SUM |
| BLOCKED (verification) | 1 | C-P0-PWA |
| NEEDS-HUMAN-REVIEW (verification) | 3 | C-P0-PREANS, C-NHR-CAL, C-NHR-RND |
| DEFERRED (priority) | 4 | C-P2-INT, DIFF, SUM, SOLVE |
| UNSUPPORTED-BY-HARDWARE | 3 | INEQ, VERIFY, DIST |
| OPTIONAL-V1 (priority) | 4 | PREANS, KBD, NHR-CAL, NHR-RND |

This build must **not** be described as a complete clone. No physical differential testing. Playwright tablet project is Chromium with an iPad-sized viewport, **not** real iOS Safari.

## Tests (this revision, actually run)

| Suite | Result |
| --- | --- |
| `npm ci` | pass |
| Vitest (`npm test`) | **257 passed** (24 files). Pre-EQN baseline 223/21 files; EQN solver + reducer + goldens added. COMP `golden/acceptance.test.ts` still 30 passed. TABLE, BASE-N, CMPLX, and STAT suites still green. |
| `npm run lint` (`tsc --noEmit`) | pass |
| `npm run build` (`tsc` + Vite PWA) | pass — Workbox precache 15 entries |
| Playwright (`npx playwright install --with-deps chromium` then `npm run test:e2e`) | **27 passed** (was 24; +EQN on Chromium desktop, Pixel 7, iPad-sized Chromium). **Not** real iOS Safari. |
| Differential vs physical unit | N/A |

## Visual calibration

Inspected via geometric keymap. **Not** signed off against the original chat binary (`NEEDS-HUMAN-REVIEW`). Use `?debug=true`. Shared `containedImageRect` + `public/keymap.json` unchanged (no coordinate retune).

## Deployment

Workflow: `.github/workflows/ci.yml` (verify job + Pages deploy from `main`).  
Live Pages: **BLOCKED** until repository Pages is enabled.  
Intended URL: `https://bratadeepsarkar123.github.io/casio-fx-991es-copy/`

## Provenance

See `docs/EVIDENCE_CLASSES.md`, `docs/NUMERIC_AUDIT.md`, `TARGET_SPEC.md` D-012 (PreAns unconfirmed on target official memory ToC).

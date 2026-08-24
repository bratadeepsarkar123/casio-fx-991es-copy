# Coverage audit (hardening pass)

Architecture/readiness map: `docs/ARCHITECTURE.md` (COMP-core freeze, FLOW A/B, domain map). Post-major-mode scorecard: `docs/POST_MAJOR_MODE_AUDIT.md`. Do not treat those documents as a hardware-complete clone claim.

Statuses follow the three-axis model in `CAPABILITY_MATRIX.md`.
**VERIFIED** = Impl `IMPLEMENTED` and Ver `VERIFIED`.

## A. Functional-v1 floor

`REQUIRED-FUNCTIONAL-V1` rows: **26**  
VERIFIED: **25** (PWA live origin is BLOCKED)  
**25 / 26**

Not VERIFIED in this bucket:

- `C-P0-PWA` — Impl `IMPLEMENTED`, Ver `BLOCKED`. Pages is enabled (`html_url` 200, `build_type: legacy`, branch `cursor/fx991es-plus2-web-clone-4c69`, path `/`). Live HTML is the Vite **source** `index.html`; `/src/main.tsx` → **404** (blank calculator, 2 module errors). Not a live-PWA verification. Fix: Pages source **GitHub Actions**, or branch folder **`/docs`**.

## B. Complete-clone required surface

`REQUIRED-COMPLETE-CLONE` rows: **7** (CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR)  
VERIFIED: **7** (source-derived — TABLE f(x); BASE-N; CMPLX; STAT; EQN; MATRIX; VECTOR; D-016 … D-022)  
**Major-mode source verification: 7 / 7**  
**Hardware differential verification: N/A** · **Target-manual verification: limited** · **Visual: NHR** · **Live PWA: BLOCKED**

VECTOR is Impl `IMPLEMENTED`, Ver `VERIFIED` for official Ex1–Ex4, Ex6, Ex7 (source-derived, not hardware). Ex5 2D×2D cross uses an inferred `(0,0,−2)` because the official HTML dropped the printed result (`NEEDS-HUMAN-REVIEW`). TABLE is Impl `IMPLEMENTED`, Ver `VERIFIED` for the official f(x) flow. BASE-N is Impl `IMPLEMENTED`, Ver `VERIFIED` for the official integer/logical flow. CMPLX is Impl `IMPLEMENTED`, Ver `VERIFIED` for official arithmetic/polar/arg/Conjg/Abs examples (not hardware). STAT is Impl `IMPLEMENTED`, Ver `VERIFIED` for official Ex2–Ex4 (and numeric Ex5 t/P); not hardware. EQN is Impl `IMPLEMENTED`, Ver `VERIFIED` for official Ex1–Ex5 (not hardware). MATRIX is Impl `IMPLEMENTED`, Ver `VERIFIED` for official Ex1–Ex8 (source-derived, not hardware). g(x) is not implemented. Bit shifts are DEFERRED. Complex STO and non-real trig/log/√ are PARTIAL/DEFERRED. STAT Q/R are INFERRED; Q1/Med/Q3 are 115/C-only. EQN vertex min/max is not implemented. MATRIX Ref/Rref is 115/C-only. VECTOR has no dedicated Angle command (Ex7 is a user formula).

## Other buckets (not mixed into A or B)

| Bucket | Count | IDs |
| --- | --- | --- |
| Identified (matrix rows) | 44 | |
| PARTIAL (implementation) | 3 | INT + DIFF + SUM |
| BLOCKED (verification) | 1 | C-P0-PWA |
| NEEDS-HUMAN-REVIEW (verification) | 3 | C-P0-PREANS, C-NHR-CAL, C-NHR-RND |
| DEFERRED (priority) | 4 | C-P2-INT, DIFF, SUM, SOLVE |
| UNSUPPORTED-BY-HARDWARE | 3 | INEQ, VERIFY, DIST |
| OPTIONAL-V1 (priority) | 4 | PREANS, KBD, NHR-CAL, NHR-RND |

This build must **not** be described as a complete clone or as hardware-equivalent. All seven major target modes are implemented and source-verified; hardware differential verification, visual sign-off, and live PWA verification remain outstanding. Playwright tablet project is Chromium with an iPad-sized viewport, **not** real iOS Safari.

## Tests (this revision, actually run)

| Suite | Result |
| --- | --- |
| `npm ci` | pass |
| Vitest (`npm test`) | **353 passed** (31 files). Pre-audit VECTOR-gate 336/30 files; +17 COMP `call.name` gate tests (`call-name-gate.test.ts`). COMP `golden/acceptance.test.ts` still 30 passed. Persistence `persist.test.ts` 17 passed. Golden suites still green. |
| `npm run lint` (`tsc --noEmit`) | pass |
| `npm run build` (`tsc` + Vite PWA) | pass — Workbox precache **15** entries; manifest `start_url`/`scope` `/casio-fx-991es-copy/` |
| Playwright (`npx playwright install --with-deps chromium` then `CI=true npm run test:e2e`) | **33 passed** (Chromium desktop, Pixel 7, iPad-sized Chromium). **Not** real iOS Safari. |
| Differential vs physical unit | N/A |
| GitHub Pages API | enabled (`legacy` / branch root). Live `/` is Vite source `index.html`; `/src/main.tsx` **404**. `C-P0-PWA` still BLOCKED |

## Visual calibration

Inspected via geometric keymap. **Not** signed off against the original chat binary (`NEEDS-HUMAN-REVIEW`). Overlay is on by default (`?debug=false` hides). D-pad boxes were retuned to the teardrop quadrants; still NHR. Shared `containedImageRect` + `public/keymap.json`.

## Deployment

Workflow: `.github/workflows/ci.yml` (verify job + Pages deploy of `dist/`).  
Live origin: **https://bratadeepsarkar123.github.io/casio-fx-991es-copy/** — HTTP 200 but currently **legacy branch `/(root)`**, so it serves Vite source (blank UI). Production files are in `docs/` for folder `/docs`, or via GitHub Actions. **Do not claim live PWA verification.**

## Provenance

See `docs/EVIDENCE_CLASSES.md`, `docs/NUMERIC_AUDIT.md`, `TARGET_SPEC.md` D-012 (PreAns unconfirmed on target official memory ToC).

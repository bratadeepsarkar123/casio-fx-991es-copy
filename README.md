# Casio fx-991ES PLUS-2 web clone

Responsive, offline-capable web clone of the **Casio fx-991ES PLUS 2nd edition** (`FX-991ESPLUS-2`). Faithfulness is judged against **manual worked examples**, not visual impression.

## Not a complete clone

P0 COMP-mode behavior is covered by golden tests. TABLE f(x) (D-016), BASE-N (D-017), CMPLX (D-018), and STAT (D-019) are implemented. Other P1 modes (EQN, MATRIX, VECTOR) can be **entered** from MODE but are not verified editors. Functional-v1 vs complete-clone counts are separate; see `CAPABILITY_MATRIX.md` and `docs/COVERAGE_AUDIT.md`.

## Requirements

- Node.js **22.14.0** (see `.nvmrc`)
- npm **10.9.7** (lockfile committed)

## Commands

```bash
npm ci
npm test          # Vitest: engine + golden + keymap
npm run lint      # tsc --noEmit
npm run build     # production build (base /casio-fx-991es-copy/)
npm run dev       # http://localhost:5173/casio-fx-991es-copy/
npm run preview
npm run test:e2e  # Playwright (build + preview)
```

## Usage

- Click/tap the photographed keys. `?debug=true` outlines hit-zones.
- SHIFT / ALPHA latches match the gold / red legends.
- MODE enters the 8 target modes. SETUP is SHIFT MODE.

## Architecture

- `src/calc/` — framework-independent calculator (`reduce`, decimal.js policy, AST editor).
- `src/store.ts` — Zustand holds `CalcState` only.
- `public/keymap.json` — percent hit-zones.
- `golden/` — manual-derived tests.
- Full layer map, FLOW A/B traces, and future-mode readiness: `docs/ARCHITECTURE.md`.

## Docs

- `docs/ARCHITECTURE.md` — system layers, state model, event flows, mode readiness
- `docs/BASE_N.md` — BASE-N integer domain, evidence classes, unresolved hardware items
- `docs/CMPLX.md` — CMPLX extended numeric domain, evidence classes, unresolved items
- `docs/STAT.md` — STAT dataset domain, evidence classes, unresolved hardware items
- `TARGET_SPEC.md` — model lock, PDF hash, variant conflict, evidence hierarchy
- `docs/EVIDENCE_CLASSES.md` — TARGET-MANUAL / TARGET-OFFICIAL-DOC / CROSS-MODEL-SOURCE / …
- `docs/NUMERIC_AUDIT.md` — native Number/Math classification
- `calc_logic_reference.md` — page citations + evidence tags
- `CAPABILITY_MATRIX.md` — priority + impl + verification
- `DECISIONS.md` / `RISK_REGISTER.md`
- `MANUAL_COVERAGE.md` / `docs/COVERAGE_AUDIT.md`

## Non-goals (v1)

- Dark theme
- Non-English UI
- Programmability / cloud sync
- Pixel-perfect LCD dot-matrix
- Full screen-reader parity beyond ARIA key labels
- Claiming 115ES PLUS C-only modes (INEQ, VERIFY, DIST)

## Deploy

GitHub Pages path: `/casio-fx-991es-copy/`. CI deploys `dist/` from `main` when Pages is enabled.

## License / trademark

Unofficial educational clone. Casio names and the product photograph remain Casio’s. Not affiliated with Casio.

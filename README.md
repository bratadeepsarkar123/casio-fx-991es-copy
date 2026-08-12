# Casio fx-991ES PLUS-2 web clone

Responsive, offline-capable web clone of the **Casio fx-991ES PLUS 2nd edition** (`FX-991ESPLUS-2`). Faithfulness is judged against **manual worked examples**, not visual impression.

## Not a complete clone

P0 COMP-mode behavior is covered by golden tests. P1 modes (STAT, TABLE, EQN, BASE-N, MATRIX, VECTOR, CMPLX) can be **entered** from MODE but are not verified editors. See `CAPABILITY_MATRIX.md`.

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

## Docs

- `TARGET_SPEC.md` — model lock, PDF hash, variant conflict
- `calc_logic_reference.md` — page citations
- `CAPABILITY_MATRIX.md` — IDs and statuses
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

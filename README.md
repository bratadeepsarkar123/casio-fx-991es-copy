# Casio fx-991ES PLUS-2 web clone

Responsive, offline-capable web calculator using the **Casio fx-991ES PLUS 2nd edition** (`FX-991ESPLUS-2`) chassis. Calculator behavior is checked against the selected fx-570ES PLUS / fx-991ES PLUS manual and its worked examples. The selected manual does not state an edition, so equivalence with the photographed second-edition hardware is not established.

## Not a hardware-complete clone

COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE and VECTOR are implemented, with manual-derived examples and automated tests. Exact hardware equivalence is not established. See `docs/MANUAL_REQUIREMENT_LEDGER.md` and `docs/MANUAL_DISCREPANCIES.md` for the evidence and open items.

## Known limitations

- The app does not reproduce a verified keypad-triggered **Stack ERROR**. The selected manual describes stack exhaustion but does not give the limits or a triggering sequence.
- Some edge cases, including certain percentage boundaries, BASE-N errors and matrix/vector navigation, have not been exhaustively checked. A BASE-N manual example also has conflicting prose and illustration.
- LCD dot patterns, cursor scrolling and timing have not been compared with a matching physical calculator. Some display geometry is reconstructed from the manual.
- Mobile and offline behavior were tested in browser emulation; installation and offline use on an actual Android device remain unverified. This is a web app, not a native Android app.

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

- Click/tap the photographed keys. Red hit-zone outlines are **off by default**. Show them with `?debug=true`.
- SHIFT / ALPHA latches match the gold / red legends.
- MODE enters the 8 target modes. SETUP is SHIFT MODE.

## Architecture

- `src/calc/` — framework-independent calculator (`reduce`, decimal.js policy, AST editor).
- `src/store.ts` — Zustand holds `CalcState` only.
- `public/keymap.json` — percent hit-zones.
- `golden/` — manual-derived tests.
- Full layer map, FLOW A/B traces, and future-mode readiness: `docs/ARCHITECTURE.md`.

## Docs

- `docs/ARCHITECTURE.md` — system layers, state model, event flows, domain map
- `docs/POST_MAJOR_MODE_AUDIT.md` — post-major-mode architecture/evidence scorecard (not a hardware-clone claim)
- `docs/BASE_N.md` — BASE-N integer domain, evidence classes, unresolved hardware items
- `docs/CMPLX.md` — CMPLX extended numeric domain, evidence classes, unresolved items
- `docs/STAT.md` — STAT dataset domain, evidence classes, unresolved hardware items
- `docs/EQN.md` — EQN coefficient solver domain, evidence classes, unresolved hardware items
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
- Full screen-reader parity beyond ARIA key labels
- Claiming 115ES PLUS C-only modes (INEQ, VERIFY, DIST)

## Deploy

GitHub Pages URL: `https://bratadeepsarkar123.github.io/casio-fx-991es-copy/`.

Pages Source is **GitHub Actions**. The origin serves the production `dist/` build (hashed `/casio-fx-991es-copy/assets/…`). Do **not** switch back to branch folder `/(root)`.

Live PWA install/offline is **not verified**. Serving `dist/` is necessary but not a passing install/offline check.

Fallback if Actions Pages is unavailable: Deploy from a branch + folder **`/docs`** (`npm run pages:sync`). Folder must be `/docs`, not `/(root)`.

## License / trademark

Unofficial educational clone. Casio names and the product photograph remain Casio’s. Not affiliated with Casio.

# Source evidence

- `supplied/FX991ESPLUS2_user_manual.pdf` — user-supplied **fx-115ES PLUS / fx-991ES PLUS C** combined guide (`CROSS-MODEL-SOURCE`; see TARGET_SPEC.md). Not an exact FX-991ESPLUS-2 manual.
  - SHA-256: `a63782bd7c93061759a08410d4b22d45f010bd6edce77e721bb3f92ef30c951e`
  - 105 pages. Cover models are fx-115ES PLUS / fx-991ES PLUS C, not a title that says fx-991ES PLUS-2 alone.
- `supplied/manual-md/` — lossless **text extract** of that PDF, one markdown file per printed page (`001-…md` … `105-…md`) plus `INDEX.md`. No OCR. Concatenated copy: `supplied/FX991ESPLUS2_user_manual.md`.
  - Extracted with pypdf. Key glyphs and diagrams that were never text are marked `NEEDS-HUMAN-REVIEW` on the page or in `calc_logic_reference.md`.
  - Do **not** invent hardware behavior from 115/C-only chapters (INEQ, VERIFY, DIST).
- Official target ToC: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/ (`TARGET-OFFICIAL-DOC`).
- Chassis photograph is under `public/assets/` (official Casio product photo, cropped) (`EMPIRICAL`).

## Copyright

The PDF is Casio’s user’s guide, redistributed here as evidence for an **unofficial educational clone**. This project does **not** claim Casio permission. Casio names remain Casio’s. If the manual should be private-only, drop the PDF from the public tree and keep the markdown extract behind the same restriction.

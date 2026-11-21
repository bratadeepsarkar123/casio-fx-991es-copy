# Owner-selected manual retrieval

## Current source decision

The app behavior reference selected by the owner is the 46-page Casio guide whose cover names **fx-570ES PLUS / fx-991ES PLUS**. Its SHA-256 is `1d2cd62e3af88b404dbc5db87646016e9e4a927f7798db8c89112777168d2686`. The cover does not label an edition; PDF metadata dates creation/modification to 2011. Use it as the expected behavior source for this clone by owner decision, while keeping transfer to the photographed fx-991ES PLUS-2 second-edition chassis unverified.

This differs from Casio’s current 84-page second-edition guide linked from the exact fx-991ES PLUS-2 support page (cover names fx-570ES PLUS / fx-991ES PLUS / fx-9910NG PLUS) and the project’s retained 105-page 2nd-edition fx-115ES PLUS / fx-991ES PLUS C combined guide. Only the selected 46-page and official 84-page second-edition guides list the same eight calculation modes. The retained 105-page fx-115ES PLUS / fx-991ES PLUS C manual additionally includes INEQ, VERIFY, and DIST. Keep model/edition-specific details attributed to their source.

## Retrieval artifacts

- [Local corpus instructions, source comparison, search, and regeneration](../sources/selected-manual/README.md)
- [Source identity and visual-review manifest](../sources/selected-manual/manifest.json)
- [Normalized physical keys, results, confidence, and citations](../sources/selected-manual/examples.jsonl)
- Local full text: `sources/selected-manual/pages/pdf-NNN.md` (46 files, ignored and not included in source control).
- Local page renders: `sources/selected-manual/renders/` (ignored).

Search local pages with `rg -n -uuu -i "phrase or result" sources/selected-manual/pages`. Search keys or answers in examples with `rg -n -i '"physical_key_event_ids"|"expected_result"' sources/selected-manual/examples.jsonl`. Citations use PDF page and printed `E-n` page.

## Scope and confidence

The eight mode examples cover COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, and VECTOR. Additional records cover CALC, SOLVE, Σ, Math ERROR recovery, CODATA dating, and NIST conversion-source dating. Full text is extracted from all 46 pages, but the example catalog is a sample set, not a complete catalog of every function. See the manifest for the exact visual checks. No physical calculator was available.

# Evidence classes

Every manual-derived rule and capability in this repository is tagged with exactly one evidence class. A class is **not** a confidence slogan: it records where the claim came from and whether the **target chassis** independently confirms it.

## Classes

| Class | Meaning |
| --- | --- |
| `OWNER-SELECTED-MANUAL` | The 46-page owner-selected fx-570ES PLUS / fx-991ES PLUS guide (`sources/selected-manual/` retrieval artifacts). Authoritative for app behavior by owner decision; its cover has no edition label, so transfer to photographed fx-991ES PLUS-2 hardware remains unverified. |
| `TARGET-MANUAL` | Printed in a manual whose cover/title is the target model (fx-991ES PLUS 2nd edition / FX-991ESPLUS-2). **Neither retained PDF is this class**: the owner-selected guide has no edition label, and the 105-page retained guide is the 115/C combination. |
| `TARGET-OFFICIAL-DOC` | Casio’s official HTML/ToC for **fx-570ES PLUS / fx-991ES PLUS / fx-9910NG PLUS (2nd edition)**: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/ |
| `CROSS-MODEL-SOURCE` | Taken from the supplied **fx-115ES PLUS / fx-991ES PLUS C** 2nd-edition PDF (`sources/supplied/FX991ESPLUS2_user_manual.pdf`). May describe overlapping COMP behavior. **Must not be promoted to target-verified** unless a `TARGET-OFFICIAL-DOC` (or `TARGET-MANUAL`) source independently confirms the same capability/behavior. |
| `EMPIRICAL` | Observed from assets in this repo (chassis photograph, keymap geometry, running tests). Not a hardware measurement — no physical unit is available. |
| `INFERRED` | Clone implementation choice filling a gap (keystroke not printed, RNG algorithm, web refresh = power on, etc.). |
| `NEEDS-HUMAN-REVIEW` | Glyph/photo/hardware gap. Do not treat as verified. |

## Current owner-selected manual decision (2026-11-20)

Use `OWNER-SELECTED-MANUAL` for expected app behavior from the owner’s selected source. It does not by itself confirm physical second-edition behavior. Keep the earlier project PDF under `CROSS-MODEL-SOURCE`; the prior hierarchy in `TARGET_SPEC.md` is historical. See [the selected-manual guide](SELECTED_MANUAL.md).

## Target-confirmation status

| Status | Meaning |
| --- | --- |
| `CONFIRMED` | Target official docs and/or target chassis independently show the capability. |
| `UNCONFIRMED` | Only cross-model or inferred; target docs do not mention it. |
| `CONFLICT` | 115/C and target official docs disagree. |
| `N/A` | Not a target-model claim (unsupported-by-hardware, web-only, etc.). |

## Promotion rule

An `OWNER-SELECTED-MANUAL` rule establishes expected **app** behavior by the owner’s source-selection decision; the class does not certify photographed second-edition hardware.

A `CROSS-MODEL-SOURCE` rule may establish **clone** behavior for overlapping COMP arithmetic. It may establish **target** behavior only when `TargetConfirm = CONFIRMED` via an independent target document. Plausible overlap is not confirmation.

## Source documents

| ID | Document | Class of the file itself |
| --- | --- | --- |
| SEL-P* | Owner-selected 46-page guide, printed E-pages | `OWNER-SELECTED-MANUAL` |
| SRC-P* | Retained 105-page fx-115ES PLUS / fx-991ES PLUS C PDF printed pages | `CROSS-MODEL-SOURCE` |
| TGT-TOC | Official 570/991 2nd edition ToC/HTML | `TARGET-OFFICIAL-DOC` |
| CHASSIS | `public/assets/chassis-fx-991es-plus-2.png` + `public/keymap.json` | `EMPIRICAL` |
| SPEC | `TARGET_SPEC.md` / this clone’s web constraints | `INFERRED` where noted |

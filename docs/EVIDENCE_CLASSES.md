# Evidence classes

Every manual-derived rule and capability in this repository is tagged with exactly one evidence class. A class is **not** a confidence slogan: it records where the claim came from and whether the **target chassis** independently confirms it.

## Classes

| Class | Meaning |
| --- | --- |
| `TARGET-MANUAL` | Printed in a manual whose cover/title is the target model (fx-991ES PLUS 2nd edition / FX-991ESPLUS-2). **None of the supplied PDF is this class** — that file is the 115/C combined guide. |
| `TARGET-OFFICIAL-DOC` | Casio’s official HTML/ToC for **fx-570ES PLUS / fx-991ES PLUS / fx-9910NG PLUS (2nd edition)**: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/ |
| `CROSS-MODEL-SOURCE` | Taken from the supplied **fx-115ES PLUS / fx-991ES PLUS C** 2nd-edition PDF (`sources/supplied/FX991ESPLUS2_user_manual.pdf`). May describe overlapping COMP behavior. **Must not be promoted to target-verified** unless a `TARGET-OFFICIAL-DOC` (or `TARGET-MANUAL`) source independently confirms the same capability/behavior. |
| `EMPIRICAL` | Observed from assets in this repo (chassis photograph, keymap geometry, running tests). Not a hardware measurement — no physical unit is available. |
| `INFERRED` | Clone implementation choice filling a gap (keystroke not printed, RNG algorithm, web refresh = power on, etc.). |
| `NEEDS-HUMAN-REVIEW` | Glyph/photo/hardware gap. Do not treat as verified. |

## Target-confirmation status

| Status | Meaning |
| --- | --- |
| `CONFIRMED` | Target official docs and/or target chassis independently show the capability. |
| `UNCONFIRMED` | Only cross-model or inferred; target docs do not mention it. |
| `CONFLICT` | 115/C and target official docs disagree. |
| `N/A` | Not a target-model claim (unsupported-by-hardware, web-only, etc.). |

## Promotion rule

A `CROSS-MODEL-SOURCE` rule may establish **clone** behavior for overlapping COMP arithmetic. It may establish **target** behavior only when `TargetConfirm = CONFIRMED` via an independent target document. Plausible overlap is not confirmation.

## Source documents

| ID | Document | Class of the file itself |
| --- | --- | --- |
| SRC-P* | Supplied PDF printed pages | `CROSS-MODEL-SOURCE` |
| TGT-TOC | Official 570/991 2nd edition ToC/HTML | `TARGET-OFFICIAL-DOC` |
| CHASSIS | `public/assets/chassis-fx-991es-plus-2.png` + `public/keymap.json` | `EMPIRICAL` |
| SPEC | `TARGET_SPEC.md` / this clone’s web constraints | `INFERRED` where noted |

# TARGET_SPEC.md

Stable ID prefix: `TGT-`

## Verified model identity

| Field | Value | Evidence |
| --- | --- | --- |
| Manufacturer | Casio Computer Co., Ltd. | Supplied PDF cover; PDF metadata `/Author` |
| Marketing name | fx-991ES PLUS 2nd edition | Chassis photo; Casio product pages |
| Product code | FX-991ESPLUS-2 | [Casio intl product page](https://www.casio.com/intl/scientific-calculators/product.FX-991ESPLUS-2/) |
| Generation | ES PLUS, 2nd edition / NATURAL-V.P.A.M. | Cover of supplied PDF; chassis print |
| Function count | 417 | Official FX-991ESPLUS-2 specification |
| Display | 10+2 digits, Natural Textbook Display, dot matrix | Official specification |
| Power | Solar + LR44 | Supplied PDF p.100 (115/C combined spec); official 991ES PLUS-2 also solar+battery |
| Physical reference unit | **Not available** in this environment | Agent workspace has no hardware |

## Target regional variant

**International fx-991ES PLUS-2 / fx-991ES PLUS 2nd edition (417 functions).**

Colorway used for the chassis overlay: official Casio **FX-991ESPLUS-2BU** (light blue-gray), which matches the supplied chat reference photograph (integral \(\int_0^{\pi/2}\cos(X)\,dx=1\) on screen). Black Seq1 photography of the same product code exists; layout is the same.

## Primary reference manual (supplied)

| Field | Value |
| --- | --- |
| Filename as supplied | `FX991ESPLUS2_user_manual_dca3.pdf` (identical hash to `..._740b.pdf`) |
| Repo copy | `sources/supplied/FX991ESPLUS2_user_manual.pdf` |
| SHA-256 | `a63782bd7c93061759a08410d4b22d45f010bd6edce77e721bb3f92ef30c951e` |
| Pages | 105 |
| PDF title metadata | `fx-115ES PLUS_fx-991ES PLUS C` |
| Cover models | **fx-115ES PLUS** and **fx-991ES PLUS C** (2nd edition / NATURAL-V.P.A.M.) |
| Creator | AH Formatter V6.6 MR6 |
| CreationDate | 2019-10-28 (+09:00) |
| ModDate | 2019-11-07 (+09:00) |
| Author | CASIO COMPUTER CO., LTD. |

**Variant conflict (not silently resolved):** the supplied PDF is the North-American **fx-115ES PLUS / fx-991ES PLUS C** combined guide, not a cover titled “fx-991ES PLUS 2nd edition” alone. The 115/C guide documents extra modes **INEQ, VERIF, DIST** and dual-function TABLE defaults that the official fx-570ES PLUS / fx-991ES PLUS 2nd edition web ToC does **not** list.

## Source-of-truth hierarchy (this project)

1. Supplied PDF for overlapping COMP/setup/numeric/error behavior (worked examples, ranges, priority).
2. Official Casio documentation for **fx-570ES PLUS / fx-991ES PLUS / fx-9910NG PLUS (2nd edition)** for the **target capability surface** (modes present on FX-991ESPLUS-2).
   - https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/
3. Physical unit: **N/A** — differential testing is N/A.
4. Golden tests derived from (1)–(2).
5. General mathematical conventions.
6. Library behavior (`decimal.js`) only as an implementation tool.

## Chassis / display image

| Field | Value |
| --- | --- |
| Chat-attached binary | **Not persisted** as a file in the workspace (description + pixels were provided in-session) |
| Asset used | Official Casio product PNG `fx-991ES_PLUS-2BU_F.png`, cropped to the calculator silhouette |
| Repo path | `public/assets/chassis-fx-991es-plus-2.png` |
| SHA-256 | recorded in git |
| Calibration status | `NEEDS HUMAN REVIEW` — geometric keymap fit; inspect `?debug=true` |

## Physical reference

**Unavailable.** `TARGET_SPEC` records differential testing as **N/A**. No other emulator is treated as a physical oracle.

## URLs

- https://www.casio.com/intl/scientific-calculators/product.FX-991ESPLUS-2/
- https://edu.casio.com/intl/calculators/scientific/fx991es_2/
- https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/
- https://world.casio.com/manual/calc/

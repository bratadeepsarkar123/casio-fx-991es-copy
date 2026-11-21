# Owner-selected manual corpus (local source)

This directory indexes the PDF supplied by the owner: `fx-570_991ES_PLUS_EN.pdf`, SHA-256 `1d2cd62e3af88b404dbc5db87646016e9e4a927f7798db8c89112777168d2686`. The source file remains outside the repository; no PDF was copied or uploaded. Its cover says **fx-570ES PLUS / fx-991ES PLUS User’s Guide** and does not state an edition. The PDF metadata dates creation/modification to 2011.

## Local artifacts

- `pages/pdf-001.md` through `pdf-046.md`: full text-layer extraction, one PDF page per file, with PDF and printed-page labels. All 46 pages have extractable text. These copyrighted page extracts are ignored by this directory’s `.gitignore` and exist only locally.
- `renders/`: ignored rendered sample pages and zooms used for the visual checks listed in `manifest.json`. These are local only.
- `examples.jsonl`: normalized physical key-event examples and searchable results. Each mode sample has a physical key ID array, PDF/printed-page citations, reading confidence, explicit target-hardware transfer status, and the latest focused reducer audit merged directly into matching records; prior observations remain in `preAuditRuntimeObservation`/`preAuditTraceStatus` fields where useful.
- `manifest.json`: source checksum/identity, page map, extraction details, and the exact visual-review checklist.
- `extract_pages.py`: regenerates the ignored text cache from the original PDF after checking its SHA-256; it does not copy the PDF.

## Search

The current `examples.jsonl` index contains **86 records with 86 unique IDs**. Its 105 citations resolve to the local page cache across 36 PDF pages. When adding or removing records, update `manifest.json`'s `example_records` and this count. Validate that IDs remain unique and every `citations[].pdf_page` is in 1–46 and resolves to the corresponding `pages/pdf-NNN.md` file; each record should retain its source ID/hash and evidence class.

Use ripgrep, already available in the workspace:

```powershell
# Search extracted page text by operation, phrase, or result. Hits name the PDF page file.
rg -n -uuu -i "Math ERROR|Σ Calculations|0\.75" sources/selected-manual/pages

# Search normalized physical key IDs or result strings in the examples catalog.
rg -n -i '"physical_key_event_ids".*(SHIFT|ARROWRIGHT)|"expected_result".*(14/5|1\.414)' sources/selected-manual/examples.jsonl
```

Page files are intentionally ignored, so `-uuu` is needed to search them. The example file is not ignored. Each example citation gives PDF page and printed `E-n` page.

## Source identity and edition comparison

This manual is the app behavior reference by owner decision (`OWNER-SELECTED-MANUAL`). The exact fx-991ES PLUS-2 support page currently links to a separate **2nd edition / NATURAL-V.P.A.M.** Casio guide, 84 PDF pages, whose cover names fx-570ES PLUS, fx-991ES PLUS, and fx-9910NG PLUS. Its contents list the same eight calculation modes represented here. Only the owner-selected 46-page and support-linked 84-page guides list those same eight modes. The retained 105-page fx-115ES PLUS / fx-991ES PLUS C guide has additional INEQ, VERIFY, and DIST modes, so it has a different capability scope. Matching mode lists do not prove every selected-PDF rule is identical on the photographed second-edition chassis. Keep all three source identities separate.

- Owner-selected PDF: [Casio-hosted copy](https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf).
- fx-991ES PLUS-2 support page and linked 2nd-edition guide: [Casio support](https://www.casio.com/sg/scientific-calculators/support.FX-991ESPLUS-2/).
- Separate official 2nd-edition HTML contents: [Casio manual](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/).

The constants table states CODATA recommended values **(March 2007)** (PDF 38 / printed E-37). Metric conversion formula data cites **NIST Special Publication 811 (1995)** and says J↔cal conversion is for 15°C (PDF 39 / printed E-38). Treat those dates as source-specific and verify against the target edition before transferring constants or conversion values.

## Confidence and visual checks

Reading confidence is high only for the cited samples whose keycaps, symbols, formula structure, and result were visually checked. The manifest lists exactly what was checked on PDF pages 1, 2, 5, 8-12, 18-22, 25, 28, 30-31, 34-35, 37-39, and 41. E-4 separates input continuation from result continuation and gives AC priority before input scrolling; E-8 also specifies AC then left/right for a truncated Natural expression. Those E-4/E-8 interactions now have isolated production-browser traces, DOM geometry checks, and retained app-only crops in `docs/selected-manual-evidence/`. E-5 menu-page and E-12 history-position indicators have focused public-key coverage. Other indicator combinations and transfer to photographed fx-991ES PLUS-2 hardware remain unverified; no physical unit was available.

## Regenerate the local text cache

A clean checkout intentionally lacks the owner’s PDF and ignored text pages. Place the unchanged file at a local path, then run:

```powershell
python sources/selected-manual/extract_pages.py "$env:USERPROFILE\Downloads\fx-570_991ES_PLUS_EN.pdf"
```

The script validates the 46-page count and manifest SHA-256, then writes text only under ignored `pages/`. It requires the public `pypdf` package. Rendered-page review can be repeated with installed `PyMuPDF` (`fitz`) by rendering PDF page `n` from zero-based index `n-1`; save new images under ignored `renders/` and update the manifest only after inspection.

## Search-before-building check

A GitHub/web search found existing options such as `mshea/pdf_search`, `IgorOffline/ripgrep-all`, `renvk/pdf-search-mcp`, and `M-Agoumi/pdf-searcher`. This task only needs one local page per text file plus structured short examples, so it uses public `pypdf`, installed ripgrep, and a small checksum-guarded extraction wrapper. No PDF search application/service was built.

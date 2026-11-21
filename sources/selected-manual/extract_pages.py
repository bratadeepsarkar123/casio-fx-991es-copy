#!/usr/bin/env python3
"""Regenerate the ignored local text cache from the owner's original PDF."""
import argparse
from pathlib import Path
import hashlib
from pypdf import PdfReader

EXPECTED_SHA256 = "1d2cd62e3af88b404dbc5db87646016e9e4a927f7798db8c89112777168d2686"
EXPECTED_PAGES = 46

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("pdf", type=Path, help="path to the unchanged owner-supplied PDF")
args = parser.parse_args()
pdf = args.pdf.expanduser().resolve()
actual = hashlib.sha256(pdf.read_bytes()).hexdigest()
if actual != EXPECTED_SHA256:
    raise SystemExit(f"SHA-256 mismatch: {actual}")
reader = PdfReader(str(pdf))
if len(reader.pages) != EXPECTED_PAGES:
    raise SystemExit(f"Expected {EXPECTED_PAGES} pages, found {len(reader.pages)}")
out = Path(__file__).resolve().parent / "pages"
out.mkdir(parents=True, exist_ok=True)
for number, page in enumerate(reader.pages, 1):
    printed = f"E-{number - 1}" if 2 <= number <= 44 else "unpaginated"
    text = page.extract_text() or ""
    (out / f"pdf-{number:03d}.md").write_text(
        f"# PDF page {number:02d} | Printed page: {printed}\n\n"
        f"Source: SEL-FX570-991ES-2011; SHA-256 {EXPECTED_SHA256}.\n\n"
        f"```text\n{text.rstrip()}\n```\n", encoding="utf-8")
print(f"Wrote {len(reader.pages)} page files under {out}")

#!/usr/bin/env python3
"""PDF -> plain text for the Mexican Consumer pipeline: one block per page, headed "==== page N ====".

Usage: pdf2text.py <in.pdf> <out.txt>
Requires pdfplumber (pip install pdfplumber). The text is what the curated figures of the page are checked against,
so the extraction is kept as plain as possible (the library's own reading order, no reflow)."""
import sys
import pdfplumber

def main(src, dst):
    out = []
    with pdfplumber.open(src) as pdf:
        for i, page in enumerate(pdf.pages):
            out.append("==== page %d ====" % (i + 1))
            out.append((page.extract_text() or "").strip())
            out.append("")
    with open(dst, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

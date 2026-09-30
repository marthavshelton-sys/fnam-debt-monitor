"""DOE's daily SPR inventory report (an image, no text version) -> JSON.

    python spr_image_ocr.py <spr-inventory.jpg> <out.json>

DOE publishes the report only as a picture of a spreadsheet
(https://www.spr.doe.gov/dir/dir.html). RapidOCR (ONNX models bundled in the
wheel, no native install) reads its header: the "CURRENT SPR INVENTORY AS OF
<date>" line and the SWEET / SOUR / TOTAL volumes under it. Each volume is
assigned to the column heading nearest to it horizontally. The reading is
written only when it reconciles: sweet + sour must equal total within DOE's
own rounding (0.15 million barrels). Anything else exits non-zero so the
caller keeps the report as an image only.
"""
import json
import re
import sys
from datetime import date

from rapidocr_onnxruntime import RapidOCR

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
          "september", "october", "november", "december"]


def main(img, out):
    res, _ = RapidOCR()(img)
    if not res:
        sys.exit("no text found in the image")
    boxes = [{"t": t, "x": (b[0][0] + b[1][0]) / 2, "y": (b[0][1] + b[2][1]) / 2} for b, t, _s in res]

    as_of = None
    for b in boxes:
        m = re.search(r"ASOF([A-Za-z]+)(\d{1,2}),?(\d{4})", b["t"].replace(" ", ""), re.I)
        if m and m.group(1).lower() in MONTHS:
            as_of = date(int(m.group(3)), MONTHS.index(m.group(1).lower()) + 1, int(m.group(2))).isoformat()
            break
    if not as_of:
        sys.exit("'AS OF <date>' line not found")

    heads = {}
    for b in boxes:
        k = b["t"].strip().upper()
        if k in ("SWEET", "SOUR", "TOTAL") and k not in heads:
            heads[k] = b
    if len(heads) != 3:
        sys.exit("SWEET/SOUR/TOTAL headings not all found: " + ", ".join(sorted(heads)))
    vals = {}
    for b in boxes:
        m = re.match(r"^\s*([\d.,]+)\s*million\s*bbls?\s*$", b["t"], re.I)
        if not m:
            continue
        below = [(abs(h["x"] - b["x"]), k) for k, h in heads.items() if 0 < b["y"] - h["y"] < 40]
        if not below:
            continue
        k = min(below)[1]
        if k not in vals:
            vals[k] = float(m.group(1).replace(",", ""))
    if len(vals) != 3:
        sys.exit("volumes not all read: " + json.dumps(vals))
    if abs(vals["SWEET"] + vals["SOUR"] - vals["TOTAL"]) > 0.15:
        sys.exit("sweet %.1f + sour %.1f does not equal total %.1f" % (vals["SWEET"], vals["SOUR"], vals["TOTAL"]))

    rec = {"asOf": as_of, "sweet": vals["SWEET"], "sour": vals["SOUR"], "total": vals["TOTAL"]}
    with open(out, "w", encoding="utf-8") as f:
        json.dump(rec, f)
    print("DOE report as of %s: sweet %.1f + sour %.1f = total %.1f million bbl" % (as_of, rec["sweet"], rec["sour"], rec["total"]))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])

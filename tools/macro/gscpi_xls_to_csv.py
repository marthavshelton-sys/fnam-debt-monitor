"""Convert the NY Fed GSCPI workbook (a legacy .xls served as .xlsx) to CSV.

Used on the GitHub runner, where Excel is not available. Locally the
PowerShell processor uses Excel COM and never calls this. Output columns match
what process_supply.ps1 parses: Date (dd-Mon-yyyy), GSCPI.

The date column has been seen as an Excel serial, a text string, and a
formatted date cell, so all three are accepted. The first few rows are echoed
to the log so a future format change is diagnosable from the run output.
"""
import csv
import sys
from datetime import date, datetime, timedelta

import xlrd  # xlrd 2.x reads .xls only, which is exactly what this file is

src, dst = sys.argv[1], sys.argv[2]
book = xlrd.open_workbook(src)
names = book.sheet_names()
sheet = book.sheet_by_name("GSCPI Monthly Data") if "GSCPI Monthly Data" in names else book.sheet_by_index(-1)
print(f"sheets: {names}; using '{sheet.name}' with {sheet.nrows} rows")


def as_date(cell):
    if cell.ctype in (xlrd.XL_CELL_DATE, xlrd.XL_CELL_NUMBER):
        try:
            return date(1899, 12, 30) + timedelta(days=int(cell.value))
        except (ValueError, OverflowError):
            return None
    if cell.ctype == xlrd.XL_CELL_TEXT:
        s = cell.value.strip()
        for fmt in ("%d-%b-%Y", "%d-%b-%y", "%Y-%m-%d", "%m/%d/%Y", "%b-%Y", "%b %Y"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                pass
    return None


def as_number(cell):
    if cell.ctype == xlrd.XL_CELL_NUMBER:
        return float(cell.value)
    if cell.ctype == xlrd.XL_CELL_TEXT:
        try:
            return float(cell.value.strip())
        except ValueError:
            return None
    return None


rows = 0
with open(dst, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Date", "GSCPI"])
    for r in range(sheet.nrows):
        if sheet.ncols < 2:
            break
        d, v = sheet.cell(r, 0), sheet.cell(r, 1)
        if r < 8:
            print(f"row {r}: ctype {d.ctype}/{v.ctype} values {d.value!r} / {v.value!r}")
        dd, vv = as_date(d), as_number(v)
        if dd is None or vv is None or dd.year < 1990:
            continue
        w.writerow([dd.strftime("%d-%b-%Y"), f"{vv:.2f}"])
        rows += 1
print(f"gscpi rows: {rows}")

"""Convert the NY Fed GSCPI workbook (a legacy .xls served as .xlsx) to CSV.

Used on the GitHub runner, where Excel is not available. Locally the
PowerShell processor uses Excel COM and never calls this. Output columns match
what process_supply.ps1 parses: Date (dd-Mon-yyyy), GSCPI.
"""
import csv
import sys
from datetime import date, timedelta

import xlrd  # xlrd 2.x reads .xls only, which is exactly what this file is

src, dst = sys.argv[1], sys.argv[2]
book = xlrd.open_workbook(src)
sheet = book.sheet_by_name("GSCPI Monthly Data")


def excel_date(v):
    # Excel serial day number -> date (1900 date system).
    return date(1899, 12, 30) + timedelta(days=int(v))


rows = 0
with open(dst, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Date", "GSCPI"])
    for r in range(sheet.nrows):
        d, v = sheet.cell(r, 0), sheet.cell(r, 1)
        if d.ctype != xlrd.XL_CELL_DATE and d.ctype != xlrd.XL_CELL_NUMBER:
            continue
        if v.ctype != xlrd.XL_CELL_NUMBER:
            continue
        w.writerow([excel_date(d.value).strftime("%d-%b-%Y"), f"{v.value:.2f}"])
        rows += 1
print(f"gscpi rows: {rows}")

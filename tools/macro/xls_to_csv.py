"""Legacy .xls sheet -> CSV for the GitHub runner, which has no Excel.

    python xls_to_csv.py <workbook.xls> <sheet name> <out.csv> [date columns, 1-based, comma-separated]

Cells in the date columns are Excel serial dates and are written as YYYY-MM-DD;
every other number is written as-is (invariant, full precision); text is quoted
only when it contains a comma.
"""
import sys
import xlrd

book = xlrd.open_workbook(sys.argv[1])
sheet = book.sheet_by_name(sys.argv[2])
date_cols = set(int(c) - 1 for c in sys.argv[4].split(",")) if len(sys.argv) > 4 and sys.argv[4] else set()
with open(sys.argv[3], "w", encoding="utf-8", newline="") as out:
    for r in range(sheet.nrows):
        cells = []
        for c in range(sheet.ncols):
            cell = sheet.cell(r, c)
            v = cell.value
            if cell.ctype == xlrd.XL_CELL_NUMBER and c in date_cols:
                try:
                    v = xlrd.xldate_as_datetime(v, book.datemode).strftime("%Y-%m-%d")
                except Exception:
                    v = repr(v)
            elif cell.ctype == xlrd.XL_CELL_NUMBER:
                v = repr(v) if v != int(v) else str(int(v))
            elif cell.ctype == xlrd.XL_CELL_EMPTY:
                v = ""
            else:
                v = str(v)
                if "," in v or '"' in v:
                    v = '"' + v.replace('"', '""') + '"'
            cells.append(v)
        out.write(",".join(cells) + "\n")
print("rows", sheet.nrows)

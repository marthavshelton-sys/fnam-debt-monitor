"""Challenger, Gray & Christmas monthly job-cut report (PDF) -> JSON.

    python challenger_pdf.py <report.pdf> <out.json>

Uses PyMuPDF (binary wheels on every platform, no native build). Reads the
report's tables by position: every word on a page comes with its
x-range and baseline, lines are formed from words that share a baseline, header
rows (MON-YY, YTD YYYY, YYYY, Q1..Q4) define column x-ranges, and each number
on a later line is assigned to the header whose left or right edge is closest
(cells are left-aligned in some tables and right-aligned in others). A blank
cell simply produces no value. Two sub-tables side by side (Table 3) become two
header groups on the same line. The result carries only what the dashboard
needs; every figure is also checked against the report's own totals.
"""
import json
import re
import sys

import pymupdf as fitz  # PyMuPDF

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
MON3 = {m[:3].upper(): i + 1 for i, m in enumerate(MONTHS)}
HDR = re.compile(r"^([A-Z]{3}-\d{2}|YTD \d{4}|\d{4}|Q[1-4])$")
NUM = re.compile(r"^[\d,]+$")


def lines_of(page):
    # (x0, y0, x1, y1, text, block, line, word) per word, in reading order.
    words = page.get_text("words")
    toks = [{"s": w[4], "x0": w[0], "x1": w[2], "y": w[1]} for w in words if w[4].strip()]
    toks.sort(key=lambda t: (round(t["y"] / 2.5), t["x0"]))
    lines = []
    for t in toks:
        if lines and abs(lines[-1]["y"] - t["y"]) < 2.5:
            lines[-1]["t"].append(t)
        else:
            lines.append({"y": t["y"], "t": [t]})
    for L in lines:
        L["t"].sort(key=lambda t: t["x0"])
        T = L["t"]
        i = 0
        while i < len(T):
            a = T[i]
            b = T[i + 1] if i + 1 < len(T) else None
            c = T[i + 2] if i + 2 < len(T) else None
            if a["s"].upper() == "YTD" and b and re.match(r"^\d{4}$", b["s"]):
                T[i:i + 2] = [{"s": "YTD " + b["s"], "x0": a["x0"], "x1": b["x1"], "y": a["y"]}]
            elif re.match(r"^[A-Z]{3}$", a["s"]) and b and b["s"] == "-":
                if c and re.match(r"^\d{2}$", c["s"]):
                    T[i:i + 3] = [{"s": a["s"] + "-" + c["s"], "x0": a["x0"], "x1": c["x1"], "y": a["y"]}]
                else:
                    T[i:i + 2] = [{"s": a["s"] + "-", "x0": a["x0"], "x1": b["x1"], "y": a["y"]}]
            elif re.match(r"^[A-Z]{3}-$", a["s"]) and b and re.match(r"^\d{2}$", b["s"]):
                T[i:i + 2] = [{"s": a["s"] + b["s"], "x0": a["x0"], "x1": b["x1"], "y": a["y"]}]
            i += 1
    return lines


def parse(pdf_path):
    out = []          # rows: {"page", "table", "label", "cells": {hdr: value}} plus plain text lines
    groups = []
    line_no = 0
    table = None
    with fitz.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf, 1):
            if pno == 1:
                # "FOR RELEASE AT 7:30 A.M. ET, THURSDAY, SEPTEMBER 3, 2026" - the letters
                # come through spaced out, so match on the text with spaces removed.
                flat = re.sub(r"\s+", "", page.get_text()).upper()
                m = re.search(r"ET,[A-Z]+,([A-Z]+?)(\d{1,2}),(\d{4})", flat)
                if m and m.group(1).title() in MONTHS:
                    out.append({"page": 1, "releasedOn": "%s-%02d-%02d" % (m.group(3), MONTHS.index(m.group(1).title()) + 1, int(m.group(2)))})
            for L in lines_of(page):
                line_no += 1
                T = L["t"]
                text = " ".join(t["s"] for t in T)
                m = re.match(r"^T\s?ABLE\s*(\d+)", text, re.I)
                if m:
                    groups = []
                    table = int(m.group(1))
                    out.append({"page": pno, "table": table, "text": text})
                    continue
                hdr_toks = [t for t in T if HDR.match(t["s"])]
                clusters, cl = [], []
                for h in hdr_toks:
                    if cl and (any(x["s"] == h["s"] for x in cl) or h["x0"] - cl[-1]["x1"] > 150):
                        clusters.append(cl)
                        cl = []
                    cl.append(h)
                if cl:
                    clusters.append(cl)
                used = set()
                for c in clusters:
                    near = next((g for g in groups if line_no - g["line"] <= 4 and min(g["x1"], c[-1]["x1"]) - max(g["x0"], c[0]["x0"]) > -100), None)
                    if len(c) < 2 and not (near and re.match(r"^[A-Z]{3}-\d{0,2}$", c[0]["s"])):
                        continue
                    hdrs = [{"s": h["s"], "x0": h["x0"], "x1": h["x1"]} for h in c]
                    if near and min(near["x1"], c[-1]["x1"]) - max(near["x0"], c[0]["x0"]) < 5:
                        near["hdrs"] = sorted(near["hdrs"] + hdrs, key=lambda h: h["x0"])
                        near["x0"], near["x1"], near["line"] = near["hdrs"][0]["x0"], near["hdrs"][-1]["x1"], line_no
                    else:
                        g = {"hdrs": hdrs, "x0": c[0]["x0"], "x1": c[-1]["x1"], "line": line_no}
                        groups = [o for o in groups if o["x1"] < g["x0"] - 5 or o["x0"] > g["x1"] + 5] + [g]
                    groups.sort(key=lambda g: g["x0"])
                    for h in c:
                        used.add(id(h))
                rest = [t for t in T if id(t) not in used]
                if not rest:
                    continue
                if not groups or not any(NUM.match(t["s"]) for t in rest):
                    out.append({"page": pno, "table": table, "text": " ".join(t["s"] for t in rest)})
                    continue
                for gi, g in enumerate(groups):
                    left = -1e9 if gi == 0 else groups[gi - 1]["x1"] + 8
                    right = 1e9 if gi == len(groups) - 1 else g["x1"] + 8
                    mine = [t for t in rest if left <= t["x0"] < right]
                    cells, label = {}, []
                    for t in mine:
                        if re.match(r"^\d{2}$", t["s"]):
                            h = next((h for h in g["hdrs"] if h["s"].endswith("-") and abs(h["x1"] - t["x1"]) < 25), None)
                            if h:
                                h["s"] += t["s"]
                                continue
                        if NUM.match(t["s"]) and t["x1"] > g["hdrs"][0]["x0"] - 8:
                            best = min(g["hdrs"], key=lambda h: min(abs(h["x0"] - t["x0"]), abs(h["x1"] - t["x1"])))
                            cells[best["s"]] = int(t["s"].replace(",", ""))
                        else:
                            label.append(t["s"])
                    lab = re.sub(r"\s*/\s*", "/", re.sub(r"\s*-\s*", "-", " ".join(label))).strip()
                    if cells:
                        out.append({"page": pno, "table": table, "label": lab, "cells": cells})
    return out


def extract(rows):
    def in_table(n):
        return [r for r in rows if r.get("table") == n and "cells" in r]

    # Table 2 tells us the report month: the month-style header with the latest year.
    t2 = in_table(2)
    month_hdrs = set(h for r in t2 for h in r["cells"] if re.match(r"^[A-Z]{3}-\d{2}$", h))
    if not month_hdrs:
        raise SystemExit("no month headers found in Table 2")
    def ym(h):
        return (2000 + int(h[4:]), MON3[h[:3]])
    target_hdr = max(month_hdrs, key=ym)
    year, month = ym(target_hdr)
    target = "%d-%02d" % (year, month)
    ycol, pycol = "YTD %d" % year, "YTD %d" % (year - 1)

    # Table 1: month-by-month totals under year headers.
    monthly = {}
    for r in [r for r in rows if r.get("table") == 1 and "cells" in r]:
        if r["label"] in MONTHS:
            for h, v in r["cells"].items():
                if re.match(r"^\d{4}$", h):
                    monthly.setdefault(h, {})[MONTHS.index(r["label"]) + 1] = v
    cur_year = monthly.get(str(year), {})
    prev_year = monthly.get(str(year - 1), {})
    if month not in cur_year:
        raise SystemExit("Table 1 has no %s value for %d" % (MONTHS[month - 1], year))
    headline = cur_year[month]
    ytd_cuts = sum(v for m, v in cur_year.items() if m <= month)
    ytd_cuts_ly = sum(v for m, v in prev_year.items() if m <= month)

    # Table 2: industry rows for the target month.
    industry, t2_total = {}, None
    for r in t2:
        if r["label"].upper() == "TOTAL":
            t2_total = r["cells"].get(target_hdr)
        elif r["label"] and target_hdr in r["cells"]:
            industry[r["label"]] = r["cells"][target_hdr]

    # Table 3: states (regions and totals kept aside for the checks).
    regions, states = {}, {}
    for r in in_table(3):
        lab = r["label"]
        if not lab:
            continue
        rec = {"m": r["cells"].get(target_hdr, 0), "ytd": r["cells"].get(ycol), "prior": r["cells"].get(pycol)}
        if lab.upper() in ("EAST", "MIDWEST", "SOUTH", "WEST", "TOTAL"):
            regions.setdefault(lab.upper(), []).append(rec)
        else:
            states[lab] = rec

    # Table 6: hiring plans by month under year headers.
    hiring = {}
    for r in in_table(6):
        if r["label"] in MONTHS:
            for h, v in r["cells"].items():
                if re.match(r"^\d{4}$", h):
                    hiring.setdefault(h, {})[MONTHS.index(r["label"]) + 1] = v
    hire_cur = hiring.get(str(year), {})
    hire_prev = hiring.get(str(year - 1), {})
    hiring_this = [hire_cur.get(m, 0) for m in range(1, month + 1)]
    hiring_last = [hire_prev.get(m, 0) for m in range(1, 13)]

    # ---- checks against the report's own totals ----
    checks = []
    ind_sum = sum(industry.values())
    checks.append(("industry sum = Table 2 total", ind_sum, t2_total, t2_total is not None and abs(ind_sum - t2_total) <= 1))
    checks.append(("Table 2 total = Table 1 month", t2_total, headline, t2_total == headline))
    region_totals = [rec["m"] for rec in regions.get("TOTAL", [])]
    state_sum = sum(s["m"] for s in states.values())
    checks.append(("states sum = region totals sum (month)", state_sum, sum(region_totals), abs(state_sum - sum(region_totals)) <= 2))
    checks.append(("region totals = headline", sum(region_totals), headline, abs(sum(region_totals) - headline) <= 2))
    checks.append(("51 states", len(states), 51, len(states) == 51))
    released = next((r["releasedOn"] for r in rows if "releasedOn" in r), None)
    return {
        "asOfMonth": target, "releasedOn": released, "headline": headline, "monthly": {y: {str(m): v for m, v in d.items()} for y, d in monthly.items()},
        "ytdCuts": ytd_cuts, "ytdCutsLastYear": ytd_cuts_ly, "industry": industry, "states": states,
        "hiringThisYear": hiring_this, "hiringLastYear": hiring_last, "ytdHiring": sum(hiring_this), "ytdHiringLastYear": sum(hiring_last[:month]),
        "checks": [{"check": c, "got": g, "expected": e, "ok": bool(ok)} for c, g, e, ok in checks],
        "ok": all(ok for _, _, _, ok in checks),
    }


if __name__ == "__main__":
    rows = parse(sys.argv[1])
    result = extract(rows)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1)
    for c in result["checks"]:
        print(("OK  " if c["ok"] else "FAIL") + " " + c["check"] + ": " + str(c["got"]) + " vs " + str(c["expected"]))
    print("asOfMonth", result["asOfMonth"], "headline", result["headline"], "industries", len(result["industry"]), "states", len(result["states"]))
    sys.exit(0 if result["ok"] else 2)

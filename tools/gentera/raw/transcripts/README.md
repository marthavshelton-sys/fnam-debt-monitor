# Hand-supplied inputs: earnings-call transcripts and quarterly presentations

Drop Gentera's call transcripts and slide decks here (PDF, DOCX, PPTX or TXT; any file name that contains the
quarter, e.g. `Gentera 2T26 transcript.pdf`, `Presentacion 4T25.pdf`). Then run

```
python scripts/gentera/ingest-transcripts.py
```

which converts each file once to `tools/gentera/raw/text/transcripts/<YYYYQn>-<transcript|presentation>-<name>.txt`
and records it in `manifest.json`. The originals stay here as the audit trail. The reviewing routine reads the
converted texts when a new quarter lands to write the management quotes in `comments.js` (`CALLS` block: one
entry per call with `quotes` per income-statement / balance-sheet / operating row, EN as spoken and ES translated),
the guidance vintage in `guidance.js` (release date, call date, ranges and wording) and the reference facts
(ratings, management changes, subsidiary timelines).

## Files supplied (22 September 2026)

| Quarter | File | Source | Notes |
|---|---|---|---|
| 3T23 | `Gentera 3T23 earnings call transcript 2023-10-25.pdf` | FactSet CallStreet, raw transcript | Otis, guidance revision (loans up, EPS down) |
| 4T23 | `Gentera 4T23 earnings call transcript 2024-02-22.pdf` | FactSet CallStreet, corrected | 2024 guidance |
| 1T24 | `Gentera 1T24 earnings call transcript 2024-04-24.pdf` | FactSet CallStreet, raw | |
| 2T24 | `Gentera 2T24 earnings call transcript 2024-07-24.pdf` | FactSet CallStreet, corrected | Peru actions, cost of risk to ~12% |
| 3T24 | `Gentera 3T24 earnings call transcript 2024-10-23.pdf` | FactSet CallStreet, corrected | CEO change at Banco Compartamos |
| 3T24 | `Gentera 3T24 presentacion corporativa 2024-10-22.pdf` | Corporate presentation (47 slides) | ratings (p. 34, 40), allowance by grade (p. 39) |
| 4T24 | `Gentera 4T24 earnings call transcript 2025-02-27.pdf` | FactSet CallStreet, corrected | 2025 guidance |
| 1T25 | `Gentera 1T25 earnings call transcript 2025-04-24.pdf` | FactSet CallStreet, corrected | board changes, Peru CEO |
| 2T25 | `Gentera 2T25 earnings call transcript 2025-07-23.pdf` | FactSet CallStreet, raw | EPS guidance raised, competition map |
| 3T25 | `Gentera 3T25 earnings call transcript 2025-10-22.pdf` | FactSet CallStreet, NRT (automated) | wording garbled in places; quotes lightly cleaned |
| 4T25 | `Gentera 4T25 earnings call transcript 2026-02-25.pdf` | FactSet CallStreet, corrected | 2026 guidance, three value-sharing initiatives |

Missing: the 1T26 and 2T26 calls, the 4T22–2T23 calls (initial 2023 guidance) and the decks other than 3T24.

# Hand-supplied inputs: earnings-call transcripts and quarterly presentations

Drop Gentera's call transcripts and slide decks here (PDF, DOCX, PPTX or TXT; any file name that contains the
quarter, e.g. `Gentera 2T26 transcript.pdf`, `Presentacion 4T25.pdf`). Then run

```
python scripts/gentera/ingest-transcripts.py
```

which converts each file once to `tools/gentera/raw/text/transcripts/<YYYYQn>-<transcript|presentation>-<name>.txt`
and records it in `manifest.json`. The originals stay here as the audit trail. The reviewing routine reads the
converted texts when a new quarter lands to write the management quotes in `comments.js` (`call` field, per
income-statement line and per guidance metric) and to cross-check guidance and reference facts.

# Monthly routine: IMSS puestos de trabajo → PR

This is the stored prompt of the Claude Routine that keeps `imssJobs` current
(monthly, around the 14th, 08:47 Mexico City — IMSS publishes the prior month's
comunicado around the 9th–12th). It needs web search and access to the
`marthavshelton-sys/fnam-debt-monitor` repository. It never opens imss.gob.mx
from a script: that site's WAF blocks scripted clients and working around it is
off limits. Web search of imss.gob.mx is the reading channel.

---

Update the IMSS formal-employment series for fnam.mx/mx/macro.

1. Read `CLAUDE.md` and `tools/mx-macro/data/imss.json` in the repository. Note
   the last month in `series` (call it L).
2. For each month after L whose comunicado should be out by today, use web
   search restricted to imss.gob.mx (e.g. `"Al 30 de septiembre de 2026" IMSS
   "puestos de trabajo"`) to find the monthly statistical comunicado titled
   "Puestos de trabajo afiliados al Instituto Mexicano del Seguro Social"
   (URL `https://www.imss.gob.mx/prensa/archivo/YYYYMM/NNN`). Record, digit for
   digit, the month-end total of puestos de trabajo, the month's reported
   change ("se crearon" / "variación mensual"), and the comunicado URL. Use this
   basis only: not the Director's press-conference figures, not
   "afiliaciones asociadas a un patrón".
3. Accept a month only if IMSS's own figures reconcile to the unit:
   new level − previous level in the file = the reported monthly change. If
   the comunicado also prints a year-to-date or 12-month change, check those
   against the file too. If anything disagrees, re-search; if it still
   disagrees, stop and open an issue titled `IMSS figures do not reconcile
   <mes año>` with what you found instead of a PR.
4. On the designated branch, append each accepted month to `series` as
   `{"d":"YYYY-MM","v":<integer>,"how":"reported","src":"<comunicado URL>"}`
   (strictly ascending), set `updatedAt` to today and `comunicado` to the
   latest URL. Touch no other file. If the file already holds the latest
   month, stop: nothing to do.
5. Validate: `node -e` a quick check that months ascend and every value is
   between 15,000,000 and 40,000,000 with month-over-month change under
   2,000,000 (the pipeline rejects a file that breaks these).
6. Commit (`mx-macro: IMSS puestos de trabajo <mes año>`), push, open a PR to
   `main` whose body states each month, its figure, its reported change and the
   comunicado URL, wait for the "Refresh Mexico macro dashboard" run on the
   branch to succeed, then merge with merge method "merge" as CLAUDE.md
   describes, and reset the branch onto the merged main.

Never invent, interpolate, round or estimate a value. A month that cannot be
read and reconciled stays out of the file.

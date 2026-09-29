# Scheduled browser task: IMSS puestos de trabajo → PR

Paste this prompt into a scheduled task in the Claude desktop app (suggested
schedule: monthly, day 13, 09:00 Mexico City — IMSS publishes the prior
month's comunicado around the 10th–12th). The task needs browser access and
access to the `marthavshelton-sys/fnam-debt-monitor` repository.

---

Update the IMSS formal-employment series for fnam.mx/mx/macro.

1. Open https://www.imss.gob.mx/prensa and find the most recent comunicado
   reporting "puestos de trabajo" registered with IMSS (usually published in
   the second week of the month, reporting the prior month, e.g. "Al 31 de
   agosto de 2026, el IMSS tiene registrados X,XXX,XXX puestos de trabajo").
2. Record: the data month, the exact national total of puestos de trabajo
   (permanent plus eventual, the headline figure, as an integer — copy it
   digit for digit, never estimate or round), and the comunicado's URL.
3. In the repository, read `tools/mx-macro/data/imss.json`.
   - If `series` already contains that month with the same value, stop:
     nothing to do, do not open a PR.
   - FIRST RUN ONLY (if `series` is empty): walk the comunicados archive
     back until you have at least the most recent 30 months, each value
     taken digit for digit from its own comunicado. The page needs 24
     months minimum to show the section.
4. On a new branch, update `tools/mx-macro/data/imss.json` only:
   - append the new month(s) to `series` as `{"d":"YYYY-MM","v":<integer>}`,
     keeping the array in strictly ascending month order with no gaps in
     what you add;
   - set `updatedAt` to today (YYYY-MM-DD) and `comunicado` to the latest
     comunicado's URL;
   - touch no other file.
5. Open a pull request titled `mx-macro: IMSS puestos de trabajo <mes año>`
   with a body stating the month, the figure, and the comunicado URL.
6. Sanity rules the pipeline will enforce (a violating file is rejected and
   the page keeps its previous data): months strictly ascending; every value
   between 15,000,000 and 40,000,000; month-over-month change never above
   2,000,000. If your figures violate these, re-read the comunicado rather
   than forcing the numbers.

Never invent, interpolate, or adjust a value; every number must come from an
IMSS comunicado you actually opened.

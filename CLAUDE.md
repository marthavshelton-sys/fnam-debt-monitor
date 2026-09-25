# fnam.mx — working notes for Claude

Read this before touching the repository. It records how the owner works and where things live; it is not a
changelog (see `git log` and the runbooks under `tools/<slug>/README.md` for history and detail).

## The owner

- Martha V. Shelton, CFA, Director, Talipot Research & Analysis. She is female and speaks Mexican Spanish;
  translations and Spanish copy follow Mexican usage.
- Answers: brief, clear, fact- and data-driven. Cite the data source. State every assumption explicitly.
- Never put a model identifier in anything pushed to the repository (code, comments, data, PR text). Commit
  trailers requested by the harness are the only exception.
- Her email is identity only; never send it anywhere.

## Workflow she has approved

1. Develop on the designated `claude/…` branch, commit with clear messages, push with `git push -u origin <branch>`.
2. Open a PR against `main` (body ends with the harness attribution), merge it yourself with merge method
   "merge" (the merge call needs the full 40-character head SHA), then reset the branch onto the merged main:
   `git fetch origin main && git checkout -B <branch> origin/main && git push --force-with-lease -u origin <branch>`.
3. The stop hook requires a clean, committed tree. Regenerated data files count.
4. Cloudflare Pages deploys `main` automatically (root is `site/`; `site/_headers` and `site/_redirects` apply).
   Preview deploys post on every PR. fnam.mx is blocked from the cloud session's network, so live checks are the
   owner's; give her the exact URLs to click.
5. Never disable TLS verification or unset `HTTPS_PROXY`. Egress 403s are policy; report, do not retry.

## What the site is

Static, bilingual (ES default, EN via the page toggle), one interactive model per company plus macro and fiscal
dashboards, everything built from public data by GitHub Actions.

- `site/index.html` landing; hubs `site/aeropuertos/` (GAP, OMA, ASUR + `trafico/`) and `site/mauricio/` (Oracle).
- Company models: `site/gap`, `site/oma`, `site/asur` (ASUR/OMA share `site/assets/airport-model.js` driven by
  `config.js`), `site/qualitas`, `site/gentera`, `site/oracle`. Each has `index.html`, `app.js` (or the shared
  model), `data/*.js` exposing `window.<PREFIX>_FIN/_MARKET/_REF/_GUIDANCE/_COMMENTS/_SUMMARY…`, and an
  owner-only `quality.html`. GAP sits behind a Cloudflare Pages password middleware.
- Dashboards: `site/macro` and `site/mx/macro` are generated from `tools/macro/macro_monitor_template.html`
  and `tools/mx-macro/template.html` — edit the template and the page together. `site/fiscal`, `site/mx/fiscal`.
- Harvesters, parsers and validators live in `scripts/<slug>/`; raw files, reference data and runbooks in
  `tools/<slug>/`; schedules in `.github/workflows/<slug>-refresh.yml`.
- The Oracle "research" page was an experiment and is retired; `/oracle/research/*` redirects to `/oracle/`.
  Do not recreate it or reference it.

## Scheduled refreshes — rules that apply to every pipeline

- Bot/data commits use the marker `[skip actions]`, never `[skip ci]`: Cloudflare Pages treats
  `[skip ci]` as its own skip marker, so pages silently stop deploying while commits keep landing
  (this bit fiscal, GAP and both macro dashboards before it was fixed).
- Never write the literal skip-ci string inside a commit message either, even to describe it —
  GitHub Actions skips the push's workflow runs if it appears anywhere in the head commit message.
- Both macro dashboards refresh every day, weekends included (weekend runs usually commit nothing;
  sources publish weekdays). A run commits only when data changed.
- When working on one page, do not touch another page's workflow or scripts.
- The sandbox's egress proxy blocks the data providers (Banxico, INEGI, FRED, BLS…) and fnam.mx
  itself. To probe a live endpoint, dispatch the page's workflow with its diagnostics inputs and
  read the run log; verify deploys via Actions history and committed files, not by fetching the site.

## The macro dashboards

- `site/mx/macro` (Node, `scripts/mx-macro/` + `tools/mx-macro/`, ubuntu runner). `series.json` is a
  manifest of candidates per series; every candidate is verified against a title regex before it is
  accepted, so a wrong ID never reaches the page. Secrets: `BANXICO_TOKEN`, `INEGI_TOKEN`,
  `FRED_API_KEY`. INEGI's public developer API answers "No se encontraron resultados" for every BIE
  id — BIE series come from the query-builder service `interna_v1_3/API.svc/ExportacionBancoInformacion`
  (tematica "3", areasGeograficas "null", whole-year dates); details in `tools/mx-macro/README.md`.
  Diagnostics run on the runner via workflow_dispatch inputs (`probe`, `search`, `url`, `post`,
  `xlsx`); nothing is fetched or committed in that mode. After each refresh `health.mjs` flags any
  series no provider has answered for in 7 days and the workflow opens/closes an issue labeled
  `mx-macro-health`.
- `site/macro` (US; Windows PowerShell, `tools/macro/`). The two yearly BLS weights tables arrive as
  PRs from scheduled browser tasks because BLS answers scripted requests with 403
  (`process_weights.ps1` probes every run in case that changes). Challenger job cuts are read from
  the report PDF and only published when the figures reconcile against the report's own totals.
  `alerts.ps1` mails material updates as a GitHub issue; a source down three runs fails the run.
- Both templates open every section with an executive-summary card ("En resumen / At a glance":
  latest print, drivers, why it matters, what to watch). Every sentence is composed at render time
  from the same data as the charts — never hand-write summary text, it would go stale by the next run.
- Both builds enforce locale parity (identical I18N keys in es/en) and that every referenced string
  exists; a page builds only when 100% of strings resolve.
- To test a template change: build against the committed data
  (`node scripts/mx-macro/build.mjs --out /tmp/t.html --force`), open it in Playwright Chromium at
  1280px and 390px in both languages, click through every view, and check for `undefined`/`NaN`,
  hidden-section regressions and horizontal overflow. The MX pipeline can also be exercised fully
  offline by preloading a mock `fetch` with `node --import`.

## Board presentations (PDF)

- Shared engine `site/assets/present-core.js` (`window.FNAM_PRESENT`: `Doc`, `run`, `autoRun`, Title Case,
  `**bold**` runs, fit-to-page tables, off-screen Chart.js charts, cover, footers "Page X of Y" + confidentiality,
  next-results rule). Per-company builders extend `Doc`: `site/gap/present.js`, `site/oracle/present.js`,
  `site/assets/airport-present.js` (ASUR, OMA), `site/qualitas/present.js`, `site/gentera/present.js`.
- Each `app.js` exposes a read-only `window.<PREFIX>_MODEL`; builders read only that, never recompute figures.
- Deep link `/<slug>/?present=1&lang=es|en` builds the PDF on arrival; the landing pages link to it.
- Text measurement: jsPDF applies kerning that the written PDF does not, so the engine sums per-glyph widths.
- Chart conventions the owner asked for: y/y and margin lines in front of bars (red, white-filled points);
  two-axis charts say which series is on which axis; bold only a few key words per bullet; sections 04–06 of the
  pages are excluded from decks; 07–10 are one landscape page each; final page is sources and methodology;
  timestamps in CDMX time; market cap in USD only where she asked.
- The Oracle deck will need a builder pass when that dashboard changes structurally; data changes flow through.

## How to verify before pushing

- `node --check` every edited script.
- Serve the site locally: `python3 -m http.server 8123 --directory site` (start it detached with `setsid nohup …`).
- Headless checks use Playwright Chromium from `/opt/node22/lib/node_modules/playwright`; route the CDN
  `chart.umd.min.js` to a local `node_modules/chart.js` copy and stub Google Fonts. Register the "abort all
  non-localhost" route first so the specific routes win.
- PDFs: click `#btnPrint` (or open the deep link), catch the download, rasterise pages with PyMuPDF and look at
  every page in both languages before merging.
- Mobile: audit at 390×844 and 360×780, ES and EN, light and dark. Nothing may overflow the viewport, no text
  below 11 px, statements collapse to line item · latest period · y/y change with the comment beneath the row.
- Aesthetics matter to the owner: cramped charts, overlapping labels and half-empty pages are defects.

## Data facts that trip people up

- Quálitas financials are in thousands of pesos (`fmtM` converts to millions); Gentera is already in millions.
- Quálitas 4Q25 carries a one-off VAT charge (`REF.vat.adjust`); Gentera 4Q25 a ConCrédito deferred-tax
  write-down (`REF.adjust`). Show as reported with "memo" rows excluding them.
- Next results dates: `REF.calendar.nextResults` when the company announced it (confirmed); otherwise the median
  lag of the same quarter over the last three years (assumed). Always say which.
- Guidance basis strings in `data/guidance.js` are English; the pages and decks carry their own Spanish wording.
- Per-model memory files (decisions, pitfalls, open items) live next to the runbooks: `tools/gentera/MEMORY.md`
  (others as they are written). Read the one for the model you are touching.

# Oracle research page

URL after deployment: `/oracle/research/` (covered by the existing `/oracle/*` Cloudflare access middleware). The existing `/oracle/` page is unchanged.

## Data contract

- `site/oracle/research/index.html` and `app.js` read the existing `site/oracle/data/financials.js`, `comments.js` and `guidance.js`. These are generated from reviewed SEC filings and owner-supplied call transcripts by the existing Oracle pipeline. Statements, cash flow, debt and RPO update when that reviewed extraction enters the canonical model.
- `evidence.json` holds discrete operational/company-announcement facts, a source registry, site observations and counterparty announcements. Every claim has a source key, date, type and URL. Transcript page numbers refer to the owner-supplied licensed PDF; the public URL goes to Oracle's IR events index because the transcript itself is private.
- `node scripts/oracle/build-research.mjs` validates source keys and allowed primary-source domains, reads the existing harvest state, and writes `site/oracle/research/data/research.js`. It writes stable bytes when its inputs have not changed. The shared weekday workflow calls it after the existing Oracle data build, with no second schedule, paid API or LLM call.
- Harvested but unextracted filings show a warning and source links. A new filing is **not** automatically parsed into financial results. Qualitative evidence must be reviewed and `quarter`, `reviewedAt` and the corresponding rows revised after each call or company announcement. A mismatch against the latest financial quarter triggers a warning. Do not hide that warning by advancing the review date alone.

## Scope and analytical limits

The page uses EDGAR, company announcements, earnings transcripts and Oracle IR. Market prices, yield curves, CDS, newswire reports and peer estimates are intentionally excluded from this page. The operational sensitivity is a user-input incremental cash-flow model, **not** a whole-company DCF or target price. It makes its seven assumptions editable and never implies that its starting defaults are Oracle guidance.

RPO additions, revenue recognized from the backlog, cancellations, precise conversion buckets, funded-hardware mix, OCI segment margin, OpenAI runway and per-site financing are not reported in a form that supports the proposed full waterfalls. Those fields display as undisclosed instead of being inferred from aggregate changes or third-party estimates. The Q1 management comments about New Mexico and Wisconsin are presented as dated comments, not independently verified site status. Project Jupiter loan pricing and other press reports are omitted under the primary-source-only requirement.

Review steps after a new release: validate `quarters.json` and `guidance.json` against the 8-K and 10-Q; update transcript-sourced comments; edit `evidence.json` with page references; run `node scripts/oracle/validate-data.mjs`, `node scripts/oracle/test-parsers.mjs`, `node scripts/oracle/build-data.mjs` and `node scripts/oracle/build-research.mjs`; inspect the page in both languages and all statement modes. Avoid entering client-specific contract economics that Oracle has not disclosed.

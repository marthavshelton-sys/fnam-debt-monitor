# Weekly press sweep — task prompt

Desktop scheduled task **"FNAM Oracle: weekly press sweep"**, Mondays 14:00 UTC (08:00 Mexico City). It refreshes
`tools/oracle/data/press.json`, the source of the executive-summary block "What the market is worried about" and of
the deck page that follows the executive summary. Paste the block below as the task prompt if the task has to be
recreated. It is deliberately narrow: it edits one data file, runs the build and pushes to `main` (the same path the
GitHub Actions refresh uses); everything else stays with the weekday routine (`ROUTINE-PROMPT.md`).

---

This is a fully autonomous weekly task for the Oracle financial model at https://fnam.mx/oracle (repository marthavshelton-sys/fnam-debt-monitor). No user is present; do not ask questions. Work ONLY in the task's own clone C:\Users\MARTH\OneDrive\Desktop\Talipot\fnam-oracle-routine (never in fnam-debt-monitor or fnam-oracle-wt, which other sessions use). Public information only; never invent a fact; never use bare `git stash`.

STEP 1 — Sync: `git fetch --prune origin`, `git checkout main`, `git pull --ff-only`. Read tools/oracle/data/press.json: its `_comment` states the rules (window = last `window_days` days, at most `max_items` items, themes, bilingual one-line summaries limited to what each piece reports).

STEP 2 — Sweep the last 7 days for what credible outlets and analysts say worries the market about Oracle: Financial Times, Wall Street Journal, Bloomberg, The Economist, Axios, Semafor, Reuters, plus S&P Global Ratings, Moody's and Fitch rating actions. Use WebSearch (query forms such as "Oracle Bloomberg data center", "Oracle FT debt", "Oracle Reuters OpenAI", "Oracle Semafor", "Oracle Axios") and WebFetch; when a paywalled outlet cannot be fetched, use a wire or syndication copy of the same report (Reuters, AOL/Yahoo syndication) and name the original outlet as in "Financial Times (reported by Reuters)". Ignore opinion pieces, stock-tip sites and anything not about Oracle's execution, financing, customer concentration or governance.

STEP 3 — Update press.json: add each new item with date (YYYY-MM-DD), outlet, headline as published, url (https), theme id, `en` and `es` one-line summaries that state only what the piece reports (Oracle's own statement quoted when the piece includes it), and `also` links for secondary coverage; drop items older than the window; keep the total at or under max_items by dropping the least material oldest items; set `as_of` to today. Spanish must be real Spanish (the page's default language); numbers as US$ mil millones. If nothing new and material appeared, only update `as_of`.

STEP 4 — Run `node scripts/oracle/build.mjs` (tie-out and parser tests must report 0 failed; the press checks verify dates, links and themes). Commit tools/oracle/data/press.json and site/oracle/data with the message "oracle: weekly press sweep <date> [skip actions]" ending in "Co-Authored-By: Claude <noreply@anthropic.com>", then `git pull --rebase origin main` and `git push origin main`. If the build fails, do not push; write the error into tools/oracle/notify-state.json → lastFailureNote (locally) and stop.

STEP 5 — Finish with one line: the number of items added or dropped and the new as_of date. No email.

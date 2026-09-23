// Shared locations for the Oracle model pipeline (fnam-debt-monitor layout).
//   tools/oracle/data   curated source of truth (JSON + daily CSVs) — the only place figures are entered
//   tools/oracle/raw    archived filings (8k/, 10q/, 10k/): the audit trail every number traces to
//   site/oracle/data    GENERATED page data (window.ORCL_*), never hand-edited
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const DATA = join(ROOT, "tools", "oracle", "data");
export const RAW = join(ROOT, "tools", "oracle", "raw");
export const SITE = join(ROOT, "site", "oracle");
export const OUT = join(SITE, "data");

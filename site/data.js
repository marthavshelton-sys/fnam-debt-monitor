// Initial snapshot — mirrors the values already baked into index.html so the very
// first deploy renders identically to the Claude Artifact. The GitHub Actions workflow
// (.github/workflows/refresh-data.yml) overwrites this file on its own schedule; once it
// has run once, this comment block and the values below are stale and that's expected.
window.LIVE_DATA = {
  "generatedAt": "2026-09-08T00:00:00.000Z",
  "debt": { "date": "2026-09-08", "totalDebtT": 40.08, "heldByPublicT": 32.39, "intragovT": 7.70 },
  "avgRate": { "date": "2026-08-31", "avgRatePct": 3.49 },
  "fed": {
    "walcl": { "date": "2026-09-02", "value": 6737.204 },
    "m2": { "date": "2026-07-31", "value": 23218.0 }
  },
  "debtComposition": { "date": "2026-08-31", "notes": 16171.71, "bills": 6988.89, "bonds": 5488.72, "tips": 2150.19, "frns": 651.98, "nonmarketable": 8320.13 },
  "rates": {
    "effr": { "date": "2026-09-09", "value": 3.63 },
    "iorb": { "date": "2026-09-09", "value": 3.65 },
    "onrrp": { "date": "2026-09-09", "value": 3.50 },
    "discount": { "date": "2026-09-09", "value": 3.75 }
  },
  "rrpVolume": { "date": "2026-09-08", "value": 0.4 }
};

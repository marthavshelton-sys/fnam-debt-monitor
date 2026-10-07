# Capitalization of the US banking system, from the FDIC and the Federal Reserve.
#   FDIC BankFind Suite API (api.fdic.gov/banks/financials): every quarterly Call Report
#     and Thrift Financial Report since 1984, summed across all FDIC-insured commercial
#     banks and savings institutions (INSFDIC = 1, excluding insured branches of foreign
#     banks, BKCLASS OI) - the Quarterly Banking Profile's universe: institution counts
#     and total assets reproduce the QBP's "all insured institutions" line exactly for
#     1984Q1, 2019Q4 and 2026Q2. Sums of equity, Tier 1 and total risk-based capital,
#     risk-weighted assets, average assets for the leverage ratio, common equity tier 1
#     (2015 on, when every institution reports it), loans, noncurrent loans, allowances, securities at amortized cost and
#     fair value (available-for-sale and held-to-maturity, 1994 on), deposits (domestic,
#     insured, estimated uninsured) and quarterly net income; the page forms the ratios
#     from the sums, as the QBP does.
#   Federal Reserve H.8 (Assets and Liabilities of Commercial Banks), via FRED: weekly
#     total assets, deposits and the residual (assets less liabilities) since 2000, a
#     timely proxy between quarterly Call Reports (it is not regulatory capital).
. "$PSScriptRoot\common.ps1"
$fields = @("ASSET","EQ","DEP","DEPDOM","DEPINS","DEPUNINS","LNLS","NCLNLS","LNATRES","SC","SCAA","SCAF","SCHA","SCHF","RBCT1","RBC","RWAJT","AVASSETJ","RBCT1C","NETINCQ","NETINC")
$filter = [uri]::EscapeDataString("REPDTE:[19840101 TO 20991231] AND INSFDIC:1 AND NOT BKCLASS:OI")
$u = "https://api.fdic.gov/banks/financials?filters=$filter&agg_by=REPDTE&agg_sum_fields=$($fields -join ',')&agg_limit=400"
$r = Invoke-Retry { Invoke-RestMethod -Uri $u -TimeoutSec 300 -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
if (-not $r.data -or @($r.data).Count -lt 150) { throw "FDIC aggregates: $(@($r.data).Count) report dates returned" }
# $ thousands -> $ billions; a sum of 0 means the field did not exist yet (risk-based
# capital from 1990, securities fair values from 1994, CET1 from 2014) and is kept null.
$bn = { param($v) if ($null -eq $v -or [double]$v -eq 0) { $null } else { [math]::Round([double]$v / 1e6, 1) } }
$rows = New-Object System.Collections.ArrayList
foreach ($rec in ($r.data | Sort-Object { $_.data.REPDTE })) {
  $d = $rec.data
  $rd = [string]$d.REPDTE
  if ($rd -notmatch '^\d{4}(0331|0630|0930|1231)$') { Write-Host "  skipping report date $rd"; continue }
  $q = "{0}-Q{1}" -f $rd.Substring(0, 4), ([int]$rd.Substring(4, 2) / 3)
  $row = [ordered]@{ d = $q; n = [int]$d.count
    assets = (& $bn $d.sum_ASSET); equity = (& $bn $d.sum_EQ); deposits = (& $bn $d.sum_DEP); depDom = (& $bn $d.sum_DEPDOM); depIns = (& $bn $d.sum_DEPINS); depUnins = (& $bn $d.sum_DEPUNINS)
    loans = (& $bn $d.sum_LNLS); noncurrent = (& $bn $d.sum_NCLNLS); allowance = (& $bn $d.sum_LNATRES); securities = (& $bn $d.sum_SC)
    afsCost = (& $bn $d.sum_SCAA); afsFair = (& $bn $d.sum_SCAF); htmCost = (& $bn $d.sum_SCHA); htmFair = (& $bn $d.sum_SCHF)
    t1 = (& $bn $d.sum_RBCT1); rbc = (& $bn $d.sum_RBC); rwa = (& $bn $d.sum_RWAJT); avgAssets = (& $bn $d.sum_AVASSETJ); cet1 = (& $bn $d.sum_RBCT1C)
    netIncQ = (& $bn $d.sum_NETINCQ); netIncYtd = (& $bn $d.sum_NETINC) }
  # Common equity tier 1 was reported only by advanced-approaches banks in 2014 and by every
  # institution from 2015Q1; the 2014 sums cover a fraction of the system and are dropped.
  if ($q -lt "2015-Q1") { $row.cet1 = $null }
  [void]$rows.Add($row)
}
$last = $rows[$rows.Count - 1]
foreach ($k in @("assets", "equity", "deposits", "loans", "t1", "rbc", "rwa", "avgAssets", "cet1", "afsFair", "htmFair")) { if ($null -eq $last.$k) { throw "FDIC: $k is missing for $($last.d)" } }
if ($last.n -lt 1000 -or $last.n -gt 20000) { throw "FDIC: implausible institution count $($last.n)" }
if ($last.equity / $last.assets -lt 0.04 -or $last.equity / $last.assets -gt 0.2) { throw "FDIC: implausible equity/assets $($last.equity / $last.assets)" }
if ($last.t1 / $last.rwa -lt 0.05 -or $last.t1 / $last.rwa -gt 0.3) { throw "FDIC: implausible Tier 1 ratio" }
# Each quarter's count must be within 5% of the previous one's: a partial index would show up here.
for ($i = 1; $i -lt $rows.Count; $i++) { if ([math]::Abs($rows[$i].n / $rows[$i - 1].n - 1) -gt 0.05) { throw ("FDIC: institution count jumps from {0} to {1} between {2} and {3}" -f $rows[$i - 1].n, $rows[$i].n, $rows[$i - 1].d, $rows[$i].d) } }
Write-Output ("FDIC: {0} quarters, {1} .. {2}; {3:N0} institutions, assets {4:N0}B, equity {5:N0}B ({6:F2}% of assets), Tier 1 leverage {7:F2}%, CET1 {8:F2}%, total risk-based {9:F2}%, unrealized AFS {10:F1}B / HTM {11:F1}B" -f $rows.Count, $rows[0].d, $last.d, $last.n, $last.assets, $last.equity, ($last.equity / $last.assets * 100), ($last.t1 / $last.avgAssets * 100), ($last.cet1 / $last.rwa * 100), ($last.rbc / $last.rwa * 100), ($last.afsFair - $last.afsCost), ($last.htmFair - $last.htmCost))

# ---- H.8 weekly (FRED), $ billions, seasonally adjusted ----
$h8 = [ordered]@{
  assets   = Get-FredChecked @("TLAACBW027SBOG") '^Total Assets, All Commercial Banks$' "2000-01-01"
  deposits = Get-FredChecked @("DPSACBW027SBOG") '^Deposits, All Commercial Banks$' "2000-01-01"
  residual = Get-FredChecked @("RALACBW027SBOG") '^Residual \(Assets Less Liabilities\), All Commercial Banks$' "2000-01-01"
}
$hb = @{}; foreach ($k in $h8.Keys) { $m = @{}; foreach ($p in $h8[$k].points) { $m[$p.d] = [math]::Round($p.v, 1) }; $hb[$k] = $m }
$today = (Get-Date).ToString("yyyy-MM-dd")
$hrows = New-Object System.Collections.ArrayList
foreach ($d in @($hb["assets"].Keys | Sort-Object)) {
  if ($d -gt $today -or -not $hb["deposits"].ContainsKey($d) -or -not $hb["residual"].ContainsKey($d)) { continue }
  [void]$hrows.Add([ordered]@{ d = $d; assets = $hb["assets"][$d]; deposits = $hb["deposits"][$d]; residual = $hb["residual"][$d] })
}
$hl = $hrows[$hrows.Count - 1]
Write-Output ("H.8: {0} weeks to {1}; assets {2}B, deposits {3}B, residual {4}B ({5:F2}% of assets)" -f $hrows.Count, $hl.d, $hl.assets, $hl.deposits, $hl.residual, ($hl.residual / $hl.assets * 100))

$obj = [ordered]@{
  quarterly = $rows; asOf = $last.d
  universe = "FDIC-insured commercial banks and savings institutions (INSFDIC=1, excluding insured branches of foreign banks)"
  fields = $fields; indexCreated = [string]$r.meta.index.createTimestamp
  h8 = [ordered]@{ weekly = $hrows; ids = [ordered]@{ assets = $h8.assets.id; deposits = $h8.deposits.id; residual = $h8.residual.id } }
  fetchedAt = (Get-Date -Format "yyyy-MM-dd")
}
Save-Json $obj "banks_processed.json" 6

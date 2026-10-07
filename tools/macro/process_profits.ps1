# Corporate profits and the labor share, from BEA's National Income and Product Accounts
# (table 1.14, "Gross Value Added of Domestic Corporate Business in Current Dollars and
# Gross Value Added of Nonfinancial Domestic Corporate Business") via FRED, which carries
# every line of the table under BEA's own series codes; plus economy-wide corporate
# profits (table 1.12) and GDP (table 1.1.5). Quarterly, seasonally adjusted annual
# rates, $ billions. The nonfinancial corporate block is where BEA itself measures
# margins (its "profits per unit of real gross value added" are these same lines).
# Every id is checked against its FRED title (Get-FredChecked) and the table's own
# accounting identities are verified before the file is written.
. "$PSScriptRoot\common.ps1"
$from = "1947-01-01"
$nf = 'nonfinancial corporate business'
$defs = [ordered]@{
  gva        = @{ ids = @("A455RC1Q027SBEA"); re = '^Gross value added of nonfinancial corporate business$' }
  cfc        = @{ ids = @("B456RC1Q027SBEA"); re = '^Consumption of fixed capital: Private: Domestic: Corporate business: Nonfinancial$' }
  nva        = @{ ids = @("A457RC1Q027SBEA"); re = '^Net value added of nonfinancial corporate business$' }
  comp       = @{ ids = @("A460RC1Q027SBEA"); re = "^Net value added of ${nf}: Compensation of employees$" }
  taxprod    = @{ ids = @("W325RC1Q027SBEA"); re = "^Net value added of ${nf}: Taxes on production and imports less subsidies$" }
  nos        = @{ ids = @("W326RC1Q027SBEA"); re = "^Net value added of ${nf}: Net operating surplus$" }
  netint     = @{ ids = @("B471RC1Q027SBEA"); re = "^Net value added of ${nf}: Net operating surplus: Net interest and miscellaneous payments$" }
  transfers  = @{ ids = @("W327RC1Q027SBEA"); re = "^Net value added of ${nf}: Net operating surplus: Business current transfer payments \(net\)$" }
  profits    = @{ ids = @("A463RC1Q027SBEA"); re = '^Corporate profits with inventory valuation and capital consumption adjustments: Domestic industries: Nonfinancial$' }
  taxes      = @{ ids = @("B465RC1Q027SBEA"); re = "^Net value added of ${nf}: Corporate profits with IVA and CCAdj: Taxes on corporate income$" }
  aftertax   = @{ ids = @("W328RC1Q027SBEA"); re = "^Net value added of ${nf}: Corporate profits with IVA and CCAdj: Profits after tax with IVA and CCAdj$" }
  dividends  = @{ ids = @("B467RC1Q027SBEA"); re = "^Net value added of ${nf}: Corporate profits with IVA and CCAdj: Profits after tax with IVA and CCAdj: Net dividends$" }
  undist     = @{ ids = @("W332RC1Q027SBEA"); re = "^Net value added of ${nf}: Corporate profits with IVA and CCAdj: Profits after tax with IVA and CCAdj: Undistributed profits with IVA and CCAdj$" }
  gvaAll     = @{ ids = @("A451RC1Q027SBEA"); re = '^Gross value added of corporate business$' }
  compAll    = @{ ids = @("A442RC1Q027SBEA"); re = '^Net value added of corporate business: Compensation of employees$' }
  profitsDom = @{ ids = @("A445RC1Q027SBEA"); re = '^Corporate profits with inventory valuation and capital consumption adjustments: Domestic industries$' }
  cprofit    = @{ ids = @("CPROFIT");         re = '^Corporate Profits with Inventory Valuation Adjustment \(IVA\) and Capital Consumption Adjustment \(CCAdj\)$' }
  cpatax     = @{ ids = @("CPATAX");          re = '^Corporate Profits After Tax with Inventory Valuation Adjustment \(IVA\) and Capital Consumption Adjustment \(CCAdj\)$' }
  gdp        = @{ ids = @("GDP");             re = '^Gross Domestic Product$' }
}
$series = [ordered]@{}; $by = @{}
foreach ($k in $defs.Keys) {
  $s = Get-FredChecked $defs[$k].ids $defs[$k].re $from
  $series[$k] = [ordered]@{ id = $s.id; title = $s.title }
  $m = @{}; foreach ($p in $s.points) { $m[(ToQuarter $p.d)] = [math]::Round($p.v, 1) }
  $by[$k] = $m
}
$quarters = @($by["gva"].Keys | Sort-Object)
$rows = New-Object System.Collections.ArrayList
foreach ($q in $quarters) {
  $row = [ordered]@{ d = $q }
  foreach ($k in $defs.Keys) { $row[$k] = $(if ($by[$k].ContainsKey($q)) { $by[$k][$q] } else { $null }) }
  [void]$rows.Add($row)
}
# ---- table 1.14's identities, each within the rounding of its components ($0.1 billion each) ----
function Check([string]$name, [scriptblock]$fails) {
  $bad = @($rows | Where-Object $fails)
  if ($bad.Count) { throw ("NIPA 1.14 identity '{0}' fails for {1} quarters (first {2})" -f $name, $bad.Count, $bad[0].d) }
  Write-Output ("identity {0}: OK" -f $name)
}
$has = { param($r, $ks) foreach ($k in $ks) { if ($null -eq $r.$k) { return $false } }; return $true }
Check "gross value added = depreciation + net value added" { (& $has $_ @("gva","cfc","nva")) -and [math]::Abs($_.gva - ($_.cfc + $_.nva)) -gt 0.35 }
Check "net value added = compensation + production taxes + net operating surplus" { (& $has $_ @("nva","comp","taxprod","nos")) -and [math]::Abs($_.nva - ($_.comp + $_.taxprod + $_.nos)) -gt 0.45 }
Check "net operating surplus = net interest + transfers + profits" { (& $has $_ @("nos","netint","transfers","profits")) -and [math]::Abs($_.nos - ($_.netint + $_.transfers + $_.profits)) -gt 0.45 }
Check "profits = taxes + profits after tax" { (& $has $_ @("profits","taxes","aftertax")) -and [math]::Abs($_.profits - ($_.taxes + $_.aftertax)) -gt 0.35 }
Check "profits after tax = dividends + undistributed" { (& $has $_ @("aftertax","dividends","undist")) -and [math]::Abs($_.aftertax - ($_.dividends + $_.undist)) -gt 0.35 }
# The latest quarter with profits: BEA publishes them with the second GDP estimate, so GDP
# and gross value added run one quarter ahead of profits after an advance estimate.
$withP = @($rows | Where-Object { $null -ne $_.profits -and $null -ne $_.gva -and $null -ne $_.comp })
$last = $withP[$withP.Count - 1]
Write-Output ("NIPA 1.14: {0} quarters, {1} .. {2}; latest with profits {3}: GVA {4}B, compensation {5}B ({6}% of GVA), profits {7}B ({8}% of GVA)" -f $rows.Count, $rows[0].d, $rows[$rows.Count - 1].d, $last.d, $last.gva, $last.comp, [math]::Round($last.comp / $last.gva * 100, 1), $last.profits, [math]::Round($last.profits / $last.gva * 100, 1))
$obj = [ordered]@{ quarterly = $rows; series = $series; asOf = $last.d; gvaAsOf = $rows[$rows.Count - 1].d; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "profits_processed.json" 6

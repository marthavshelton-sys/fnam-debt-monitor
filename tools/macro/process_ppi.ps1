# Fetches the PPI Final Demand-Intermediate Demand series from BLS and shapes
# them exactly like the CPI file (points of {d, idx, yoy, mom}) so the two
# sections can share every renderer. Weights come from BLS's published
# relative-importance table (ppi-fdgrouprel.xlsx), using the aggregate rows it
# prints rather than re-summing leaves.
. "$PSScriptRoot\common.ps1"

# NSA (WPU) drives 12-month changes and the category cards; SA (WPS) drives the
# month-over-month momentum panel, the same split the CPI section makes.
$ids = @(
  "WPUFD4","WPUFD49104","WPUFD49116","WPUFD41","WPUFD411","WPUFD412","WPUFD413",
  "WPUFD42","WPUFD421","WPUFD422","WPUFD423","WPUFD43",
  "WPUID61","WPUID62","WPUID63","WPUID54",
  "WPSFD4","WPSFD49104","WPSFD49116","WPSFD41","WPSFD413","WPSFD42"
)
$out = [ordered]@{}
foreach ($s in (Invoke-Bls $ids 2016 (Get-Date).Year $true)) {
  $pts = $s.data | Where-Object { $_.period -match '^M(0[1-9]|1[0-2])$' } |
    ForEach-Object { [PSCustomObject]@{ d = ("{0}-{1}" -f $_.year, $_.period.Substring(1)); idx = [double]$_.value } } |
    Sort-Object d
  $byD = @{}; $pts | ForEach-Object { $byD[$_.d] = $_.idx }
  $arr = New-Object System.Collections.ArrayList
  foreach ($p in $pts) {
    $y = [int]$p.d.Substring(0,4); $m = [int]$p.d.Substring(5,2)
    $ago = "{0}-{1:D2}" -f ($y-1), $m
    $pm = if ($m -eq 1) { "{0}-12" -f ($y-1) } else { "{0}-{1:D2}" -f $y, ($m-1) }
    $yoy = if ($byD.ContainsKey($ago)) { [math]::Round(($p.idx / $byD[$ago] - 1) * 100, 2) } else { $null }
    $mom = if ($byD.ContainsKey($pm))  { [math]::Round(($p.idx / $byD[$pm]  - 1) * 100, 2) } else { $null }
    [void]$arr.Add([ordered]@{ d = $p.d; idx = $p.idx; yoy = $yoy; mom = $mom })
  }
  # Keep 2017 on, matching the CPI window, so the YoY column is populated from the first point.
  $arr = @($arr | Where-Object { $_.d -ge "2017-01" })
  $out[$s.seriesID] = [ordered]@{ name = ($s.catalog.series_title -replace '^PPI Commodity data for ', ''); points = $arr }
  "{0,-11} {1,4} pts  latest {2}  yoy {3,6}  mom {4,6}" -f $s.seriesID, $arr.Count, $arr[-1].d, $arr[-1].yoy, $arr[-1].mom
}
Save-Json $out "ppi_processed.json" 6

# ---- weights ----
$rows = & "$PSScriptRoot\xlsx_to_rows.ps1" -Path "$data\ppi-fdgrouprel.xlsx"
$posted = ($rows | Where-Object { $_['B'] -match 'posted' } | Select-Object -First 1)['B']
$w = @{}
foreach ($row in $rows) {
  $c = $row['B']
  if ($c -match '^FD\d+$' -and -not $w.ContainsKey($c) -and $row['F'] -match '^[\d.]+$') {
    $w[$c] = [PSCustomObject]@{ w = [math]::Round([double]$row['F'], 3); wPrior = [math]::Round([double]$row['E'], 3) }
  }
}
function G($code, $id, $name) { [ordered]@{ id = $id; code = $code; name = $name; w = $w[$code].w; wPrior = $w[$code].wPrior } }
$weights = [ordered]@{
  # By commodity type: the three top-level pieces of final demand.
  majorGroups = @(
    (G "FD41" "WPUFD41" "Final demand goods"),
    (G "FD42" "WPUFD42" "Final demand services"),
    (G "FD43" "WPUFD43" "Final demand construction")
  )
  # Goods split into foods / energy / core goods; services into its three pieces.
  detail = @(
    (G "FD411" "WPUFD411" "Foods"),
    (G "FD412" "WPUFD412" "Energy"),
    (G "FD413" "WPUFD413" "Goods less foods and energy"),
    (G "FD421" "WPUFD421" "Services less trade, transportation, and warehousing"),
    (G "FD422" "WPUFD422" "Transportation and warehousing services"),
    (G "FD423" "WPUFD423" "Trade services"),
    (G "FD43"  "WPUFD43"  "Construction")
  )
  # By buyer: who the output is sold to.
  byBuyer = @(
    (G "FD49501" "buyerPC"     "Personal consumption"),
    (G "FD49215" "buyerCapInv" "Private capital investment"),
    (G "FD49301" "buyerExport" "Exports"),
    (G "FD49401" "buyerGovt"   "Government")
  )
  specialAggregates = @(
    (G "FD49104" "WPUFD49104" "Final demand less foods and energy"),
    (G "FD49116" "WPUFD49116" "Final demand less foods, energy, and trade services")
  )
  asOfMonth = "2025-12"; priorAsOfMonth = "2024-12"; posted = $posted
}
# Identities the page will rely on. Fail loudly if BLS's table doesn't reconcile.
function SumW($list) { ($list | ForEach-Object { $_.w } | Measure-Object -Sum).Sum }
$sumMajor = SumW $weights.majorGroups
$sumDetail = SumW $weights.detail
$sumBuyer = SumW $weights.byBuyer
Write-Output ("weights: major {0:N3}  detail {1:N3}  buyer {2:N3}  core {3}  {4}" -f $sumMajor, $sumDetail, $sumBuyer, $w["FD49104"].w, $posted)
foreach ($pair in @(@("major",$sumMajor),@("detail",$sumDetail),@("buyer",$sumBuyer))) {
  if ([math]::Abs($pair[1] - 100) -gt 0.01) { throw "PPI weights for $($pair[0]) sum to $($pair[1]), not 100" }
}
Save-Json $weights "ppi_weights.json" 5

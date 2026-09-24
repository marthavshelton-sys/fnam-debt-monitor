# Retail sales from two Census products:
#   MARTS  - Monthly Retail Trade (advance), national, by NAICS category, $ millions.
#            Pulled from the Census API with the key. SA levels drive MoM/YoY.
#   MSRS   - Monthly State Retail Sales, an experimental product published as a
#            CSV: 12-month % change by state x subsector. Lags MARTS by ~2 months.
. "$PSScriptRoot\common.ps1"
$key = Get-ApiKey "CENSUS_API_KEY"

# ---- MARTS ----
$url = "https://api.census.gov/data/timeseries/eits/marts?get=cell_value,data_type_code,category_code,seasonally_adj&time=from+2016-01&key=$key"
$r = Invoke-Retry { Invoke-RestMethod -Uri $url -TimeoutSec 180 }
$rows = $r[1..($r.Count-1)] | ForEach-Object { [PSCustomObject]@{ v=$_[0]; dt=$_[1]; cat=$_[2]; sa=$_[3]; t=$_[4] } }
$sm = $rows | Where-Object { $_.dt -eq "SM" -and $_.t -match '^\d{4}-\d{2}$' }
Write-Output ("MARTS rows {0}, SM level rows {1}, months {2}..{3}" -f $rows.Count, $sm.Count, ($sm.t | Sort-Object)[0], ($sm.t | Sort-Object)[-1])

$cats = @("44X72","44000","44Y72","44W72","44Z72","441","442","443","444","445","446","447","448","451","452","453","454","722")
$out = [ordered]@{}
# SA only: YoY on SA levels is what the page shows, and NSA would double the payload.
foreach ($adj in @("yes")) {
  foreach ($cat in $cats) {
    $pts = $sm | Where-Object { $_.cat -eq $cat -and $_.sa -eq $adj -and $_.v -match '^-?[\d.]+$' } |
      ForEach-Object { [PSCustomObject]@{ d=$_.t; v=[double]$_.v } } | Sort-Object d
    if (-not $pts) { continue }
    $by = @{}; $pts | ForEach-Object { $by[$_.d] = $_.v }
    $arr = New-Object System.Collections.ArrayList
    foreach ($p in $pts) {
      $y = [int]$p.d.Substring(0,4); $m = [int]$p.d.Substring(5,2)
      $ago = "{0}-{1:D2}" -f ($y-1), $m
      $pm = if ($m -eq 1) { "{0}-12" -f ($y-1) } else { "{0}-{1:D2}" -f $y, ($m-1) }
      $yoy = if ($by.ContainsKey($ago)) { [math]::Round(($p.v / $by[$ago] - 1) * 100, 2) } else { $null }
      $mom = if ($by.ContainsKey($pm))  { [math]::Round(($p.v / $by[$pm]  - 1) * 100, 2) } else { $null }
      [void]$arr.Add([ordered]@{ d=$p.d; v=$p.v; yoy=$yoy; mom=$mom })
    }
    $arr = @($arr | Where-Object { $_.d -ge "2017-01" })
    $k = if ($adj -eq "yes") { $cat } else { $cat + "_NSA" }
    $out[$k] = [ordered]@{ points = $arr }
  }
}
$tot = $out["44X72"].points[-1]
Write-Output ("total retail & food services (SA) {0}: {1:N0} $M  mom {2}  yoy {3}" -f $tot.d, $tot.v, $tot.mom, $tot.yoy)

# Identity: the 12 retail subsectors sum to retail total; + food services = grand total.
$subs = @("441","442","443","444","445","446","447","448","451","452","453","454")
$sumSubs = ($subs | ForEach-Object { $out[$_].points[-1].v } | Measure-Object -Sum).Sum
$retail = $out["44000"].points[-1].v
$grand = $out["44X72"].points[-1].v
$food = $out["722"].points[-1].v
Write-Output ("identity: 12 subsectors {0:N0} vs retail total {1:N0}; + food svc {2:N0} = {3:N0} vs grand {4:N0}" -f $sumSubs, $retail, $food, ($sumSubs + $food), $grand)
if ([math]::Abs($sumSubs - $retail) -gt 1 -or [math]::Abs($sumSubs + $food - $grand) -gt 1) { throw "MARTS categories do not reconcile to totals" }

# ---- MSRS (state) ----
$rs = Invoke-WebRequest -Uri "https://www.census.gov/retail/mrts/www/statedata/state_retail_yy.csv" -UseBasicParsing -TimeoutSec 90 -UserAgent "Mozilla/5.0"
# Census regenerates this CSV (its Last-Modified is the generation time, not a
# data date), so no file date is recorded; the page shows the check date only.
$csv = $rs.Content; if ($csv -is [byte[]]) { $csv = [System.Text.Encoding]::UTF8.GetString($csv) }
$lines = ($csv -split "\r?\n") | Where-Object { $_ }
$hdr = $lines[0] -split ','
$months = @(); for ($i = 3; $i -lt $hdr.Count; $i++) { $months += ($hdr[$i] -replace '^yy(\d{4})(\d{2})$', '$1-$2') }
$latest = $months[-1]
$states = [ordered]@{}
$usa = [ordered]@{}
foreach ($line in $lines[1..($lines.Count-1)]) {
  $p = $line -split ','
  $st = $p[1]; $n = $p[2]
  $vals = @(); for ($i = 3; $i -lt $p.Count; $i++) { $vals += $(if ($p[$i] -match '^-?[\d.]+$') { [double]$p[$i] } else { $null }) }
  if ($st -eq "USA") {
    $usa[$n] = $vals[-1]
    if ($n -eq "TOTAL") { $usaTotal = @(); for ($i = 0; $i -lt $months.Count; $i++) { $usaTotal += [ordered]@{ d=$months[$i]; v=$vals[$i] } } }
    continue
  }
  if (-not $states.Contains($st)) { $states[$st] = [ordered]@{ latest = [ordered]@{}; total = $null } }
  $states[$st].latest[$n] = $vals[-1]
  if ($n -eq "TOTAL") {
    $t = @(); $from = [math]::Max(0, $months.Count - 24)
    for ($i = $from; $i -lt $months.Count; $i++) { $t += [ordered]@{ d=$months[$i]; v=$vals[$i] } }
    $states[$st].total = $t
  }
}
$missing = @($states.Keys | Where-Object { $null -eq $states[$_].latest["TOTAL"] })
Write-Output ("MSRS: {0} states, latest {1}, USA TOTAL yoy {2}, suppressed TOTAL: {3}" -f $states.Count, $latest, $usa["TOTAL"], ($missing -join ' '))

$obj = [ordered]@{
  marts = $out
  states = [ordered]@{ asOf = $latest; usa = $usa; usaTotal = $usaTotal; byState = $states }
}
Save-Json $obj "retail_processed.json" 8

# Labor productivity and costs from the BLS Productivity and Costs program (quarterly,
# seasonally adjusted): the nonfarm business sector's output per hour, unit labor costs,
# hourly compensation (nominal and real), output, hours and the labor share, plus the
# manufacturing sector's output per hour. Each measure comes as an index (2017 = 100),
# a percent change from the previous quarter at an annual rate and a percent change
# from the same quarter a year earlier (BLS duration codes 3, 2 and 1).
#
# Series ids: PRS + sector (8500 nonfarm business, 3000 manufacturing) + 6 (all workers)
# + measure (09 output per hour, 11 unit labor costs, 10 hourly compensation, 15 real
# hourly compensation, 04 output, 03 hours, 17 labor share) + duration. With the BLS key
# (the runner) the catalog titles are checked against each measure; with or without it,
# the three durations are checked against each other (the 2017 average of an index is
# 100; the percent changes are the index's own changes), so a wrong id never ships.
. "$PSScriptRoot\common.ps1"
$key = [Environment]::GetEnvironmentVariable("BLS_API_KEY")
$measures = [ordered]@{
  prod  = @{ code = "09"; sector = "8500"; title = 'productivity|output per hour';          sectorRe = 'nonfarm' }
  ulc   = @{ code = "11"; sector = "8500"; title = 'unit labor cost';                       sectorRe = 'nonfarm' }
  comp  = @{ code = "10"; sector = "8500"; title = '^(?!.*real).*hourly compensation';      sectorRe = 'nonfarm' }
  rcomp = @{ code = "15"; sector = "8500"; title = 'real hourly compensation';              sectorRe = 'nonfarm' }
  out   = @{ code = "04"; sector = "8500"; title = '^(?!.*per hour).*output';               sectorRe = 'nonfarm' }
  hrs   = @{ code = "03"; sector = "8500"; title = 'hours';                                 sectorRe = 'nonfarm' }
  lsh   = @{ code = "17"; sector = "8500"; title = 'labor share';                           sectorRe = 'nonfarm'; indexOnly = $true }
  mfg   = @{ code = "09"; sector = "3000"; title = 'productivity|output per hour';          sectorRe = 'manufacturing' }
}
$dur = @{ Y = "1"; Q = "2"; Idx = "3" }
$ids = New-Object System.Collections.ArrayList; $idMap = @{}
foreach ($k in $measures.Keys) {
  $m = $measures[$k]
  foreach ($dk in @("Idx", "Q", "Y")) {
    if ($m.indexOnly -and $dk -ne "Idx") { continue }
    $id = "PRS" + $m.sector + "6" + $m.code + $dur[$dk]
    [void]$ids.Add($id); $idMap[$id] = @{ key = $k; dur = $dk }
  }
}
# The whole history in windows: 20 years per call with a key, 10 without (BLS's limits).
$thisYear = (Get-Date).Year
$span = $(if ($key) { 20 } else { 10 })
$pts = @{}; $catalog = @{}
foreach ($id in $ids) { $pts[$id] = @{} }
for ($y0 = 1947; $y0 -le $thisYear; $y0 += $span) {
  $y1 = [math]::Min($thisYear, $y0 + $span - 1)
  $body = @{ seriesid = @($ids); startyear = "$y0"; endyear = "$y1" }
  if ($key) { $body.registrationkey = $key; $body.catalog = $true }
  $r = Invoke-Retry { Invoke-RestMethod -Uri "https://api.bls.gov/publicAPI/v2/timeseries/data/" -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 120 }
  if ($r.status -ne "REQUEST_SUCCEEDED") { throw "BLS: $($r.status) $($r.message -join '; ')" }
  foreach ($s in $r.Results.series) {
    if ($s.catalog -and $s.catalog.series_title) { $catalog[$s.seriesID] = $s.catalog }
    foreach ($o in $s.data) {
      if ($o.period -notmatch '^Q0[1-4]$' -or $o.value -notmatch '^-?\d+(\.\d+)?$') { continue }
      $pts[$s.seriesID][("{0}-Q{1}" -f $o.year, $o.period.Substring(2))] = [double]$o.value
    }
  }
  Write-Output ("BLS {0}-{1}: {2} series answered" -f $y0, $y1, @($r.Results.series).Count)
  Start-Sleep -Milliseconds 500
}
# ---- checks ----
# Titles (with the key): the measure's words and the sector must be in the catalog title.
foreach ($id in $ids) {
  $m = $measures[$idMap[$id].key]
  if ($catalog.ContainsKey($id)) {
    # The catalog describes a series across several fields; BLS's title of an index series
    # names the program ("Index/Level and Office of Productivity And Technology and Unit
    # Profits and Costs : Nonfarm Business") and the measure sits in another field, so the
    # measure's words and the sector are looked for in every descriptive field, leaving out
    # the id and the survey's name ("Major Sector Productivity and Costs"), which would match
    # "productivity" for every series.
    $blob = (@($catalog[$id].PSObject.Properties | Where-Object { $_.Name -notmatch '^(series_id|survey_name|survey_abbreviation)$' } | ForEach-Object { [string]$_.Value }) -join ' | ')
    if ($blob -notmatch $m.title -or $blob -notmatch $m.sectorRe) { throw ("BLS {0}: catalog '{1}' does not describe {2} / {3}" -f $id, $blob, $idMap[$id].key, $m.sectorRe) }
  }
  if (-not $pts[$id].Count) { throw "BLS $id returned no quarterly data" }
}
if ($catalog.Count) { Write-Output ("catalog titles: OK for {0} series (e.g. {1}: {2})" -f $catalog.Count, $ids[0], ((@($catalog[$ids[0]].PSObject.Properties | ForEach-Object { $_.Name + "=" + [string]$_.Value }) -join '; '))) } else { Write-Output "catalog titles: not available without a BLS key (checked by the data tests below)" }
# Durations, from the data itself: the index averages 100 over 2017; the yearly change is
# the index's change on the same quarter a year earlier; the quarterly change is the
# index's quarter-on-quarter change compounded to an annual rate (BLS rounds to 0.1).
function QPrev([string]$q, [int]$back) { $y = [int]$q.Substring(0, 4); $n = [int]$q.Substring(6, 1) - 1 - $back; while ($n -lt 0) { $n += 4; $y-- }; "{0}-Q{1}" -f $y, ($n + 1) }
foreach ($k in $measures.Keys) {
  $m = $measures[$k]; $idx = $pts["PRS" + $m.sector + "6" + $m.code + "3"]
  $avg17 = @(1..4 | ForEach-Object { $idx["2017-Q$_"] } | Measure-Object -Average).Average
  if ([math]::Abs($avg17 - 100) -gt 1.5) { throw ("BLS {0}: the index does not average 100 in 2017 ({1}); wrong duration code?" -f $k, $avg17) }
  if ($m.indexOnly) { continue }
  $yy = $pts["PRS" + $m.sector + "6" + $m.code + "1"]; $qq = $pts["PRS" + $m.sector + "6" + $m.code + "2"]
  $worstY = 0; $worstQ = 0; $n = 0
  foreach ($q in $idx.Keys) {
    $p4 = QPrev $q 4; $p1 = QPrev $q 1
    if ($idx.ContainsKey($p4) -and $yy.ContainsKey($q)) { $worstY = [math]::Max($worstY, [math]::Abs(($idx[$q] / $idx[$p4] - 1) * 100 - $yy[$q])); $n++ }
    if ($idx.ContainsKey($p1) -and $qq.ContainsKey($q)) { $worstQ = [math]::Max($worstQ, [math]::Abs(([math]::Pow($idx[$q] / $idx[$p1], 4) - 1) * 100 - $qq[$q])) }
  }
  if ($n -lt 100 -or $worstY -gt 0.35 -or $worstQ -gt 0.6) { throw ("BLS {0}: percent changes do not match the index (worst y/y gap {1:F2} pp, q/q gap {2:F2} pp over {3} quarters)" -f $k, $worstY, $worstQ, $n) }
  Write-Output ("{0,-6} index 2017 = {1:F2}; y/y and q/q agree with the index (worst gaps {2:F2} / {3:F2} pp)" -f $k, $avg17, $worstY, $worstQ)
}
# ---- one row per quarter ----
$quarters = @($pts["PRS85006093"].Keys | Sort-Object)
$rows = New-Object System.Collections.ArrayList
foreach ($q in $quarters) {
  $row = [ordered]@{ d = $q }
  foreach ($k in $measures.Keys) {
    $m = $measures[$k]
    foreach ($dk in @("Idx", "Q", "Y")) {
      if ($m.indexOnly -and $dk -ne "Idx") { continue }
      $id = "PRS" + $m.sector + "6" + $m.code + $dur[$dk]
      $row[$k + $dk] = $(if ($pts[$id].ContainsKey($q)) { $pts[$id][$q] } else { $null })
    }
  }
  [void]$rows.Add($row)
}
$last = $rows[$rows.Count - 1]
Write-Output ("productivity: {0} quarters, {1} .. {2}; latest output per hour {3}% q/q (annual rate), {4}% y/y; unit labor costs {5}% q/q; manufacturing {6}% q/q" -f $rows.Count, $rows[0].d, $last.d, $last.prodQ, $last.prodY, $last.ulcQ, $last.mfgQ)
$titles = [ordered]@{}; foreach ($id in $ids) { if ($catalog.ContainsKey($id)) { $titles[$id] = [string]$catalog[$id].series_title } }
$obj = [ordered]@{ quarterly = $rows; ids = [ordered]@{}; titles = $titles; asOf = $last.d; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
foreach ($k in $measures.Keys) { $m = $measures[$k]; $obj.ids[$k] = "PRS" + $m.sector + "6" + $m.code + "{1,2,3}" }
Save-Json $obj "productivity_processed.json" 6

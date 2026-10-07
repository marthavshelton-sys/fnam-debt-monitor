# The nonbank financial system: who holds the financial sector's assets beyond the banks
# and how much cushion stands behind them, from four official sources.
#   Federal Reserve Z.1 Financial Accounts, from the Board's release package of CSV tables
#     (quarterly since 1952, $ millions -> $ billions): total financial assets of every domestic financial sector (the sum of the
#     sectors must equal the published "domestic financial sectors" total less the central
#     bank, exactly - the processor fails otherwise); the balance sheet of the sectors whose
#     equity the Z.1 publishes (total liabilities and equity, total liabilities; equity is the
#     difference: depositories, life insurers' general accounts, property-casualty insurers,
#     broker-dealers, GSEs, finance companies); and defined benefit pension funds' funded
#     assets and entitlements (private, state and local, federal; their sum must equal the
#     all-DB series, exactly). Every series' description is checked against the data dictionary.
#   OFR Hedge Fund Monitor API (data.financialresearch.gov/hf/v1, SEC Form PF aggregates for
#     qualifying hedge funds, quarterly since 2013): gross notional exposure, gross and net
#     assets, borrowing by type, fund count, top-10 leverage. Each series' name is checked.
#   SEC Money Market Fund Statistics (Form N-MFP aggregates, monthly since Dec-2010): the newest
#     "supporting data" workbook linked from the SEC's page (its file name is irregular, so the
#     page is scraped), read by mmf_xlsx.py with its identity checks.
#   NCUA "Financial Trends in Federally Insured Credit Unions" chart pack (quarterly, forty
#     quarters per edition): the newest zip linked from the NCUA's page, read by ncua_xlsx.py;
#     quarters that drop out of the forty-quarter window are kept from the committed file.
. "$PSScriptRoot\common.ps1"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
$prevPath = Join-Path $data "nonbank_processed.json"
$prev = $null
if (Test-Path $prevPath) { try { $prev = Get-Content $prevPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $prev = $null } }

# ---- Z.1: the Board's release package (every table as CSV, with a data dictionary) ----
# FRED carries most but not all of these series (the three sectors the Z.1 added last -
# private debt funds, business development companies, interval funds - have no FRED id, and
# the financial-sector total is FBTFASQ027S there), so the Z.1 is read from the Board's own
# package: the data dictionary gives each series' description (checked against the pattern
# below, as Get-FredChecked checks FRED titles) and the table file that carries it.
$z1Url = "https://www.federalreserve.gov/releases/z1/current/z1_csv_files.zip"
$z1Zip = Join-Path $scratch "z1_csv_files.zip"; $z1Dir = Join-Path $scratch "z1_csv"
Invoke-Retry { Invoke-WebRequest -Uri $z1Url -OutFile $z1Zip -UseBasicParsing -UserAgent $ua -TimeoutSec 300 } | Out-Null
$head = [System.IO.File]::ReadAllBytes($z1Zip)[0..1]
if ($head[0] -ne 0x50 -or $head[1] -ne 0x4B) { throw "Z.1: $z1Url is not a zip file" }
if (Test-Path $z1Dir) { Remove-Item $z1Dir -Recurse -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($z1Zip, $z1Dir)
$z1Date = Get-RemoteFileDate $z1Url
$dictDir = Join-Path $z1Dir "data_dictionary"; $csvDir = Join-Path $z1Dir "csv"
if (-not (Test-Path $dictDir) -or -not (Test-Path $csvDir)) { throw "Z.1: the package no longer has data_dictionary and csv folders" }
# Series -> description and table (a series is listed in every table that shows it; the first will do).
$dict = @{}
foreach ($f in (Get-ChildItem $dictDir -Filter *.txt)) {
  foreach ($line in [System.IO.File]::ReadAllLines($f.FullName)) {
    $p = $line -split "`t"
    if ($p.Count -lt 2) { continue }
    $sid = $p[0].Trim()
    if ($sid -and -not $dict.ContainsKey($sid)) { $dict[$sid] = @{ desc = $p[1].Trim(); table = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) } }
  }
}
if ($dict.Count -lt 5000) { throw "Z.1: only $($dict.Count) series in the data dictionary" }
# Name -> Z.1 series and the description it must carry (-match is case-insensitive). "Total
# liabilities" patterns end at the line so they can never take the liabilities-and-equity line.
$z1 = [ordered]@{
  fin   = @("FL794090005.Q", '^Domestic financial sectors; total financial assets')
  fed   = @("FL714090005.Q", '^(Central bank|Monetary authority); total financial assets')
  dep   = @("FL704090005.Q", '^Private depository institutions; total financial assets')
  cu    = @("FL474090005.Q", '^Credit unions; total financial assets')
  pc    = @("FL514090005.Q", '^Property-casualty insurance companies; total financial assets')
  life  = @("FL544090005.Q", '^Life insurance companies; total financial assets')
  pens  = @("FL594090005.Q", '^Pension funds; total financial assets')
  mmf   = @("FL634090005.Q", '^Money market funds; total financial assets')
  mf    = @("LM654090000.Q", '^Mutual funds; total financial assets')
  cef   = @("LM554090005.Q", '^Closed-end funds; total financial assets')
  etf   = @("LM564090005.Q", '^Exchange-traded funds; total financial assets')
  gse   = @("FL404090005.Q", '^Government-sponsored enterprises; total financial assets')
  pools = @("FL413065005.Q", 'GSE-backed mortgage pools; total mortgages; asset')
  abs   = @("FL674090005.Q", '^Issuers of asset-backed securities; total financial assets')
  finco = @("FL614090005.Q", '^Finance companies; total financial assets')
  mreit = @("FL644090075.Q", '^Mortgage real estate investment trusts; total financial assets')
  bd    = @("FL664090005.Q", '^Security brokers and dealers; total financial assets')
  hold  = @("FL734090005.Q", '^Holding companies; total financial assets')
  other = @("FL504090005.Q", '^(Other financial business|Funding corporations); total financial assets')
  hf    = @("FL624090005.Q", '^Hedge funds \(domestic\); total assets net of short sales')
  pdf   = @("FL444090000.Q", '^Private debt funds; total financial assets')
  bdc   = @("FL454090003.Q", '^Business development companies; total financial assets')
  ivf   = @("FL464090005.Q", '^Interval funds and tender offer funds; total financial assets')
  depLE   = @("FL704194005.Q", '^Private depository institutions; total liabilities and equity')
  depTL   = @("FL704190005.Q", '^Private depository institutions; total liabilities\s*$')
  lifeLE  = @("FL544194075.Q", '^Life insurance companies, general accounts; total liabilities and equity')
  lifeTL  = @("FL544190075.Q", '^Life insurance companies, general accounts; total liabilities\s*$')
  pcLE    = @("FL514194005.Q", '^Property-casualty insurance companies; total liabilities and equity')
  pcTL    = @("FL514190005.Q", '^Property-casualty insurance companies; total liabilities\s*$')
  bdLE    = @("FL664194005.Q", '^Security brokers and dealers; total liabilities and equity')
  bdTL    = @("FL664190005.Q", '^Security brokers and dealers; total liabilities\s*$')
  gseLE   = @("FL404194005.Q", '^Government-sponsored enterprises; total liabilities and equity')
  gseTL   = @("FL404190005.Q", '^Government-sponsored enterprises; total liabilities\s*$')
  fincoLE = @("FL614194005.Q", '^Finance companies; total liabilities and equity')
  fincoTL = @("FL614190005.Q", '^Finance companies; total liabilities\s*$')
  dbPrivFunded = @("FL572000075.Q", '^Private defined benefit pension funds; total funded assets')
  dbPrivEnt    = @("FL574190043.Q", '^Private defined benefit pension funds; pension entitlements')
  dbSlFunded   = @("FL222000075.Q", '^State and local government employee defined benefit pension funds; total funded assets')
  dbSlEnt      = @("FL224190043.Q", '^State and local government employee defined benefit pension funds; pension entitlements')
  dbFedFunded  = @("FL342000075.Q", '^Federal government defined benefit pension funds; total funded assets')
  dbFedEnt     = @("FL344190045.Q", '^Federal government defined benefit pension funds; pension entitlements')
  dbAllFunded  = @("FL592000075.Q", '^Defined benefit pension funds; total funded assets')
  dbAllEnt     = @("FL594190045.Q", '^Defined benefit pension funds; pension entitlements')
}
$tables = @{}; $byQ = @{}; $ids = [ordered]@{}
foreach ($k in $z1.Keys) {
  $code = $z1[$k][0]
  if (-not $dict.ContainsKey($code)) { throw "Z.1: $code is not in the package's data dictionary" }
  $desc = [string]$dict[$code].desc
  if ($desc -notmatch $z1[$k][1]) { throw "Z.1: $code is described as '$desc', not /$($z1[$k][1])/" }
  $t = [string]$dict[$code].table
  # Many tables repeat a column (Import-Csv refuses duplicate headers); the files carry plain
  # numbers, "ND" and dates, never quoted commas, so a split on commas is exact.
  if (-not $tables.ContainsKey($t)) {
    $csvPath = Join-Path $csvDir ($t + ".csv")
    if (-not (Test-Path $csvPath)) { throw "Z.1: table file $t.csv is missing" }
    $txt = [System.IO.File]::ReadAllLines($csvPath)
    if ($txt.Count -lt 2) { throw "Z.1: table file $t.csv is empty" }
    $hdr = @($txt[0].Trim() -split ',' | ForEach-Object { $_.Trim() })
    $body = New-Object System.Collections.ArrayList
    for ($i = 1; $i -lt $txt.Count; $i++) { if ($txt[$i].Trim()) { [void]$body.Add(@($txt[$i].Trim() -split ',')) } }
    $tables[$t] = @{ hdr = $hdr; rows = $body }
  }
  $ci = [array]::IndexOf($tables[$t].hdr, $code)
  if ($ci -lt 0) { throw "Z.1: $code is not a column of $t.csv" }
  $m = @{}
  foreach ($row in $tables[$t].rows) {
    $d = [string]$row[0]
    if ($d -notmatch '^\d{4}:Q[1-4]$' -or $d -lt "1952:Q1" -or $row.Count -le $ci) { continue }
    $v = ([string]$row[$ci]).Trim()
    if ($v -eq "" -or $v -eq "ND" -or $v -eq "NA") { continue }
    $m[($d -replace ':', '-')] = [math]::Round([double]$v / 1000, 1)
  }
  if ($m.Count -lt 40) { throw "Z.1: only $($m.Count) quarterly observations for $code in $t" }
  $byQ[$k] = $m; $ids[$k] = $code
  Write-Host ("  {0,-13} {1,-15} {2,4} qtrs  {3}" -f $k, $code, $m.Count, $desc)
}
$quarters = @($byQ["fin"].Keys | Sort-Object)
$sizeKeys = @("dep", "pc", "life", "pens", "mmf", "mf", "cef", "etf", "gse", "pools", "abs", "finco", "mreit", "bd", "hold", "other")
$newKeys = @("hf", "pdf", "bdc", "ivf")   # in the Z.1's financial-sector total from 2012-Q4 (0 or absent before)
$rows = New-Object System.Collections.ArrayList
foreach ($q in $quarters) {
  $row = [ordered]@{ d = $q }
  foreach ($k in $z1.Keys) { if ($byQ[$k].ContainsKey($q)) { $row[$k] = $byQ[$k][$q] } else { $row[$k] = $null } }
  if ($q -lt "2012-Q4") { foreach ($k in $newKeys) { $row[$k] = $null } }
  [void]$rows.Add($row)
}
if ($rows.Count -lt 200) { throw "Z.1: only $($rows.Count) quarters" }
# The latest quarter must carry every series (the Z.1 posts them together).
$last = $rows[$rows.Count - 1]
foreach ($k in $z1.Keys) { if ($null -eq $last[$k]) { throw "Z.1: $k is missing for $($last.d)" } }
# Identity 1: the sectors add up to the financial-sector total less the central bank (exactly,
# within rounding; the four sectors the Z.1 added from 2012-Q4 count from then on). Credit unions are
# part of private depository institutions and are kept only as a memo item.
$maxGap = 0.0
foreach ($r in $rows) {
  if ($null -eq $r.fin -or $null -eq $r.fed) { continue }
  $sum = 0.0; $ok = $true
  foreach ($k in $sizeKeys) { if ($null -eq $r[$k]) { $ok = $false; break }; $sum += [double]$r[$k] }
  if ($r.d -ge "2012-Q4") { foreach ($k in $newKeys) { if ($null -eq $r[$k]) { $ok = $false; break }; $sum += [double]$r[$k] } }
  if (-not $ok) { continue }
  $gap = [math]::Abs(([double]$r.fin - [double]$r.fed) - $sum)
  if ($gap -gt $maxGap) { $maxGap = $gap }
  if ($gap -gt [math]::Max(2.0, 0.0005 * [double]$r.fin)) { throw ("Z.1: sectors sum to {0:N1}B but the financial total less the central bank is {1:N1}B in {2} (gap {3:N1}B)" -f $sum, ([double]$r.fin - [double]$r.fed), $r.d, $gap) }
}
# Identity 2: private + state and local + federal defined benefit = all defined benefit (funded assets and entitlements).
foreach ($r in $rows) {
  if ($null -eq $r.dbAllFunded -or $null -eq $r.dbPrivFunded -or $null -eq $r.dbSlFunded -or $null -eq $r.dbFedFunded) { continue }
  $g1 = [math]::Abs([double]$r.dbPrivFunded + [double]$r.dbSlFunded + [double]$r.dbFedFunded - [double]$r.dbAllFunded)
  $g2 = [math]::Abs([double]$r.dbPrivEnt + [double]$r.dbSlEnt + [double]$r.dbFedEnt - [double]$r.dbAllEnt)
  if ($g1 -gt 1.0 -or $g2 -gt 1.0) { throw ("Z.1: defined benefit pension components do not add up in {0} (funded gap {1:N1}B, entitlements gap {2:N1}B)" -f $r.d, $g1, $g2) }
}
# Equity = total liabilities and equity - total liabilities; every sector's share must be sane in the latest quarter.
foreach ($k in @("dep", "life", "pc", "bd", "gse", "finco")) {
  $eq = [double]$last["${k}LE"] - [double]$last["${k}TL"]; $share = $eq / [double]$last["${k}LE"] * 100
  if ($eq -le 0 -or $share -gt 60) { throw ("Z.1: implausible equity for {0} in {1}: {2:N1}B ({3:F1}% of the balance sheet)" -f $k, $last.d, $eq, $share) }
}
$nonbank = (1 - [double]$last.dep / ([double]$last.fin - [double]$last.fed)) * 100
if ($nonbank -lt 50 -or $nonbank -gt 95) { throw "Z.1: implausible nonbank share $nonbank%" }
Write-Output ("Z.1: {0} quarters, {1} .. {2}; financial assets ex-Fed {3:N0}B, depositories {4:N0}B (nonbank share {5:F1}%); equity/balance sheet: depositories {6:F1}%, life (GA) {7:F1}%, P&C {8:F1}%, broker-dealers {9:F1}%, GSEs {10:F1}%, finance cos {11:F1}%; DB funded: private {12:F1}%, state/local {13:F1}%, federal {14:F1}%; max sector gap {15:N2}B" -f $rows.Count, $rows[0].d, $last.d, ([double]$last.fin - [double]$last.fed), $last.dep, $nonbank,
  (([double]$last.depLE - [double]$last.depTL) / [double]$last.depLE * 100), (([double]$last.lifeLE - [double]$last.lifeTL) / [double]$last.lifeLE * 100), (([double]$last.pcLE - [double]$last.pcTL) / [double]$last.pcLE * 100),
  (([double]$last.bdLE - [double]$last.bdTL) / [double]$last.bdLE * 100), (([double]$last.gseLE - [double]$last.gseTL) / [double]$last.gseLE * 100), (([double]$last.fincoLE - [double]$last.fincoTL) / [double]$last.fincoLE * 100),
  ([double]$last.dbPrivFunded / [double]$last.dbPrivEnt * 100), ([double]$last.dbSlFunded / [double]$last.dbSlEnt * 100), ([double]$last.dbFedFunded / [double]$last.dbFedEnt * 100), $maxGap)

# ---- OFR Hedge Fund Monitor (SEC Form PF aggregates), dollars -> $ billions ----
$ofr = [ordered]@{
  gne   = @("FPF-ALLQHF_GNE_SUM", 'Qualifying Hedge Funds: gross notional exposure')
  nav   = @("FPF-ALLQHF_NAV_SUM", 'Qualifying Hedge Funds: net assets')
  gav   = @("FPF-ALLQHF_GAV_SUM", 'Qualifying Hedge Funds: gross assets')
  repo  = @("FPF-BORROW_REPO_SUM", 'Qualifying Hedge Funds: repo borrowing')
  pb    = @("FPF-BORROW_PRIMEBROKER_SUM", 'Qualifying Hedge Funds: prime brokerage borrowing')
  osec  = @("FPF-BORROW_OTHERSECURED_SUM", 'Qualifying Hedge Funds: other secured borrowing')
  n     = @("FPF-ALLQHF_COUNT", 'Qualifying Hedge Funds: number of Qualifying Hedge Funds')
  top10 = @("FPF-ALLQHF_GAVN10_LEVERAGERATIO_AVERAGE", 'Top 10 largest funds: leverage')
}
$hq = @{}; $hLastUpdate = $null
foreach ($k in $ofr.Keys) {
  $mn = $ofr[$k][0]
  $r = Invoke-Retry { Invoke-RestMethod -Uri "https://data.financialresearch.gov/hf/v1/series/full?mnemonic=$mn" -TimeoutSec 120 -UserAgent $ua }
  $s = $r.$mn
  if (-not $s) { throw "OFR: no series $mn in the response" }
  $name = [string]$s.metadata.description.name
  if ($name -notmatch $ofr[$k][1]) { throw "OFR: $mn is named '$name', not /$($ofr[$k][1])/" }
  $obs = @($s.timeseries.aggregation)
  if ($obs.Count -lt 40) { throw "OFR: $mn has only $($obs.Count) observations" }
  $m = @{}
  foreach ($o in $obs) { if ($null -ne $o[1] -and "$($o[1])" -ne "") { $q = ToQuarter ([string]$o[0]); if ($k -eq "n") { $m[$q] = [int]$o[1] } elseif ($k -eq "top10") { $m[$q] = [math]::Round([double]$o[1], 3) } else { $m[$q] = [math]::Round([double]$o[1] / 1e9, 1) } } }
  $hq[$k] = $m
  $lu = [string]$s.metadata.schedule.last_update; if ($lu -and (-not $hLastUpdate -or $lu -gt $hLastUpdate)) { $hLastUpdate = $lu }
  Write-Host ("  {0,-42} {1,3} pts  {2} .. {3}  {4}" -f $mn, $obs.Count, $obs[0][0], $obs[$obs.Count - 1][0], $name)
  Start-Sleep -Milliseconds 300
}
$hrows = New-Object System.Collections.ArrayList
foreach ($q in @($hq["nav"].Keys | Sort-Object)) {
  $row = [ordered]@{ d = $q }
  foreach ($k in $ofr.Keys) { if ($hq[$k].ContainsKey($q)) { $row[$k] = $hq[$k][$q] } else { $row[$k] = $null } }
  [void]$hrows.Add($row)
}
$hl = $hrows[$hrows.Count - 1]
foreach ($k in @("gne", "nav", "gav", "repo", "pb", "osec", "n")) { if ($null -eq $hl[$k]) { throw "OFR: $k is missing for $($hl.d)" } }
if ($hl.gav -lt $hl.nav -or $hl.gne -lt $hl.gav) { throw "OFR: gross assets $($hl.gav)B, net assets $($hl.nav)B and gross notional exposure $($hl.gne)B are not ordered" }
if (($hl.repo + $hl.pb + $hl.osec) -gt $hl.gav) { throw "OFR: borrowing exceeds gross assets in $($hl.d)" }
for ($i = 1; $i -lt $hrows.Count; $i++) { $a = $hrows[$i - 1].d; $b = $hrows[$i].d; if (([int]$b.Substring(0, 4) * 4 + [int]$b.Substring(6, 1)) -ne ([int]$a.Substring(0, 4) * 4 + [int]$a.Substring(6, 1) + 1)) { throw "OFR: quarters are not consecutive ($a -> $b)" } }
Write-Output ("OFR hedge funds: {0} quarters, {1} .. {2}; GNE {3:N0}B, GAV {4:N0}B, NAV {5:N0}B (GAV/NAV {6:F2}x, GNE/NAV {7:F1}x); repo {8:N0}B, prime brokerage {9:N0}B, other secured {10:N0}B; {11:N0} funds; last update {12}" -f $hrows.Count, $hrows[0].d, $hl.d, $hl.gne, $hl.gav, $hl.nav, ($hl.gav / $hl.nav), ($hl.gne / $hl.nav), $hl.repo, $hl.pb, $hl.osec, $hl.n, $hLastUpdate)

# ---- SEC money market fund statistics: the newest supporting-data workbook on the SEC's page ----
# The SEC asks scripted clients to identify themselves in the User-Agent.
$secUa = "fnam.mx macro monitor (https://fnam.mx)"
$secPage = "https://www.sec.gov/data-research/investment-management-data/money-market-fund-statistics"
$html = (Invoke-Retry { Invoke-WebRequest -Uri $secPage -UseBasicParsing -UserAgent $secUa -TimeoutSec 120 }).Content
$links = @([regex]::Matches($html, 'href="([^"]*supporting-data[^"]*\.xlsx)"') | ForEach-Object { $_.Groups[1].Value })
if (-not $links.Count) { throw "SEC: no supporting-data workbook linked from $secPage" }
# The newest file: the one whose name carries the latest year-month (MM-YYYY or YYYY-MM or YYYYMM), else the first link.
$best = $null; $bestKey = ""
foreach ($l in $links) {
  $key = ""
  if ($l -match '(\d{2})-(\d{4})\.xlsx$') { $key = $Matches[2] + $Matches[1] }
  elseif ($l -match '(\d{4})-(\d{2})\.xlsx$') { $key = $Matches[1] + $Matches[2] }
  elseif ($l -match '(\d{4})(\d{2})(\d{2})?\.xlsx$') { $key = $Matches[1] + $Matches[2] }
  if ($key -gt $bestKey) { $bestKey = $key; $best = $l }
}
if (-not $best) { $best = $links[0] }
$secUrl = $(if ($best -match '^https?://') { $best } else { "https://www.sec.gov" + $best })
$mmfXlsx = Join-Path $scratch "mmf.xlsx"; $mmfJson = Join-Path $scratch "mmf.json"
Invoke-Retry { Invoke-WebRequest -Uri $secUrl -OutFile $mmfXlsx -UseBasicParsing -UserAgent $secUa -TimeoutSec 180 } | Out-Null
$head = [System.IO.File]::ReadAllBytes($mmfXlsx)[0..1]
if ($head[0] -ne 0x50 -or $head[1] -ne 0x4B) { throw "SEC: $secUrl is not a workbook" }
& (Get-Python) (Join-Path $PSScriptRoot "mmf_xlsx.py") $mmfXlsx $mmfJson | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $mmfJson)) { throw "mmf_xlsx.py failed for $secUrl" }
$mmf = Get-Content $mmfJson -Raw -Encoding UTF8 | ConvertFrom-Json
$mmfDate = $null
try { $h = Invoke-WebRequest -Uri $secUrl -Method Head -UseBasicParsing -UserAgent $secUa -TimeoutSec 60; $lm = $h.Headers["Last-Modified"]; if ($lm) { $mmfDate = ([datetime]$lm).ToUniversalTime().ToString("yyyy-MM-dd") } } catch { }
if ($prev -and $prev.mmf -and $prev.mmf.asOf -and ($mmf.asOf -lt $prev.mmf.asOf)) { throw "SEC: the newest workbook ends at $($mmf.asOf), before the committed $($prev.mmf.asOf)" }
Write-Output ("SEC MMF: {0} ({1}), data through {2}" -f $secUrl, $(if ($mmfDate) { $mmfDate } else { "undated" }), $mmf.asOf)

# ---- NCUA chart pack: the newest zip on the NCUA's page, merged with the committed quarters ----
$ncuaPage = "https://ncua.gov/analysis/credit-union-corporate-call-report-data/financial-trends-federally-insured-credit-unions"
$html = (Invoke-Retry { Invoke-WebRequest -Uri $ncuaPage -UseBasicParsing -UserAgent $ua -TimeoutSec 120 }).Content
$zips = @([regex]::Matches($html, 'href="([^"]*chart-pack-(\d{4})-q([1-4])\.zip)"') | ForEach-Object { [pscustomobject]@{ href = $_.Groups[1].Value; key = $_.Groups[2].Value + $_.Groups[3].Value } } | Sort-Object key -Descending)
if (-not $zips.Count) { throw "NCUA: no chart-pack zip linked from $ncuaPage" }
$ncuaUrl = $(if ($zips[0].href -match '^https?://') { $zips[0].href } else { "https://ncua.gov" + $zips[0].href })
$ncuaZip = Join-Path $scratch "ncua-chart-pack.zip"; $ncuaDir = Join-Path $scratch "ncua-chart-pack"; $ncuaJson = Join-Path $scratch "ncua.json"
Invoke-Retry { Invoke-WebRequest -Uri $ncuaUrl -OutFile $ncuaZip -UseBasicParsing -UserAgent $ua -TimeoutSec 180 } | Out-Null
if (Test-Path $ncuaDir) { Remove-Item $ncuaDir -Recurse -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($ncuaZip, $ncuaDir)
$ncuaXlsx = @(Get-ChildItem $ncuaDir -Recurse -Filter *.xlsx | Where-Object { $_.Name -notmatch '^~' } | Sort-Object Length -Descending)
if (-not $ncuaXlsx.Count) { throw "NCUA: no workbook inside $ncuaUrl" }
& (Get-Python) (Join-Path $PSScriptRoot "ncua_xlsx.py") $ncuaXlsx[0].FullName $ncuaJson | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ncuaJson)) { throw "ncua_xlsx.py failed for $ncuaUrl" }
$ncua = Get-Content $ncuaJson -Raw -Encoding UTF8 | ConvertFrom-Json
$ncuaDate = Get-RemoteFileDate $ncuaUrl
# Merge: the new edition's quarters replace the committed ones; older quarters stay.
$merged = [ordered]@{}
if ($prev -and $prev.ncua -and $prev.ncua.quarterly) { foreach ($r in $prev.ncua.quarterly) { $merged[[string]$r.d] = [ordered]@{ d = [string]$r.d; n = [int]$r.n; nw = $r.nw; delq = $r.delq; borrow = $r.borrow; roaa = $r.roaa } } }
foreach ($r in $ncua.quarterly) { $merged[[string]$r.d] = [ordered]@{ d = [string]$r.d; n = [int]$r.n; nw = $r.nw; delq = $r.delq; borrow = $r.borrow; roaa = $r.roaa } }
$nrows = @($merged.Keys | Sort-Object | ForEach-Object { $merged[$_] })
if ($prev -and $prev.ncua -and $prev.ncua.asOf -and ($ncua.asOf -lt $prev.ncua.asOf)) { throw "NCUA: the newest chart pack ends at $($ncua.asOf), before the committed $($prev.ncua.asOf)" }
Write-Output ("NCUA: {0} ({1}), {2} quarters kept, {3} .. {4}" -f $ncuaUrl, $(if ($ncuaDate) { $ncuaDate } else { "undated" }), $nrows.Count, $nrows[0].d, $nrows[$nrows.Count - 1].d)

$obj = [ordered]@{
  z1 = [ordered]@{ quarterly = $rows; asOf = $last.d; ids = $ids; newSectorsFrom = "2012-Q4"; file = $z1Url; fileDate = $z1Date
    note = "Total financial assets by sector, $ billions (Z.1 L tables; mutual funds, closed-end funds and ETFs at market value); equity = total liabilities and equity less total liabilities (life insurers: general accounts); defined benefit pension funds: total funded assets and pension entitlements (L.118.b-L.120.b)" }
  hedge = [ordered]@{ quarterly = $hrows; asOf = $hl.d; lastUpdate = $hLastUpdate; mnemonics = [ordered]@{}; universe = "Qualifying hedge funds reporting on SEC Form PF (net assets of $500 million or more), aggregated by the OFR" }
  mmf = [ordered]@{ monthly = $mmf.monthly; asOf = $mmf.asOf; from = $mmf.from; liquidityFrom = $mmf.liquidityFrom; file = $secUrl; fileDate = $mmfDate
    note = "Form N-MFP aggregates, feeder funds excluded; net assets $ billions; daily and weekly liquid assets as % of total assets" }
  ncua = [ordered]@{ quarterly = $nrows; asOf = $ncua.asOf; assets = $ncua.assets; loans = $ncua.loans; shares = $ncua.shares; file = $ncuaUrl; fileDate = $ncuaDate
    note = "All federally insured credit unions; net worth ratio = aggregate net worth / total assets (the chart pack's simple aggregate, not the PCA ratio); ratios in percent, dollars in $ billions" }
  fetchedAt = (Get-Date -Format "yyyy-MM-dd")
}
foreach ($k in $ofr.Keys) { $obj.hedge.mnemonics[$k] = $ofr[$k][0] }
Save-Json $obj "nonbank_processed.json" 6

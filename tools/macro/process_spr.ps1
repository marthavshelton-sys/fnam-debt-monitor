# Strategic Petroleum Reserve.
#   EIA   weekly (1982 on) and monthly (1977 on) SPR crude stocks, from keyless
#         history workbooks. The weekly series comes from the Weekly Petroleum
#         Status Report's own Table 1 workbook, which EIA posts at the 10:30 ET
#         release; the copy behind EIA's series page (same figures, checked
#         2026-09-30) only goes public in the afternoon and is the fallback. EIA's
#         holiday release schedule is read too, so the page's "next report" date
#         follows EIA when a holiday moves it.
#   DOE   authorized capacity and cavern count per storage site, read from the
#         SPR storage-sites page; and the daily inventory report, which DOE
#         publishes only as an image (sweet/sour split, monthly movements) -
#         saved alongside the data so the page can show it as published; and
#         inventory per site (sweet/sour/combined and caverns) from the table
#         on DOE's SPR Quick Facts page, which carries its own "as of" date.
#         DOE publishes no history per site, so each new table is appended to
#         bySiteHistory as it appears.
. "$PSScriptRoot\common.ps1"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
$prevFile = Join-Path $data "spr_processed.json"
$prev = if (Test-Path $prevFile) { try { Get-Content $prevFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $null } } else { $null }

# ---- EIA stocks ----
# One series from an EIA history workbook's "Data 1" sheet, found by its source
# key in the sheet's "Sourcekey" row (the WPSR workbooks hold several series side
# by side; the series-page workbooks hold one).
function Get-EiaHistory([string]$url, [string]$key, [string]$name) {
  $xls = Join-Path $scratch "$name.xls"; $csv = Join-Path $scratch "$name.csv"
  Invoke-Retry { Invoke-WebRequest -Uri $url -OutFile $xls -UserAgent $ua -TimeoutSec 90 }
  Convert-XlsSheetToCsv $xls "Data 1" $csv @(1)
  $lines = @(Get-Content $csv)
  $keyRow = $lines | Where-Object { $_ -like "Sourcekey,*" } | Select-Object -First 1
  $col = if ($keyRow) { [array]::IndexOf([string[]]($keyRow -split ','), $key) } else { -1 }
  if ($col -lt 1) { throw "$name has no $key column" }
  $pts = New-Object System.Collections.ArrayList
  foreach ($line in $lines) {
    $p = $line -split ','
    if ($p.Count -gt $col -and $p[0] -match '^\d{4}-\d{2}-\d{2}$' -and $p[$col] -match '^-?[\d.]+$') { [void]$pts.Add([ordered]@{ d = $p[0]; v = [int][double]$p[$col] }) }
  }
  if ($pts.Count -lt 100) { throw "EIA $name parsed only $($pts.Count) rows" }
  return $pts
}
$wpsrUrl = "https://ir.eia.gov/wpsr/psw01.xls"
$seriesUrl = "https://www.eia.gov/dnav/pet/hist_xls/WCSSTUS1w.xls"
$fromWpsr = $null; $fromSeries = $null
try { $fromWpsr = Get-EiaHistory $wpsrUrl "WCSSTUS1" "psw01" } catch { Write-Output "WPSR table 1 workbook failed: $($_.Exception.Message)" }
try { $fromSeries = Get-EiaHistory $seriesUrl "WCSSTUS1" "WCSSTUS1w" } catch { Write-Output "EIA series workbook failed: $($_.Exception.Message)" }
if (-not $fromWpsr -and -not $fromSeries) { throw "no EIA weekly SPR workbook could be read" }
# The newer of the two; on a tie the WPSR copy, which is the one published at release time.
$useWpsr = $fromWpsr -and (-not $fromSeries -or $fromWpsr[-1].d -ge $fromSeries[-1].d)
$weekly = if ($useWpsr) { $fromWpsr } else { $fromSeries }
$weeklyUrl = if ($useWpsr) { $wpsrUrl } else { $seriesUrl }
if ($fromWpsr -and $fromSeries) {
  $a = @{}; foreach ($p in $fromWpsr) { $a[$p.d] = $p.v }
  $diff = @($fromSeries | Where-Object { $a.ContainsKey($_.d) -and $a[$_.d] -ne $_.v }).Count
  Write-Output ("EIA weekly: WPSR workbook through {0}, series workbook through {1}; {2} shared weeks differ; using the {3} one" -f $fromWpsr[-1].d, $fromSeries[-1].d, $diff, $(if ($useWpsr) { "WPSR" } else { "series" }))
}
$monthlyRaw = Get-EiaHistory "https://www.eia.gov/dnav/pet/hist_xls/MCSSTUS1m.xls" "MCSSTUS1" "MCSSTUS1m"
$monthly = New-Object System.Collections.ArrayList
foreach ($p in $monthlyRaw) { [void]$monthly.Add([ordered]@{ d = $p.d.Substring(0,7); v = $p.v }) }
# EIA's file dates (Last-Modified), shown on the page next to the check date.
$eiaFiles = [ordered]@{ weekly = (Get-RemoteFileDate $weeklyUrl); monthly = (Get-RemoteFileDate "https://www.eia.gov/dnav/pet/hist_xls/MCSSTUS1m.xls"); weeklySource = $weeklyUrl }
Write-Output ("EIA workbooks dated: weekly {0}, monthly {1}" -f $eiaFiles.weekly, $eiaFiles.monthly)
Write-Output ("SPR weekly : {0} pts  {1} = {2:N0} thousand bbl" -f $weekly.Count, $weekly[-1].d, $weekly[-1].v)
Write-Output ("SPR monthly: {0} pts  {1} = {2:N0} thousand bbl" -f $monthly.Count, $monthly[-1].d, $monthly[-1].v)

# ---- EIA: holiday release schedule ----
# The report comes out Wednesdays at 10:30 ET; in weeks with a holiday EIA moves
# it (usually to Thursday, 12:00 ET) and lists those weeks on its schedule page.
# Each exception: data week (the Friday), release date, release time (24 h, ET).
$schedule = $null
try {
  $r = Invoke-Retry { Invoke-WebRequest -Uri "https://www.eia.gov/petroleum/supply/weekly/schedule.php" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
  $txt = [regex]::Replace($r.Content, '<script[\s\S]*?</script>|<style[\s\S]*?</style>', '')
  $txt = [System.Net.WebUtility]::HtmlDecode([regex]::Replace($txt, '<[^>]+>', ' ')) -replace '\s+', ' '
  if ($txt -notmatch '10:30 a\.m\. eastern time on Wednesday') { throw "the usual Wednesday 10:30 ET release is no longer stated" }
  $ci = [System.Globalization.CultureInfo]::InvariantCulture
  $since = (Get-Date).AddDays(-60)
  $ex = New-Object System.Collections.ArrayList
  foreach ($m in [regex]::Matches($txt, '([A-Z][a-z]+ \d{1,2}, \d{4}) ([A-Z][a-z]+ \d{1,2}, \d{4}) (Monday|Tuesday|Wednesday|Thursday|Friday) (\d{1,2}):(\d{2}) ([ap])\.m\.')) {
    $wk = [datetime]::ParseExact($m.Groups[1].Value, "MMMM d, yyyy", $ci)
    $rel = [datetime]::ParseExact($m.Groups[2].Value, "MMMM d, yyyy", $ci)
    if ($wk.DayOfWeek -ne [DayOfWeek]::Friday -or $rel -le $wk -or ($rel - $wk).TotalDays -gt 14) { Write-Output "  schedule row skipped: $($m.Value)"; continue }
    if ($rel -lt $since) { continue }
    $h = [int]$m.Groups[4].Value % 12; if ($m.Groups[6].Value -eq 'p') { $h += 12 }
    [void]$ex.Add([ordered]@{ week = $wk.ToString("yyyy-MM-dd"); release = $rel.ToString("yyyy-MM-dd"); time = ("{0:D2}:{1}" -f $h, $m.Groups[5].Value) })
  }
  $schedule = [ordered]@{ exceptions = $ex; source = "https://www.eia.gov/petroleum/supply/weekly/schedule.php"; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
  Write-Output ("EIA schedule: {0} holiday exception(s) from {1}: {2}" -f $ex.Count, $since.ToString("yyyy-MM-dd"), (($ex | ForEach-Object { "$($_.week)->$($_.release) $($_.time)" }) -join ", "))
} catch {
  Write-Output "EIA schedule page failed: $($_.Exception.Message)"
  if ($prev -and $prev.schedule) { $schedule = $prev.schedule; Write-Output "  keeping the previous schedule" }
}

# ---- DOE: capacity per site ----
$capacity = $null
try {
  $r = Invoke-Retry { Invoke-WebRequest -Uri "https://www.energy.gov/ceser/spr-storage-sites" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
  $txt = [regex]::Replace($r.Content, '<script[\s\S]*?</script>|<style[\s\S]*?</style>', '')
  $txt = [regex]::Replace($txt, '<[^>]+>', ' ')
  $txt = [System.Net.WebUtility]::HtmlDecode($txt) -replace '\s+', ' '
  $words = @{ one=1; two=2; three=3; four=4; five=5; six=6; seven=7; eight=8; nine=9; ten=10; eleven=11; twelve=12; thirteen=13; fourteen=14; fifteen=15; sixteen=16; seventeen=17; eighteen=18; nineteen=19; twenty=20 }
  $meta = @{ "Bryan Mound" = @("bryanMound","TX","Freeport, Texas"); "Big Hill" = @("bigHill","TX","Winnie, Texas"); "West Hackberry" = @("westHackberry","LA","Hackberry, Louisiana"); "Bayou Choctaw" = @("bayouChoctaw","LA","Iberville Parish, Louisiana") }
  $sites = New-Object System.Collections.ArrayList
  foreach ($m in [regex]::Matches($txt, '(Bayou Choctaw|Big Hill|Bryan Mound|West Hackberry) currently has (\w+) storage caverns, an authorized storage capacity of ([\d.]+) million barrels')) {
    $n = $m.Groups[2].Value.ToLower(); $caverns = if ($words.ContainsKey($n)) { $words[$n] } else { [int]$n }
    $info = $meta[$m.Groups[1].Value]
    [void]$sites.Add([ordered]@{ id = $info[0]; name = $m.Groups[1].Value; state = $info[1]; location = $info[2]; caverns = $caverns; cap = [double]$m.Groups[3].Value })
  }
  $tot = [regex]::Match($txt, 'combined authorized storage capacity of ([\d.]+) million barrels')
  if ($sites.Count -ne 4) { throw "expected 4 sites, parsed $($sites.Count)" }
  $capacity = [ordered]@{ sites = $sites; total = [double]$tot.Groups[1].Value; source = "https://www.energy.gov/ceser/spr-storage-sites"; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
  Write-Output ("DOE capacity: " + (($sites | ForEach-Object { "$($_.name) $($_.cap)" }) -join ", ") + " | total $($capacity.total)")
} catch {
  Write-Output "DOE capacity page failed: $($_.Exception.Message)"
  if ($prev -and $prev.capacity) { $capacity = $prev.capacity; Write-Output "  keeping previous capacity data" } else { throw }
}

# ---- DOE: daily inventory report (image) ----
$image = $null
try {
  $imgPath = Join-Path $data "spr-inventory.jpg"
  $r = Invoke-Retry { Invoke-WebRequest -Uri "https://www.spr.doe.gov/dir/images/img2.jpg" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
  if ($r.Content.Length -lt 20000) { throw "image too small ($($r.Content.Length) bytes)" }
  [System.IO.File]::WriteAllBytes($imgPath, $r.Content)
  $lm = $r.Headers["Last-Modified"]
  $asOf = if ($lm) { ([datetime]$lm).ToUniversalTime().ToString("yyyy-MM-dd") } else { (Get-Date -Format "yyyy-MM-dd") }
  $image = [ordered]@{ file = "spr-inventory.jpg"; source = "https://www.spr.doe.gov/dir/dir.html"; published = $asOf; bytes = $r.Content.Length; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
  Write-Output "DOE inventory image: $($r.Content.Length) bytes, published $asOf"
} catch {
  Write-Output "DOE inventory image failed: $($_.Exception.Message)"
  if ($prev -and $prev.image) { $image = $prev.image; Write-Output "  keeping previous image record" }
}
# The report's own "as of" date and volumes, read off the image (spr_image_ocr.py
# checks sweet + sour = total). DOE posts it before EIA's weekly release for the
# same Friday, so when it is newer than EIA's latest week the page shows it as
# the latest reading. Accepted only if it is dated on or before the posting,
# within 14 days of it, and within 3% of EIA's latest week.
if ($image -and -not $image.reading) {
  try {
    $ocrOut = Join-Path $scratch "spr-ocr.json"
    if (Test-Path $ocrOut) { Remove-Item $ocrOut }
    & (Get-Python) "$PSScriptRoot\spr_image_ocr.py" (Join-Path $data "spr-inventory.jpg") $ocrOut
    if ($LASTEXITCODE -ne 0) { throw "spr_image_ocr.py exit $LASTEXITCODE" }
    $rd = Get-Content $ocrOut -Raw | ConvertFrom-Json
    $pub = [datetime]$image.published; $rdDate = [datetime]$rd.asOf
    if ($rdDate -gt $pub -or ($pub - $rdDate).TotalDays -gt 14) { throw "as-of $($rd.asOf) does not fit the posting date $($image.published)" }
    $eiaLast = $weekly[-1].v / 1000
    if ([math]::Abs($rd.total / $eiaLast - 1) -gt 0.03) { throw "total $($rd.total) is more than 3% from EIA's latest week ($eiaLast)" }
    $image = [ordered]@{ file = $image.file; source = $image.source; published = $image.published; bytes = $image.bytes; fetchedAt = $image.fetchedAt
                         reading = [ordered]@{ asOf = $rd.asOf; sweet = $rd.sweet; sour = $rd.sour; total = $rd.total } }
  } catch {
    Write-Output "DOE report not read ($($_.Exception.Message)); the page shows the image without its figures"
    if ($prev -and $prev.image -and $prev.image.reading -and $prev.image.published -eq $image.published) {
      $image = [ordered]@{ file = $image.file; source = $image.source; published = $image.published; bytes = $image.bytes; fetchedAt = $image.fetchedAt; reading = $prev.image.reading }
      Write-Output "  same posting as last run: keeping its reading"
    }
  }
}

# ---- DOE: inventory per site (SPR Quick Facts table) ----
function Get-FirstNumber([string]$s) { $m = [regex]::Match($s, '-?\d+(\.\d+)?'); if ($m.Success) { [double]$m.Value } else { $null } }
$bySite = $null
try {
  $r = Invoke-Retry { Invoke-WebRequest -Uri "https://www.energy.gov/ceser/spr-quick-facts" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
  $h = [System.Net.WebUtility]::HtmlDecode($r.Content)
  $hm = [regex]::Match($h, 'Crude Oil Inventory by Site[\s\u00A0]*\([\s\u00A0]*as of[\s\u00A0]+([A-Za-z]+[\s\u00A0]+\d{1,2},[\s\u00A0]*\d{4})[\s\u00A0]*\)')
  if (-not $hm.Success) { throw "'Crude Oil Inventory by Site (as of ...)' heading not found" }
  $asOfText = $hm.Groups[1].Value -replace '[\s\u00A0]+', ' '
  $asOf = ([datetime]::ParseExact($asOfText, "MMMM d, yyyy", [System.Globalization.CultureInfo]::InvariantCulture)).ToString("yyyy-MM-dd")
  $tm = [regex]::Match($h.Substring($hm.Index), '<table[\s\S]*?</table>')
  if (-not $tm.Success) { throw "table after the heading not found" }
  $rows = New-Object System.Collections.ArrayList
  foreach ($tr in [regex]::Matches($tm.Value, '<tr[\s\S]*?</tr>')) {
    $cells = @([regex]::Matches($tr.Value, '<t[dh][^>]*>([\s\S]*?)</t[dh]>') | ForEach-Object { ([regex]::Replace($_.Groups[1].Value, '<[^>]+>', ' ') -replace '[\s\u00A0]+', ' ').Trim() })
    if ($cells.Count -lt 5) { continue }
    if ($cells[0] -notmatch '^(Bayou Choctaw|Big Hill|Bryan Mound|West Hackberry|Total)$') { continue }
    [void]$rows.Add([ordered]@{ name = $cells[0]; sweet = (Get-FirstNumber $cells[1]); sour = (Get-FirstNumber $cells[2]); total = (Get-FirstNumber $cells[3]); caverns = [int](Get-FirstNumber $cells[4]) })
  }
  $siteRows = @($rows | Where-Object { $_.name -ne "Total" })
  $totRow = @($rows | Where-Object { $_.name -eq "Total" }) | Select-Object -First 1
  if ($siteRows.Count -ne 4) { throw "expected 4 site rows, parsed $($siteRows.Count)" }
  $sum = 0.0; foreach ($s in $siteRows) { if ($null -eq $s.total) { throw "site $($s.name) has no combined volume" }; $sum += $s.total }
  $total = if ($totRow -and $null -ne $totRow.total) { $totRow.total } else { [math]::Round($sum, 1) }
  if ([math]::Abs($sum - $total) -gt 0.3) { throw "site volumes sum to $sum but DOE's total row says $total" }
  $bySite = [ordered]@{ asOf = $asOf; sites = $siteRows; total = $total; source = "https://www.energy.gov/ceser/spr-quick-facts"; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
  Write-Output ("DOE by site (as of $asOf): " + (($siteRows | ForEach-Object { "$($_.name) $($_.total)" }) -join ", ") + " | total $total")
} catch {
  Write-Output "DOE quick-facts page failed: $($_.Exception.Message)"
  if ($prev -and $prev.bySite) { $bySite = $prev.bySite; Write-Output "  keeping previous by-site data" }
}
# Growing history: one entry per distinct "as of" date DOE has published.
$bySiteHistory = New-Object System.Collections.ArrayList
if ($prev -and $prev.bySiteHistory) { foreach ($e in $prev.bySiteHistory) { [void]$bySiteHistory.Add($e) } }
if ($bySite -and -not ($bySiteHistory | Where-Object { $_.asOf -eq $bySite.asOf })) {
  [void]$bySiteHistory.Add([ordered]@{ asOf = $bySite.asOf; total = $bySite.total; sites = $bySite.sites })
  Write-Output "  by-site history: $($bySiteHistory.Count) snapshot(s)"
}

$obj = [ordered]@{ weekly = $weekly; monthly = $monthly; files = $eiaFiles; schedule = $schedule; capacity = $capacity; image = $image; bySite = $bySite; bySiteHistory = $bySiteHistory; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "spr_processed.json" 6

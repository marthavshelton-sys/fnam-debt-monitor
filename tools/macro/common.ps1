# Shared by every process_*.ps1: where data lives and where API keys come from.
#
# Locally, keys sit in $env:TEMP\claude\api_keys.json and data in $env:TEMP\claude.
# In GitHub Actions, keys arrive as environment variables from repository secrets
# and MACRO_DATA_DIR points at the checkout's data folder. Keys are never written
# to disk by anything in the pipeline and never appear in page source.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$script:data = if ($env:MACRO_DATA_DIR) { $env:MACRO_DATA_DIR } else { "$env:TEMP\claude" }
if (-not (Test-Path $script:data)) { New-Item -ItemType Directory -Force -Path $script:data | Out-Null }
# Raw downloads (workbooks, PDFs) go here, not into the committed data folder:
# only the processed JSON is worth keeping as a fallback.
$script:scratch = if ($env:RUNNER_TEMP) { Join-Path $env:RUNNER_TEMP "macro" } else { Join-Path $env:TEMP "macro-scratch" }
if (-not (Test-Path $script:scratch)) { New-Item -ItemType Directory -Force -Path $script:scratch | Out-Null }

function Get-ApiKey([string]$name) {
  $v = [Environment]::GetEnvironmentVariable($name)
  if ($v) { return $v }
  $f = Join-Path $script:data "api_keys.json"
  if (Test-Path $f) {
    $k = Get-Content $f -Raw | ConvertFrom-Json
    if ($k.$name) { return $k.$name }
  }
  throw "API key $name not found: set it as an environment variable (GitHub secret) or in api_keys.json"
}

# Census and BEA answer 503 now and then for no lasting reason; three tries
# with a pause between them covers those without hiding a real outage.
function Invoke-Retry([scriptblock]$call, [int]$tries = 3, [int]$waitSec = 20) {
  for ($i = 1; $i -le $tries; $i++) {
    try { return (& $call) } catch {
      if ($i -eq $tries) { throw }
      # Write-Host, not Write-Output: output from inside this function is the caller's return value.
      Write-Host ("  attempt {0} failed ({1}); retrying in {2}s" -f $i, $_.Exception.Message.Split([char]10)[0], $waitSec)
      Start-Sleep -Seconds $waitSec
    }
  }
}

# Date of a remote file (its Last-Modified header, as yyyy-MM-dd UTC) from a
# HEAD request; $null when the host does not say or refuses HEAD, in which case
# the page shows only the check date. Only meaningful for files that change
# when the data does (Shiller, EIA, the Challenger PDF) - hosts that regenerate
# a file on a schedule stamp it with the generation time, which says nothing.
# Write-Host for the note: output from here would become the return value.
function Get-RemoteFileDate([string]$url, [int]$timeoutSec = 60) {
  try {
    $h = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -TimeoutSec $timeoutSec
    $lm = $h.Headers["Last-Modified"]
    if ($lm) { return ([datetime]$lm).ToUniversalTime().ToString("yyyy-MM-dd") }
  } catch { Write-Host ("  no Last-Modified for {0} ({1})" -f $url, $_.Exception.Message.Split([char]10)[0]) }
  return $null
}

# Python for the steps that need it (xlrd on the runner, pdfplumber for the
# Challenger report). On the runner setup-python puts it on PATH; on Windows
# desktops the Store's "python" alias answers to the name but is not Python.
function Get-Python {
  $cands = @("python", "python3") + @(Get-ChildItem "$env:LOCALAPPDATA\Programs\Python" -Recurse -Filter python.exe -ErrorAction SilentlyContinue | Where-Object { $_.DirectoryName -notmatch 'venv' } | ForEach-Object { $_.FullName })
  foreach ($c in $cands) {
    try { $v = & $c --version 2>$null; if ($LASTEXITCODE -eq 0 -and "$v" -match 'Python 3') { return $c } } catch {}
  }
  throw "Python 3 not found"
}

# Legacy .xls workbooks (EIA history files, Shiller's data set) -> one sheet as
# CSV. Excel COM does it where Excel exists (this machine); the GitHub runner has
# no Excel and falls back to Python + xlrd (xls_to_csv.py). Date columns are
# written as YYYY-MM-DD; everything else as invariant numbers or text.
function Convert-XlsSheetToCsv([string]$xls, [string]$sheet, [string]$csv, [int[]]$dateCols = @()) {
  $done = $false
  try {
    $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
    try {
      $wb = $x.Workbooks.Open($xls, 0, $true)
      $ws = $wb.Worksheets.Item($sheet)
      $vals = $ws.UsedRange.Value2
      $rows = $vals.GetLength(0); $cols = $vals.GetLength(1)
      $sb = New-Object System.Text.StringBuilder
      for ($r = 1; $r -le $rows; $r++) {
        $cells = for ($c = 1; $c -le $cols; $c++) {
          $v = $vals[$r, $c]
          if ($null -eq $v) { "" }
          elseif ($v -is [double] -and $dateCols -contains $c) { [DateTime]::FromOADate($v).ToString("yyyy-MM-dd") }
          elseif ($v -is [double]) { $v.ToString("R", [System.Globalization.CultureInfo]::InvariantCulture) }
          else { $s = "$v"; if ($s.Contains(",") -or $s.Contains('"')) { '"' + $s.Replace('"', '""') + '"' } else { $s } }
        }
        [void]$sb.AppendLine(($cells -join ","))
      }
      $wb.Close($false)
      [System.IO.File]::WriteAllText($csv, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
      $done = $true
    } finally { $x.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
  } catch { Write-Host "  Excel COM unavailable ($($_.Exception.Message.Split([char]10)[0])); converting with Python xlrd" }
  if (-not $done) {
    # The script's stdout ("rows N") must go to the host, not into this
    # function's output stream, or the caller's return value picks it up.
    & (Get-Python) "$PSScriptRoot\xls_to_csv.py" $xls $sheet $csv ($dateCols -join ",") | ForEach-Object { Write-Host "  xlrd: $_" }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $csv)) { throw "xls conversion failed for $xls ($sheet)" }
  }
}

# Payroll vintages from ALFRED (FRED's archive of past releases). For each month,
# its monthly change as first printed and after every later revision, as
# [release date, change in thousands] pairs in release order; a pair is kept only
# when the value moved, so a month carries its first print and its revisions and
# nothing else. $vintDates: release dates ("yyyy-MM-dd", ascending). $obsRows: FRED
# observation rows (date, value, realtime_start, realtime_end). Returns an ordered
# dictionary keyed "yyyy-MM" holding the latest $keepMonths months.
function ConvertTo-PayrollVintages($vintDates, $obsRows, [int]$keepMonths = 24) {
  $vint = [ordered]@{}
  foreach ($R in $vintDates) {
    # The level series exactly as it stood on release day R, then its monthly changes.
    $lvl = @{}
    foreach ($o in $obsRows) { if ($o.realtime_start -le $R -and $o.realtime_end -ge $R) { $lvl[$o.date.Substring(0, 7)] = [double]$o.value } }
    foreach ($mth in @($lvl.Keys | Sort-Object)) {
      $y = [int]$mth.Substring(0, 4); $mo = [int]$mth.Substring(5, 2)
      $pm = if ($mo -eq 1) { "{0}-12" -f ($y - 1) } else { "{0}-{1:D2}" -f $y, ($mo - 1) }
      if (-not $lvl.ContainsKey($pm)) { continue }
      $chg = [int][math]::Round($lvl[$mth] - $lvl[$pm], 0)
      if (-not $vint.Contains($mth)) { $vint[$mth] = New-Object System.Collections.ArrayList }
      $n = $vint[$mth].Count
      if ($n -eq 0 -or $vint[$mth][$n - 1][1] -ne $chg) { [void]$vint[$mth].Add(@($R, $chg)) }
    }
  }
  $out = [ordered]@{}
  foreach ($mth in @($vint.Keys | Sort-Object | Select-Object -Last $keepMonths)) { $out[$mth] = @($vint[$mth]) }
  return $out
}

function Save-Json($obj, [string]$file, [int]$depth = 8) {
  $path = Join-Path $script:data $file
  ($obj | ConvertTo-Json -Depth $depth -Compress) | Set-Content $path -Encoding utf8
  Write-Output ("saved {0} {1:N0} bytes" -f $file, (Get-Item $path).Length)
}

# BLS v2 API: up to 50 series per call with a registered key.
function Invoke-Bls([string[]]$ids, [int]$startYear, [int]$endYear, [bool]$catalog = $false) {
  $body = @{ seriesid = $ids; startyear = "$startYear"; endyear = "$endYear"; registrationkey = (Get-ApiKey "BLS_API_KEY"); catalog = $catalog } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "https://api.bls.gov/publicAPI/v2/timeseries/data/" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
  if ($r.status -ne "REQUEST_SUCCEEDED") { throw "BLS: $($r.status) $($r.message -join '; ')" }
  return $r.Results.series
}

# Monthly BLS series -> [{d, idx}] ascending, M13 (annual) rows dropped.
function BlsMonthly($series) {
  $series.data | Where-Object { $_.period -match '^M(0[1-9]|1[0-2])$' } |
    ForEach-Object { [PSCustomObject]@{ d = ("{0}-{1}" -f $_.year, $_.period.Substring(1)); v = $(if ($_.value -match '^-?\d+(\.\d+)?$') { [double]$_.value } else { $null }) } } |
    Sort-Object d
}

# [{d, v}] -> [{d, idx, yoy, mom}] with the same rounding the page's live layer uses.
function WithChanges($pts, [string]$from) {
  $by = @{}; $pts | ForEach-Object { $by[$_.d] = $_.v }
  $arr = New-Object System.Collections.ArrayList
  for ($i = 0; $i -lt $pts.Count; $i++) {
    $p = $pts[$i]
    $yoy = $null; $mom = $null
    if ($null -ne $p.v) {
      $y = [int]$p.d.Substring(0,4); $m = [int]$p.d.Substring(5,2)
      $ago = "{0}-{1:D2}" -f ($y-1), $m
      if ($by.ContainsKey($ago) -and $null -ne $by[$ago]) { $yoy = [math]::Round(($p.v - $by[$ago]) / $by[$ago] * 100, 2) }
      if ($i -gt 0 -and $null -ne $pts[$i-1].v) { $mom = [math]::Round(($p.v - $pts[$i-1].v) / $pts[$i-1].v * 100, 2) }
    }
    if (-not $from -or $p.d -ge $from) { [void]$arr.Add([ordered]@{ d = $p.d; idx = $p.v; yoy = $yoy; mom = $mom }) }
  }
  return $arr
}

# BEA's note on each table carries the date its figures were last revised ("LastRevised:
# August 26, 2026"): the release the numbers come from. Kept per table in
# $script:beaRevised (yyyy-MM-dd); a table whose note lacks it is simply absent.
$script:beaRevised = @{}
function Invoke-Bea([string]$table, [string]$freq, [string]$years) {
  $u = "https://apps.bea.gov/api/data/?UserID=$(Get-ApiKey 'BEA_API_KEY')&method=GetData&datasetname=NIPA&TableName=$table&Frequency=$freq&Year=$years&ResultFormat=JSON"
  $r = Invoke-Retry { Invoke-RestMethod -Uri $u -TimeoutSec 120 }
  if ($r.BEAAPI.Error) { throw "BEA $table : $($r.BEAAPI.Error.APIErrorDescription)" }
  foreach ($n in @($r.BEAAPI.Results.Notes)) {
    if ($n -and [string]$n.NoteText -match 'Last\s*Revised(?:\s+on)?:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})') {
      $dt = [datetime]::MinValue
      if ([datetime]::TryParseExact(($Matches[1] -replace '\s+', ' '), [string[]]@("MMMM d, yyyy", "MMM d, yyyy"), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$dt)) {
        $script:beaRevised[$table] = $dt.ToString("yyyy-MM-dd"); break
      }
    }
  }
  return $r.BEAAPI.Results.Data
}
function BeaValue($s) { [double](([string]$s) -replace ',', '') }
function BeaMonth([string]$tp) { $tp.Substring(0,4) + "-" + $tp.Substring(5,2) }   # 2026M07 -> 2026-07
function BeaQuarter([string]$tp) { $tp.Substring(0,4) + "-" + $tp.Substring(4,2) } # 2026Q2  -> 2026-Q2

# ---- history revisions (BEA's annual update) ----
# Every GDP release revises the latest quarter or two, and every income and outlays
# release a few recent months. Once a year, in late September, BEA's annual update
# revises years of history, and every chart on the GDP, income and PCE views changes
# back to that point. Given the previous and new GDP data (gdp_processed.json) and
# PCE prices (pce_processed.json), this returns the revision when it reaches back
# further than that: growth revised for a quarter older than the two latest, or
# income, real spending or the PCE price index for a month more than seven months
# before the latest. It carries the earliest quarter revised, the earliest month of
# income, real spending and PCE prices revised, the number of quarters whose growth
# changed, and the three largest changes in growth among the older quarters (ties:
# the most recent); $null when there is none.
function Get-HistoryRevision($prevGdp, $gdp, $prevPce, $pce, [string]$release) {
  if (-not $prevGdp -or -not $prevGdp.growth) { return $null }
  $qi = { param($d) [int]$d.Substring(0,4) * 4 + [int]$d.Substring(6,1) }
  $mi = { param($d) [int]$d.Substring(0,4) * 12 + [int]$d.Substring(5,2) }
  $changed = {
    param($oldPts, $newPts, $field)
    $o = @{}; foreach ($p in @($oldPts)) { if ($null -ne $p.$field) { $o[[string]$p.d] = [double]$p.$field } }
    @(@($newPts) | Where-Object { $null -ne $_.$field -and $o.ContainsKey([string]$_.d) -and $o[[string]$_.d] -ne [double]$_.$field } | ForEach-Object { [string]$_.d })
  }
  $gNew = @($gdp.growth.L1.points)
  $qChanged = @(& $changed $prevGdp.growth.L1.points $gNew "v" | Sort-Object)
  $inc = @(& $changed $prevGdp.income.L1.points $gdp.income.L1.points "v" | Sort-Object)
  $spd = @(& $changed $prevGdp.realPce.L1.points $gdp.realPce.L1.points "v" | Sort-Object)
  $prc = @(if ($prevPce -and $pce) { & $changed $prevPce.L1.points $pce.L1.points "idx" | Sort-Object })
  $mChanged = @($inc + $spd + $prc | Sort-Object -Unique)
  $lastQ = & $qi $gNew[-1].d; $lastM = & $mi @($gdp.income.L1.points)[-1].d
  $oldQ = @($qChanged | Where-Object { (& $qi $_) -le $lastQ - 2 })
  $oldM = @($mChanged | Where-Object { (& $mi $_) -le $lastM - 7 })
  if (-not $oldQ.Count -and -not $oldM.Count) { return $null }
  $was = @{}; foreach ($p in @($prevGdp.growth.L1.points)) { $was[[string]$p.d] = [double]$p.v }
  $ex = @($gNew | Where-Object { $oldQ -contains [string]$_.d } | ForEach-Object { [ordered]@{ d = [string]$_.d; was = $was[[string]$_.d]; now = [double]$_.v } } |
    Sort-Object @{ Expression = { [math]::Round([math]::Abs($_.now - $_.was), 4) }; Descending = $true }, @{ Expression = { $_.d }; Descending = $true } | Select-Object -First 3)
  $first = { param($a) if ($a.Count) { $a[0] } else { $null } }
  return [ordered]@{ release = $release; gdpFrom = (& $first $qChanged); quarters = $qChanged.Count; examples = $ex
                     monthsFrom = [ordered]@{ income = (& $first $inc); spending = (& $first $spd); prices = (& $first $prc) } }
}

# ---- FRED series with a title check ----
# Pulls a FRED series and verifies its title against a pattern before accepting it,
# so a renamed, discontinued or mistyped id never reaches the page. $candidates are
# tried in order and the first whose title matches wins. With FRED_API_KEY set (the
# runner) the API serves the title and the observations; without it (a session) the
# public series page and CSV download serve the same title and data, so a processor
# can be run anywhere. Returns @{ id; title; points = [{d, v}] } with the points on or
# after $from (dates as published: "yyyy-MM-dd"); missing values (".") are dropped.
# Throws when no candidate matches: the caller's section then keeps its last data.
function Get-FredChecked([string[]]$candidates, [string]$titlePattern, [string]$from = "1900-01-01") {
  $key = [Environment]::GetEnvironmentVariable("FRED_API_KEY")
  $ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  foreach ($id in $candidates) {
    try {
      $title = $null
      if ($key) {
        $meta = Invoke-Retry { Invoke-RestMethod -Uri "https://api.stlouisfed.org/fred/series?series_id=$id&api_key=$key&file_type=json" -TimeoutSec 60 }
        $title = [string]$meta.seriess[0].title
      } else {
        $html = (Invoke-WebRequest -Uri "https://fred.stlouisfed.org/series/$id" -UseBasicParsing -UserAgent $ua -TimeoutSec 60).Content
        $m = [regex]::Match($html, '<title>(.*?)</title>')
        $title = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) -replace ('\s*\(' + [regex]::Escape($id) + '\).*$'), ''
      }
      if (-not $title -or $title -notmatch $titlePattern) { Write-Host ("  {0}: title '{1}' does not match /{2}/; skipped" -f $id, $title, $titlePattern); Start-Sleep -Milliseconds 300; continue }
      $pts = New-Object System.Collections.ArrayList
      if ($key) {
        $r = Invoke-Retry { Invoke-RestMethod -Uri "https://api.stlouisfed.org/fred/series/observations?series_id=$id&api_key=$key&file_type=json&observation_start=$from" -TimeoutSec 120 }
        foreach ($o in $r.observations) { if ($o.value -ne "." -and $o.date -ge $from) { [void]$pts.Add([ordered]@{ d = [string]$o.date; v = [double]$o.value }) } }
      } else {
        $csv = (Invoke-WebRequest -Uri "https://fred.stlouisfed.org/graph/fredgraph.csv?id=$id" -UseBasicParsing -UserAgent $ua -TimeoutSec 120).Content
        foreach ($line in ($csv -split "`n")) {
          $p = $line.Trim() -split ','
          if ($p.Count -lt 2 -or $p[0] -notmatch '^\d{4}-\d{2}-\d{2}$' -or $p[1] -eq "." -or $p[1] -eq "" -or $p[0] -lt $from) { continue }
          [void]$pts.Add([ordered]@{ d = $p[0]; v = [double]$p[1] })
        }
      }
      if (-not $pts.Count) { throw "no observations" }
      # FRED allows 120 requests a minute per key; two calls per series, paced to about 90.
      Start-Sleep -Milliseconds 1000
      Write-Host ("  {0,-18} {1,5} pts  {2} .. {3} = {4}  {5}" -f $id, $pts.Count, $pts[0].d, $pts[$pts.Count - 1].d, $pts[$pts.Count - 1].v, $title)
      return [ordered]@{ id = $id; title = $title; points = $pts }
    } catch { Write-Host ("  {0}: {1}" -f $id, $_.Exception.Message.Split([char]10)[0]); Start-Sleep -Milliseconds 300 }
  }
  throw ("FRED: none of {0} matched /{1}/" -f ($candidates -join ', '), $titlePattern)
}

# "2026-04-01" -> "2026-Q2"; "2026-04-01" -> "2026-04". Quarterly FRED observations are dated to the quarter's first day.
function ToQuarter([string]$d) { "{0}-Q{1}" -f $d.Substring(0, 4), [math]::Floor(([int]$d.Substring(5, 2) - 1) / 3 + 1) }
function ToMonth([string]$d) { $d.Substring(0, 7) }

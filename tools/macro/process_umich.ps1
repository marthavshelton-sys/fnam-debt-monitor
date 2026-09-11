# Turns the six University of Michigan Surveys of Consumers CSVs into the shape
# the dashboard reads. Two kinds of file are involved:
#
#   tbm*.csv  full monthly history, final readings only
#   tbc*.csv  a rolling 12-month table that also carries the PRELIMINARY reading
#             for the current month, marked "September (P)"
#
# The preliminary is the newest information available and matters for a page that
# tracks releases, but it is a mid-month partial sample that gets revised at
# month end. It is carried through with p:true so the page can mark it rather
# than quietly presenting it as final.
. "$PSScriptRoot\common.ps1"
function Get-UmichCsv([string]$name) {
  $r = Invoke-WebRequest -Uri "https://www.sca.isr.umich.edu/files/$name" -UseBasicParsing -TimeoutSec 60
  $c = $r.Content
  if ($c -is [byte[]]) { return [System.Text.Encoding]::UTF8.GetString($c) }
  return $c
}
$raw = [PSCustomObject]@{}
foreach ($n in @("tbmics.csv","tbmiccice.csv","tbmpx1px5.csv","tbcics.csv","tbciccice.csv","tbcpx1px5.csv")) {
  $raw | Add-Member -NotePropertyName $n -NotePropertyValue (Get-UmichCsv $n)
}

$MN = @{January=1;February=2;March=3;April=4;May=5;June=6;July=7;August=8;
        September=9;October=10;November=11;December=12}

function Parse-Month([string]$s) {
  $t = $s.Trim()
  $prelim = $t -match '\(P\)'
  $t = ($t -replace '\(P\)','').Trim()
  if (-not $MN.ContainsKey($t)) { return $null }
  return [PSCustomObject]@{ m = $MN[$t]; prelim = $prelim }
}

# Full-history files: "Month,YYYY,col1[,col2]" with a one-line header.
function Parse-History([string]$txt, [int[]]$cols) {
  $out = @{}
  foreach ($c in $cols) { $out[$c] = @() }
  foreach ($line in ($txt -split "\r?\n")) {
    $p = $line -split ','
    if ($p.Count -lt 3) { continue }
    $mi = Parse-Month $p[0]
    if (-not $mi) { continue }
    if ($p[1].Trim() -notmatch '^\d{4}$') { continue }
    $d = "{0}-{1:D2}" -f $p[1].Trim(), $mi.m
    foreach ($c in $cols) {
      if ($p.Count -le $c) { continue }
      $v = $p[$c].Trim()
      if ($v -notmatch '^-?\d+(\.\d+)?$') { continue }
      $out[$c] += [PSCustomObject]@{ d = $d; v = [double]$v }
    }
  }
  foreach ($c in $cols) { $out[$c] = @($out[$c] | Sort-Object d) }
  return $out
}

# Rolling tables: padded with empty columns, values sit at varying offsets, so
# take the numeric fields in order rather than by fixed index.
function Parse-Current([string]$txt) {
  $rows = @()
  foreach ($line in ($txt -split "\r?\n")) {
    $p = $line -split ','
    if ($p.Count -lt 3) { continue }
    $mi = Parse-Month $p[0]
    if (-not $mi) { continue }
    if ($p[1].Trim() -notmatch '^\d{4}$') { continue }
    $nums = @()
    for ($i = 2; $i -lt $p.Count; $i++) {
      $v = $p[$i].Trim()
      if ($v -match '^-?\d+(\.\d+)?$') { $nums += [double]$v }
    }
    $rows += [PSCustomObject]@{
      d = "{0}-{1:D2}" -f $p[1].Trim(), $mi.m
      prelim = $mi.prelim
      nums = $nums
    }
  }
  return @($rows | Sort-Object d)
}

$ics  = (Parse-History $raw.'tbmics.csv'     @(2))[2]
$cc   = Parse-History $raw.'tbmiccice.csv'   @(2,3)
$px   = Parse-History $raw.'tbmpx1px5.csv'   @(2,3)
$icc  = $cc[2]; $ice = $cc[3]
$px1  = $px[2]; $px5 = $px[3]

$curIcs = Parse-Current $raw.'tbcics.csv'
$curCc  = Parse-Current $raw.'tbciccice.csv'
$curPx  = Parse-Current $raw.'tbcpx1px5.csv'

Write-Output ("history  ICS {0}  ICC {1}  ICE {2}  PX1 {3}  PX5 {4}" -f `
  $ics.Count, $icc.Count, $ice.Count, $px1.Count, $px5.Count)
Write-Output ("final through: ICS {0}  ICC {1}  PX1 {2}" -f $ics[-1].d, $icc[-1].d, $px1[-1].d)

# The preliminary row, if the rolling tables run a month past the final history.
$prelim = $null
$pIcs = $curIcs | Where-Object { $_.prelim } | Select-Object -Last 1
if ($pIcs -and $pIcs.d -gt $ics[-1].d) {
  $pCc = $curCc | Where-Object { $_.d -eq $pIcs.d } | Select-Object -Last 1
  $pPx = $curPx | Where-Object { $_.d -eq $pIcs.d } | Select-Object -Last 1
  $prelim = [ordered]@{
    d   = $pIcs.d
    ics = $pIcs.nums[0]
    icc = if ($pCc) { $pCc.nums[0] } else { $null }
    ice = if ($pCc) { $pCc.nums[1] } else { $null }
    px1 = if ($pPx) { $pPx.nums[0] } else { $null }
    px5 = if ($pPx) { $pPx.nums[1] } else { $null }
  }
  Write-Output ("preliminary {0}: ICS {1}  ICC {2}  ICE {3}  PX1 {4}  PX5 {5}" -f `
    $prelim.d, $prelim.ics, $prelim.icc, $prelim.ice, $prelim.px1, $prelim.px5)
}

# Cross-check: the rolling table's final months must agree with the history file.
# A mismatch means one of the two was republished and the other cached.
$mismatch = 0
foreach ($r in ($curIcs | Where-Object { -not $_.prelim })) {
  $h = $ics | Where-Object { $_.d -eq $r.d }
  if ($h -and [math]::Abs($h.v - $r.nums[0]) -gt 0.05) {
    Write-Output ("  MISMATCH {0}: history {1} vs table {2}" -f $r.d, $h.v, $r.nums[0])
    $mismatch++
  }
}
Write-Output ("cross-check: {0} mismatches across {1} overlapping months" -f `
  $mismatch, ($curIcs | Where-Object { -not $_.prelim }).Count)

# Historical context, computed over the full series so the percentile is honest.
$sorted = @($ics | Sort-Object v)
$cur = if ($prelim) { $prelim.ics } else { $ics[-1].v }
$curD = if ($prelim) { $prelim.d } else { $ics[-1].d }
# @() matters: a single match comes back as a scalar with no .Count in PS 5.1,
# which would silently record "null months lower" for a near-record reading.
$below = @($ics | Where-Object { $_.v -lt $cur }).Count
$avg = [math]::Round(($ics | Measure-Object v -Average).Average, 1)

# The headline index ships in full (1952 on) so the page can derive historical
# claims — percentile, sub-60 episodes — from the same series it plots. The
# chart itself starts at 1978 (the page trims it): before that the survey ran
# quarterly, which would draw a misleadingly jagged line against the monthly
# data that follows. The component series are only charted, so they ship trimmed.
function Trim([object[]]$pts) { @($pts | Where-Object { $_.d -ge "1978-01" }) }
function ToArr([object[]]$pts) {
  $a = New-Object System.Collections.ArrayList
  foreach ($p in $pts) { [void]$a.Add([ordered]@{ d = $p.d; v = $p.v }) }
  return $a
}

$obj = [ordered]@{
  ics     = ToArr $ics
  chartFrom = "1978-01"
  icc     = ToArr (Trim $icc)
  ice     = ToArr (Trim $ice)
  px1     = ToArr (Trim $px1)
  px5     = ToArr (Trim $px5)
  prelim  = $prelim
  stats   = [ordered]@{
    current            = $cur
    currentMonth       = $curD
    currentIsPrelim    = [bool]$prelim
    finalThrough       = $ics[-1].d
    allTimeLow         = $sorted[0].v
    allTimeLowDate     = $sorted[0].d
    allTimeHigh        = $sorted[-1].v
    allTimeHighDate    = $sorted[-1].d
    longRunAvg         = $avg
    historyStart       = $ics[0].d
    totalMonths        = $ics.Count
    monthsBelowCurrent = $below
    lowest             = @($sorted | Select-Object -First 6 | ForEach-Object { [ordered]@{ d = $_.d; v = $_.v } })
  }
}
Save-Json $obj "umich_processed.json" 6
Write-Output ("current {0} = {1}{2}   long-run avg {3}   only {4} of {5} months ever lower" -f `
  $curD, $cur, $(if ($prelim) { " (prelim)" } else { "" }), $avg, $below, $ics.Count)

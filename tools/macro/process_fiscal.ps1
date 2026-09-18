# Federal deficit from Treasury's Monthly Treasury Statement via the FiscalData
# API (keyless), plus the annual deficit/GDP ratio from FRED.
#   Table 1: receipts, outlays, deficit by month. Every monthly statement
#            restates the current and prior fiscal year, so the history is
#            assembled by taking each (fiscal year, month) from the latest
#            statement that carries it.
#   Table 9: receipts by source and outlays by function, FYTD vs prior FYTD.
. "$PSScriptRoot\common.ps1"
$fredKey = Get-ApiKey "FRED_API_KEY"
$api = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts"
$MN = @{October=10;November=11;December=12;January=1;February=2;March=3;April=4;May=5;June=6;July=7;August=8;September=9}

# ---- Table 1 history ----
$rows = @(); $page = 1
do {
  # FiscalData is slow some mornings; a 5,000-row page can take over two minutes, and a
  # timed-out request is retried rather than failing the whole section.
  $r = Invoke-Retry { Invoke-RestMethod "$api/mts_table_1?filter=record_type_cd:eq:MTH&fields=record_date,classification_desc,current_month_gross_rcpt_amt,current_month_gross_outly_amt,current_month_dfct_sur_amt,sequence_number_cd,record_fiscal_year&page[size]=5000&page[number]=$page" -TimeoutSec 300 }
  $rows += $r.data; $page++
} while ($r.data.Count -eq 5000)
Write-Output "table 1 monthly rows: $($rows.Count)   statements: $(($rows.record_date | Sort-Object -Unique).Count)   latest: $(($rows.record_date | Sort-Object)[-1])"

# sequence 1.x = prior FY block, 2.x = current FY block within each statement.
$byKey = @{}
foreach ($row in $rows) {
  if (-not $MN.ContainsKey($row.classification_desc)) { continue }
  $stmtFY = [int]$row.record_fiscal_year
  $fy = if ($row.sequence_number_cd -like "1.*") { $stmtFY - 1 } else { $stmtFY }
  $m = $MN[$row.classification_desc]
  $cy = if ($m -ge 10) { $fy - 1 } else { $fy }
  $d = "{0}-{1:D2}" -f $cy, $m
  if ($row.current_month_gross_rcpt_amt -eq $null -or $row.current_month_gross_rcpt_amt -eq "null") { continue }
  # Keep the newest statement's figure for each month (later statements carry revisions).
  if (-not $byKey.ContainsKey($d) -or $byKey[$d].stmt -lt $row.record_date) {
    $byKey[$d] = [PSCustomObject]@{ stmt = $row.record_date; fy = $fy
      rcpt = [math]::Round([double]$row.current_month_gross_rcpt_amt / 1e9, 2)
      outly = [math]::Round([double]$row.current_month_gross_outly_amt / 1e9, 2)
      dfct = [math]::Round([double]$row.current_month_dfct_sur_amt / 1e9, 2) }
  }
}
$latestStmt = ($rows.record_date | Sort-Object)[-1]
# Drop months only known from a statement's "current FY" block beyond the latest data month
# (statements list all 12 months; future months arrive empty and were skipped above).
$months = $byKey.Keys | Sort-Object
$monthly = New-Object System.Collections.ArrayList
foreach ($d in $months) { $x = $byKey[$d]; [void]$monthly.Add([ordered]@{ d = $d; fy = $x.fy; rcpt = $x.rcpt; outly = $x.outly; dfct = $x.dfct }) }
Write-Output ("monthly series: {0} .. {1}  ({2} months)" -f $monthly[0].d, $monthly[-1].d, $monthly.Count)
$lastM = $monthly[-1]
Write-Output ("latest {0}: receipts {1}B  outlays {2}B  deficit {3}B" -f $lastM.d, $lastM.rcpt, $lastM.outly, $lastM.dfct)
# Identity: outlays - receipts = deficit
$bad = @($monthly | Where-Object { [math]::Abs(($_.outly - $_.rcpt) - $_.dfct) -gt 0.05 })
if ($bad.Count) { throw "deficit identity fails for $($bad.Count) months" }
Write-Output "identity outlays - receipts = deficit: OK for all $($monthly.Count) months"

# ---- Table 9: latest statement ----
$r9 = Invoke-Retry { Invoke-RestMethod "$api/mts_table_9?filter=record_date:eq:$latestStmt&page[size]=100" -TimeoutSec 180 }
$sources = New-Object System.Collections.ArrayList; $functions = New-Object System.Collections.ArrayList
# The API does not guarantee row order (it stopped being sequential in Sep 2026), so the
# sequence code decides the section (1.x = receipts by source, 2.x = outlays by function)
# and the display order.
$seqParts = { param($s) $p = "$s".Split('.'); @(0, 1, 2) | ForEach-Object { if ($p.Count -gt $_) { [int]$p[$_] } else { 0 } } }
$rows9 = $r9.data | Sort-Object { (& $seqParts $_.sequence_number_cd)[0] }, { (& $seqParts $_.sequence_number_cd)[1] }, { (& $seqParts $_.sequence_number_cd)[2] }
foreach ($row in $rows9) {
  if ($row.sequence_level_nbr -eq "1") { continue }
  if ($row.current_fytd_rcpt_outly_amt -eq $null -or $row.current_fytd_rcpt_outly_amt -eq "null") { continue }
  $item = [ordered]@{ name = $row.classification_desc.TrimEnd(':'); level = [int]$row.sequence_level_nbr
    fytd = [math]::Round([double]$row.current_fytd_rcpt_outly_amt / 1e9, 2)
    pyfytd = [math]::Round([double]$row.prior_fytd_rcpt_outly_amt / 1e9, 2)
    cm = [math]::Round([double]$row.current_month_rcpt_outly_amt / 1e9, 2) }
  if ($row.sequence_number_cd -like "1.*") { [void]$sources.Add($item) } else { [void]$functions.Add($item) }
}
$totR = @($sources | Where-Object { $_.name -eq "Total" }); $totO = @($functions | Where-Object { $_.name -eq "Total" })
if ($totR.Count -ne 1 -or $totO.Count -ne 1) { throw "table 9: expected one Total per section, got $($totR.Count) receipts / $($totO.Count) outlays" }
$totR = $totR[0]; $totO = $totO[0]
Write-Output ("FYTD receipts {0}B (py {1}B)  outlays {2}B (py {3}B)  deficit {4}B (py {5}B)" -f $totR.fytd, $totR.pyfytd, $totO.fytd, $totO.pyfytd, ($totO.fytd - $totR.fytd), ($totO.pyfytd - $totR.pyfytd))
# Identity: sources sum to total (level-2 items, excluding the social insurance header whose level-3 children carry the value)
$sumR = ($sources | Where-Object { $_.name -ne "Total" -and $_.level -ge 2 } | ForEach-Object { $_.fytd } | Measure-Object -Sum).Sum
$sumO = ($functions | Where-Object { $_.name -ne "Total" } | ForEach-Object { $_.fytd } | Measure-Object -Sum).Sum
Write-Output ("identity: sources {0:N2} vs total {1:N2}; functions {2:N2} vs total {3:N2}" -f $sumR, $totR.fytd, $sumO, $totO.fytd)
if ([math]::Abs($sumR - $totR.fytd) -gt 0.5 -or [math]::Abs($sumO - $totO.fytd) -gt 0.5) { throw "table 9 does not reconcile" }

# ---- FRED annual: deficit as % of GDP; fiscal-year totals for the long view ----
function Get-FredA($id) {
  $r = Invoke-Retry { Invoke-RestMethod "https://api.stlouisfed.org/fred/series/observations?series_id=$id&api_key=$fredKey&file_type=json&observation_start=1970-01-01" -TimeoutSec 120 }
  $a = New-Object System.Collections.ArrayList
  foreach ($o in $r.observations) { if ($o.value -ne ".") { [void]$a.Add([ordered]@{ y = [int]$o.date.Substring(0,4); v = [double]$o.value }) } }
  return $a
}
$pctGdp = Get-FredA "FYFSGDA188S"
$debtGdp = Get-FredA "GFDEGDQ188S"
$debtGdpQ = @($debtGdp | Select-Object -Last 1)
Write-Output ("deficit % GDP: {0} .. {1} = {2}%   debt % GDP latest {3}%" -f $pctGdp[0].y, $pctGdp[-1].y, $pctGdp[-1].v, $debtGdpQ[0].v)

$obj = [ordered]@{
  monthly = $monthly
  statementDate = $latestStmt
  sources = $sources
  functions = $functions
  pctGdp = $pctGdp
  debtPctGdp = [ordered]@{ v = $debtGdpQ[0].v; y = $debtGdpQ[0].y }
  fetchedAt = (Get-Date -Format "yyyy-MM-dd")
}
Save-Json $obj "fiscal_processed.json" 6

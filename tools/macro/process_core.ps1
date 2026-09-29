# Core series: CPI (BLS), labor (BLS), PCE prices + weights (BEA), GDP/income (BEA).
# Reproduces the data contracts the page was built against; the CPI and PCE
# shaping mirrors the page's own live layer exactly.
. "$PSScriptRoot\common.ps1"
$thisYear = (Get-Date).Year

# ---------------- CPI ----------------
$cpiIds = @("CUUR0000SA0","CUUR0000SA0L1E","CUUR0000SA0E","CUUR0000SAF","CUUR0000SAH","CUUR0000SAA",
            "CUUR0000SAT","CUUR0000SAM","CUUR0000SAR","CUUR0000SAE","CUUR0000SAG","CUUR0000SAH1",
            "CUUR0000SACL1E","CUUR0000SASLE","CUSR0000SA0","CUSR0000SA0L1E")
$cpiNames = @{
  "CUUR0000SA0"="Headline (All items)";"CUUR0000SA0L1E"="Core (ex. food & energy)";"CUUR0000SA0E"="Energy";
  "CUUR0000SAF"="Food and beverages";"CUUR0000SAH"="Housing";"CUUR0000SAA"="Apparel";"CUUR0000SAT"="Transportation";
  "CUUR0000SAM"="Medical care";"CUUR0000SAR"="Recreation";"CUUR0000SAE"="Education and communication";
  "CUUR0000SAG"="Other goods and services";"CUUR0000SAH1"="Shelter";"CUUR0000SACL1E"="Core goods (commodities)";
  "CUUR0000SASLE"="Core services";"CUSR0000SA0"="Headline (SA)";"CUSR0000SA0L1E"="Core (SA)"
}
$cpi = [ordered]@{}
foreach ($s in (Invoke-Bls $cpiIds 2016 $thisYear)) {
  $cpi[$s.seriesID] = [ordered]@{ name = $cpiNames[$s.seriesID]; points = (WithChanges (BlsMonthly $s) "2017-01") }
}
$h = $cpi["CUUR0000SA0"].points[-1]
Write-Output ("CPI: {0} series, headline {1} yoy {2} mom {3}" -f $cpi.Count, $h.d, $h.yoy, $h.mom)
Save-Json $cpi "bls_cpi_processed3.json"

# ---------------- Labor ----------------
$laborIds = @("LNS14000000","LNS13327709","LNS11300000","LNS12300000","LNS13000000","LNS13008396","LNS13008756",
              "LNS13008516","LNS13008636","LNS13008275","LNS13008276","LNS12026620","LNS12026619",
              "CES0000000001","CES0500000003","CES0500000002","CES0500000001","CES0600000001","CES0800000001",
              "CES1000000001","CES2000000001","CES3000000001","CES4000000001","CES5000000001","CES5500000001",
              "CES6000000001","CES6500000001","CES7000000001","CES8000000001","CES9000000001",
              "JTS000000000000000JOL","JTS000000000000000QUR")
$labor = [ordered]@{}
foreach ($s in (Invoke-Bls $laborIds 2017 $thisYear)) {
  $pts = New-Object System.Collections.ArrayList
  # Null months are kept: the household survey has a real gap (Oct 2025 shutdown)
  # that the page draws as a break in the line rather than papering over.
  foreach ($p in (BlsMonthly $s)) { [void]$pts.Add([ordered]@{ d = $p.d; v = $p.v }) }
  $labor[$s.seriesID] = [ordered]@{ points = $pts }
}
Write-Output ("labor: {0} series, unemployment {1} = {2}%, payrolls {3}" -f $labor.Count, $labor["LNS14000000"].points[-1].d, $labor["LNS14000000"].points[-1].v, $labor["CES0000000001"].points[-1].d)
Save-Json $labor "labor_processed.json"

# ---------------- labor_static upkeep ----------------
# Two things in labor_static.json used to need a hand each month; both are now
# maintained here so the revisions chart and the state maps never go stale.
$lsPath = Join-Path $data "labor_static.json"
$ls = Get-Content $lsPath -Raw -Encoding UTF8 | ConvertFrom-Json
$changed = $false

# (a) First prints. The payroll revisions chart compares each month's current
# value with its first-published change. The first run after a jobs report is
# the only time that number is observable, so record it then and never overwrite.
$ces = $labor["CES0000000001"].points
$latestM = $ces[-1]; $priorM = $ces[-2]
if ($null -ne $latestM.v -and $null -ne $priorM.v) {
  $firstPrint = [math]::Round($latestM.v - $priorM.v, 0)
  if (-not $ls.payrollInitial.PSObject.Properties[$latestM.d]) {
    $ls.payrollInitial | Add-Member -NotePropertyName $latestM.d -NotePropertyValue $firstPrint
    Write-Output ("first print recorded: {0} = {1:+#;-#;0}K" -f $latestM.d, $firstPrint); $changed = $true
  }
}

# (a2) Every published value of the last two years, from ALFRED (FRED's archive
# of vintages). BLS's own "revised" sentence compares each month with the
# previous release, not with its first print, and the two figures differ, so the
# page needs the history: two calls rebuild, release by release, the monthly
# change as it stood at that release (ConvertTo-PayrollVintages in common.ps1).
# Stored as, e.g.,
#   payrollVintages: { "2026-06": [["2026-07-02",57],["2026-08-07",20],["2026-09-04",31]], ... }
# (release date, change in thousands; first print, then each revision) for the
# latest 24 months. A failure here keeps the previous block and never blocks the run.
try {
  $fredKey = Get-ApiKey "FRED_API_KEY"
  $obsStart = (Get-Date).AddMonths(-30).ToString("yyyy-MM-01")
  $rtStart  = (Get-Date).AddMonths(-27).ToString("yyyy-MM-dd")
  $vd = Invoke-Retry { Invoke-RestMethod -Uri "https://api.stlouisfed.org/fred/series/vintagedates?series_id=PAYEMS&api_key=$fredKey&file_type=json&realtime_start=$rtStart&realtime_end=9999-12-31" -TimeoutSec 60 }
  $vintDates = @($vd.vintage_dates | Sort-Object -Unique)
  $ob = Invoke-Retry { Invoke-RestMethod -Uri "https://api.stlouisfed.org/fred/series/observations?series_id=PAYEMS&api_key=$fredKey&file_type=json&observation_start=$obsStart&realtime_start=$rtStart&realtime_end=9999-12-31" -TimeoutSec 120 }
  $obsRows = @($ob.observations | Where-Object { $_.value -ne "." })
  if ($vintDates.Count -lt 2 -or $obsRows.Count -lt 24) { throw "ALFRED returned $($vintDates.Count) vintages and $($obsRows.Count) rows" }
  $pv = ConvertTo-PayrollVintages $vintDates $obsRows 24
  $keep = @($pv.Keys)
  # Rewrite the file only when a value moved: a signature "month=release:change,..." on
  # both sides, so an unchanged block never produces a new page and a new commit.
  $sig = @($keep | ForEach-Object { $mth = $_; $mth + "=" + (@($pv[$mth] | ForEach-Object { [string]$_[0] + ":" + [string]$_[1] }) -join ",") }) -join ";"
  $prevSig = ""
  if ($ls.PSObject.Properties["payrollVintages"]) {
    $prevSig = @($ls.payrollVintages.PSObject.Properties | ForEach-Object { $_.Name + "=" + (@($_.Value | ForEach-Object { [string]$_[0] + ":" + [string]$_[1] }) -join ",") }) -join ";"
  }
  if ($sig -ne $prevSig) {
    if ($ls.PSObject.Properties["payrollVintages"]) { $ls.payrollVintages = $pv } else { $ls | Add-Member -NotePropertyName payrollVintages -NotePropertyValue $pv }
    Write-Output ("payroll vintages: {0} months, {1} releases from {2} to {3}" -f $keep.Count, $vintDates.Count, $vintDates[0], $vintDates[-1]); $changed = $true
  } else { Write-Output "payroll vintages unchanged ($($keep.Count) months)" }
} catch { Write-Host "::warning::payroll vintages (ALFRED) not updated: $($_.Exception.Message.Split([char]10)[0])" }

# (b) State nonfarm employment (BLS CES state series), the denominator for the
# job-cut maps. 51 series, two API calls.
$fips = @{ AL="01";AK="02";AZ="04";AR="05";CA="06";CO="08";CT="09";DE="10";DC="11";FL="12";GA="13";HI="15";ID="16";IL="17";IN="18";IA="19";KS="20";KY="21";LA="22";ME="23";MD="24";MA="25";MI="26";MN="27";MS="28";MO="29";MT="30";NE="31";NV="32";NH="33";NJ="34";NM="35";NY="36";NC="37";ND="38";OH="39";OK="40";OR="41";PA="42";RI="44";SC="45";SD="46";TN="47";TX="48";UT="49";VT="50";VA="51";WA="53";WV="54";WI="55";WY="56" }
$byId = @{}; foreach ($st in $fips.Keys) { $byId["SMS$($fips[$st])000000000000001"] = $st }
$ids = @($byId.Keys | Sort-Object)
$stEmp = @{}; $stMonth = $null
foreach ($chunk in @($ids[0..25], $ids[26..($ids.Count-1)])) {
  foreach ($s in (Invoke-Bls $chunk ($thisYear-1) $thisYear)) {
    $p = BlsMonthly $s | Where-Object { $null -ne $_.v } | Select-Object -Last 1
    if ($p) { $stEmp[$byId[$s.seriesID]] = $p.v; if (-not $stMonth -or $p.d -lt $stMonth) { $stMonth = $p.d } }
  }
}
if ($stEmp.Count -eq 51 -and $stMonth -ne $ls.challenger.stateEmploymentAsOf) {
  $ls.stateEmployment = [PSCustomObject]$stEmp
  $ls.challenger.stateEmploymentAsOf = $stMonth
  Write-Output "state employment refreshed to $stMonth"; $changed = $true
} elseif ($stEmp.Count -ne 51) { Write-Host "::warning::state employment: only $($stEmp.Count) of 51 states returned; kept previous values" }
else { Write-Output "state employment already at $stMonth" }

# Compact: this file is baked into the page, and pretty-printing it was 65 KB of whitespace.
if ($changed) { ($ls | ConvertTo-Json -Depth 6 -Compress) | Set-Content $lsPath -Encoding utf8; Write-Output "labor_static.json updated" }

# ---------------- PCE prices + weights (BEA T20804 / T20805) ----------------
$pceLines = @{
  "1"="Personal consumption expenditures (PCE)";"25"="PCE excluding food and energy (core)";"2"="Goods";"13"="Services";
  "3"="Durable goods";"8"="Nondurable goods";"15"="Housing and utilities";"16"="Health care";"17"="Transportation services";
  "18"="Recreation services";"19"="Food services and accommodations";"20"="Financial services and insurance";
  "21"="Other services";"22"="Nonprofit institutions (NPISH)";"27"="Energy goods and services";"26"="PCE excluding food, energy, and housing"
}
$priceYears = (($thisYear-10)..$thisYear) -join ","
$rows = Invoke-Bea "T20804" "M" $priceYears
$byLine = @{}
foreach ($r in $rows) {
  $ln = [string]$r.LineNumber
  if (-not $pceLines.ContainsKey($ln)) { continue }
  if (-not $byLine.ContainsKey($ln)) { $byLine[$ln] = @{} }
  $byLine[$ln][(BeaMonth $r.TimePeriod)] = (BeaValue $r.DataValue)
}
$pce = [ordered]@{}
foreach ($ln in $byLine.Keys) {
  $pts = $byLine[$ln].Keys | Sort-Object | ForEach-Object { [PSCustomObject]@{ d = $_; v = $byLine[$ln][$_] } }
  $pce["L$ln"] = [ordered]@{ name = $pceLines[$ln]; points = (WithChanges @($pts) "2017-01") }
}
$pl = $pce["L1"].points[-1]
Write-Output ("PCE: {0} lines, headline {1} yoy {2}" -f $pce.Count, $pl.d, $pl.yoy)
Save-Json $pce "pce_processed.json"

$nomRows = Invoke-Bea "T20805" "M" ("{0},{1}" -f ($thisYear-1), $thisYear)
$nom = @{}
foreach ($r in $nomRows) { $ln = [string]$r.LineNumber; if (-not $nom.ContainsKey($ln)) { $nom[$ln] = @{} }; $nom[$ln][(BeaMonth $r.TimePeriod)] = (BeaValue $r.DataValue) }
$months = $nom["1"].Keys | Sort-Object
$latest = $months[-1]; $prior = "{0}-{1}" -f ([int]$latest.Substring(0,4)-1), $latest.Substring(5,2)
function Share($ln, $m) { if ($nom["$ln"].ContainsKey($m) -and $nom["1"].ContainsKey($m)) { [math]::Round($nom["$ln"][$m] / $nom["1"][$m] * 100, 3) } else { $null } }
function MkW($defs) { @($defs | ForEach-Object { $w = Share $_.ln $latest; $wp = Share $_.ln $prior; [ordered]@{ id = $_.id; name = $_.name; w = $w; wPrior = $(if ($null -eq $wp) { $w } else { $wp }) } } | Where-Object { $null -ne $_.w }) }
$pceWeights = [ordered]@{
  majorGroups = MkW @(
    @{id="durable";ln=3;name="Durable goods"},@{id="nondurable";ln=8;name="Nondurable goods"},
    @{id="housing";ln=15;name="Housing and utilities"},@{id="health";ln=16;name="Health care"},
    @{id="transport";ln=17;name="Transportation services"},@{id="recreation";ln=18;name="Recreation services"},
    @{id="foodsvc";ln=19;name="Food services and accommodations"},@{id="financial";ln=20;name="Financial services and insurance"},
    @{id="other";ln=21;name="Other services"},@{id="npish";ln=22;name="Nonprofit institutions (NPISH)"})
  specialAggregates = MkW @(
    @{id="energy";ln=27;name="Energy goods and services"},@{id="core";ln=25;name="PCE excluding food and energy (core)"},
    @{id="goods";ln=2;name="Goods"},@{id="services";ln=13;name="Services"},@{id="supercore";ln=26;name="PCE excluding food, energy, and housing"})
  asOfMonth = $latest; priorAsOfMonth = $prior
}
Write-Output ("PCE weights as of {0}: 10 groups sum {1:N3}" -f $latest, (($pceWeights.majorGroups | ForEach-Object { $_.w }) | Measure-Object -Sum).Sum)
Save-Json $pceWeights "pce_weights.json"

# ---------------- GDP: growth, contributions, income, real PCE ----------------
function BeaSeries($table, $freq, $years, $lines, $fmt, $from) {
  $rows = Invoke-Bea $table $freq $years
  $out = [ordered]@{}
  foreach ($ln in $lines) {
    $pts = $rows | Where-Object { [string]$_.LineNumber -eq "$ln" } |
      ForEach-Object { [PSCustomObject]@{ d = (& $fmt $_.TimePeriod); v = (BeaValue $_.DataValue) } } | Sort-Object d |
      Where-Object { $_.d -ge $from }
    $arr = New-Object System.Collections.ArrayList
    foreach ($p in $pts) { [void]$arr.Add([ordered]@{ d = $p.d; v = $p.v }) }
    $out["L$ln"] = [ordered]@{ points = $arr }
  }
  return $out
}
$qYears = (($thisYear-10)..$thisYear) -join ","
$gdp = [ordered]@{
  growth        = BeaSeries "T10101" "Q" $qYears @(1) ${function:BeaQuarter} "2016-Q1"
  contributions = BeaSeries "T10102" "Q" $qYears @(1,2,7,15,16,19,22) ${function:BeaQuarter} "2016-Q1"
  income        = BeaSeries "T20600" "M" $qYears @(1,2,9,12,13,16,25,26,27,28,29,34,35,37) ${function:BeaMonth} "2016-01"
  realPce       = BeaSeries "T20806" "M" $qYears @(1,2,3,8,13,15,16,17,18,19,20,21,22) ${function:BeaMonth} "2016-01"
}
# The release each block comes from, as BEA dates it: the page names the GDP estimate
# it shows from this (advance, second or third), so a run that lands between BEA's
# release and FRED's calendar update still labels the figures correctly.
$vintage = [ordered]@{}
if ($script:beaRevised["T10101"]) { $vintage["gdp"] = $script:beaRevised["T10101"] }
if ($script:beaRevised["T20600"]) { $vintage["income"] = $script:beaRevised["T20600"] }
if ($vintage.Count) { $gdp["vintage"] = $vintage }
Write-Output ("BEA last revised: GDP {0}, personal income {1}" -f $(if ($vintage["gdp"]) { $vintage["gdp"] } else { "not reported" }), $(if ($vintage["income"]) { $vintage["income"] } else { "not reported" }))
$gq = $gdp.growth.L1.points[-1]; $gi = $gdp.income.L1.points[-1]
Write-Output ("GDP: growth {0} = {1}%   income {2} = {3:N0}   saving rate {4}%" -f $gq.d, $gq.v, $gi.d, $gi.v, $gdp.income.L35.points[-1].v)
# Identity: income - taxes = DPI (BEA nets social insurance inside personal income)
$L = { param($k) $gdp.income[$k].points[-1].v }
$gap = (& $L "L1") - (& $L "L26") - (& $L "L27")
if ([math]::Abs($gap) -gt 5) { throw "DPI identity fails by $gap" }
Write-Output "identity income - taxes = DPI: OK"
Save-Json $gdp "gdp_processed.json"

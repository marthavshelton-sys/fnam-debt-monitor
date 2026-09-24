# Supply chain: four sources into one file.
#   GSCPI   NY Fed Global Supply Chain Pressure Index - a legacy .xls served
#           with an .xlsx extension; converted through Excel COM (present on
#           this machine) into CSV, then parsed. Monthly, 1998 on.
#   FRED    inventories, inventory/sales ratios, trade flows, import/export
#           price indexes (monthly) and diesel (weekly).
#   BLS     PPI freight commodity indexes and two industry indexes (monthly).
. "$PSScriptRoot\common.ps1"
$keys = [PSCustomObject]@{ FRED_API_KEY = (Get-ApiKey "FRED_API_KEY"); BLS_API_KEY = (Get-ApiKey "BLS_API_KEY") }

# ---- GSCPI ----
$xlsx = "$scratch\gscpi_data.xlsx"; $xls = "$scratch\gscpi_data.xls"; $csv = "$data\gscpi_data.csv"
# gscpi_data.csv is committed alongside the scripts as the last good copy. If
# the download or the conversion fails on a given run, the page keeps last
# month's GSCPI rather than losing the whole build over one input. The raw
# workbook and the fresh CSV stay in the scratch folder, out of the repo.
$fresh = "$scratch\gscpi_fresh.csv"
$converted = $false
$gscpiUrl = "https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx"
$gscpiFileDate = $null
try {
  Invoke-WebRequest -Uri $gscpiUrl -OutFile $xlsx -UserAgent "Mozilla/5.0" -TimeoutSec 60
  Copy-Item $xlsx $xls -Force
  $gscpiFileDate = Get-RemoteFileDate $gscpiUrl   # the NY Fed's file date, shown on the page
  Write-Output "GSCPI workbook dated $gscpiFileDate"
} catch { Write-Output "GSCPI download failed: $($_.Exception.Message)" }
# The file is a legacy .xls. Excel COM converts it where Excel exists (this
# machine); the GitHub runner has no Excel, so it falls back to Python + xlrd.
if (Test-Path $xls) { try {
  $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
  try {
    $wb = $x.Workbooks.Open($xls)
    $ws = $wb.Worksheets.Item("GSCPI Monthly Data")
    if (Test-Path $fresh) { Remove-Item $fresh -Force }
    $ws.SaveAs($fresh, 6)
    $wb.Close($false)
    $converted = $true
  } finally { $x.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
} catch { Write-Output "Excel COM unavailable; converting with Python xlrd" } }
if (-not $converted -and (Test-Path $xls)) {
  try { & python "$PSScriptRoot\gscpi_xls_to_csv.py" $xls $fresh; if ($LASTEXITCODE -eq 0) { $converted = $true } } catch { Write-Output "xlrd conversion failed: $($_.Exception.Message)" }
}
if ($converted -and (Get-Content $fresh | Where-Object { $_ -match '^\d{1,2}-[A-Za-z]{3}-\d{4},' }).Count -gt 300) {
  Copy-Item $fresh $csv -Force
  Write-Output "GSCPI: fresh file parsed and committed as gscpi_data.csv"
} elseif (Test-Path $csv) {
  Write-Output "GSCPI: using last committed gscpi_data.csv"
} else { throw "GSCPI: no fresh file and no committed fallback" }
$MN = @{Jan=1;Feb=2;Mar=3;Apr=4;May=5;Jun=6;Jul=7;Aug=8;Sep=9;Oct=10;Nov=11;Dec=12}
$gscpi = New-Object System.Collections.ArrayList
foreach ($line in (Get-Content $csv)) {
  $p = $line -split ','
  # Two -match tests in one condition would overwrite $Matches; test the date first.
  if ($p[0] -notmatch '^\d{1,2}-([A-Za-z]{3})-(\d{4})$') { continue }
  $mon = $Matches[1]; $yr = $Matches[2]
  if ($p[1] -match '^-?[\d.]+$') {
    [void]$gscpi.Add([ordered]@{ d = ("{0}-{1:D2}" -f $yr, $MN[$mon]); v = [double]$p[1] })
  }
}
Write-Output ("GSCPI: {0} months, {1} .. {2} = {3}" -f $gscpi.Count, $gscpi[0].d, $gscpi[-1].d, $gscpi[-1].v)

# ---- FRED ----
function Get-Fred($id, $from, $freq) {
  $u = "https://api.stlouisfed.org/fred/series/observations?series_id=$id&api_key=$($keys.FRED_API_KEY)&file_type=json&observation_start=$from"
  if ($freq) { $u += "&frequency=$freq&aggregation_method=eop" }
  $r = Invoke-RestMethod -Uri $u -TimeoutSec 60
  $pts = New-Object System.Collections.ArrayList
  foreach ($o in $r.observations) { if ($o.value -ne ".") { [void]$pts.Add([ordered]@{ d = $o.date.Substring(0,7); v = [double]$o.value }) } }
  Start-Sleep -Milliseconds 150
  return $pts
}
$fred = [ordered]@{}
foreach ($id in @("ISRATIO","RETAILIRSA","MNFCTRIRSA","WHLSLRIRSA","BUSINV","TOTBUSSMSA","BOPGSTB","BOPTEXP","BOPTIMP","IR","IQ")) {
  $fred[$id] = Get-Fred $id "2015-01-01" $null
  "{0,-11} {1,4} pts  {2} = {3}" -f $id, $fred[$id].Count, $fred[$id][-1].d, $fred[$id][-1].v
}
# Diesel is weekly (Monday); keep the full date and ship as a compact regular series.
$u = "https://api.stlouisfed.org/fred/series/observations?series_id=GASDESW&api_key=$($keys.FRED_API_KEY)&file_type=json&observation_start=2015-01-01"
$r = Invoke-RestMethod -Uri $u -TimeoutSec 60
$dsl = @(); foreach ($o in $r.observations) { if ($o.value -ne ".") { $dsl += [ordered]@{ d = $o.date; v = [double]$o.value } } }
$regular = $true; for ($i = 1; $i -lt $dsl.Count; $i++) { if (([datetime]$dsl[$i].d - [datetime]$dsl[$i-1].d).TotalDays -ne 7) { $regular = $false; break } }
$diesel = if ($regular) { [ordered]@{ d0 = $dsl[0].d; step = 7; v = @($dsl | ForEach-Object { $_.v }) } } else { [ordered]@{ points = $dsl } }
"{0,-11} {1,4} pts  {2} = {3}  regular={4}" -f "GASDESW", $dsl.Count, $dsl[-1].d, $dsl[-1].v, $regular

# ---- BLS freight PPIs ----
$ids = @("WPU301","WPU3012","WPU3011","WPU3013","WPU3014","PCU483111483111","PCU4841214841212","WPU32")
$body = @{ seriesid=$ids; startyear="2015"; endyear="$((Get-Date).Year)"; registrationkey=$keys.BLS_API_KEY; catalog=$true } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "https://api.bls.gov/publicAPI/v2/timeseries/data/" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
if ($r.status -ne "REQUEST_SUCCEEDED") { throw "BLS: $($r.status)" }
$bls = [ordered]@{}
foreach ($s in $r.Results.series) {
  if (-not $s.data.Count) { Write-Output ("{0,-17} none (skipped)" -f $s.seriesID); continue }
  $pts = $s.data | Where-Object { $_.period -match '^M(0[1-9]|1[0-2])$' } |
    ForEach-Object { [PSCustomObject]@{ d = ("{0}-{1}" -f $_.year, $_.period.Substring(1)); idx = [double]$_.value } } | Sort-Object d
  $by = @{}; $pts | ForEach-Object { $by[$_.d] = $_.idx }
  $arr = New-Object System.Collections.ArrayList
  foreach ($p in $pts) {
    $y = [int]$p.d.Substring(0,4); $m = [int]$p.d.Substring(5,2)
    $ago = "{0}-{1:D2}" -f ($y-1), $m
    $yoy = if ($by.ContainsKey($ago)) { [math]::Round(($p.idx / $by[$ago] - 1) * 100, 2) } else { $null }
    if ($p.d -ge "2016-01") { [void]$arr.Add([ordered]@{ d = $p.d; idx = $p.idx; yoy = $yoy }) }
  }
  $bls[$s.seriesID] = [ordered]@{ name = ($s.catalog.series_title -replace '^PPI (Commodity|industry) data for ', ''); points = $arr }
  "{0,-17} {1,4} pts  {2} yoy {3}" -f $s.seriesID, $arr.Count, $arr[-1].d, $arr[-1].yoy
}

$obj = [ordered]@{ gscpi = $gscpi; gscpiFileDate = $gscpiFileDate; fred = $fred; diesel = $diesel; freight = $bls; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "supply_processed.json" 6

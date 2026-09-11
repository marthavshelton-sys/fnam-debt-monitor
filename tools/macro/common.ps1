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

function Invoke-Bea([string]$table, [string]$freq, [string]$years) {
  $u = "https://apps.bea.gov/api/data/?UserID=$(Get-ApiKey 'BEA_API_KEY')&method=GetData&datasetname=NIPA&TableName=$table&Frequency=$freq&Year=$years&ResultFormat=JSON"
  $r = Invoke-RestMethod -Uri $u -TimeoutSec 120
  if ($r.BEAAPI.Error) { throw "BEA $table : $($r.BEAAPI.Error.APIErrorDescription)" }
  return $r.BEAAPI.Results.Data
}
function BeaValue($s) { [double](([string]$s) -replace ',', '') }
function BeaMonth([string]$tp) { $tp.Substring(0,4) + "-" + $tp.Substring(5,2) }   # 2026M07 -> 2026-07
function BeaQuarter([string]$tp) { $tp.Substring(0,4) + "-" + $tp.Substring(4,2) } # 2026Q2  -> 2026-Q2

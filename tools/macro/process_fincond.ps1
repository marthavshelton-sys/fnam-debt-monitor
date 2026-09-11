# Financial conditions from FRED. Everything is pulled at weekly frequency,
# end-of-period, so daily market series and the weekly composite indexes line
# up on one axis and the page carries ~1,000 points per series instead of 5,000.
. "$PSScriptRoot\common.ps1"
$key = Get-ApiKey "FRED_API_KEY"

$series = [ordered]@{
  # composites
  NFCI          = "Chicago Fed National Financial Conditions Index"
  ANFCI         = "Chicago Fed Adjusted NFCI"
  NFCIRISK      = "NFCI risk subindex"
  NFCICREDIT    = "NFCI credit subindex"
  NFCILEVERAGE  = "NFCI leverage subindex"
  STLFSI4       = "St. Louis Fed Financial Stress Index"
  KCFSI         = "Kansas City Fed Financial Stress Index"
  # credit spreads
  BAMLH0A0HYM2  = "ICE BofA US High Yield OAS"
  BAMLC0A0CM    = "ICE BofA US Corporate (IG) OAS"
  # rates
  DFF           = "Effective federal funds rate"
  DFEDTARU      = "Fed funds target range, upper"
  DFEDTARL      = "Fed funds target range, lower"
  DGS3MO        = "3-month Treasury"
  DGS2          = "2-year Treasury"
  DGS10         = "10-year Treasury"
  DGS30         = "30-year Treasury"
  T10Y2Y        = "10y-2y spread"
  T10Y3M        = "10y-3m spread"
  MORTGAGE30US  = "30-year fixed mortgage rate"
  # markets
  DTWEXBGS      = "Broad dollar index"
  VIXCLS        = "VIX"
  SP500         = "S&P 500"
  WALCL         = "Fed balance sheet, total assets"
}

$out = [ordered]@{}
$meta = [ordered]@{}
foreach ($id in $series.Keys) {
  $u = "https://api.stlouisfed.org/fred/series/observations?series_id=$id&api_key=$key&file_type=json&observation_start=2007-01-01&frequency=w&aggregation_method=eop"
  try {
    $r = Invoke-RestMethod -Uri $u -TimeoutSec 60
  } catch {
    # Some series refuse weekly aggregation; fall back to native frequency.
    $u2 = "https://api.stlouisfed.org/fred/series/observations?series_id=$id&api_key=$key&file_type=json&observation_start=2007-01-01"
    $r = Invoke-RestMethod -Uri $u2 -TimeoutSec 60
  }
  # The composite stress indexes keep 2007 on so the 2008 episode stays in
  # frame as the yardstick; market series start 2012, which is plenty for the
  # rate cycle since. Precision matches how each series is quoted.
  $from = if ($id -match '^(NFCI|ANFCI|STLFSI4|KCFSI)') { "2007-01-01" } else { "2012-01-01" }
  $dec = if ($id -eq "WALCL") { 0 } elseif ($id -match '^(DTWEXBGS|VIXCLS|SP500)$') { 1 } elseif ($id -match '^(NFCI|ANFCI|STLFSI4|KCFSI)') { 3 } else { 2 }
  $pts = New-Object System.Collections.ArrayList
  foreach ($o in $r.observations) {
    if ($o.value -eq "." -or $o.date -lt $from) { continue }
    $v = [double]$o.value
    if ($id -eq "WALCL") { $v = $v / 1000 }   # $ millions -> $ billions
    [void]$pts.Add([ordered]@{ d = $o.date; v = [math]::Round($v, $dec) })
  }
  # A series whose points are exactly 7 days apart ships as a start date plus a
  # value list; the page rebuilds the dates. Anything irregular ships in full.
  $regular = $pts.Count -gt 1
  for ($i = 1; $i -lt $pts.Count -and $regular; $i++) {
    $gap = ([datetime]$pts[$i].d - [datetime]$pts[$i-1].d).TotalDays
    if ($gap -ne 7) { $regular = $false }
  }
  if ($regular) {
    $out[$id] = [ordered]@{ d0 = $pts[0].d; step = 7; v = @($pts | ForEach-Object { $_.v }) }
  } else {
    $out[$id] = [ordered]@{ points = $pts }
  }
  $lastP = $pts[$pts.Count-1]
  "{0,-13} {1,5} pts  {2} = {3,-10}  {4}" -f $id, $pts.Count, $lastP.d, $lastP.v, $series[$id]
  Start-Sleep -Milliseconds 150
}

$obj = [ordered]@{ series = $out; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "fincond_processed.json" 6

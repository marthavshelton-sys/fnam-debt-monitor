# Shiller CAPE (cyclically adjusted price/earnings ratio) for the S&P Composite.
# Source: Robert Shiller's monthly data set (ie_data.xls), hosted at
# shillerdata.com since the Yale copy stopped updating in 2023. The download
# link there carries a version token, so the page is read first and the link
# taken from it. Sheet "Data", header row 8, data from row 9: A date (yyyy.mm -
# note 1871.1 means October, so the month comes from the fractional-year
# column F), B price, D earnings, E CPI, G 10-year yield, H real price, M CAPE,
# Q excess CAPE yield, T 10-year annualized real stock return (only for months
# at least ten years old). The last row is the current month, whose price is
# the average of the month so far.
. "$PSScriptRoot\common.ps1"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
$xls = Join-Path $scratch "ie_data.xls"; $csv = Join-Path $scratch "ie_data.csv"

$page = Invoke-Retry { Invoke-WebRequest -Uri "https://shillerdata.com/" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
$m = [regex]::Match($page.Content, 'href="([^"]*ie_data\.xls[^"]*)"')
if (-not $m.Success) { throw "ie_data.xls link not found on shillerdata.com" }
$url = $m.Groups[1].Value; if ($url.StartsWith("//")) { $url = "https:" + $url }
Invoke-Retry { Invoke-WebRequest -Uri $url -OutFile $xls -UserAgent $ua -TimeoutSec 120 }
Convert-XlsSheetToCsv $xls "Data" $csv @()

$pts = New-Object System.Collections.ArrayList
$num = { param($s) if ($s -match '^-?\d+(\.\d+)?([eE][-+]?\d+)?$') { [double]$s } else { $null } }
foreach ($line in (Get-Content $csv)) {
  $p = $line -split ','
  if ($p.Count -lt 20 -or $p[0] -notmatch '^\d{4}\.\d{1,2}$') { continue }
  $frac = & $num $p[5]; if ($frac -eq $null) { continue }
  $year = [math]::Floor($frac); $month = [int][math]::Round(($frac - $year) * 12 + 0.5)
  $cape = & $num $p[12]
  if ($cape -eq $null) { continue }                       # CAPE needs ten years of earnings; starts 1881
  $r10 = & $num $p[19]
  [void]$pts.Add([ordered]@{
    d = ("{0}-{1:D2}" -f [int]$year, $month)
    cape = [math]::Round($cape, 2)
    price = [math]::Round((& $num $p[1]), 2)
    real = [math]::Round((& $num $p[7]), 0)
    gs10 = [math]::Round((& $num $p[6]), 2)
    ecy = $(if ((& $num $p[16]) -ne $null) { [math]::Round((& $num $p[16]) * 100, 2) } else { $null })
    r10 = $(if ($r10 -ne $null) { [math]::Round($r10 * 100, 2) } else { $null })
  })
}
if ($pts.Count -lt 1500) { throw "CAPE parsed only $($pts.Count) rows" }
$last = $pts[-1]
Write-Output ("CAPE: {0} months, {1} .. {2} = {3} (real S&P {4}, excess CAPE yield {5}%)" -f $pts.Count, $pts[0].d, $last.d, $last.cape, $last.real, $last.ecy)
$obj = [ordered]@{ monthly = $pts; asOfMonth = $last.d; partialMonth = $true; source = $url; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "cape_processed.json" 4

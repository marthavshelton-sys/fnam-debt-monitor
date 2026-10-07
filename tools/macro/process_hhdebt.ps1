# Household (consumer) debt by type, from three Federal Reserve sources and BEA:
#   New York Fed Consumer Credit Panel / Equifax - Quarterly Report on Household Debt and
#     Credit: balances by loan type (mortgage, home-equity revolving, auto, credit card,
#     student, other) since 2003Q1 and the share of balances 90+ days delinquent by type
#     (the workbook's delinquency-status split is read and checked, not kept). The data workbook is named for its
#     quarter (HHD_C_Report_2026Q2.xlsx); the newest that exists is read by hhdc_xlsx.py.
#   Federal Reserve Z.1 Financial Accounts, via FRED: household liabilities since 1952 -
#     total debt, home mortgages, consumer credit (the rest is other loans), quarterly.
#   Federal Reserve G.19 Consumer Credit, via FRED: total, revolving and nonrevolving
#     consumer credit outstanding, monthly, seasonally adjusted, since 1968.
#   Federal Reserve household debt service ratio (debt payments as % of disposable
#     income), via FRED; BEA disposable personal income (monthly, SAAR) via FRED for the
#     debt-to-income ratios.
. "$PSScriptRoot\common.ps1"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

# ---- New York Fed: the newest quarter's workbook ----
$now = Get-Date
$cands = New-Object System.Collections.ArrayList
$y = $now.Year; $q = [math]::Floor(($now.Month - 1) / 3) + 1   # the current quarter (not yet reported) first
for ($i = 0; $i -lt 6; $i++) { [void]$cands.Add(("{0}Q{1}" -f $y, $q)); $q--; if ($q -lt 1) { $q = 4; $y-- } }
$xlsx = Join-Path $scratch "hhdc.xlsx"; $json = Join-Path $scratch "hhdc.json"
$report = $null; $url = $null
foreach ($c in $cands) {
  $u = "https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/xls/HHD_C_Report_$c.xlsx"
  try {
    Invoke-WebRequest -Uri $u -OutFile $xlsx -UseBasicParsing -UserAgent $ua -TimeoutSec 120
    $head = [System.IO.File]::ReadAllBytes($xlsx)[0..1]
    if ($head[0] -eq 0x50 -and $head[1] -eq 0x4B) { $report = $c; $url = $u; break }   # a zip (xlsx), not an error page
    Write-Host "  $c : not a workbook"
  } catch { Write-Host ("  {0}: {1}" -f $c, $_.Exception.Message.Split([char]10)[0]) }
}
if (-not $report) { throw "no Household Debt and Credit workbook found for $($cands -join ', ')" }
$fileDate = Get-RemoteFileDate $url
Write-Output ("NY Fed report {0}: {1} ({2:N0} bytes, dated {3})" -f $report, $url, (Get-Item $xlsx).Length, $(if ($fileDate) { $fileDate } else { "unknown" }))
& (Get-Python) (Join-Path $PSScriptRoot "hhdc_xlsx.py") $xlsx $json | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $json)) { throw "hhdc_xlsx.py failed for $report" }
$ny = Get-Content $json -Raw -Encoding UTF8 | ConvertFrom-Json
if ($ny.asOf -ne ($report -replace '^(\d{4})Q(\d)$', '$1-Q$2')) { throw "workbook $report ends at $($ny.asOf)" }

# ---- Z.1 household liabilities (quarterly, $ millions -> $ billions) ----
$z = [ordered]@{
  total    = Get-FredChecked @("CMDEBT")    '^Households and Nonprofit Organizations; Debt Securities and Loans; Liability, Level' "1952-01-01"
  mortgage = Get-FredChecked @("HHMSDODNS") '^Households and Nonprofit Organizations; One-to-Four-Family Residential Mortgages; Liability, Level' "1952-01-01"
  consumer = Get-FredChecked @("HCCSDODNS") '^Households and Nonprofit Organizations; Consumer Credit; Liability, Level' "1952-01-01"
}
$dpiM = Get-FredChecked @("DSPI") '^Disposable Personal Income$' "1952-01-01"   # monthly, $ billions SAAR
$dsr = Get-FredChecked @("TDSP") '^Household Debt Service Payments as a Percent of Disposable Personal Income$' "1980-01-01"
$dpiQ = @{}; $acc = @{}
foreach ($p in $dpiM.points) { $k = ToQuarter $p.d; if (-not $acc.ContainsKey($k)) { $acc[$k] = New-Object System.Collections.ArrayList }; [void]$acc[$k].Add($p.v) }
foreach ($k in $acc.Keys) { if ($acc[$k].Count -eq 3) { $dpiQ[$k] = [math]::Round(($acc[$k] | Measure-Object -Average).Average, 1) } }   # only complete quarters
$zb = @{}; foreach ($k in $z.Keys) { $m = @{}; foreach ($p in $z[$k].points) { $m[(ToQuarter $p.d)] = [math]::Round($p.v / 1000, 1) }; $zb[$k] = $m }
$zrows = New-Object System.Collections.ArrayList
foreach ($qk in @($zb["total"].Keys | Sort-Object)) {
  $row = [ordered]@{ d = $qk; total = $zb["total"][$qk]
    mortgage = $(if ($zb["mortgage"].ContainsKey($qk)) { $zb["mortgage"][$qk] } else { $null })
    consumer = $(if ($zb["consumer"].ContainsKey($qk)) { $zb["consumer"][$qk] } else { $null })
    dpi = $(if ($dpiQ.ContainsKey($qk)) { $dpiQ[$qk] } else { $null }) }
  if ($null -ne $row.mortgage -and $null -ne $row.consumer) { $row.other = [math]::Round($row.total - $row.mortgage - $row.consumer, 1) } else { $row.other = $null }
  [void]$zrows.Add($row)
}
$bad = @($zrows | Where-Object { $null -ne $_.other -and $_.other -lt 0 })
if ($bad.Count) { throw "Z.1 household: mortgages + consumer credit exceed total debt in $($bad.Count) quarters" }
$zl = $zrows[$zrows.Count - 1]
Write-Output ("Z.1 households: {0} quarters to {1}; total {2}B, mortgages {3}B, consumer credit {4}B, other {5}B; DPI {6}B" -f $zrows.Count, $zl.d, $zl.total, $zl.mortgage, $zl.consumer, $zl.other, $zl.dpi)

# ---- G.19 consumer credit (monthly, $ billions) ----
$g = [ordered]@{
  total = Get-FredChecked @("TOTALSL")  '^Total Consumer Credit Owned and Securitized' "1968-01-01"
  rev   = Get-FredChecked @("REVOLSL")  '^Revolving Consumer Credit Owned and Securitized' "1968-01-01"
  nonrev = Get-FredChecked @("NONREVSL") '^Nonrevolving Consumer Credit Owned and Securitized' "1968-01-01"
}
$gb = @{}; foreach ($k in $g.Keys) { $m = @{}; foreach ($p in $g[$k].points) { $m[(ToMonth $p.d)] = [math]::Round($p.v / 1000, 1) }; $gb[$k] = $m }
$grows = New-Object System.Collections.ArrayList
foreach ($mk in @($gb["total"].Keys | Sort-Object)) {
  $row = [ordered]@{ d = $mk; total = $gb["total"][$mk]; rev = $(if ($gb["rev"].ContainsKey($mk)) { $gb["rev"][$mk] } else { $null }); nonrev = $(if ($gb["nonrev"].ContainsKey($mk)) { $gb["nonrev"][$mk] } else { $null }) }
  [void]$grows.Add($row)
}
$bad = @($grows | Where-Object { $null -ne $_.rev -and $null -ne $_.nonrev -and [math]::Abs($_.total - ($_.rev + $_.nonrev)) -gt 0.25 })
if ($bad.Count) { throw "G.19: revolving + nonrevolving differ from the total in $($bad.Count) months (first $($bad[0].d))" }
$gl = $grows[$grows.Count - 1]
Write-Output ("G.19: {0} months to {1}; total {2}B = revolving {3}B + nonrevolving {4}B" -f $grows.Count, $gl.d, $gl.total, $gl.rev, $gl.nonrev)
$dsrRows = @($dsr.points | ForEach-Object { [ordered]@{ d = (ToQuarter $_.d); v = [math]::Round($_.v, 2) } })
Write-Output ("debt service ratio: {0} quarters to {1} = {2}%" -f $dsrRows.Count, $dsrRows[-1].d, $dsrRows[-1].v)

$obj = [ordered]@{
  nyfed = [ordered]@{ asOf = $ny.asOf; report = $report; file = $url; fileDate = $fileDate; balances = $ny.balances; delinq90 = $ny.delinq90 }
  z1 = [ordered]@{ quarterly = $zrows; ids = [ordered]@{ total = $z.total.id; mortgage = $z.mortgage.id; consumer = $z.consumer.id; dpi = $dpiM.id } }
  g19 = [ordered]@{ monthly = $grows; asOf = $gl.d; ids = [ordered]@{ total = $g.total.id; rev = $g.rev.id; nonrev = $g.nonrev.id } }
  dsr = [ordered]@{ quarterly = $dsrRows; id = $dsr.id }
  fetchedAt = (Get-Date -Format "yyyy-MM-dd")
}
Save-Json $obj "hhdebt_processed.json" 6

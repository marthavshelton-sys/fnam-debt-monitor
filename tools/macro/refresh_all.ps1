# Runs every processor, then builds the page. This is what the GitHub Actions
# workflow calls; locally it does the same thing against $env:TEMP\claude.
#
#   .\refresh_all.ps1 -OutFile ..\..\site\macro\index.html
#
# Each processor is independent: one source failing (a site outage, a schema
# change) is logged and the build proceeds with that section's last committed
# data, so a single bad feed can't take the whole page down. Exit code is
# non-zero only if the build itself fails.
param([string]$OutFile = "")
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$data = if ($env:MACRO_DATA_DIR) { $env:MACRO_DATA_DIR } else { "$env:TEMP\claude" }
$failed = @()
foreach ($step in @("process_calendar.ps1","process_core.ps1","process_umich.ps1","process_ppi.ps1","process_retail.ps1","process_fincond.ps1","process_supply.ps1","process_fiscal.ps1")) {
  Write-Output "=============== $step"
  try { & "$here\$step" } catch { Write-Output "FAILED $step : $($_.Exception.Message)"; $failed += $step }
}
if ($failed.Count) { Write-Host "::warning::processors that fell back to committed data: $($failed -join ', ')" }

# ---- staleness checks on the inputs that still need a human ----
# Surfaced as GitHub Actions warning annotations so they show in the run list
# without failing the build. Each one names the file and the fix.
Write-Output "=============== staleness"
function MonthsBetween([string]$ym, [datetime]$now) { $y = [int]$ym.Substring(0,4); $m = [int]$ym.Substring(5,2); return ($now.Year - $y) * 12 + ($now.Month - $m) }
$now = Get-Date
try {
  $w = Get-Content (Join-Path $data "bls_weights.json") -Raw | ConvertFrom-Json
  $age = MonthsBetween $w.asOfMonth $now
  if ($age -gt 14) { Write-Host "::warning::CPI relative-importance weights are from $($w.asOfMonth) ($age months old). BLS posts new weights each February at bls.gov/cpi/tables/relative-importance - update tools/macro/data/bls_weights.json" } else { Write-Output "CPI weights: $($w.asOfMonth) ($age months old) OK" }
  $pw = Get-Content (Join-Path $data "ppi_weights.json") -Raw | ConvertFrom-Json
  $age = MonthsBetween $pw.asOfMonth $now
  if ($age -gt 14) { Write-Host "::warning::PPI relative-importance weights are from $($pw.asOfMonth) ($age months old). BLS posts the new table around June at bls.gov/ppi/tables - replace tools/macro/data/ppi-fdgrouprel.xlsx" } else { Write-Output "PPI weights: $($pw.asOfMonth) ($age months old) OK" }
  $ls = Get-Content (Join-Path $data "labor_static.json") -Raw | ConvertFrom-Json
  $lb = Get-Content (Join-Path $data "labor_processed.json") -Raw | ConvertFrom-Json
  $payrollMonth = $lb.CES0000000001.points[-1].d
  $lag = MonthsBetween $ls.challenger.asOfMonth ([datetime]::ParseExact($payrollMonth + "-01", "yyyy-MM-dd", $null))
  if ($lag -ge 1) { Write-Host "::warning::Challenger job-cut data is for $($ls.challenger.asOfMonth) while payrolls are at $payrollMonth. Challenger publishes its report in the first week of each month - update the challenger block in tools/macro/data/labor_static.json" } else { Write-Output "Challenger: $($ls.challenger.asOfMonth) matches payrolls $payrollMonth OK" }
} catch { Write-Host "::warning::staleness check could not run: $($_.Exception.Message)" }

Write-Output "=============== build"
if ($OutFile) { & "$here\build.ps1" -Target web -OutFile $OutFile } else { & "$here\build.ps1" -Target art }

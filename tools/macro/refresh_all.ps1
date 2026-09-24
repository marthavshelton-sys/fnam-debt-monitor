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
$warnings = New-Object System.Collections.ArrayList
# Warnings are annotated for the Actions UI and also collected for health.json,
# which the email alert task reads.
function Warn([string]$msg) { Write-Host "::warning::$msg"; [void]$script:warnings.Add($msg) }
foreach ($step in @("process_calendar.ps1","process_core.ps1","process_challenger.ps1","process_umich.ps1","process_ppi.ps1","process_retail.ps1","process_fincond.ps1","process_supply.ps1","process_fiscal.ps1","process_spr.ps1","process_cape.ps1","process_weights.ps1")) {
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
  if ($age -gt 14) { Warn "CPI relative-importance weights are from $($w.asOfMonth) ($age months old). BLS posts new weights each February at bls.gov/cpi/tables/relative-importance - update tools/macro/data/bls_weights.json" } else { Write-Output "CPI weights: $($w.asOfMonth) ($age months old) OK" }
  $pw = Get-Content (Join-Path $data "ppi_weights.json") -Raw | ConvertFrom-Json
  $age = MonthsBetween $pw.asOfMonth $now
  if ($age -gt 14) { Warn "PPI relative-importance weights are from $($pw.asOfMonth) ($age months old). BLS posts the new table around June at bls.gov/ppi/tables - replace tools/macro/data/ppi-fdgrouprel.xlsx" } else { Write-Output "PPI weights: $($pw.asOfMonth) ($age months old) OK" }
  $ls = Get-Content (Join-Path $data "labor_static.json") -Raw | ConvertFrom-Json
  $lb = Get-Content (Join-Path $data "labor_processed.json") -Raw | ConvertFrom-Json
  $payrollMonth = $lb.CES0000000001.points[-1].d
  $lag = MonthsBetween $ls.challenger.asOfMonth ([datetime]::ParseExact($payrollMonth + "-01", "yyyy-MM-dd", $null))
  # Challenger's report can trail the jobs report by a few days; only a lag that
  # persists into the second week of the month (or two months) is a problem.
  if ($lag -ge 2 -or ($lag -ge 1 -and $now.Day -ge 12)) { Warn "Challenger job-cut data is for $($ls.challenger.asOfMonth) while payrolls are at $payrollMonth. process_challenger.ps1 should have picked up the new report - check its output" } else { Write-Output "Challenger: $($ls.challenger.asOfMonth) vs payrolls $payrollMonth OK" }
} catch { Warn "staleness check could not run: $($_.Exception.Message)" }

# ---- health.json: what the email alert task reads to judge pipeline health ----
# Consecutive-failure counts carry over from the previous run's file, so a
# source that is down for a day shows up as a streak, not three isolated notes.
$healthPath = Join-Path $data "health.json"
$prevConsec = @{}
if (Test-Path $healthPath) {
  try { $prev = Get-Content $healthPath -Raw | ConvertFrom-Json; foreach ($p in $prev.consecutive.PSObject.Properties) { $prevConsec[$p.Name] = [int]$p.Value } } catch {}
}
$consec = [ordered]@{}
foreach ($f in $failed) { $consec[$f] = $(if ($prevConsec.ContainsKey($f)) { $prevConsec[$f] + 1 } else { 1 }) }
$prevWarnStreak = 0; try { if ($prev -and $prev.warnStreak) { $prevWarnStreak = [int]$prev.warnStreak } } catch {}
$warnStreak = if ($warnings.Count) { $prevWarnStreak + 1 } else { 0 }
$health = [ordered]@{ runAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"); failed = @($failed); consecutive = $consec; warnings = @($warnings); warnStreak = $warnStreak }
($health | ConvertTo-Json -Depth 4) | Set-Content $healthPath -Encoding utf8
Write-Output ("health.json: {0} failed, {1} warnings (streak {2})" -f $failed.Count, $warnings.Count, $warnStreak)

# Nobody watches the Actions tab, so a source that has been down for three runs
# in a row (a day) - or a staleness warning that has persisted that long - is
# reported to the workflow, which fails the run after committing so GitHub
# emails the repository owner. One bad run stays silent: feeds hiccup.
$stuck = @($consec.Keys | Where-Object { $consec[$_] -ge 3 })
if ($warnStreak -ge 3) { $stuck += "staleness: " + ($warnings -join " / ") }
if ($stuck.Count) { Write-Host "::error::Stuck for three runs or more: $($stuck -join '; ')" }
if ($env:GITHUB_OUTPUT) { "stuck=$(($stuck -join '; ') -replace '[\r\n]', ' ')" | Out-File $env:GITHUB_OUTPUT -Append -Encoding utf8 }

Write-Output "=============== build"
if ($OutFile) { & "$here\build.ps1" -Target web -OutFile $OutFile } else { & "$here\build.ps1" -Target art }

# ---- status.json beside the page: when the pipeline last checked its sources ----
# The page itself is rewritten only when data changes (build.ps1 hashes the
# inputs), so the "checked" dates in its headers are read from this small file,
# which every run writes and commits: the run time and the processors that fell
# back to last-good data on this run.
if ($OutFile) {
  $status = [ordered]@{ runAt = $health.runAt; failed = @($failed) }
  [System.IO.File]::WriteAllText((Join-Path (Split-Path $OutFile) "status.json"), ($status | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
}

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
$failed = @()
foreach ($step in @("process_core.ps1","process_umich.ps1","process_ppi.ps1","process_retail.ps1","process_fincond.ps1","process_supply.ps1","process_fiscal.ps1")) {
  Write-Output "=============== $step"
  try { & "$here\$step" } catch { Write-Output "FAILED $step : $($_.Exception.Message)"; $failed += $step }
}
Write-Output "=============== build"
if ($OutFile) { & "$here\build.ps1" -Target web -OutFile $OutFile } else { & "$here\build.ps1" -Target art }
if ($failed.Count) { Write-Output ("processors that fell back to committed data: {0}" -f ($failed -join ", ")) }

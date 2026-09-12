# Release calendar from FRED, which republishes each agency's official schedule
# including future dates. Replaces the hand-typed date tables that used to live
# in the page (one of which turned out to be wrong).
#
# For each release: the most recent date that actually published data, and the
# first scheduled date after today. The page pairs "next" with the month after
# its latest data point; if a build ever lands in the minutes between a release
# and FRED's update, the next scheduled run corrects it.
. "$PSScriptRoot\common.ps1"
$key = Get-ApiKey "FRED_API_KEY"
$today = (Get-Date).ToString("yyyy-MM-dd")
$horizon = (Get-Date).AddMonths(15).ToString("yyyy-MM-dd")

$releases = [ordered]@{
  cpi    = 10   # Consumer Price Index
  ppi    = 46   # Producer Price Index
  jobs   = 50   # Employment Situation
  jolts  = 192  # Job Openings and Labor Turnover Survey
  pce    = 54   # Personal Income and Outlays
  gdp    = 53   # Gross Domestic Product
  retail = 9    # Advance Monthly Sales for Retail and Food Services
}

$cal = [ordered]@{}
foreach ($k in $releases.Keys) {
  $id = $releases[$k]
  $base = "https://api.stlouisfed.org/fred/release/dates?release_id=$id&api_key=$key&file_type=json"
  $past = Invoke-Retry { Invoke-RestMethod "$base&sort_order=desc&limit=3" -TimeoutSec 60 }
  $future = Invoke-Retry { Invoke-RestMethod "$base&include_release_dates_with_no_data=true&realtime_start=$today&realtime_end=$horizon&sort_order=asc&limit=12" -TimeoutSec 60 }
  $last = ($past.release_dates | ForEach-Object { $_.date } | Where-Object { $_ -le $today } | Sort-Object -Descending | Select-Object -First 1)
  $upcoming = @($future.release_dates | ForEach-Object { $_.date } | Where-Object { $_ -gt $today } | Sort-Object -Unique)
  $cal[$k] = [ordered]@{ last = $last; next = $(if ($upcoming.Count) { $upcoming[0] } else { $null }); upcoming = $upcoming }
  "{0,-7} last {1}  next {2}  (+{3} more scheduled)" -f $k, $last, $cal[$k].next, [Math]::Max(0, $upcoming.Count - 1)
  Start-Sleep -Milliseconds 150
}
$missing = @($cal.Keys | Where-Object { -not $cal[$_].next })
if ($missing.Count) { Write-Host "::warning::No upcoming release date from FRED for: $($missing -join ', '); the page will show an estimate" }
Save-Json ([ordered]@{ releases = $cal; fetchedAt = $today }) "calendar.json" 4

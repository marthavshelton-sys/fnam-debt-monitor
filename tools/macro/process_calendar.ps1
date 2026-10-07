# Release calendar from FRED, which republishes each agency's official schedule
# including future dates. Replaces the hand-typed date tables that used to live
# in the page (one of which turned out to be wrong).
#
# For each release: the most recent dates that actually published data (newest
# first; the page counts the ones after a quarter's end to name the GDP estimate
# it shows - advance, second or third), and the first scheduled date after today.
# The page pairs "next" with the month after its latest data point; if a build
# ever lands in the minutes between a release and FRED's update, the next
# scheduled run corrects it.
. "$PSScriptRoot\common.ps1"
$key = Get-ApiKey "FRED_API_KEY"
$today = (Get-Date).ToString("yyyy-MM-dd")
$horizon = (Get-Date).AddMonths(15).ToString("yyyy-MM-dd")
# The look-back for past releases is explicit (13 months, room for the six most
# recent of any monthly or quarterly release), so it never rests on FRED's default.
$since = (Get-Date).AddMonths(-13).ToString("yyyy-MM-dd")

$releases = [ordered]@{
  cpi    = 10   # Consumer Price Index
  ppi    = 46   # Producer Price Index
  jobs   = 50   # Employment Situation
  jolts  = 192  # Job Openings and Labor Turnover Survey
  pce    = 54   # Personal Income and Outlays
  gdp    = 53   # Gross Domestic Product
  retail = 9    # Advance Monthly Sales for Retail and Food Services
  # Weekly releases: their calendars carry the holiday shifts (the NFCI moves to
  # Thursday in a week with a Monday holiday, the mortgage survey to Wednesday in
  # Thanksgiving week), which a fixed weekday cannot.
  nfci     = 221  # Chicago Fed National Financial Conditions Index
  mortgage = 190  # Primary Mortgage Market Survey (Freddie Mac)
  # Quarterly and monthly releases behind the productivity, profits, debt and bank sections.
  productivity = 47   # BLS Productivity and Costs
  z1       = 52   # Federal Reserve Z.1 Financial Accounts of the United States
  g19      = 14   # Federal Reserve G.19 Consumer Credit (monthly)
  h8       = 22   # Federal Reserve H.8 Assets and Liabilities of Commercial Banks (weekly)
}
# Each id must still be the release it is meant to be: FRED's name for it is checked against
# these patterns, and a release whose name no longer matches is left out (the page then shows
# its "expected" wording) rather than carrying another release's dates.
$releaseNames = @{
  cpi = 'Consumer Price Index'; ppi = 'Producer Price Index'; jobs = 'Employment Situation'; jolts = 'Job Openings and Labor Turnover'
  pce = 'Personal Income and Outlays'; gdp = 'Gross Domestic Product'; retail = 'Advance Monthly Sales for Retail'
  nfci = 'National Financial Conditions Index'; mortgage = 'Primary Mortgage Market Survey'
  productivity = 'Productivity and Costs'; z1 = 'Z\.1'; g19 = 'G\.19'; h8 = 'H\.8'
}

# The weekly releases' "next" is worked out on the page from the data it shows, so
# their lists must not lose a date scheduled for today: until FRED lists it as
# published it stays in "upcoming". Without this, the 04:00 UTC run on Thursday
# 01-Oct-2026 dropped that day's mortgage survey from both lists and the page named
# 08-Oct as the next reading. The monthly releases keep the rule their lines use.
$weeklyKeys = @("nfci", "mortgage", "h8")

$cal = [ordered]@{}
foreach ($k in $releases.Keys) {
  $id = $releases[$k]
  $base = "https://api.stlouisfed.org/fred/release/dates?release_id=$id&api_key=$key&file_type=json"
  try {
    $rel = Invoke-Retry { Invoke-RestMethod "https://api.stlouisfed.org/fred/release?release_id=$id&api_key=$key&file_type=json" -TimeoutSec 60 }
    $name = [string]$rel.releases[0].name
    if ($name -notmatch $releaseNames[$k]) { Write-Host "::warning::FRED release $id is named '$name', not /$($releaseNames[$k])/; $k left out of the calendar"; continue }
  } catch { Write-Host "::warning::could not read the name of FRED release $id for $k ($($_.Exception.Message.Split([char]10)[0])); $k left out of the calendar"; continue }
  Start-Sleep -Milliseconds 150
  $past = Invoke-Retry { Invoke-RestMethod "$base&realtime_start=$since&sort_order=desc&limit=6" -TimeoutSec 60 }
  $future = Invoke-Retry { Invoke-RestMethod "$base&include_release_dates_with_no_data=true&realtime_start=$today&realtime_end=$horizon&sort_order=asc&limit=12" -TimeoutSec 60 }
  $recent = @($past.release_dates | ForEach-Object { $_.date } | Where-Object { $_ -le $today } | Sort-Object -Unique -Descending)
  $last = $(if ($recent.Count) { $recent[0] } else { $null })
  $upcoming = @($future.release_dates | ForEach-Object { $_.date } | Where-Object { $_ -gt $today -or ($weeklyKeys -contains $k -and $_ -eq $today -and $recent -notcontains $today) } | Sort-Object -Unique)
  $cal[$k] = [ordered]@{ last = $last; next = $(if ($upcoming.Count) { $upcoming[0] } else { $null }); upcoming = $upcoming; recent = $recent }
  "{0,-8} last {1}  next {2}  (+{3} more scheduled)" -f $k, $last, $cal[$k].next, [Math]::Max(0, $upcoming.Count - 1)
  Start-Sleep -Milliseconds 150
}
$missing = @($cal.Keys | Where-Object { -not $cal[$_].next })
if ($missing.Count) { Write-Host "::warning::No upcoming release date from FRED for: $($missing -join ', '); the page will show an estimate" }
Save-Json ([ordered]@{ releases = $cal; fetchedAt = $today }) "calendar.json" 4

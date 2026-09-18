# Strategic Petroleum Reserve.
#   EIA   weekly (1982 on) and monthly (1977 on) SPR crude stocks, from the
#         keyless history workbooks behind EIA's series pages.
#   DOE   authorized capacity and cavern count per storage site, read from the
#         SPR storage-sites page; and the daily inventory report, which DOE
#         publishes only as an image (sweet/sour split, monthly movements) -
#         saved alongside the data so the page can show it as published.
# DOE does not publish inventory per site as data, so "by site" on the page is
# capacity per site against the reserve's total holdings.
. "$PSScriptRoot\common.ps1"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
$prevFile = Join-Path $data "spr_processed.json"
$prev = if (Test-Path $prevFile) { try { Get-Content $prevFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $null } } else { $null }

# ---- EIA stocks ----
function Get-EiaHistory([string]$id, [string]$freq) {
  $xls = Join-Path $data "$id$freq.xls"; $csv = Join-Path $data "$id$freq.csv"
  Invoke-Retry { Invoke-WebRequest -Uri "https://www.eia.gov/dnav/pet/hist_xls/$id$freq.xls" -OutFile $xls -UserAgent $ua -TimeoutSec 90 }
  Convert-XlsSheetToCsv $xls "Data 1" $csv @(1)
  $pts = New-Object System.Collections.ArrayList
  foreach ($line in (Get-Content $csv)) {
    $p = $line -split ','
    if ($p.Count -ge 2 -and $p[0] -match '^\d{4}-\d{2}-\d{2}$' -and $p[1] -match '^-?[\d.]+$') { [void]$pts.Add([ordered]@{ d = $p[0]; v = [int][double]$p[1] }) }
  }
  if ($pts.Count -lt 100) { throw "EIA $id$freq parsed only $($pts.Count) rows" }
  return $pts
}
$weekly = Get-EiaHistory "WCSSTUS1" "w"
$monthlyRaw = Get-EiaHistory "MCSSTUS1" "m"
$monthly = New-Object System.Collections.ArrayList
foreach ($p in $monthlyRaw) { [void]$monthly.Add([ordered]@{ d = $p.d.Substring(0,7); v = $p.v }) }
Write-Output ("SPR weekly : {0} pts  {1} = {2:N0} thousand bbl" -f $weekly.Count, $weekly[-1].d, $weekly[-1].v)
Write-Output ("SPR monthly: {0} pts  {1} = {2:N0} thousand bbl" -f $monthly.Count, $monthly[-1].d, $monthly[-1].v)

# ---- DOE: capacity per site ----
$capacity = $null
try {
  $r = Invoke-Retry { Invoke-WebRequest -Uri "https://www.energy.gov/ceser/spr-storage-sites" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
  $txt = [regex]::Replace($r.Content, '<script[\s\S]*?</script>|<style[\s\S]*?</style>', '')
  $txt = [regex]::Replace($txt, '<[^>]+>', ' ')
  $txt = [System.Net.WebUtility]::HtmlDecode($txt) -replace '\s+', ' '
  $words = @{ one=1; two=2; three=3; four=4; five=5; six=6; seven=7; eight=8; nine=9; ten=10; eleven=11; twelve=12; thirteen=13; fourteen=14; fifteen=15; sixteen=16; seventeen=17; eighteen=18; nineteen=19; twenty=20 }
  $meta = @{ "Bryan Mound" = @("bryanMound","TX","Freeport, Texas"); "Big Hill" = @("bigHill","TX","Winnie, Texas"); "West Hackberry" = @("westHackberry","LA","Hackberry, Louisiana"); "Bayou Choctaw" = @("bayouChoctaw","LA","Iberville Parish, Louisiana") }
  $sites = New-Object System.Collections.ArrayList
  foreach ($m in [regex]::Matches($txt, '(Bayou Choctaw|Big Hill|Bryan Mound|West Hackberry) currently has (\w+) storage caverns, an authorized storage capacity of ([\d.]+) million barrels')) {
    $n = $m.Groups[2].Value.ToLower(); $caverns = if ($words.ContainsKey($n)) { $words[$n] } else { [int]$n }
    $info = $meta[$m.Groups[1].Value]
    [void]$sites.Add([ordered]@{ id = $info[0]; name = $m.Groups[1].Value; state = $info[1]; location = $info[2]; caverns = $caverns; cap = [double]$m.Groups[3].Value })
  }
  $tot = [regex]::Match($txt, 'combined authorized storage capacity of ([\d.]+) million barrels')
  if ($sites.Count -ne 4) { throw "expected 4 sites, parsed $($sites.Count)" }
  $capacity = [ordered]@{ sites = $sites; total = [double]$tot.Groups[1].Value; source = "https://www.energy.gov/ceser/spr-storage-sites"; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
  Write-Output ("DOE capacity: " + (($sites | ForEach-Object { "$($_.name) $($_.cap)" }) -join ", ") + " | total $($capacity.total)")
} catch {
  Write-Output "DOE capacity page failed: $($_.Exception.Message)"
  if ($prev -and $prev.capacity) { $capacity = $prev.capacity; Write-Output "  keeping previous capacity data" } else { throw }
}

# ---- DOE: daily inventory report (image) ----
$image = $null
try {
  $imgPath = Join-Path $data "spr-inventory.jpg"
  $r = Invoke-Retry { Invoke-WebRequest -Uri "https://www.spr.doe.gov/dir/images/img2.jpg" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
  if ($r.Content.Length -lt 20000) { throw "image too small ($($r.Content.Length) bytes)" }
  [System.IO.File]::WriteAllBytes($imgPath, $r.Content)
  $lm = $r.Headers["Last-Modified"]
  $asOf = if ($lm) { ([datetime]$lm).ToUniversalTime().ToString("yyyy-MM-dd") } else { (Get-Date -Format "yyyy-MM-dd") }
  $image = [ordered]@{ file = "spr-inventory.jpg"; source = "https://www.spr.doe.gov/dir/dir.html"; published = $asOf; bytes = $r.Content.Length; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
  Write-Output "DOE inventory image: $($r.Content.Length) bytes, published $asOf"
} catch {
  Write-Output "DOE inventory image failed: $($_.Exception.Message)"
  if ($prev -and $prev.image) { $image = $prev.image; Write-Output "  keeping previous image record" }
}

$obj = [ordered]@{ weekly = $weekly; monthly = $monthly; capacity = $capacity; image = $image; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "spr_processed.json" 6

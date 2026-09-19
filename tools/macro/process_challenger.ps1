# Challenger, Gray & Christmas job-cut report -> the challenger block of
# labor_static.json. The report is a monthly PDF linked from the newest post in
# the firm's "job cuts report" category; its tables are read positionally by
# challenger_pdf.py (Python + pdfplumber), which also checks every figure
# against the report's own totals and refuses to hand back numbers that do not
# reconcile. Runs on every refresh; most runs find the current report already
# applied and stop after one page fetch.
. "$PSScriptRoot\common.ps1"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
$lsPath = Join-Path $data "labor_static.json"
$ls = Get-Content $lsPath -Raw -Encoding UTF8 | ConvertFrom-Json
$C = $ls.challenger

# ---- newest report post ----
$cat = Invoke-Retry { Invoke-WebRequest -Uri "https://www.challengergray.com/blog/category/job-cuts-report/" -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
$post = [regex]::Match($cat.Content, 'href="(https://www\.challengergray\.com/blog/challenger-report-[^"]+)"').Groups[1].Value
if (-not $post) { throw "no report post link found on the category page" }
$page = Invoke-Retry { Invoke-WebRequest -Uri $post -UserAgent $ua -UseBasicParsing -TimeoutSec 60 }
$pdfUrl = [regex]::Match($page.Content, 'href="(https://www\.challengergray\.com/wp-content/uploads/[^"]+\.pdf)"').Groups[1].Value
if (-not $pdfUrl) { throw "no PDF link on $post" }
$published = [regex]::Match($page.Content, 'property="article:published_time"[^>]+content="([^"]+)"').Groups[1].Value
Write-Output "newest report: $post"
if ($C.reportUrl -eq $pdfUrl) { Write-Output "Challenger: $($C.asOfMonth) already applied ($pdfUrl); nothing to do"; return }

# ---- read the PDF ----
$pdf = Join-Path $scratch "challenger_latest.pdf"; $out = Join-Path $scratch "challenger_latest.json"
Invoke-Retry { Invoke-WebRequest -Uri $pdfUrl -OutFile $pdf -UserAgent $ua -TimeoutSec 120 }
$py = Get-Python
& $py "$PSScriptRoot\challenger_pdf.py" $pdf $out
if ($LASTEXITCODE -ne 0) { throw "challenger_pdf.py failed (exit $LASTEXITCODE): the report's tables did not parse or did not reconcile - see the lines above" }
$r = Get-Content $out -Raw -Encoding UTF8 | ConvertFrom-Json
if ($r.asOfMonth -le $C.asOfMonth) { Write-Output "Challenger: report is for $($r.asOfMonth), data already at $($C.asOfMonth); nothing to do"; return }
$target = $r.asOfMonth; $year = $target.Substring(0, 4); $monthN = [int]$target.Substring(5, 2)

# ---- merge into the challenger block (a growing history; nothing is re-keyed) ----
function SetKey($obj, [string]$key, $val) { if ($obj.PSObject.Properties[$key]) { $obj.$key = $val } else { $obj | Add-Member -NotePropertyName $key -NotePropertyValue $val } }
SetKey $C "asOfMonth" $target
SetKey $C "releasedOn" $(if ($r.releasedOn) { $r.releasedOn } elseif ($published) { $published.Substring(0, 10) } else { (Get-Date -Format "yyyy-MM-dd") })
SetKey $C "reportUrl" $pdfUrl
if (-not ($C.monthly | Where-Object { $_.d -eq $target })) { $C.monthly = @($C.monthly) + @([PSCustomObject]@{ d = $target; v = [int]$r.headline }) }
$C.industry = @($r.industry.PSObject.Properties | Where-Object { [int]$_.Value -gt 0 } | Sort-Object { -[int]$_.Value } | ForEach-Object { [PSCustomObject]@{ name = $_.Name; v = [int]$_.Value } })
SetKey $C "hiringThisYear" @($r.hiringThisYear | ForEach-Object { [int]$_ })
SetKey $C "hiringLastYear" @($r.hiringLastYear | ForEach-Object { [int]$_ })
SetKey $C "ytdHiring" ([int]$r.ytdHiring); SetKey $C "ytdHiringLastYear" ([int]$r.ytdHiringLastYear)
SetKey $C "ytdCuts" ([int]$r.ytdCuts); SetKey $C "ytdCutsLastYear" ([int]$r.ytdCutsLastYear)

$codeByName = @{}; foreach ($s in $ls.states) { $codeByName[$s.name.ToLower()] = $s.code }
$codeByName["dist. of columbia"] = "DC"; $codeByName["district of columbia"] = "DC"; $codeByName["washington dc"] = "DC"; $codeByName["washington, d.c."] = "DC"
if (-not $C.PSObject.Properties["stateCuts"]) { SetKey $C "stateCuts" ([PSCustomObject]@{}) }
if (-not $C.PSObject.Properties["stateYearTotals"]) { SetKey $C "stateYearTotals" ([PSCustomObject]@{}) }
$matched = 0; $unmatched = @(); $yearTotals = [ordered]@{}
foreach ($p in $r.states.PSObject.Properties) {
  $code = $codeByName[$p.Name.ToLower()]
  if (-not $code) { $unmatched += $p.Name; continue }
  $matched++
  if (-not $C.stateCuts.PSObject.Properties[$code]) { SetKey $C.stateCuts $code ([PSCustomObject]@{ m = [PSCustomObject]@{}; ytd = [PSCustomObject]@{}; priorYtd = [PSCustomObject]@{} }) }
  $s = $C.stateCuts.$code
  SetKey $s.m $target ([int]$p.Value.m)
  if ($null -ne $p.Value.ytd) { SetKey $s.ytd $target ([int]$p.Value.ytd) }
  if ($null -ne $p.Value.prior) { SetKey $s.priorYtd $target ([int]$p.Value.prior) }
  if ($monthN -eq 12 -and $null -ne $p.Value.ytd) { $yearTotals[$code] = [int]$p.Value.ytd }
}
if ($unmatched.Count) { throw "state names not recognised: $($unmatched -join ', ')" }
if ($matched -ne 51) { throw "expected 51 states, matched $matched" }
if ($monthN -eq 12) { SetKey $C.stateYearTotals $year ([PSCustomObject]$yearTotals) }

[System.IO.File]::WriteAllText($lsPath, ($ls | ConvertTo-Json -Depth 10), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("Challenger: applied {0} - {1:N0} cuts, YTD {2:N0}, {3} industries, {4} states, hiring YTD {5:N0}; released {6}" -f $target, $r.headline, $r.ytdCuts, $C.industry.Count, $matched, $r.ytdHiring, $C.releasedOn)

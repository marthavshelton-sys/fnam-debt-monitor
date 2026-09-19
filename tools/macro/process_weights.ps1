# CPI and PPI relative-importance weights. BLS answers scripted requests for
# its tables with HTTP 403 from ordinary networks; this processor probes both
# files from wherever the pipeline runs and, when BLS allows the fetch, reports
# what it found so the yearly update can be automated here. Until then the two
# yearly browser tasks (cpi-weights-yearly, ppi-weights-yearly) keep the files
# current and this step only logs the probe result. Never fails the build.
. "$PSScriptRoot\common.ps1"
$h = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        "Accept" = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"; "Accept-Language" = "en-US,en;q=0.9" }
$year = (Get-Date).Year - 1
foreach ($u in @("https://www.bls.gov/cpi/tables/relative-importance/$year.htm", "https://www.bls.gov/ppi/tables/relative-importance/ppi-fdgrouprel.xlsx")) {
  try {
    $r = Invoke-WebRequest -Uri $u -Headers $h -UseBasicParsing -TimeoutSec 60
    Write-Output ("BLS probe: {0} -> {1} ({2:N0} bytes, {3})" -f $u, $r.StatusCode, $r.Content.Length, $r.Headers["Content-Type"])
    if ($u -like "*.htm") {
      $txt = [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($r.Content, '<[^>]+>', ' ') -replace '\s+', ' '))
      $i = $txt.IndexOf("Food and beverages"); if ($i -ge 0) { Write-Output ("  sample: " + $txt.Substring([Math]::Max(0, $i - 120), [Math]::Min(400, $txt.Length - [Math]::Max(0, $i - 120)))) }
    }
  } catch { Write-Output ("BLS probe: {0} -> {1}" -f $u, $_.Exception.Message.Split([char]10)[0]) }
}

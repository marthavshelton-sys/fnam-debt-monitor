# Builds both targets from the single template, so the artifact we iterate on and
# the bundle we eventually deploy can never drift apart.
#
#   .\build.ps1              -> both targets
#   .\build.ps1 -Target art  -> artifact only (snapshot, no live fetch)
#   .\build.ps1 -Target web  -> Cloudflare Pages bundle only (live fetch on)
param([string]$Target = "both", [string]$OutFile = "")

$ErrorActionPreference = "Stop"
$base = $PSScriptRoot
$data = if ($env:MACRO_DATA_DIR) { $env:MACRO_DATA_DIR } else { "$env:TEMP\claude" }

$template     = Get-Content "$base\macro_monitor_template.html" -Raw -Encoding UTF8
# A Windows git checkout may hand the template back with CRLF line endings; the
# guards below match on LF, and the page is emitted with LF either way.
$template     = $template -replace "`r`n", "`n"
$cpiJson      = Get-Content "$data\bls_cpi_processed3.json" -Raw -Encoding UTF8
$weightsJson  = Get-Content "$data\bls_weights.json" -Raw -Encoding UTF8
$pceJson      = Get-Content "$data\pce_processed.json" -Raw -Encoding UTF8
$pceWeights   = Get-Content "$data\pce_weights.json" -Raw -Encoding UTF8
$laborJson    = Get-Content "$data\labor_processed.json" -Raw -Encoding UTF8
$laborStatic  = Get-Content "$data\labor_static.json" -Raw -Encoding UTF8
$gdpJson      = Get-Content "$data\gdp_processed.json" -Raw -Encoding UTF8
$umichJson    = Get-Content "$data\umich_processed.json" -Raw -Encoding UTF8
$ppiJson      = Get-Content "$data\ppi_processed.json" -Raw -Encoding UTF8
$ppiWeights   = Get-Content "$data\ppi_weights.json" -Raw -Encoding UTF8
$retailJson   = Get-Content "$data\retail_processed.json" -Raw -Encoding UTF8
$fincondJson  = Get-Content "$data\fincond_processed.json" -Raw -Encoding UTF8
$supplyJson   = Get-Content "$data\supply_processed.json" -Raw -Encoding UTF8
$fiscalJson   = Get-Content "$data\fiscal_processed.json" -Raw -Encoding UTF8
$calendarJson = Get-Content "$data\calendar.json" -Raw -Encoding UTF8
$refreshedAt  = '"' + (Get-Date -Format "yyyy-MM-dd") + '"'
$pceRefreshed = $refreshedAt      # BEA is pulled on every build
$umichRefresh = '"' + (Get-Date -Format "yyyy-MM-dd") + '"'

# Fails the build if the two locales don't expose the same keys, so a
# half-translated page can't ship. Compares the es/en blocks in the template.
function Assert-LocaleParity {
  $esBlock = [regex]::Match($template, '(?s)\n  es: \{(.*?)\n  \},\n\n  en: \{').Groups[1].Value
  $enBlock = [regex]::Match($template, '(?s)\n  en: \{(.*?)\n  \}\n\};').Groups[1].Value
  if (-not $esBlock -or -not $enBlock) { throw "Could not locate both locale blocks in the template." }

  # Top-level keys, excluding anything nested inside the names{} map.
  function Keys([string]$block) {
    $namesStripped = [regex]::Replace($block, '(?s)names: \{.*?\n    \}', '')
    $k = [regex]::Matches($namesStripped, '(?m)^    ([A-Za-z][A-Za-z0-9]*)\s*:') | ForEach-Object { $_.Groups[1].Value }
    return ($k | Sort-Object -Unique)
  }
  function NameKeys([string]$block) {
    $names = [regex]::Match($block, '(?s)names: \{(.*?)\n    \}').Groups[1].Value
    $k = [regex]::Matches($names, '"([^"]+)"\s*:') | ForEach-Object { $_.Groups[1].Value }
    return ($k | Sort-Object -Unique)
  }

  $esKeys = Keys $esBlock;  $enKeys = Keys $enBlock
  $esNames = NameKeys $esBlock; $enNames = NameKeys $enBlock

  $missEn  = $esKeys  | Where-Object { $_ -notin $enKeys }
  $missEs  = $enKeys  | Where-Object { $_ -notin $esKeys }
  $missNEn = $esNames | Where-Object { $_ -notin $enNames }
  $missNEs = $enNames | Where-Object { $_ -notin $esNames }

  if ($missEn -or $missEs -or $missNEn -or $missNEs) {
    if ($missEn)  { Write-Output "  missing in en : $($missEn  -join ', ')" }
    if ($missEs)  { Write-Output "  missing in es : $($missEs  -join ', ')" }
    if ($missNEn) { Write-Output "  names missing in en : $($missNEn -join ', ')" }
    if ($missNEs) { Write-Output "  names missing in es : $($missNEs -join ', ')" }
    throw "Locale parity check failed - refusing to build a half-translated page."
  }
  Write-Output ("locale parity  : OK ({0} strings + {1} names, both locales)" -f $esKeys.Count, $esNames.Count)
}

# Parity proves the two locales agree with each other; it says nothing about
# whether a key the code actually asks for exists. A typo like T.legCPIHeadline
# against a defined legCpiHeadline renders the literal string "undefined" on the
# page and passes every other check, so verify every reference resolves.
function Assert-StringsResolve {
  $esBlock = [regex]::Match($template, '(?s)\n  es: \{(.*?)\n  \},\n\n  en: \{').Groups[1].Value
  $stripped = [regex]::Replace($esBlock, '(?s)names: \{.*?\n    \}', '')
  $defined = @([regex]::Matches($stripped, '(?m)^    ([A-Za-z][A-Za-z0-9]*)\s*:') | ForEach-Object { $_.Groups[1].Value })
  $defined += @('names','months','htmlLang','dateLocale')
  $defined = $defined | Sort-Object -Unique

  $code = [regex]::Replace($template, '(?s)const I18N = \{.*?\n\};', '')
  $used = @([regex]::Matches($code, '\bT\.([A-Za-z][A-Za-z0-9]*)') | ForEach-Object { $_.Groups[1].Value }) | Sort-Object -Unique

  $undef = $used | Where-Object { $_ -notin $defined }
  if ($undef) {
    $undef | ForEach-Object { Write-Output "  undefined reference : T.$_" }
    throw "Unresolved string reference - the page would render 'undefined'."
  }
  Write-Output ("string refs    : OK ({0} references all resolve)" -f $used.Count)
}

Assert-LocaleParity
Assert-StringsResolve

function Build-Page([string]$liveFlag) {
  $out = $template.
    Replace('/*__CPI_DATA__*/ null',         $cpiJson).
    Replace('/*__WEIGHTS_DATA__*/ null',     $weightsJson).
    Replace('/*__REFRESHED_AT__*/ null',     $refreshedAt).
    Replace('/*__PCE_DATA__*/ null',         $pceJson).
    Replace('/*__LABOR_DATA__*/ null',       $laborJson).
    Replace('/*__LABOR_STATIC__*/ null',     $laborStatic).
    Replace('/*__GDP_DATA__*/ null',         $gdpJson).
    Replace('/*__PCE_WEIGHTS__*/ null',      $pceWeights).
    Replace('/*__PCE_REFRESHED_AT__*/ null', $pceRefreshed).
    Replace('/*__UMICH_DATA__*/ null',       $umichJson).
    Replace('/*__UMICH_REFRESHED_AT__*/ null', $umichRefresh).
    Replace('/*__PPI_DATA__*/ null',         $ppiJson).
    Replace('/*__PPI_WEIGHTS__*/ null',      $ppiWeights).
    Replace('/*__RETAIL_DATA__*/ null',      $retailJson).
    Replace('/*__FINCOND_DATA__*/ null',     $fincondJson).
    Replace('/*__SUPPLY_DATA__*/ null',      $supplyJson).
    Replace('/*__FISCAL_DATA__*/ null',      $fiscalJson).
    Replace('/*__CALENDAR__*/ null',         $calendarJson).
    Replace('/*__LIVE_DATA__*/ false',       $liveFlag)

  if ($out -match '__(CPI_DATA|WEIGHTS_DATA|REFRESHED_AT|PCE_DATA|PCE_WEIGHTS|PCE_REFRESHED_AT|UMICH_DATA|UMICH_REFRESHED_AT|PPI_DATA|PPI_WEIGHTS|RETAIL_DATA|FINCOND_DATA|SUPPLY_DATA|FISCAL_DATA|CALENDAR|LIVE_DATA|LABOR_DATA|LABOR_STATIC|GDP_DATA)__') {
    throw "A placeholder was left unsubstituted."
  }
  return $out
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if ($Target -eq "both" -or $Target -eq "art") {
  $page = Build-Page "false"
  [System.IO.File]::WriteAllText("$base\macro_monitor.html", $page, $utf8NoBom)
  Write-Output ("artifact build : {0:N0} bytes  (snapshot only)" -f (Get-Item "$base\macro_monitor.html").Length)
}

# Site build: same snapshot page, written wherever the caller asks (the
# workflow passes site/macro/index.html). Data is refreshed by rebuilding on a
# schedule, so no live-fetch layer and no proxy functions are needed.
if ($Target -eq "both" -or $Target -eq "web") {
  if (-not $OutFile) { $OutFile = Join-Path $base "macrodash\index.html" }

  # Skip the write when nothing changed, so the scheduled job doesn't commit a
  # 1.4 MB page twice a day just to move a "refreshed" date. The hash covers the
  # template and every data file (pull-date stamps stripped), so either a data
  # release or an edit to the page triggers a rebuild, and nothing else does.
  $payload = ($template + $cpiJson + $weightsJson + $pceJson + $pceWeights + $laborJson + $laborStatic + $gdpJson +
              $umichJson + $ppiJson + $ppiWeights + $retailJson + $fincondJson + $supplyJson + $fiscalJson + $calendarJson) -replace '"fetchedAt":"\d{4}-\d{2}-\d{2}"', ''
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hash = ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload)))).Replace("-", "").ToLower()
  $hashFile = Join-Path $data ".datahash"
  if ((Test-Path $hashFile) -and (Test-Path $OutFile) -and ((Get-Content $hashFile -Raw).Trim() -eq $hash)) {
    Write-Output "site build     : data unchanged since last build; page not rewritten"
    return
  }
  $page = Build-Page "false"
  # The artifact host wraps pages in its own <html>/<head>/<body>; the site gets
  # no such help, and without a viewport meta an iPhone renders it as a shrunken
  # desktop page. Split at the shell so the title/fonts/styles land in <head>.
  $cut = $page.IndexOf('<div class="mobilebar"')
  if ($cut -lt 0) { throw "could not find the page body to wrap" }
  $page = "<!doctype html>`n<html lang=`"es`">`n<head>`n<meta charset=`"utf-8`">`n<meta name=`"viewport`" content=`"width=device-width, initial-scale=1`">`n" +
          $page.Substring(0, $cut) + "</head>`n<body>`n" + $page.Substring($cut) + "`n</body>`n</html>`n"
  New-Item -ItemType Directory -Force -Path (Split-Path $OutFile) | Out-Null
  [System.IO.File]::WriteAllText($OutFile, $page, $utf8NoBom)
  [System.IO.File]::WriteAllText($hashFile, $hash, $utf8NoBom)
  Write-Output ("site build     : {0:N0} bytes -> {1}" -f (Get-Item $OutFile).Length, $OutFile)
}

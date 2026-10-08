# The U.S. international investment position (IIP) and foreign direct investment, from BEA.
#   IIP table 1.1 via FRED, quarterly since 2006 (not seasonally adjusted, $ millions): the net
#   position, U.S. assets and liabilities, each by type (direct investment at market value,
#   portfolio investment, financial derivatives, other investment, reserve assets); the annual
#   net position since 1976; nominal GDP for the ratios.
#   International transactions (ITA tables 1.1 and 1.2) via FRED, quarterly since 1999
#   (seasonally adjusted, $ millions): the current account and its goods, services and primary
#   income balances; direct investment flows both ways (equity and debt instruments);
#   portfolio investment flows; net lending or borrowing from financial-account transactions. FRED suffixes:
#   none = quarterly seasonally adjusted, N = quarterly not seasonally adjusted, A = annual (IEAIPIA is annual).
#   Two optional blocks come from BEA's own API (the runner holds the key): the quarterly change
#   in the net position split into financial transactions, price changes, exchange-rate changes
#   and other changes (dataset IIP), and the foreign direct investment position in the United
#   States by country of the foreign parent, historical-cost basis, annual (dataset MNE). Each
#   is dropped with a warning when it cannot be read or checked; the page then leaves it out.
# Every FRED id is checked against its title (Get-FredChecked); the IIP's and ITA's own sums are
# verified before the file is written, and a failure keeps the committed file.
. "$PSScriptRoot\common.ps1"

function Pull($defs, [string]$from, [scriptblock]$keyOf, [double]$scale, [int]$dec) {
  $series = [ordered]@{}; $by = @{}
  foreach ($k in $defs.Keys) {
    $s = Get-FredChecked $defs[$k].ids $defs[$k].re $from
    $series[$k] = [ordered]@{ id = $s.id; title = $s.title }
    $m = @{}; foreach ($p in $s.points) { $m[(& $keyOf $p.d)] = [math]::Round($p.v * $scale, $dec) }
    $by[$k] = $m
  }
  return @{ series = $series; by = $by }
}
function BuildRows($by, [string[]]$keys) {
  $periods = @($by[$keys[0]].Keys | Sort-Object)
  $rows = New-Object System.Collections.ArrayList
  foreach ($d in $periods) {
    $row = [ordered]@{ d = $d }
    foreach ($k in $keys) { $row[$k] = $(if ($by[$k].ContainsKey($d)) { $by[$k][$d] } else { $null }) }
    [void]$rows.Add($row)
  }
  return $rows.ToArray()
}
function Check([string]$name, $rows, [scriptblock]$fails) {
  $bad = @($rows | Where-Object $fails)
  if ($bad.Count) { throw ("identity '{0}' fails for {1} periods (first {2})" -f $name, $bad.Count, $bad[0].d) }
  Write-Output ("identity {0}: OK" -f $name)
}
$has = { param($r, $ks) foreach ($k in $ks) { if ($null -eq $r.$k) { return $false } }; return $true }
$toQuarter = { param($d) ToQuarter $d }
$toYear = { param($d) $d.Substring(0, 4) }
$allSeries = [ordered]@{}

# ---- 1. IIP table 1.1, quarterly ($ millions -> $ billions) ----
$iipDefs = [ordered]@{
  net    = @{ ids = @("IIPUSNETIQ");  re = '^U\.S\. Net International Investment Position$' }
  netXd  = @{ ids = @("IIPNETINQ");   re = '^U\.S\. Net International Investment Position Excluding Financial Derivatives$' }
  assets = @{ ids = @("IIPUSASSQ");   re = '^U\.S\. Assets$' }
  liab   = @{ ids = @("IIPUSLIAQ");   re = '^U\.S\. Liabilities$' }
  diA    = @{ ids = @("IIPDIREAMVQ"); re = '^U\.S\. Assets: Direct Investment at Market Value$' }
  diL    = @{ ids = @("IIPDIRELMVQ"); re = '^U\.S\. Liabilities: Direct Investment at Market Value$' }
  pfA    = @{ ids = @("IIPPORTAQ");   re = '^U\.S\. Assets: Portfolio Investment$' }
  pfL    = @{ ids = @("IIPPORTLQ");   re = '^U\.S\. Liabilities: Portfolio Investment$' }
  fdA    = @{ ids = @("IIPFINAAGQ");  re = '^U\.S\. Assets: Financial Derivatives Other Than Reserves, Gross Positive Fair Value$' }
  fdL    = @{ ids = @("IIPFINALGQ");  re = '^U\.S\. Liabilities: Financial Derivatives Other Than Reserves, Gross Negative Fair Value$' }
  oiA    = @{ ids = @("IIPOTHEAQ");   re = '^U\.S\. Assets: Other Investment$' }
  oiL    = @{ ids = @("IIPOTHELQ");   re = '^U\.S\. Liabilities: Other Investment$' }
  res    = @{ ids = @("IIPRESEQ");    re = '^U\.S\. Assets: Reserve Assets$' }
}
$iip = Pull $iipDefs "2006-01-01" $toQuarter 0.001 1
foreach ($k in $iip.series.Keys) { $allSeries[("iip_" + $k)] = $iip.series[$k] }
$g = Get-FredChecked @("GDP") '^Gross Domestic Product$' "1976-01-01"
$allSeries["gdp"] = [ordered]@{ id = $g.id; title = $g.title }
$gdpQ = @{}; foreach ($p in $g.points) { $gdpQ[(ToQuarter $p.d)] = [math]::Round($p.v, 1) }
$iip.by["gdp"] = $gdpQ
$quarterly = @(BuildRows $iip.by (@($iipDefs.Keys) + @("gdp")))
# Table 1.1's own sums, within the rounding of its $ millions (each line rounded to $0.1 billion).
Check "assets = direct + portfolio + derivatives + other + reserves" $quarterly { (& $has $_ @("assets","diA","pfA","fdA","oiA","res")) -and [math]::Abs($_.assets - ($_.diA + $_.pfA + $_.fdA + $_.oiA + $_.res)) -gt 0.6 }
Check "liabilities = direct + portfolio + derivatives + other" $quarterly { (& $has $_ @("liab","diL","pfL","fdL","oiL")) -and [math]::Abs($_.liab - ($_.diL + $_.pfL + $_.fdL + $_.oiL)) -gt 0.6 }
Check "net position = assets - liabilities" $quarterly { (& $has $_ @("net","assets","liab")) -and [math]::Abs($_.net - ($_.assets - $_.liab)) -gt 0.6 }
Check "net position excluding derivatives" $quarterly { (& $has $_ @("netXd","assets","liab","fdA","fdL")) -and [math]::Abs($_.netXd - (($_.assets - $_.fdA) - ($_.liab - $_.fdL))) -gt 0.6 }
$qComplete = @($quarterly | Where-Object { & $has $_ @("net","assets","liab","diA","diL","pfA","pfL") })
$lastQ = $qComplete[$qComplete.Count - 1]
Write-Output ("IIP: {0} quarters, {1} .. {2}; latest {2}: net {3}B ({4}% of GDP), assets {5}B, liabilities {6}B, FDI in the US at market value {7}B, US direct investment abroad {8}B" -f $quarterly.Count, $quarterly[0].d, $lastQ.d, $lastQ.net, $(if ($lastQ.gdp) { [math]::Round($lastQ.net / $lastQ.gdp * 100, 1) } else { "n/a" }), $lastQ.assets, $lastQ.liab, $lastQ.diL, $lastQ.diA)

# ---- 2. the annual net position since 1976, with annual GDP ----
$a = Get-FredChecked @("IIPUSNETIA") '^U\.S\. Net International Investment Position$' "1976-01-01"
$allSeries["iip_netA"] = [ordered]@{ id = $a.id; title = $a.title }
$ga = Get-FredChecked @("GDPA") '^Gross Domestic Product$' "1976-01-01"
$allSeries["gdpA"] = [ordered]@{ id = $ga.id; title = $ga.title }
$netA = @{}; foreach ($p in $a.points) { $netA[$p.d.Substring(0, 4)] = [math]::Round($p.v / 1000, 1) }
$gdpA = @{}; foreach ($p in $ga.points) { $gdpA[$p.d.Substring(0, 4)] = [math]::Round($p.v, 1) }
$annual = @(BuildRows @{ net = $netA; gdp = $gdpA } @("net", "gdp"))
$lastA = $annual[$annual.Count - 1]
Write-Output ("IIP annual: {0} years, {1} .. {2}; {2}: net {3}B" -f $annual.Count, $annual[0].d, $lastA.d, $lastA.net)

# ---- 3. international transactions, quarterly, seasonally adjusted ($ millions -> $ billions) ----
$itaDefs = [ordered]@{
  ca         = @{ ids = @("IEABC");    re = '^Balance on current account$' }
  caG        = @{ ids = @("IEABCG");   re = '^Balance on goods$' }
  caS        = @{ ids = @("IEABCS");   re = '^Balance on services$' }
  caPI       = @{ ids = @("IEABCPI");  re = '^Balance on primary income$' }
  fdiOut     = @{ ids = @("IEAADI");   re = '^US acquisition of direct investment assets$' }
  fdiOutEq   = @{ ids = @("IEAADIE");  re = '^US acquisition of direct investment assets: Equity$' }
  fdiOutDebt = @{ ids = @("IEAADIDI"); re = '^US acquisition of direct investment assets: Debt instruments$' }
  fdiIn      = @{ ids = @("IEAIDI");   re = '^US incurrence of direct investment liabilities$' }
  fdiInEq    = @{ ids = @("IEAIDIE");  re = '^(US incurrence of )?direct investment liabilities: Equity$' }
  fdiInDebt  = @{ ids = @("IEAIDIDI"); re = '^(US incurrence of )?direct investment liabilities: Debt instruments$' }
  pfOut      = @{ ids = @("IEAAPI");   re = '^US acquisition of portfolio investment assets$' }
  pfIn       = @{ ids = @("IEAIPI");   re = '^US incurrence of portfolio investment liabilities$' }
  nlf        = @{ ids = @("IEANLF");   re = '^Net lending \(\+\) or net borrowing \(-\) from financial-account transactions$' }
}
$ita = Pull $itaDefs "1999-01-01" $toQuarter 0.001 1
foreach ($k in $ita.series.Keys) { $allSeries[("ita_" + $k)] = $ita.series[$k] }
$ita.by["gdp"] = $gdpQ
$flows = @(BuildRows $ita.by (@($itaDefs.Keys) + @("gdp")))
Check "direct investment liabilities = equity + debt instruments" $flows { (& $has $_ @("fdiIn","fdiInEq","fdiInDebt")) -and [math]::Abs($_.fdiIn - ($_.fdiInEq + $_.fdiInDebt)) -gt 0.4 }
Check "direct investment assets = equity + debt instruments" $flows { (& $has $_ @("fdiOut","fdiOutEq","fdiOutDebt")) -and [math]::Abs($_.fdiOut - ($_.fdiOutEq + $_.fdiOutDebt)) -gt 0.4 }
$fComplete = @($flows | Where-Object { & $has $_ @("ca","fdiIn","fdiOut","nlf") })
$lastF = $fComplete[$fComplete.Count - 1]
Write-Output ("ITA: {0} quarters, {1} .. {2}; latest {2}: current account {3}B ({4}% of GDP at an annual rate), FDI inflows {5}B, outflows {6}B, net borrowing {7}B" -f $flows.Count, $flows[0].d, $lastF.d, $lastF.ca, $(if ($lastF.gdp) { [math]::Round($lastF.ca * 4 / $lastF.gdp * 100, 1) } else { "n/a" }), $lastF.fdiIn, $lastF.fdiOut, $lastF.nlf)

# ---- 4. BEA API blocks (optional: dropped with a warning when the key, the API or a check fails) ----
function Invoke-BeaApi([string]$query) {
  $key = Get-ApiKey "BEA_API_KEY"
  $r = Invoke-Retry { Invoke-RestMethod -Uri ("https://apps.bea.gov/api/data/?UserID=" + $key + "&" + $query + "&ResultFormat=JSON") -TimeoutSec 120 }
  if ($r.BEAAPI.Error) { throw ("BEA API: " + $r.BEAAPI.Error.APIErrorDescription) }
  if ($r.BEAAPI.Results.Error) { throw ("BEA API: " + $r.BEAAPI.Results.Error.APIErrorDescription) }
  return $r.BEAAPI.Results
}
function BeaNumber($v) {
  $s = "$v" -replace ',', ''
  if ($s -match '^\(?\*\)?$') { return 0 }          # (*) = between -500,000 and +500,000
  if ($s -notmatch '^-?\d+(\.\d+)?$') { return $null }  # (D) suppressed, blanks
  return [double]$s
}
function ParamDesc($list) { ($list | ForEach-Object { "$($_.Key)=$($_.Desc)" }) -join "; " }
$bea = [ordered]@{}
# 4a. What moved the net position: transactions vs. price and exchange-rate changes (IIP, Component dimension).
try {
  $types = @((Invoke-BeaApi "method=GetParameterValues&DataSetName=IIP&ParameterName=TypeOfInvestment").ParamValue)
  Write-Host ("  IIP TypeOfInvestment: " + (ParamDesc $types))
  # BEA describes two keys as "U.S. net international investment position": Net (the position) and
  # FinDerivNet (net financial derivatives, mislabelled; it sorts first and has no change components).
  # The key Net wins when it carries that description; the description alone is the fallback.
  $netType = @($types | Where-Object { "$($_.Key)" -eq "Net" -and "$($_.Desc)" -match 'net international investment position' })
  if (-not $netType.Count) { $netType = @($types | Where-Object { "$($_.Desc)" -match 'net international investment position' -and "$($_.Desc)" -notmatch 'excluding' -and "$($_.Key)" -notmatch 'deriv' }) }
  if (-not $netType.Count) { throw "no IIP TypeOfInvestment describes the net position" }
  Write-Host ("  IIP net position key: " + $netType[0].Key + " = " + $netType[0].Desc)
  $comps = @((Invoke-BeaApi "method=GetParameterValues&DataSetName=IIP&ParameterName=Component").ParamValue)
  Write-Host ("  IIP Component: " + (ParamDesc $comps))
  $pick = { param($re) $m = @($comps | Where-Object { "$($_.Desc)" -match $re }); if ($m.Count) { "$($m[0].Key)" } else { $null } }
  # BEA's components (table 1.3): Pos; ChgPos = ChgPosTrans + ChgPosOth, and ChgPosOth = ChgPosPrice +
  # ChgPosXRate + ChgPosNie ("changes in volume and valuation n.i.e."), the "other" of the page. The
  # patterns are anchored: "not attributable to financial-account transactions" must not match transactions.
  $cKeys = @{ pos = (& $pick '^position$'); chg = (& $pick '^change in position$'); trans = (& $pick '^change in position attributable to financial.account transactions$'); price = (& $pick 'attributable to price changes$'); fx = (& $pick 'attributable to exchange.rate changes$'); other = (& $pick 'volume and valuation') }
  Write-Host ("  IIP component keys: " + (($cKeys.Keys | Sort-Object | ForEach-Object { $_ + "=" + $cKeys[$_] }) -join ", "))
  if (-not $cKeys.pos -or -not $cKeys.trans -or -not $cKeys.price -or -not $cKeys.fx) { throw ("IIP Component keys not recognised: " + (ParamDesc $comps)) }
  $rows = @((Invoke-BeaApi ("method=GetData&DataSetName=IIP&TypeOfInvestment=" + $netType[0].Key + "&Component=All&Frequency=QNSA&Year=ALL")).Data)
  if (-not $rows.Count) { throw "IIP GetData returned no rows" }
  Write-Host ("  IIP first row: " + (($rows[0].PSObject.Properties | ForEach-Object { $_.Name + "=" + $_.Value }) -join "; "))
  Write-Host ("  IIP rows: " + $rows.Count + "; components seen: " + ((@($rows | ForEach-Object { "$($_.Component)" } | Sort-Object -Unique)) -join ", "))
  # One hashtable per quarter; no reliance on $Matches or property access on dictionaries, so the
  # same code runs on Windows PowerShell 5.1 (the runner) and PowerShell 7.
  $tpRe = New-Object System.Text.RegularExpressions.Regex '^(\d{4})Q([1-4])$'
  $byQ = @{}; $skipped = 0
  foreach ($row in $rows) {
    $tm = $tpRe.Match([string]$row.TimePeriod)
    if (-not $tm.Success) { $skipped++; continue }
    $q = $tm.Groups[1].Value + "-Q" + $tm.Groups[2].Value
    $v = BeaNumber $row.DataValue
    if ($null -eq $v) { $skipped++; continue }
    $mult = 6; $mu = [string]$row.UNIT_MULT; if ($mu -match '^\d+$') { $mult = [int]$mu }
    $bn = [math]::Round($v * [math]::Pow(10, $mult) / 1e9, 1)
    if (-not $byQ.ContainsKey($q)) { $byQ[$q] = @{ d = $q; pos = $null; chg = $null; trans = $null; price = $null; fx = $null; other = $null } }
    $comp = [string]$row.Component
    foreach ($ck in @("pos", "chg", "trans", "price", "fx", "other")) { if ($cKeys[$ck] -and $comp -eq $cKeys[$ck]) { $byQ[$q][$ck] = $bn } }
  }
  $qKeys = @($byQ.Keys | Sort-Object)
  Write-Host ("  IIP quarters assembled: {0} ({1} rows skipped); sample: {2}" -f $qKeys.Count, $skipped, $(if ($qKeys.Count) { ($byQ[$qKeys[$qKeys.Count - 1]] | ConvertTo-Json -Compress) } else { "none" }))
  $chgRows = New-Object System.Collections.ArrayList
  foreach ($k in $qKeys) {
    $e = $byQ[$k]
    if ($null -eq $e["pos"] -or $null -eq $e["trans"] -or $null -eq $e["price"] -or $null -eq $e["fx"]) { continue }
    [void]$chgRows.Add([ordered]@{ d = $e["d"]; pos = $e["pos"]; chg = $e["chg"]; trans = $e["trans"]; price = $e["price"]; fx = $e["fx"]; other = $e["other"] })
  }
  if ($chgRows.Count -lt 8) { throw ("only {0} quarters with a complete change decomposition" -f $chgRows.Count) }
  # The API's position must be FRED's, and the components must add up to the quarter's change.
  $fredNet = @{}; foreach ($r2 in $quarterly) { if ($null -ne $r2.net) { $fredNet[$r2.d] = $r2.net } }
  $off = New-Object System.Collections.ArrayList; $bad = New-Object System.Collections.ArrayList
  foreach ($e in $chgRows) {
    if ($fredNet.ContainsKey($e["d"]) -and [math]::Abs($fredNet[$e["d"]] - $e["pos"]) -gt 1.5) { [void]$off.Add($e) }
    $oth = $(if ($null -ne $e["other"]) { $e["other"] } else { 0 })
    if ($null -ne $e["chg"] -and [math]::Abs($e["chg"] - ($e["trans"] + $e["price"] + $e["fx"] + $oth)) -gt 1.5) { [void]$bad.Add($e) }
  }
  if ($off.Count) { throw ("BEA API position differs from FRED in {0} quarters (first {1}: {2} vs {3})" -f $off.Count, $off[0]["d"], $off[0]["pos"], $fredNet[$off[0]["d"]]) }
  if ($bad.Count) { throw ("IIP change components do not add up in {0} quarters (first {1})" -f $bad.Count, $bad[0]["d"]) }
  $keep = [math]::Min(24, $chgRows.Count)
  $kept = @($chgRows.GetRange($chgRows.Count - $keep, $keep))
  $lastC = $chgRows[$chgRows.Count - 1]
  $bea["change"] = [ordered]@{ quarterly = $kept; typeOfInvestment = "$($netType[0].Key)"; asOf = $lastC["d"] }
  Write-Output ("IIP change decomposition: {0} quarters, latest {1}: change {2}B = transactions {3}B + price {4}B + exchange rate {5}B + other {6}B" -f $chgRows.Count, $lastC["d"], $lastC["chg"], $lastC["trans"], $lastC["price"], $lastC["fx"], $lastC["other"])
} catch { Write-Host ("::warning::IIP change decomposition (BEA API) left out: {0}" -f $_.Exception.Message.Split([char]10)[0]) }
# 4b. Foreign direct investment position in the United States by country (historical cost, annual).
try {
  $sids = @((Invoke-BeaApi "method=GetParameterValues&DataSetName=MNE&ParameterName=SeriesID").ParamValue)
  Write-Host ("  MNE SeriesID: " + (ParamDesc $sids))
  $posSid = @($sids | Where-Object { "$($_.Desc)" -match 'position' -and "$($_.Desc)" -notmatch 'income|flow|transaction|per|change' })
  if (-not $posSid.Count) { throw "no MNE SeriesID describes the direct investment position" }
  $cls = @((Invoke-BeaApi "method=GetParameterValues&DataSetName=MNE&ParameterName=Classification").ParamValue)
  Write-Host ("  MNE Classification: " + (ParamDesc $cls))
  $rows = @((Invoke-BeaApi ("method=GetData&DataSetName=MNE&DirectionOfInvestment=Inward&Classification=Country&SeriesID=" + $posSid[0].Key + "&Year=all&Country=all")).Data)
  if (-not $rows.Count) { throw "MNE GetData returned no rows" }
  Write-Host ("  MNE first row: " + (($rows[0].PSObject.Properties | ForEach-Object { $_.Name + "=" + $_.Value }) -join "; "))
  $nameOf = { param($r) foreach ($f in @("Row", "Country", "RowName", "CountryName")) { if ($r.PSObject.Properties[$f] -and "$($r.$f)".Trim()) { return "$($r.$f)".Trim() } }; return $null }
  $years = @($rows | ForEach-Object { "$($_.Year)" } | Where-Object { $_ -match '^\d{4}$' } | Sort-Object -Unique)
  if (-not $years.Count) { throw "MNE rows carry no Year" }
  $year = $years[$years.Count - 1]
  $scale = "$($rows[0].TableScale)"; if (-not $scale -and $rows[0].PSObject.Properties["DataValueUnit"]) { $scale = "$($rows[0].DataValueUnit)" }
  $div = $(if ($scale -match 'million') { 1000.0 } elseif ($scale -match 'billion') { 1.0 } elseif ($scale -match 'thousand') { 1000000.0 } else { throw ("MNE scale not recognised: '" + $scale + "'") })
  $agg = '^(All Countries|Europe\b|Of which|Latin America|South and Central America|Other Western Hemisphere|Africa\b|Middle East|Asia and Pacific|Addenda|OPEC|European Union|Other\b|Eastern Europe|Western Europe|Asia\b|Pacific\b|Americas|North America|Central America|Caribbean|International|Unallocated|Euro area|Eurozone|Other Europe|Other Asia|Other Africa|Other Latin|Other Middle)'
  $items = New-Object System.Collections.ArrayList; $total = $null
  foreach ($row in $rows) {
    if ("$($row.Year)" -ne $year) { continue }
    $n = & $nameOf $row; if (-not $n) { continue }
    $v = BeaNumber $row.DataValue; if ($null -eq $v) { continue }
    $bn = [math]::Round($v / $div, 1)
    if ($n -match '^All Countries') { $total = $bn; continue }
    if ($n -match $agg) { continue }
    [void]$items.Add([ordered]@{ name = $n; v = $bn })
  }
  if ($null -eq $total) { throw ("no 'All Countries' total for " + $year) }
  $top = @($items | Sort-Object { $_.v } -Descending | Select-Object -First 15)
  if ($top.Count -lt 10) { throw ("only {0} countries parsed for {1}" -f $top.Count, $year) }
  $sumTop = ($top | ForEach-Object { $_.v } | Measure-Object -Sum).Sum
  if ($sumTop -gt $total * 1.001) { throw ("the top countries ({0}B) exceed the all-countries total ({1}B) for {2}" -f $sumTop, $total, $year) }
  # The historical-cost total must sit below the market-value position of the same year end (FRED, Q4).
  $mv = @($quarterly | Where-Object { $_.d -eq ($year + "-Q4") -and $null -ne $_.diL })
  if ($mv.Count -and $total -gt $mv[0].diL * 1.05) { throw ("historical-cost FDI total {0}B exceeds the market-value position {1}B for {2}" -f $total, $mv[0].diL, $year) }
  $bea["fdiCountry"] = [ordered]@{ year = $year; total = $total; countries = $top; basis = "historical cost, by country of foreign parent"; seriesId = "$($posSid[0].Key)"; seriesDesc = "$($posSid[0].Desc)"; scale = $scale }
  Write-Output ("FDI in the US by country ({0}): total {1}B; top {2}: {3}" -f $year, $total, $top.Count, (($top | Select-Object -First 5 | ForEach-Object { $_.name + " " + $_.v + "B" }) -join ", "))
} catch { Write-Host ("::warning::FDI by country (BEA API) left out: {0}" -f $_.Exception.Message.Split([char]10)[0]) }

$obj = [ordered]@{
  quarterly = $quarterly; asOf = $lastQ.d
  annual = $annual
  flows = $flows; flowsAsOf = $lastF.d
  bea = $bea
  series = $allSeries
  fetchedAt = (Get-Date -Format "yyyy-MM-dd")
}
Save-Json $obj "iip_processed.json" 8

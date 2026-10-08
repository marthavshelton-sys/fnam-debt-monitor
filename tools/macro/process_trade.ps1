# U.S. foreign trade: the monthly trade balance, exports and imports of goods and services
# (Census Bureau and BEA, "U.S. International Trade in Goods and Services", the FT-900,
# balance of payments basis, seasonally adjusted, $ millions), the BLS import and export
# price indexes (end-use categories and by locality of origin, not seasonally adjusted),
# goods trade with the largest partners (Census basis, not seasonally adjusted, $ millions),
# customs duties from the Monthly Treasury Statement (Treasury FiscalData API, keyless) and
# the trade lines of the national accounts (BEA NIPA: nominal and real exports and imports,
# net exports and their contributions to real GDP growth, quarterly). Everything but the
# duties comes through FRED: every id is checked against its FRED title (Get-FredChecked,
# common.ps1) and the accounting identities of each block are verified before the file is
# written, so a renamed series or a wrong id never reaches the page. A failure keeps the
# committed file; a FiscalData outage alone keeps only the committed duties block.
. "$PSScriptRoot\common.ps1"

# ---- helpers ----
# Pulls a set of {ids, re} definitions and keys the points by period ($keyOf: ToMonth or
# ToQuarter), scaled and rounded; returns the FRED ids/titles used and the values per period.
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
# One row per period of the first key, every other key null where it has no value.
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
$toMonth = { param($d) ToMonth $d }
$toQuarter = { param($d) ToQuarter $d }
$allSeries = [ordered]@{}

# ---- 1. the FT-900 headline block: balance of payments basis, seasonally adjusted, $ millions -> $ billions ----
$bopDefs = [ordered]@{
  bal  = @{ ids = @("BOPGSTB"); re = '^Trade Balance: Goods and Services, Balance of Payments Basis$' }
  balG = @{ ids = @("BOPGTB");  re = '^Trade Balance: Goods, Balance of Payments Basis$' }
  balS = @{ ids = @("BOPSTB");  re = '^Trade Balance: Services, Balance of Payments Basis$' }
  exp  = @{ ids = @("BOPTEXP"); re = '^Exports of Goods and Services[:,] Balance of Payments Basis$' }
  imp  = @{ ids = @("BOPTIMP"); re = '^Imports of Goods and Services[:,] Balance of Payments Basis$' }
  expG = @{ ids = @("BOPGEXP"); re = '^Exports of Goods[:,] Balance of Payments Basis$' }
  impG = @{ ids = @("BOPGIMP"); re = '^Imports of Goods[:,] Balance of Payments Basis$' }
  expS = @{ ids = @("BOPSEXP"); re = '^Exports of Services[:,] Balance of Payments Basis$' }
  impS = @{ ids = @("BOPSIMP"); re = '^Imports of Services[:,] Balance of Payments Basis$' }
}
$bop = Pull $bopDefs "1992-01-01" $toMonth 0.001 3
foreach ($k in $bop.series.Keys) { $allSeries[$k] = $bop.series[$k] }
$monthly = @(BuildRows $bop.by @($bopDefs.Keys))
# The FT-900's own arithmetic, within the rounding of the published $ millions.
Check "balance = exports - imports" $monthly { (& $has $_ @("bal","exp","imp")) -and [math]::Abs($_.bal - ($_.exp - $_.imp)) -gt 0.003 }
Check "goods balance = goods exports - goods imports" $monthly { (& $has $_ @("balG","expG","impG")) -and [math]::Abs($_.balG - ($_.expG - $_.impG)) -gt 0.003 }
Check "services balance = services exports - services imports" $monthly { (& $has $_ @("balS","expS","impS")) -and [math]::Abs($_.balS - ($_.expS - $_.impS)) -gt 0.003 }
Check "exports = goods + services" $monthly { (& $has $_ @("exp","expG","expS")) -and [math]::Abs($_.exp - ($_.expG + $_.expS)) -gt 0.003 }
Check "imports = goods + services" $monthly { (& $has $_ @("imp","impG","impS")) -and [math]::Abs($_.imp - ($_.impG + $_.impS)) -gt 0.003 }
$complete = @($monthly | Where-Object { & $has $_ @("bal","balG","balS","exp","imp") })
$lastM = $complete[$complete.Count - 1]
Write-Output ("FT-900: {0} months, {1} .. {2}; latest {2}: balance {3}B (goods {4}B, services {5}B), exports {6}B, imports {7}B" -f $monthly.Count, $monthly[0].d, $lastM.d, $lastM.bal, $lastM.balG, $lastM.balS, $lastM.exp, $lastM.imp)

# ---- 2. import and export price indexes (BLS, via FRED): end-use aggregates and localities of origin ----
# End-use indexes are 2000 = 100 and the locality indexes December 2003 = 100; both not seasonally
# adjusted, and both exclude duties, insurance and freight (the price at the foreign port).
$priceDefs = [ordered]@{
  ir    = @{ ids = @("IR");        re = '^Import Price Index \(End Use\): All Commodities$' }
  iq    = @{ ids = @("IQ");        re = '^Export Price Index \(End Use\): All Commodities$' }
  irxp  = @{ ids = @("IREXPET");   re = '^Import Price Index \(End Use\): All Imports Excluding Petroleum$' }
  iqxa  = @{ ids = @("IQEXAG");    re = '^Export Price Index \(End Use\): Nonagricultural Commodities$' }
  irxff = @{ ids = @("IREXFDFLS"); re = '^Import Price Index \(End Use\): All Imports Excluding Food and Fuels$' }
  iqxff = @{ ids = @("IQEXFDFLS"); re = '^Export Price Index \(End Use\): All Exports Excluding Food and Fuels$' }
  crude = @{ ids = @("IR10000");   re = '^Import Price Index \(End Use\): Crude Oil$' }
  cn    = @{ ids = @("CHNTOT");    re = '^Import Price Index by Origin \(NAICS\): All Industries for China$' }
  mx    = @{ ids = @("MEXTOT");    re = '^Import Price Index by Origin \(NAICS\): All Industries for Mexico$' }
  ca    = @{ ids = @("CANTOT");    re = '^Import Price Index by Origin \(NAICS\): All Industries for Canada$' }
  jp    = @{ ids = @("JPNTOT");    re = '^Import Price Index by Origin \(NAICS\): All Industries for Japan$' }
  eu    = @{ ids = @("EECTOT");    re = '^Import Price Index by Origin \(NAICS\): All Industries for European Union$' }
  asean = @{ ids = @("ASEANTOT");  re = '^Import Price Index by Origin \(NAICS\): All Industries for Association of Southeast Asian Nations$' }
}
$prc = Pull $priceDefs "1990-01-01" $toMonth 1 1
foreach ($k in $prc.series.Keys) { $allSeries[("price_" + $k)] = $prc.series[$k] }
$prices = @(BuildRows $prc.by @($priceDefs.Keys))
Check "price indexes are positive" $prices { foreach ($k in @($priceDefs.Keys)) { if ($null -ne $_.$k -and $_.$k -le 0) { return $true } }; $false }
$pComplete = @($prices | Where-Object { & $has $_ @("ir","iq") })
$lastP = $pComplete[$pComplete.Count - 1]
$agoP = @($prices | Where-Object { $_.d -eq ("{0}-{1}" -f ([int]$lastP.d.Substring(0,4) - 1), $lastP.d.Substring(5,2)) })
$irYoy = $(if ($agoP.Count -and $agoP[0].ir) { [math]::Round(($lastP.ir / $agoP[0].ir - 1) * 100, 1) } else { $null })
Write-Output ("import/export prices: {0} months, {1} .. {2}; latest import prices {3} ({4}% y/y), export prices {5}" -f $prices.Count, $prices[0].d, $lastP.d, $lastP.ir, $irYoy, $lastP.iq)

# ---- 3. goods trade by partner (Census basis: exports f.a.s., imports customs value; not seasonally adjusted) ----
# The largest partners by total trade plus the European Union as a bloc and the world total; each
# pair's title must name the partner. Stored as one array per partner aligned on a shared month list.
$partnerDefs = [ordered]@{
  mx    = @{ exp = "EXPMX";   imp = "IMPMX";   re = 'Mexico' }
  ca    = @{ exp = "EXPCA";   imp = "IMPCA";   re = 'Canada' }
  cn    = @{ exp = "EXPCH";   imp = "IMPCH";   re = '(Mainland )?China' }
  eu    = @{ exp = "EXP0003"; imp = "IMP0003"; re = 'European Union' }
  de    = @{ exp = "EXPGE";   imp = "IMPGE";   re = 'Germany' }
  jp    = @{ exp = "EXPJP";   imp = "IMPJP";   re = 'Japan' }
  vn    = @{ exp = "EXP5520"; imp = "IMP5520"; re = 'Vietnam' }
  kr    = @{ exp = "EXPKR";   imp = "IMPKR";   re = 'South Korea' }
  tw    = @{ exp = "EXP5830"; imp = "IMP5830"; re = 'Taiwan' }
  uk    = @{ exp = "EXPUK";   imp = "IMPUK";   re = '(the )?United Kingdom' }
  ind   = @{ exp = "EXP5330"; imp = "IMP5330"; re = 'India' }
  ie    = @{ exp = "EXP4190"; imp = "IMP4190"; re = 'Ireland' }
  sw    = @{ exp = "EXP4419"; imp = "IMP4419"; re = 'Switzerland' }
  nl    = @{ exp = "EXP4210"; imp = "IMP4210"; re = '(the )?Netherlands' }
  it    = @{ exp = "EXP4759"; imp = "IMP4759"; re = 'Italy' }
  fr    = @{ exp = "EXPFR";   imp = "IMPFR";   re = 'France' }
  world = @{ exp = "EXP0004"; imp = "IMP0004"; re = '(the )?World' }
}
$pFrom = "1999-01-01"
$pData = [ordered]@{}; $pBy = @{}
foreach ($k in $partnerDefs.Keys) {
  $pd = $partnerDefs[$k]
  $e = Get-FredChecked @($pd.exp) ('^U\.S\. Exports of Goods by F\.A\.S\. Basis to ' + $pd.re + '$') $pFrom
  $i = Get-FredChecked @($pd.imp) ('^U\.S\. Imports of Goods by Customs Basis from ' + $pd.re + '$') $pFrom
  $allSeries[("exp_" + $k)] = [ordered]@{ id = $e.id; title = $e.title }
  $allSeries[("imp_" + $k)] = [ordered]@{ id = $i.id; title = $i.title }
  $em = @{}; foreach ($p in $e.points) { $em[(ToMonth $p.d)] = [math]::Round($p.v / 1000, 3) }
  $im = @{}; foreach ($p in $i.points) { $im[(ToMonth $p.d)] = [math]::Round($p.v / 1000, 3) }
  $pBy[$k] = @{ exp = $em; imp = $im }
}
$months = @($pBy["world"].imp.Keys | Sort-Object)
foreach ($k in $partnerDefs.Keys) {
  $pData[$k] = [ordered]@{
    exp = @($months | ForEach-Object { if ($pBy[$k].exp.ContainsKey($_)) { $pBy[$k].exp[$_] } else { $null } })
    imp = @($months | ForEach-Object { if ($pBy[$k].imp.ContainsKey($_)) { $pBy[$k].imp[$_] } else { $null } })
  }
}
# No partner can exceed the world total, and the partners together must stay below it.
for ($mi = 0; $mi -lt $months.Count; $mi++) {
  $wE = $pData["world"].exp[$mi]; $wI = $pData["world"].imp[$mi]
  if ($null -eq $wE -or $null -eq $wI) { continue }
  $sumE = 0; $sumI = 0
  foreach ($k in $partnerDefs.Keys) {
    if ($k -eq "world" -or $k -eq "eu") { continue }
    $e = $pData[$k].exp[$mi]; $i = $pData[$k].imp[$mi]
    if ($null -ne $e) { if ($e -gt $wE) { throw ("partner {0} exports exceed the world total in {1}" -f $k, $months[$mi]) }; $sumE += $e }
    if ($null -ne $i) { if ($i -gt $wI) { throw ("partner {0} imports exceed the world total in {1}" -f $k, $months[$mi]) }; $sumI += $i }
  }
  if ($sumE -gt $wE -or $sumI -gt $wI) { throw ("the partners add up to more than the world total in {0}" -f $months[$mi]) }
  if ($null -ne $pData["eu"].imp[$mi] -and $pData["eu"].imp[$mi] -gt $wI) { throw ("EU imports exceed the world total in {0}" -f $months[$mi]) }
}
$pLast = @($months | Where-Object { $i = [array]::IndexOf($months, $_); $null -ne $pData["world"].imp[$i] -and $null -ne $pData["cn"].imp[$i] -and $null -ne $pData["mx"].imp[$i] })
$partnersAsOf = $pLast[$pLast.Count - 1]
$li = [array]::IndexOf($months, $partnersAsOf)
Write-Output ("partners: {0} partners + world, {1} months, {2} .. {3}; {3} imports: world {4}B, Mexico {5}B, China {6}B, Canada {7}B" -f ($partnerDefs.Count - 1), $months.Count, $months[0], $partnersAsOf, $pData["world"].imp[$li], $pData["mx"].imp[$li], $pData["cn"].imp[$li], $pData["ca"].imp[$li])
$partners = [ordered]@{ months = $months; data = $pData; asOf = $partnersAsOf }

# ---- 4. customs duties (Monthly Treasury Statement, table 4, via FiscalData; $ -> $ billions) ----
# Gross receipts, refunds and net receipts for each month, from March 2015 (the API's first
# statement). Cash basis: duties are paid at entry or on the importer's monthly statement, so a
# month's receipts fall on roughly that month's imports; the page divides them by the month's
# customs-value imports for an effective rate and says it is an approximation.
$customs = $null
try {
  $api = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_4"
  $q = $api + "?filter=classification_desc:eq:Customs%20Duties&fields=record_date,classification_desc,current_month_gross_rcpt_amt,current_month_refund_amt,current_month_net_rcpt_amt,record_calendar_year,record_calendar_month&sort=record_date&page[size]=2000"
  $r = Invoke-Retry { Invoke-RestMethod -Uri $q -TimeoutSec 300 }
  $byMonth = @{}
  foreach ($row in @($r.data)) {
    if ($row.classification_desc -ne "Customs Duties") { continue }
    if ("$($row.current_month_net_rcpt_amt)" -notmatch '^-?\d' -or "$($row.current_month_gross_rcpt_amt)" -notmatch '^-?\d') { continue }
    $d = "{0}-{1:D2}" -f [int]$row.record_calendar_year, [int]$row.record_calendar_month
    $byMonth[$d] = [ordered]@{ d = $d
      gross = [math]::Round([double]$row.current_month_gross_rcpt_amt / 1e9, 3)
      refund = [math]::Round([double]$row.current_month_refund_amt / 1e9, 3)
      net = [math]::Round([double]$row.current_month_net_rcpt_amt / 1e9, 3) }
  }
  $cRows = @($byMonth.Keys | Sort-Object | ForEach-Object { $byMonth[$_] })
  if ($cRows.Count -lt 24) { throw ("only {0} months of customs duties returned" -f $cRows.Count) }
  Check "customs duties: net = gross - refunds" $cRows { [math]::Abs($_.net - ($_.gross - $_.refund)) -gt 0.0025 -or $_.gross -le 0 }
  $cLast = $cRows[$cRows.Count - 1]
  Write-Output ("customs duties: {0} months, {1} .. {2}; latest {2}: net {3}B (gross {4}B)" -f $cRows.Count, $cRows[0].d, $cLast.d, $cLast.net, $cLast.gross)
  $customs = [ordered]@{ monthly = $cRows; asOf = $cLast.d; source = "FiscalData MTS table 4"; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
} catch {
  Write-Host ("::warning::customs duties could not be refreshed ({0}); keeping the committed block" -f $_.Exception.Message.Split([char]10)[0])
  $prevPath = Join-Path $script:data "trade_processed.json"
  if (Test-Path $prevPath) {
    try { $prev = Get-Content $prevPath -Raw -Encoding UTF8 | ConvertFrom-Json; if ($prev.customs -and $prev.customs.monthly) { $customs = $prev.customs; Write-Output ("customs duties: committed block kept, through {0}" -f $prev.customs.asOf) } } catch {}
  }
}

# ---- 5. the national accounts' trade lines (BEA NIPA via FRED), quarterly, SAAR ----
# Nominal exports, imports and net exports ($ billions), real ones (chained 2017 dollars),
# the contributions of exports, imports and net exports to real GDP growth (percentage points)
# and nominal GDP for the ratios.
$nipaDefs = [ordered]@{
  expN = @{ ids = @("EXPGS");          re = '^Exports of Goods and Services$' }
  impN = @{ ids = @("IMPGS");          re = '^Imports of Goods and Services$' }
  netN = @{ ids = @("NETEXP");         re = '^Net Exports of Goods and Services$' }
  expR = @{ ids = @("EXPGSC1");        re = '^Real Exports of Goods and Services$' }
  impR = @{ ids = @("IMPGSC1");        re = '^Real Imports of Goods and Services$' }
  netR = @{ ids = @("NETEXC");         re = '^Real Net Exports of Goods and Services$' }
  cNet = @{ ids = @("A019RY2Q224SBEA"); re = '^Contributions to percent change in real gross domestic product: Net exports of goods and services$' }
  cExp = @{ ids = @("A020RY2Q224SBEA"); re = '^Contributions to percent change in real gross domestic product: Exports of goods and services$' }
  cImp = @{ ids = @("A021RY2Q224SBEA"); re = '^Contributions to percent change in real gross domestic product: Imports of goods and services$' }
  gdp  = @{ ids = @("GDP");            re = '^Gross Domestic Product$' }
}
$nipa = Pull $nipaDefs "1947-01-01" $toQuarter 1 2
foreach ($k in $nipa.series.Keys) { $allSeries[("nipa_" + $k)] = $nipa.series[$k] }
$quarterly = @(BuildRows $nipa.by @($nipaDefs.Keys))
Check "net exports = exports - imports (nominal)" $quarterly { (& $has $_ @("netN","expN","impN")) -and [math]::Abs($_.netN - ($_.expN - $_.impN)) -gt 0.25 }
Check "net export contribution = exports + imports contributions" $quarterly { (& $has $_ @("cNet","cExp","cImp")) -and [math]::Abs($_.cNet - ($_.cExp + $_.cImp)) -gt 0.025 }
$qComplete = @($quarterly | Where-Object { & $has $_ @("netN","gdp","cNet") })
$lastQ = $qComplete[$qComplete.Count - 1]
Write-Output ("NIPA trade: {0} quarters, {1} .. {2}; latest {2}: net exports {3}B ({4}% of GDP), contribution {5} pp" -f $quarterly.Count, $quarterly[0].d, $lastQ.d, $lastQ.netN, [math]::Round($lastQ.netN / $lastQ.gdp * 100, 1), $lastQ.cNet)

$obj = [ordered]@{
  monthly = $monthly; asOf = $lastM.d
  prices = $prices; pricesAsOf = $lastP.d
  partners = $partners
  customs = $customs
  quarterly = $quarterly; quarterlyAsOf = $lastQ.d
  series = $allSeries
  fetchedAt = (Get-Date -Format "yyyy-MM-dd")
}
Save-Json $obj "trade_processed.json" 8

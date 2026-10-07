# Material updates -> one GitHub issue per run that found new releases or
# revisions of figures already reported. GitHub
# emails the repository owner about every issue opened in a repo they watch
# (their own, by default), so the issue is only a delivery channel: no mail
# server, no credentials, nothing running on anyone's computer.
#
# What counts as a release: a new period in any tracked series (CPI, PPI, jobs,
# PCE, GDP, retail, sentiment prelim/final, Treasury statement, Challenger,
# CAPE, BLS productivity, NIPA corporate profits, the Z.1 debt accounts, the New
# York Fed's household debt report, the G.19 and the FDIC's bank aggregates) and a
# weekly SPR move of 3 million barrels or more. The body is the
# page's own "At a glance" text for each affected section (read out of the
# built page under Node), so the email says exactly what the dashboard says.
# Thresholds below decide whether the subject is marked MATERIAL.
#
# Revisions: for the releases whose figures get revised (GDP estimates and annual
# updates, payrolls, PCE, PPI and CPI months, Census retail benchmarks), the state
# also keeps the headline figures of the last three periods as last reported. A
# figure that has since moved by more than its noise band is reported as a
# revision: inside the next release's alert when it arrives with one (payrolls,
# PCE), or as an alert of its own when nothing new was published (a GDP estimate,
# a benchmark revision). Bands, per figure: GDP growth 0.1 pp (MATERIAL from
# 0.5 pp); CPI, PPI and PCE y/y 0.1 pp (MATERIAL from 0.2 pp); payroll change 10K
# (MATERIAL from 50K, also for the net of the months revised); unemployment rate
# 0.1 pp (MATERIAL from 0.2 pp); retail level 0.3% (MATERIAL from 1%) and m/m
# 0.2 pp (MATERIAL from 0.5 pp); productivity q/q 0.3 pp (MATERIAL from 1 pp) and
# unit labor costs q/q 0.5 pp (from 1.5 pp); the corporate profit margin 0.1 pp
# (from 0.5 pp); nonfinancial corporate debt as % of GDP 0.3 pp (from 1.5 pp);
# household debt 1% (from 3%); the banks' Tier 1 leverage ratio 0.05 pp (from 0.25 pp).
#
# A release missing from the state (a section added to the page) is seeded from the
# current data without sending anything, like a missing state file.
#
# State (the last period reported per release, and those figures) lives next to
# the data and is committed with it. A missing state file, or a release missing
# from it, is seeded from the current data without sending anything.
# -DumpValues prints the figures the state would keep for the data in
# MACRO_DATA_DIR, and stops.
param([string]$Page = "", [switch]$DumpValues)
. "$PSScriptRoot\common.ps1"
$statePath = Join-Path $data "alerts_state.json"
function LoadJson([string]$f) { $p = Join-Path $data $f; if (Test-Path $p) { Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null } }
$cpi = LoadJson "bls_cpi_processed3.json"; $ppi = LoadJson "ppi_processed.json"; $labor = LoadJson "labor_processed.json"; $ls = LoadJson "labor_static.json"
$pce = LoadJson "pce_processed.json"; $gdp = LoadJson "gdp_processed.json"; $retail = LoadJson "retail_processed.json"; $umich = LoadJson "umich_processed.json"
$fiscal = LoadJson "fiscal_processed.json"; $spr = LoadJson "spr_processed.json"; $cape = LoadJson "cape_processed.json"
$prod = LoadJson "productivity_processed.json"; $profits = LoadJson "profits_processed.json"; $debt = LoadJson "debt_processed.json"
$hh = LoadJson "hhdebt_processed.json"; $banks = LoadJson "banks_processed.json"

function Pts($series) { if ($series -and $series.points) { @($series.points | Where-Object { $null -ne $_.v -or $null -ne $_.yoy -or $null -ne $_.idx }) } else { @() } }
function Last($arr, [int]$back = 0) { if ($arr.Count -gt $back) { $arr[$arr.Count - 1 - $back] } else { $null } }
function Mon([string]$ym) { $m = @("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"); if ($ym -match '^(\d{4})-(\d{2})') { "{0} {1}" -f $m[[int]$Matches[2] - 1], $Matches[1] } else { $ym } }
function Sg($v, [int]$d = 1) { if ($null -eq $v) { "n/a" } else { ("{0}{1}" -f $(if ($v -ge 0) { "+" } else { [string][char]0x2212 }), [math]::Abs($v).ToString("F$d")) } }
function N0($v) { [math]::Round($v).ToString("N0") }

# ---- current period per release ----
$cur = [ordered]@{}
if ($cpi) { $cur.cpi = (Last (Pts $cpi.CUUR0000SA0)).d }
if ($ppi) { $cur.ppi = (Last (Pts $ppi.WPUFD4)).d }
if ($labor) { $cur.jobs = (Last (Pts $labor.CES0000000001)).d }
if ($pce) { $cur.pce = (Last (Pts $pce.L1)).d }
if ($gdp) { $cur.gdp = (Last (Pts $gdp.growth.L1)).d }
if ($retail) { $cur.retail = (Last (Pts $retail.marts.'44X72')).d }
if ($umich) { $cur.sentiment = $umich.stats.currentMonth + $(if ($umich.stats.currentIsPrelim) { "p" } else { "" }) }
if ($fiscal) { $cur.fiscal = $fiscal.statementDate }
if ($ls -and $ls.challenger) { $cur.cuts = $ls.challenger.asOfMonth }
if ($spr -and $spr.weekly) { $cur.spr = $spr.weekly[$spr.weekly.Count - 1].d }
if ($cape) { $cur.cape = $cape.asOfMonth }
if ($prod -and $prod.asOf) { $cur.productivity = $prod.asOf }
if ($profits -and $profits.asOf) { $cur.profits = $profits.asOf }
if ($debt -and $debt.asOf) { $cur.debt = $debt.asOf }
if ($hh -and $hh.nyfed -and $hh.nyfed.asOf) { $cur.hhdebt = $hh.nyfed.asOf }
if ($hh -and $hh.g19 -and $hh.g19.asOf) { $cur.g19 = $hh.g19.asOf }
if ($banks -and $banks.asOf) { $cur.banks = $banks.asOf }
# Quarterly rows ("2026-Q2") of the quarterly sections: the last $n with a value in $field.
function QRows($rows, [string]$field, [int]$n = 3) { $a = @($rows | Where-Object { $null -ne $_.$field }); if ($a.Count -gt $n) { $a[($a.Count - $n)..($a.Count - 1)] } else { $a } }

# ---- the revisable figures of the last three periods, per release ----
$revKeys = @("cpi", "ppi", "jobs", "pce", "gdp", "retail", "productivity", "profits", "debt", "hhdebt", "banks")
$revTitle = @{ cpi = "Consumer Price Index"; ppi = "Producer Price Index"; jobs = "Jobs report"; pce = "PCE prices, income and spending"; gdp = "Real GDP"; retail = "Retail sales"
  productivity = "Productivity and costs"; profits = "Corporate profits and labor share"; debt = "Private sector debt (Z.1)"; hhdebt = "Household debt (New York Fed)"; banks = "Bank capital (FDIC)" }
$revShort = @{ cpi = "CPI"; ppi = "PPI"; jobs = "Payrolls"; pce = "PCE"; gdp = "GDP"; retail = "Retail"; productivity = "Productivity"; profits = "Profit margin"; debt = "Corporate debt"; hhdebt = "Household debt"; banks = "Bank capital" }
$revViews = @{ cpi = @("cpi"); ppi = @("ppi"); jobs = @("payrolls", "unemployment"); pce = @("pce", "income"); gdp = @("gdp"); retail = @("retail")
  productivity = @("productivity"); profits = @("profits"); debt = @("debt"); hhdebt = @("hhdebt"); banks = @("banks") }
function PeriodLabel([string]$d) { if ($d -match '^(\d{4})-Q(\d)$') { "Q{0} {1}" -f $Matches[2], $Matches[1] } else { Mon $d } }
function YoyPairs($a, $b, [string]$fa, [string]$fb) {
  $out = [ordered]@{}; $byB = @{}; foreach ($q in (Pts $b)) { $byB[$q.d] = $q.yoy }
  $pa = @(Pts $a | Where-Object { $null -ne $_.yoy }); $from = [math]::Max(0, $pa.Count - 3)
  for ($i = $from; $i -lt $pa.Count; $i++) {
    $row = [ordered]@{}; $row[$fa] = [math]::Round([double]$pa[$i].yoy, 2)
    if ($byB.ContainsKey($pa[$i].d) -and $null -ne $byB[$pa[$i].d]) { $row[$fb] = [math]::Round([double]$byB[$pa[$i].d], 2) }
    $out[$pa[$i].d] = $row
  }
  return $out
}
function Get-RevValues([string]$k) {
  $out = [ordered]@{}
  switch ($k) {
    "cpi" { $out = YoyPairs $cpi.CUUR0000SA0 $cpi.CUUR0000SA0L1E "yoy" "core" }
    "ppi" { $out = YoyPairs $ppi.WPUFD4 $ppi.WPUFD49104 "yoy" "core" }
    "pce" { $out = YoyPairs $pce.L1 $pce.L25 "yoy" "core" }
    "gdp" { $g = Pts $gdp.growth.L1; for ($i = [math]::Max(0, $g.Count - 3); $i -lt $g.Count; $i++) { $out[$g[$i].d] = [ordered]@{ v = [math]::Round([double]$g[$i].v, 1) } } }
    "jobs" {
      $nf = Pts $labor.CES0000000001; $byU = @{}; foreach ($q in (Pts $labor.LNS14000000)) { $byU[$q.d] = $q.v }
      for ($i = [math]::Max(1, $nf.Count - 3); $i -lt $nf.Count; $i++) {
        $row = [ordered]@{ chg = [math]::Round([double]$nf[$i].v - [double]$nf[$i - 1].v, 0) }
        if ($byU.ContainsKey($nf[$i].d)) { $row.ur = [math]::Round([double]$byU[$nf[$i].d], 1) }
        $out[$nf[$i].d] = $row
      }
    }
    "retail" { $t = Pts $retail.marts.'44X72'; for ($i = [math]::Max(0, $t.Count - 3); $i -lt $t.Count; $i++) { $out[$t[$i].d] = [ordered]@{ lvl = [math]::Round([double]$t[$i].v, 0); mom = $(if ($null -ne $t[$i].mom) { [math]::Round([double]$t[$i].mom, 2) } else { $null }) } } }
    "productivity" { foreach ($r in (QRows $prod.quarterly "prodQ")) { $out[$r.d] = [ordered]@{ q = [math]::Round([double]$r.prodQ, 1); ulc = $(if ($null -ne $r.ulcQ) { [math]::Round([double]$r.ulcQ, 1) } else { $null }) } } }
    "profits" { foreach ($r in (QRows $profits.quarterly "profits")) { $out[$r.d] = [ordered]@{ margin = [math]::Round([double]$r.profits / [double]$r.gva * 100, 2) } } }
    "debt" { foreach ($r in (QRows ($debt.quarterly | Where-Object { $null -ne $_.gdp }) "nfc")) { $out[$r.d] = [ordered]@{ nfcGdp = [math]::Round([double]$r.nfc / [double]$r.gdp * 100, 2) } } }
    "hhdebt" { foreach ($r in (QRows $hh.nyfed.balances "total")) { $out[$r.d] = [ordered]@{ total = [math]::Round([double]$r.total, 3) } } }
    "banks" { foreach ($r in (QRows $banks.quarterly "t1")) { $out[$r.d] = [ordered]@{ lev = [math]::Round([double]$r.t1 / [double]$r.avgAssets * 100, 2) } } }
  }
  return $out
}
# One field's revision as text, with whether it clears the note band and the MATERIAL band.
function RevField([string]$k, [string]$f, [double]$old, [double]$now) {
  $d = $now - $old
  switch ("$k/$f") {
    { $_ -in "cpi/yoy", "ppi/yoy", "pce/yoy" } { return @{ note = [math]::Abs($d) -ge 0.095; mat = [math]::Abs($d) -ge 0.195; text = ("{0} y/y {1}% (was {2}%)" -f $revShort[$k], $now.ToString("F1"), $old.ToString("F1")) } }
    { $_ -in "cpi/core", "ppi/core", "pce/core" } { return @{ note = [math]::Abs($d) -ge 0.095; mat = [math]::Abs($d) -ge 0.195; text = ("core {0}% (was {1}%)" -f $now.ToString("F1"), $old.ToString("F1")) } }
    "gdp/v" { return @{ note = [math]::Abs($d) -ge 0.05; mat = [math]::Abs($d) -ge 0.45; text = ("{0}% (was {1}%, {2} pp)" -f $now.ToString("F1"), $old.ToString("F1"), (Sg $d)) } }
    "jobs/chg" { return @{ note = [math]::Abs($d) -ge 10; mat = [math]::Abs($d) -ge 50; text = ("{0}K (was {1}K)" -f (Sg $now 0), (Sg $old 0)) } }
    "jobs/ur" { return @{ note = [math]::Abs($d) -ge 0.05; mat = [math]::Abs($d) -ge 0.15; text = ("unemployment {0}% (was {1}%)" -f $now.ToString("F1"), $old.ToString("F1")) } }
    "retail/lvl" { $pc = $(if ($old -ne 0) { ($now / $old - 1) * 100 } else { 0 }); return @{ note = [math]::Abs($pc) -ge 0.3; mat = [math]::Abs($pc) -ge 1.0; text = ("`${0}B (was `${1}B, {2}%)" -f ($now / 1000).ToString("F1"), ($old / 1000).ToString("F1"), (Sg $pc)) } }
    "retail/mom" { return @{ note = [math]::Abs($d) -ge 0.2; mat = [math]::Abs($d) -ge 0.5; text = ("m/m {0}% (was {1}%)" -f (Sg $now 2), (Sg $old 2)) } }
    "productivity/q" { return @{ note = [math]::Abs($d) -ge 0.25; mat = [math]::Abs($d) -ge 0.95; text = ("productivity {0}% q/q ann. (was {1}%)" -f (Sg $now), (Sg $old)) } }
    "productivity/ulc" { return @{ note = [math]::Abs($d) -ge 0.45; mat = [math]::Abs($d) -ge 1.45; text = ("unit labor costs {0}% q/q ann. (was {1}%)" -f (Sg $now), (Sg $old)) } }
    "profits/margin" { return @{ note = [math]::Abs($d) -ge 0.095; mat = [math]::Abs($d) -ge 0.45; text = ("margin {0}% (was {1}%)" -f $now.ToString("F1"), $old.ToString("F1")) } }
    "debt/nfcGdp" { return @{ note = [math]::Abs($d) -ge 0.25; mat = [math]::Abs($d) -ge 1.45; text = ("corporate debt {0}% of GDP (was {1}%)" -f $now.ToString("F1"), $old.ToString("F1")) } }
    "hhdebt/total" { $pc = $(if ($old -ne 0) { ($now / $old - 1) * 100 } else { 0 }); return @{ note = [math]::Abs($pc) -ge 1.0; mat = [math]::Abs($pc) -ge 3.0; text = ("`${0}T (was `${1}T, {2}%)" -f $now.ToString("F2"), $old.ToString("F2"), (Sg $pc)) } }
    "banks/lev" { return @{ note = [math]::Abs($d) -ge 0.045; mat = [math]::Abs($d) -ge 0.245; text = ("Tier 1 leverage {0}% (was {1}%)" -f $now.ToString("F2"), $old.ToString("F2")) } }
  }
  return $null
}
$nowVals = [ordered]@{}
foreach ($k in $revKeys) { if ($cur[$k]) { try { $nowVals[$k] = Get-RevValues $k } catch { Write-Output "alerts: figures for $k unavailable ($($_.Exception.Message))" } } }
if ($DumpValues) { Write-Output ($nowVals | ConvertTo-Json -Depth 6); return }

if (-not (Test-Path $statePath)) {
  $seed = [ordered]@{}; foreach ($k in $cur.Keys) { $seed[$k] = $cur[$k] }; $seed.values = $nowVals
  [System.IO.File]::WriteAllText($statePath, ($seed | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "alerts: no state file - seeded from the current data, nothing sent: $(($cur.Keys | ForEach-Object { $_ + '=' + $cur[$_] }) -join ' ')"
  return
}
$state = Get-Content $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
$isNew = { param($k) $c = $cur[$k]; $s = $state.$k; if (-not $c -or -not $s) { return $false }; ($c -ne $s) -and ($c.TrimEnd('p') -ge $s.TrimEnd('p')) }
$new = @($cur.Keys | Where-Object { & $isNew $_ })
# Releases the state has never seen (a section added to the page): recorded now, reported from the next period on.
$unseen = @($cur.Keys | Where-Object { -not $state.PSObject.Properties[$_] })

# ---- revisions: figures that moved since they were last reported ----
$stored = if ($state.PSObject.Properties["values"]) { $state.values } else { $null }
$revisions = [ordered]@{}
foreach ($k in $nowVals.Keys) {
  if (-not $stored -or -not $stored.PSObject.Properties[$k]) { continue }   # first sight: seeded below, nothing to compare
  $recs = New-Object System.Collections.ArrayList; $net = 0
  foreach ($pp in $stored.$k.PSObject.Properties) {
    if (-not $nowVals[$k].Contains($pp.Name)) { continue }
    $nowRow = $nowVals[$k][$pp.Name]; $texts = @(); $mat = $false
    foreach ($f in $pp.Value.PSObject.Properties) {
      if ($null -eq $f.Value -or -not $nowRow.Contains($f.Name) -or $null -eq $nowRow[$f.Name]) { continue }
      $r = RevField $k $f.Name ([double]$f.Value) ([double]$nowRow[$f.Name])
      if ($r -and $r.note) { $texts += $r.text; if ($r.mat) { $mat = $true } }
      if ($k -eq "jobs" -and $f.Name -eq "chg") { $net += [double]$nowRow[$f.Name] - [double]$f.Value }
    }
    if ($texts.Count) { [void]$recs.Add([PSCustomObject]@{ period = $pp.Name; figures = ($texts -join ", "); text = (PeriodLabel $pp.Name) + ": " + ($texts -join ", "); material = $mat }) }
  }
  if ($recs.Count) {
    $recs = @($recs | Sort-Object period -Descending)
    $isMat = [bool](@($recs | Where-Object { $_.material }).Count) -or ($k -eq "jobs" -and [math]::Abs($net) -ge 50)
    # "text" lists every period revised (the alert's Revision line); "short" names the
    # newest one only, for the subject.
    $netNote = $(if ($k -eq "jobs" -and $recs.Count -gt 1) { "; net {0}K" -f (Sg $net 0) } else { "" })
    $revisions[$k] = [PSCustomObject]@{ records = $recs; material = $isMat; net = $net; text = (($recs | ForEach-Object { $_.text }) -join "; ") + $netNote; short = (PeriodLabel $recs[0].period) + " revised to " + $recs[0].figures + $netNote }
  }
}
$revOnly = @($revisions.Keys | Where-Object { $_ -notin $new })
$seedOnly = @($nowVals.Keys | Where-Object { -not $stored -or -not $stored.PSObject.Properties[$_] })

# The figures kept for next time: refreshed for every release reported now (new
# period or revision) and seeded for any not kept yet; the rest keep what was
# last reported, so small drifts add up until they clear their band.
function Save-State {
  $vals = [ordered]@{}
  foreach ($k in $revKeys) {
    if ($nowVals.Contains($k) -and ($k -in $new -or $revisions.Contains($k) -or $k -in $seedOnly)) { $vals[$k] = $nowVals[$k] }
    elseif ($stored -and $stored.PSObject.Properties[$k]) { $vals[$k] = $stored.$k }
  }
  foreach ($k in (@($new) + @($unseen))) { if ($state.PSObject.Properties[$k]) { $state.$k = $cur[$k] } else { $state | Add-Member -NotePropertyName $k -NotePropertyValue $cur[$k] } }
  if ($state.PSObject.Properties["values"]) { $state.values = $vals } else { $state | Add-Member -NotePropertyName values -NotePropertyValue $vals }
  [System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
}

if (-not $new.Count -and -not $revOnly.Count) {
  if ($seedOnly.Count -or $unseen.Count) { Save-State; Write-Output "alerts: nothing new; seeded $((@($unseen) + @($seedOnly) | Sort-Object -Unique) -join ', ')" }
  else { Write-Output "alerts: nothing new (state matches the data)" }
  return
}
if ($new.Count) { Write-Output "alerts: new releases: $($new -join ', ')" }
if ($revisions.Count) { Write-Output "alerts: revisions: $(($revisions.Keys | ForEach-Object { $_ + ' (' + $revisions[$_].text + ')' }) -join ' | ')" }

# ---- headline figures and materiality, per release ----
$items = New-Object System.Collections.ArrayList
function AddItem([string]$key, [string]$title, [string]$period, [string]$headline, [bool]$material, [string[]]$views, [bool]$notify = $true) {
  [void]$items.Add([PSCustomObject]@{ key = $key; title = $title; period = $period; headline = $headline; material = $material; views = $views; notify = $notify })
}
foreach ($k in $new) {
  try {
    switch ($k) {
      "cpi" {
        $h = Pts $cpi.CUUR0000SA0; $c = Pts $cpi.CUUR0000SA0L1E; $hs = Pts $cpi.CUSR0000SA0; $cs = Pts $cpi.CUSR0000SA0L1E
        $hL = Last $h; $hP = Last $h 1; $cL = Last $c; $cP = Last $c 1
        $mat = ([math]::Abs($hL.yoy - $hP.yoy) -ge 0.2) -or ([math]::Abs($cL.yoy - $cP.yoy) -ge 0.2) -or ((Last $hs) -and [math]::Abs((Last $hs).mom) -ge 0.4) -or ((Last $cs) -and [math]::Abs((Last $cs).mom) -ge 0.3)
        AddItem $k "Consumer Price Index" (Mon $hL.d) ("CPI {0} {1}% YoY ({2}pp), core {3}%" -f (Mon $hL.d), $hL.yoy.ToString("F1"), (Sg ($hL.yoy - $hP.yoy)), $cL.yoy.ToString("F1")) $mat @("cpi")
      }
      "ppi" {
        $h = Pts $ppi.WPUFD4; $c = Pts $ppi.WPUFD49104; $hL = Last $h; $hP = Last $h 1; $cL = Last $c; $cP = Last $c 1
        $hs = if ($ppi.WPSFD4) { Pts $ppi.WPSFD4 } else { @() }; $cs = if ($ppi.WPSFD49104) { Pts $ppi.WPSFD49104 } else { @() }
        $mat = ([math]::Abs($hL.yoy - $hP.yoy) -ge 0.2) -or ([math]::Abs($cL.yoy - $cP.yoy) -ge 0.2) -or ((Last $hs) -and [math]::Abs((Last $hs).mom) -ge 0.4) -or ((Last $cs) -and [math]::Abs((Last $cs).mom) -ge 0.3)
        AddItem $k "Producer Price Index" (Mon $hL.d) ("PPI {0} {1}% YoY ({2}pp), core {3}%" -f (Mon $hL.d), $hL.yoy.ToString("F1"), (Sg ($hL.yoy - $hP.yoy)), $cL.yoy.ToString("F1")) $mat @("ppi")
      }
      "jobs" {
        $nf = Pts $labor.CES0000000001; $u = Pts $labor.LNS14000000
        $chg = (Last $nf).v - (Last $nf 1).v
        $prior = @(); for ($i = 1; $i -le 3; $i++) { if ($nf.Count -gt $i + 1) { $prior += ((Last $nf $i).v - (Last $nf ($i + 1)).v) } }
        $avg3 = if ($prior.Count) { ($prior | Measure-Object -Average).Average } else { $chg }
        $du = (Last $u).v - (Last $u 1).v
        $rev = 0; $pm = (Last $nf 1).d
        if ($ls.payrollInitial -and $ls.payrollInitial.PSObject.Properties[$pm]) { $rev = ((Last $nf 1).v - (Last $nf 2).v) - [double]$ls.payrollInitial.$pm }
        $mat = ([math]::Abs($chg - $avg3) -gt 75) -or ([math]::Abs($du) -ge 0.2) -or ([math]::Abs($rev) -ge 50)
        AddItem $k "Jobs report" (Mon (Last $nf).d) ("Jobs {0} {1}K, unemployment {2}%" -f (Mon (Last $nf).d), (Sg $chg 0), (Last $u).v.ToString("F1")) $mat @("payrolls", "unemployment")
      }
      "pce" {
        $h = Pts $pce.L1; $c = Pts $pce.L25; $hL = Last $h; $hP = Last $h 1; $cL = Last $c; $cP = Last $c 1
        $mat = ([math]::Abs($hL.yoy - $hP.yoy) -ge 0.2) -or ([math]::Abs($cL.yoy - $cP.yoy) -ge 0.2) -or ($null -ne $hL.mom -and [math]::Abs($hL.mom) -ge 0.4) -or ($null -ne $cL.mom -and [math]::Abs($cL.mom) -ge 0.3)
        AddItem $k "PCE prices, income and spending" (Mon $hL.d) ("PCE {0} {1}% YoY, core {2}% ({3}pp)" -f (Mon $hL.d), $hL.yoy.ToString("F1"), $cL.yoy.ToString("F1"), (Sg ($cL.yoy - $cP.yoy))) $mat @("pce", "income")
      }
      "gdp" {
        $g = Pts $gdp.growth.L1; $gL = Last $g; $gP = Last $g 1
        $mat = [math]::Abs($gL.v - $gP.v) -ge 1.0
        $qLabel = $gL.d -replace '^(\d{4})-Q(\d)$', 'Q$2 $1'
        AddItem $k "Real GDP" $qLabel ("GDP {0} {1}% annualized ({2}pp vs prior quarter)" -f $qLabel, $gL.v.ToString("F1"), (Sg ($gL.v - $gP.v))) $mat @("gdp")
      }
      "retail" {
        $M = $retail.marts; $tot = Pts $M.'44X72'; $tL = Last $tot; $tP = Last $tot 1
        $ctl = { param($d) $t = @($M.'44X72'.points | Where-Object { $_.d -eq $d })[0]; if (-not $t) { return $null }; $s = 0; foreach ($kk in "441","447","444","722") { $q = @($M.$kk.points | Where-Object { $_.d -eq $d })[0]; if (-not $q) { return $null }; $s += $q.v }; $t.v - $s }
        $cNow = & $ctl $tL.d; $cPrev = & $ctl $tP.d
        $ctlM = if ($null -ne $cNow -and $null -ne $cPrev) { ($cNow / $cPrev - 1) * 100 } else { $null }
        $mat = ([math]::Abs($tL.mom) -gt 0.8) -or ($null -ne $ctlM -and [math]::Abs($ctlM) -gt 0.5)
        AddItem $k "Retail sales" (Mon $tL.d) ("Retail {0} {1}% m/m, control {2}%" -f (Mon $tL.d), (Sg $tL.mom), $(if ($null -ne $ctlM) { Sg $ctlM } else { "n/a" })) $mat @("retail")
      }
      "sentiment" {
        $S = $umich.stats; $curV = [double]$S.current
        $prevV = if ($umich.ics -and $umich.ics.Count -ge 2) { if ($S.currentIsPrelim) { [double]$umich.ics[-1].v } else { [double]$umich.ics[-2].v } } else { $curV }
        $px1 = if ($S.currentIsPrelim -and $umich.prelim) { [double]$umich.prelim.px1 } elseif ($umich.px1) { [double]$umich.px1[-1].v } else { $null }
        $px1Prev = if ($umich.px1 -and $umich.px1.Count -ge 2) { if ($S.currentIsPrelim) { [double]$umich.px1[-1].v } else { [double]$umich.px1[-2].v } } else { $px1 }
        $mat = ([math]::Abs($curV - $prevV) -ge 3.0) -or ($null -ne $px1 -and [math]::Abs($px1 - $px1Prev) -ge 0.5)
        AddItem $k "Consumer sentiment" ((Mon $S.currentMonth) + $(if ($S.currentIsPrelim) { " (preliminary)" } else { " (final)" })) ("Sentiment {0}{1} {2} ({3} vs prior)" -f (Mon $S.currentMonth), $(if ($S.currentIsPrelim) { " prelim" } else { "" }), $curV.ToString("F1"), (Sg ($curV - $prevV))) $mat @("confidence")
      }
      "fiscal" {
        $Mn = $fiscal.monthly; $cM = $Mn[$Mn.Count - 1]
        $agoD = "{0}-{1}" -f ([int]$cM.d.Substring(0, 4) - 1), $cM.d.Substring(5, 2); $ago = @($Mn | Where-Object { $_.d -eq $agoD })[0]
        $intr = @($fiscal.functions | Where-Object { $_.name -eq "Net Interest" })[0]
        $mat = ($ago -and [math]::Abs($cM.dfct - $ago.dfct) -ge 50) -or ($intr -and $intr.pyfytd -and ($intr.fytd / $intr.pyfytd - 1) -ge 0.15)
        AddItem $k "Fiscal deficit (Monthly Treasury Statement)" (Mon $cM.d) ("Treasury {0}: {1} of `${2}B" -f (Mon $cM.d), $(if ($cM.dfct -ge 0) { "deficit" } else { "surplus" }), (N0 ([math]::Abs($cM.dfct)))) $mat @("fiscal")
      }
      "cuts" {
        $C = $ls.challenger; $mo = $C.monthly; $L = $mo[$mo.Count - 1]; $P = $mo[$mo.Count - 2]; $Y = if ($mo.Count -ge 13) { $mo[$mo.Count - 13] } else { $null }
        $momP = ($L.v / $P.v - 1) * 100; $yoyP = if ($Y) { ($L.v / $Y.v - 1) * 100 } else { 0 }
        $mat = ([math]::Abs($momP) -ge 30) -or ([math]::Abs($yoyP) -ge 30)
        AddItem $k "Announced job cuts (Challenger)" (Mon $L.d) ("Job cuts {0} {1} ({2}% m/m)" -f (Mon $L.d), (N0 $L.v), (Sg $momP 0)) $mat @("cuts")
      }
      "spr" {
        $W = $spr.weekly; $L = $W[$W.Count - 1]; $P = $W[$W.Count - 2]; $dlt = ($L.v - $P.v) / 1000
        $mat = [math]::Abs($dlt) -ge 3
        AddItem $k "Strategic Petroleum Reserve" $L.d ("SPR {0}: {1} M bbl ({2} M on the week)" -f $L.d, ($L.v / 1000).ToString("F1"), (Sg $dlt)) $mat @("spr") $mat
      }
      "cape" {
        $Pm = $cape.monthly; $L = $Pm[$Pm.Count - 1]; $P = $Pm[$Pm.Count - 2]
        $mat = [math]::Abs($L.cape - $P.cape) -ge 1.0
        AddItem $k "Shiller CAPE" (Mon $L.d) ("CAPE {0} {1} ({2} vs prior month)" -f (Mon $L.d), $L.cape.ToString("F1"), (Sg ($L.cape - $P.cape))) $mat @("cape")
      }
      "productivity" {
        $R = @(QRows $prod.quarterly "prodQ" 2); $L = $R[-1]; $P = $R[-2]
        $mat = ([math]::Abs([double]$L.prodQ) -ge 3.0) -or ([math]::Abs([double]$L.prodQ - [double]$P.prodQ) -ge 2.0) -or ($null -ne $L.ulcQ -and [math]::Abs([double]$L.ulcQ) -ge 4.0)
        AddItem $k "Productivity and costs" (PeriodLabel $L.d) ("Productivity {0} {1}% q/q ann., {2}% y/y; unit labor costs {3}% q/q" -f (PeriodLabel $L.d), (Sg $L.prodQ), (Sg $L.prodY), (Sg $L.ulcQ)) $mat @("productivity")
      }
      "profits" {
        $R = @(QRows $profits.quarterly "profits" 5); $L = $R[-1]; $P = $R[-2]; $Y = $(if ($R.Count -ge 5) { $R[-5] } else { $null })
        $m = [double]$L.profits / [double]$L.gva * 100; $mp = [double]$P.profits / [double]$P.gva * 100
        $yoy = $(if ($Y) { ([double]$L.profits / [double]$Y.profits - 1) * 100 } else { 0 })
        $mat = ([math]::Abs($m - $mp) -ge 0.5) -or ([math]::Abs($yoy) -ge 10)
        AddItem $k "Corporate profits and labor share" (PeriodLabel $L.d) ("Corporate profits {0}: margin {1}% ({2} pp), profits {3}% y/y, labor share {4}%" -f (PeriodLabel $L.d), $m.ToString("F1"), (Sg ($m - $mp)), (Sg $yoy), ([double]$L.comp / [double]$L.gva * 100).ToString("F1")) $mat @("profits")
      }
      "debt" {
        $R = @(QRows ($debt.quarterly | Where-Object { $null -ne $_.gdp -and $null -ne $_.hh -and $null -ne $_.bus }) "nfc" 5); $L = $R[-1]; $P = $R[-2]; $Y = $(if ($R.Count -ge 5) { $R[-5] } else { $null })
        $nfcY = $(if ($Y) { ([double]$L.nfc / [double]$Y.nfc - 1) * 100 } else { 0 })
        $priv = ([double]$L.hh + [double]$L.bus) / [double]$L.gdp * 100; $privP = ([double]$P.hh + [double]$P.bus) / [double]$P.gdp * 100
        $mat = ($nfcY -ge 8) -or ($nfcY -le 0) -or ([math]::Abs($priv - $privP) -ge 2)
        AddItem $k "Private sector debt (Z.1)" (PeriodLabel $L.d) ("Z.1 {0}: corporate debt `${1}T ({2}% y/y), private nonfinancial debt {3}% of GDP ({4} pp q/q)" -f (PeriodLabel $L.d), ([double]$L.nfc / 1000).ToString("F1"), (Sg $nfcY), [math]::Round($priv), (Sg ($priv - $privP))) $mat @("debt")
      }
      "hhdebt" {
        $B = @(QRows $hh.nyfed.balances "total" 5); $L = $B[-1]; $P = $B[-2]; $Y = $(if ($B.Count -ge 5) { $B[-5] } else { $null })
        $D = @(QRows $hh.nyfed.delinq90 "all" 2); $dL = $D[-1]; $dP = $D[-2]
        $yoy = $(if ($Y) { ([double]$L.total / [double]$Y.total - 1) * 100 } else { 0 }); $cardY = $(if ($Y) { ([double]$L.card / [double]$Y.card - 1) * 100 } else { 0 })
        $mat = ([math]::Abs([double]$dL.all - [double]$dP.all) -ge 0.3) -or ($cardY -ge 10) -or ([math]::Abs([double]$L.total - [double]$P.total) -ge 0.3)
        AddItem $k "Household debt (New York Fed)" (PeriodLabel $L.d) ("Household debt {0} `${1}T ({2}% y/y), 90+ day delinquency {3}% ({4} pp q/q)" -f (PeriodLabel $L.d), ([double]$L.total).ToString("F2"), (Sg $yoy), ([double]$dL.all).ToString("F2"), (Sg ([double]$dL.all - [double]$dP.all) 2)) $mat @("hhdebt")
      }
      "g19" {
        $G = @($hh.g19.monthly); $L = $G[-1]; $P = $G[-2]; $Y = $(if ($G.Count -ge 13) { $G[-13] } else { $null })
        $mm = [double]$L.total - [double]$P.total; $yoy = $(if ($Y) { ([double]$L.total / [double]$Y.total - 1) * 100 } else { 0 }); $yoyP = $(if ($G.Count -ge 14) { ([double]$P.total / [double]$G[-14].total - 1) * 100 } else { $yoy })
        $mat = ([math]::Abs($mm) -ge 30) -or ([math]::Abs($yoy - $yoyP) -ge 1.0)
        AddItem $k "Consumer credit (G.19)" (Mon $L.d) ("Consumer credit {0} `${1}B ({2}B m/m, {3}% y/y)" -f (Mon $L.d), (N0 $L.total), (Sg $mm 0), (Sg $yoy)) $mat @("hhdebt")
      }
      "banks" {
        $R = @(QRows $banks.quarterly "t1" 2); $L = $R[-1]; $P = $R[-2]
        $lev = [double]$L.t1 / [double]$L.avgAssets * 100; $levP = [double]$P.t1 / [double]$P.avgAssets * 100
        $un = ([double]$L.afsFair - [double]$L.afsCost) + ([double]$L.htmFair - [double]$L.htmCost); $unP = ([double]$P.afsFair - [double]$P.afsCost) + ([double]$P.htmFair - [double]$P.htmCost)
        $nc = [double]$L.noncurrent / [double]$L.loans * 100; $ncP = [double]$P.noncurrent / [double]$P.loans * 100
        $mat = ([math]::Abs($lev - $levP) -ge 0.25) -or ([math]::Abs($un - $unP) -ge 100) -or ([math]::Abs($nc - $ncP) -ge 0.2)
        AddItem $k "Bank capital (FDIC)" (PeriodLabel $L.d) ("FDIC {0}: Tier 1 leverage {1}% ({2} pp q/q), unrealized securities {3}`${4}B, noncurrent loans {5}%" -f (PeriodLabel $L.d), $lev.ToString("F2"), (Sg ($lev - $levP) 2), $(if ($un -lt 0) { "-" } else { "+" }), (N0 ([math]::Abs($un))), $nc.ToString("F2")) $mat @("banks")
      }
    }
  } catch { Write-Output "alerts: could not evaluate $k ($($_.Exception.Message)); it will be reported without a materiality flag"; AddItem $k $k $cur[$k] "$k $($cur[$k])" $false @($k) }
}
foreach ($it in $items) {
  if ($revisions.Contains($it.key)) { $rv = $revisions[$it.key]; $it.headline += "; " + $rv.short; $it | Add-Member -NotePropertyName revision -NotePropertyValue $rv.text; if ($rv.material) { $it.material = $true } }
}
foreach ($k in $revOnly) {
  $rv = $revisions[$k]
  AddItem $k ($revTitle[$k] + " (revision)") (PeriodLabel $rv.records[0].period) ($revShort[$k] + " " + $rv.short) $rv.material $revViews[$k]
  $items[$items.Count - 1] | Add-Member -NotePropertyName revision -NotePropertyValue $rv.text
}
$toSend = @($items | Where-Object { $_.notify })

# ---- the page's own summaries, in English ----
$sections = @{}
if ($toSend.Count -and $Page -and (Test-Path $Page)) {
  try {
    $node = (Get-Command node -ErrorAction Stop).Source
    $json = & $node "$PSScriptRoot\exec_extract.js" $Page "en" 2>$null | Out-String
    $ex = $json | ConvertFrom-Json
    if ($ex.error) { Write-Output "alerts: page script stopped early ($($ex.error.Split([char]10)[0])); using whatever summaries were produced" }
    foreach ($p in $ex.sections.PSObject.Properties) { $sections[$p.Name] = $p.Value }
    Write-Output "alerts: summaries extracted for $($sections.Count) sections"
  } catch { Write-Output "alerts: summary extraction failed ($($_.Exception.Message)); the email will carry headline figures only" }
}

if ($toSend.Count) {
  $materials = @($toSend | Where-Object { $_.material })
  $subject = $(if ($materials.Count) { "MATERIAL: " } else { "Macro update: " }) + (($toSend | ForEach-Object { $_.headline }) -join " | ")
  if ($subject.Length -gt 240) { $subject = $subject.Substring(0, 237) + "..." }
  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add("Macro Monitor - " + $(if ($new.Count) { "new" } else { "revised" }) + " data on " + (Get-Date).ToUniversalTime().ToString("dd-MMM-yyyy") + ". " + $(if ($materials.Count) { "Material by the dashboard's thresholds: " + (($materials | ForEach-Object { $_.title }) -join ", ") + "." } else { "No threshold crossed." }))
  [void]$lines.Add("")
  foreach ($it in $toSend) {
    [void]$lines.Add("## " + $it.title + " - " + $it.period + $(if ($it.material) { " (MATERIAL)" } else { "" }))
    [void]$lines.Add("**" + $it.headline + "**")
    if ($it.PSObject.Properties["revision"]) { [void]$lines.Add("- **Revision:** " + $it.revision + " (vs. the figures last reported)") }
    $any = $false
    foreach ($v in $it.views) {
      $s = $sections[$v]; if (-not $s) { continue }
      $any = $true
      if ($it.views.Count -gt 1) { [void]$lines.Add(""); [void]$lines.Add("_" + $v + "_") }
      [void]$lines.Add("- **Latest print:** " + $s.latest)
      [void]$lines.Add("- **What drove it:** " + $s.drivers)
      [void]$lines.Add("- **Why it matters:** " + $s.why)
      [void]$lines.Add("- **What to watch:** " + $s.watch)
    }
    if (-not $any) { [void]$lines.Add("- Summary text unavailable this run; the section on the dashboard has the full picture.") }
    [void]$lines.Add("- Section: https://fnam.mx/macro/?lang=en&view=" + $it.views[0])
    [void]$lines.Add("")
  }
  [void]$lines.Add("---")
  [void]$lines.Add("Automated alert from the Macro Monitor pipeline; thresholds and sources at https://fnam.mx/macro/. This issue is the delivery channel for the email - nothing to do with it.")
  $body = $lines -join "`n"

  $repo = $env:GITHUB_REPOSITORY; $token = $env:GITHUB_TOKEN
  if (-not $repo -or -not $token) {
    Write-Output "alerts: no GITHUB_TOKEN/GITHUB_REPOSITORY - printing the email instead (state not advanced)"
    Write-Output ("SUBJECT: " + $subject); Write-Output $body
    return
  }
  $payload = @{ title = $subject; body = $body } | ConvertTo-Json -Depth 3
  $r = Invoke-Retry { Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/issues" -Method Post -Headers @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "User-Agent" = "macro-refresh" } -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType "application/json; charset=utf-8" -TimeoutSec 60 }
  Write-Output "alerts: issue #$($r.number) opened - $($r.html_url)"
} else {
  Write-Output "alerts: new periods but nothing to send (only sub-threshold weekly moves)"
}

# ---- advance the state for everything that was new or revised ----
Save-State
Write-Output "alerts: state advanced for $((@($new) + @($revOnly)) -join ', ')"

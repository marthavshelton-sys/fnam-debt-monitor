# Material updates -> one GitHub issue per run that found new releases. GitHub
# emails the repository owner about every issue opened in a repo they watch
# (their own, by default), so the issue is only a delivery channel: no mail
# server, no credentials, nothing running on anyone's computer.
#
# What counts as a release: a new period in any tracked series (CPI, PPI, jobs,
# PCE, GDP, retail, sentiment prelim/final, Treasury statement, Challenger,
# CAPE) and a weekly SPR move of 3 million barrels or more. The body is the
# page's own "At a glance" text for each affected section (read out of the
# built page under Node), so the email says exactly what the dashboard says.
# Thresholds below decide whether the subject is marked MATERIAL.
#
# State (the last period reported per release) lives next to the data and is
# committed with it. A missing state file is seeded from the current data
# without sending anything.
param([string]$Page = "")
. "$PSScriptRoot\common.ps1"
$statePath = Join-Path $data "alerts_state.json"
function LoadJson([string]$f) { $p = Join-Path $data $f; if (Test-Path $p) { Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null } }
$cpi = LoadJson "bls_cpi_processed3.json"; $ppi = LoadJson "ppi_processed.json"; $labor = LoadJson "labor_processed.json"; $ls = LoadJson "labor_static.json"
$pce = LoadJson "pce_processed.json"; $gdp = LoadJson "gdp_processed.json"; $retail = LoadJson "retail_processed.json"; $umich = LoadJson "umich_processed.json"
$fiscal = LoadJson "fiscal_processed.json"; $spr = LoadJson "spr_processed.json"; $cape = LoadJson "cape_processed.json"

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

if (-not (Test-Path $statePath)) {
  [System.IO.File]::WriteAllText($statePath, ($cur | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "alerts: no state file - seeded from the current data, nothing sent: $(($cur.Keys | ForEach-Object { $_ + '=' + $cur[$_] }) -join ' ')"
  return
}
$state = Get-Content $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
$isNew = { param($k) $c = $cur[$k]; $s = $state.$k; if (-not $c) { return $false }; if (-not $s) { return $true }; ($c -ne $s) -and ($c.TrimEnd('p') -ge $s.TrimEnd('p')) }
$new = @($cur.Keys | Where-Object { & $isNew $_ })
if (-not $new.Count) { Write-Output "alerts: nothing new (state matches the data)"; return }
Write-Output "alerts: new releases: $($new -join ', ')"

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
    }
  } catch { Write-Output "alerts: could not evaluate $k ($($_.Exception.Message)); it will be reported without a materiality flag"; AddItem $k $k $cur[$k] "$k $($cur[$k])" $false @($k) }
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
  [void]$lines.Add("Macro Monitor - new data on " + (Get-Date).ToUniversalTime().ToString("dd-MMM-yyyy") + ". " + $(if ($materials.Count) { "Material by the dashboard's thresholds: " + (($materials | ForEach-Object { $_.title }) -join ", ") + "." } else { "No threshold crossed." }))
  [void]$lines.Add("")
  foreach ($it in $toSend) {
    [void]$lines.Add("## " + $it.title + " - " + $it.period + $(if ($it.material) { " (MATERIAL)" } else { "" }))
    [void]$lines.Add("**" + $it.headline + "**")
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

# ---- advance the state for everything that was new ----
foreach ($k in $new) { if ($state.PSObject.Properties[$k]) { $state.$k = $cur[$k] } else { $state | Add-Member -NotePropertyName $k -NotePropertyValue $cur[$k] } }
[System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "alerts: state advanced for $($new -join ', ')"
